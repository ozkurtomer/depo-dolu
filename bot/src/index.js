/**
 * Depo Dolu Telegram botu (Cloudflare Worker).
 *
 * Görevleri:
 *  1. Telegram konuşması: /start → il sor → yakıt sor → abone et.
 *  2. Abone listesini D1 veritabanında tutmak (chat_id, il, yakıt). Başka kişisel veri yok.
 *  3. Toplayıcıya (GitHub Actions) abone listesini vermek. Bildirimleri toplayıcı gönderir,
 *     böylece Worker'ın istek başına alt istek sınırına takılmayız.
 *
 * Adresler:
 *  POST /tg              Telegram webhook (X-Telegram-Bot-Api-Secret-Token ile korunur)
 *  GET  /subscribers     Abone listesi (Authorization: Bearer API_SECRET)
 *  POST /unsubscribe     Botu engelleyenleri sil   (Authorization: Bearer API_SECRET)
 *  GET  /stats           İl bazında abone sayısı   (Authorization: Bearer API_SECRET)
 *  GET  /setup?key=...   Webhook'u ve bot menüsünü kurar (key = WEBHOOK_SECRET)
 */

const FUELS = {
  benzin: { label: 'Benzin', dative: 'Benzine', locative: 'Benzinde' },
  motorin: { label: 'Motorin', dative: 'Motorine', locative: 'Motorinde' },
  lpg: { label: 'LPG', dative: "LPG'ye", locative: "LPG'de" },
};
const FUEL_KEYS = Object.keys(FUELS);
const POPULAR = ['istanbul-avrupa', 'istanbul-anadolu', 'ankara', 'izmir', 'bursa', 'antalya'];

const COMMANDS = [
  { command: 'start', description: 'İl ve yakıt seç, takibe başla' },
  { command: 'fiyat', description: 'İlinin güncel fiyatları' },
  { command: 'degistir', description: 'İli ya da yakıtı değiştir' },
  { command: 'durdur', description: 'Bildirimleri kapat' },
  { command: 'test', description: 'Örnek bir bildirim gönder' },
  { command: 'yardim', description: 'Bot ne yapar?' },
];

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    try {
      if (request.method === 'POST' && url.pathname === '/tg') return await webhook(request, env, ctx);
      if (url.pathname === '/subscribers') return await subscribers(request, env, url);
      if (url.pathname === '/unsubscribe') return await unsubscribe(request, env);
      if (url.pathname === '/stats') return await stats(request, env);
      if (url.pathname === '/setup') return await setup(env, url);
      return new Response('Depo Dolu botu çalışıyor. https://t.me/depodolu_bot', { status: 200 });
    } catch (err) {
      console.error(err);
      return json({ ok: false, error: String(err?.message ?? err) }, 500);
    }
  },
};

// ---------------------------------------------------------------- HTTP uçları

async function webhook(request, env, ctx) {
  if (request.headers.get('X-Telegram-Bot-Api-Secret-Token') !== env.WEBHOOK_SECRET) {
    return new Response('forbidden', { status: 403 });
  }
  const update = await request.json();
  // Telegram'a hemen 200 dön, işi arkada yap: yavaş bir cevap tekrar denemelere yol açmasın.
  ctx.waitUntil(handleUpdate(update, env).catch(err => console.error('update hatası', err)));
  return new Response('ok');
}

async function subscribers(request, env, url) {
  if (!authorized(request, env)) return new Response('unauthorized', { status: 401 });
  const city = url.searchParams.get('city');
  const { results } = city
    ? await env.DB.prepare('SELECT chat_id, city, fuel FROM subscribers WHERE city = ?').bind(city).all()
    : await env.DB.prepare('SELECT chat_id, city, fuel FROM subscribers').all();
  return json({ subscribers: results });
}

async function unsubscribe(request, env) {
  if (!authorized(request, env)) return new Response('unauthorized', { status: 401 });
  if (request.method !== 'POST') return new Response('method not allowed', { status: 405 });
  const { chat_ids: ids = [] } = await request.json();
  if (!Array.isArray(ids) || ids.length === 0) return json({ removed: 0 });
  const stmt = env.DB.prepare('DELETE FROM subscribers WHERE chat_id = ?');
  await env.DB.batch(ids.slice(0, 500).map(id => stmt.bind(id)));
  return json({ removed: Math.min(ids.length, 500) });
}

async function stats(request, env) {
  if (!authorized(request, env)) return new Response('unauthorized', { status: 401 });
  const { results } = await env.DB
    .prepare('SELECT city, fuel, COUNT(*) AS n FROM subscribers GROUP BY city, fuel ORDER BY n DESC')
    .all();
  const total = results.reduce((s, r) => s + r.n, 0);
  return json({ total, byCity: results });
}

async function setup(env, url) {
  if (url.searchParams.get('key') !== env.WEBHOOK_SECRET) return new Response('forbidden', { status: 403 });
  const hook = await tg(env, 'setWebhook', {
    url: `${url.origin}/tg`,
    secret_token: env.WEBHOOK_SECRET,
    allowed_updates: ['message', 'callback_query'],
    drop_pending_updates: true,
  });
  const commands = await tg(env, 'setMyCommands', { commands: COMMANDS });
  await tg(env, 'setMyDescription', {
    description:
      "İlindeki benzin, motorin ya da LPG fiyatı değiştiği an sana haber veren ücretsiz bot. " +
      'Reklam yok, kayıt yok. Başlamak için aşağıdaki BAŞLAT düğmesine dokun.',
  });
  await tg(env, 'setMyShortDescription', {
    short_description: 'İlindeki akaryakıt fiyatı değiştiği an haber verir. Ücretsiz, reklamsız.',
  });
  return json({ webhook: hook, commands });
}

function authorized(request, env) {
  return !!env.API_SECRET && request.headers.get('Authorization') === `Bearer ${env.API_SECRET}`;
}

// ---------------------------------------------------------------- Konuşma

export async function handleUpdate(update, env) {
  if (update.callback_query) return onCallback(update.callback_query, env);

  const msg = update.message;
  if (!msg?.text || msg.chat?.type !== 'private') return;
  const chatId = msg.chat.id;
  const text = msg.text.trim();
  const [rawCommand, ...rest] = text.split(/\s+/);
  const command = rawCommand.startsWith('/') ? rawCommand.slice(1).split('@')[0].toLowerCase() : null;

  if (command === 'start') return onStart(chatId, rest.join(' '), env);
  if (command === 'fiyat') return onPrice(chatId, env);
  if (command === 'degistir' || command === 'değiştir') return askCity(chatId, env, 'Hangi ile geçelim? İlin adını yaz ya da aşağıdan seç.');
  if (command === 'durdur') return onStop(chatId, env);
  if (command === 'test') return onTest(chatId, env);
  if (command === 'yardim' || command === 'yardım' || command === 'help') return onHelp(chatId, env);
  if (command) return send(env, chatId, 'Bu komutu tanımıyorum. /yardim yazarak neler yapabildiğimi görebilirsin.');

  const folded = fold(text);
  if (['basla', 'baslat', 'merhaba', 'selam'].includes(folded)) return onStart(chatId, '', env);
  if (['durdur', 'dur', 'iptal'].includes(folded)) return onStop(chatId, env);
  if (folded === 'fiyat') return onPrice(chatId, env);
  return searchCity(chatId, text, env);
}

async function onStart(chatId, payload, env) {
  // Web'den gelen derin bağlantı: /start bursa  ya da  /start bursa_motorin
  if (payload) {
    const [slug, fuel] = payload.toLowerCase().split('_');
    const prices = await getPrices(env);
    if (prices.prices[slug]) {
      if (fuel === 'hepsi' || FUEL_KEYS.includes(fuel)) return subscribe(chatId, slug, fuel, env);
      return askFuel(chatId, slug, env);
    }
  }
  return askCity(
    chatId,
    env,
    'Merhaba 👋 Ben <b>Depo Dolu</b>.\n\n' +
      'İlindeki benzin, motorin ya da LPG fiyatı değiştiği an sana haber veririm. ' +
      'Diğer illerin fiyatlarıyla seni yormam.\n\n' +
      '<b>Hangi ilde yakıt alıyorsun?</b> İlin adını yaz ya da aşağıdan seç.',
  );
}

async function askCity(chatId, env, text) {
  const prices = await getPrices(env);
  const buttons = POPULAR.filter(s => prices.prices[s]).map(s => ({ text: prices.prices[s].name, callback_data: `c:${s}` }));
  return send(env, chatId, text, { inline_keyboard: chunk(buttons, 2) });
}

async function searchCity(chatId, query, env) {
  const prices = await getPrices(env);
  const q = fold(query).replace(/[^a-z0-9 ]/g, ' ').trim();
  if (!q) return send(env, chatId, 'İlinin adını yazar mısın? Örneğin: Bursa');

  const cities = Object.entries(prices.prices).map(([slug, c]) => ({ slug, name: c.name, key: fold(c.name) }));
  const exact = cities.filter(c => c.key === q || c.key.replace(/[()]/g, '') === q);
  const starts = cities.filter(c => c.key.startsWith(q));
  const contains = cities.filter(c => c.key.includes(q));
  const matches = exact.length ? exact : starts.length ? starts : contains;

  if (matches.length === 1) return askFuel(chatId, matches[0].slug, env);
  if (matches.length === 0) {
    return send(env, chatId, `"${escape(query)}" diye bir il bulamadım. Yazımı kontrol edip tekrar dener misin? Örneğin: Kahramanmaraş`);
  }
  const buttons = matches.slice(0, 8).map(c => ({ text: c.name, callback_data: `c:${c.slug}` }));
  return send(env, chatId, 'Hangisi?', { inline_keyboard: chunk(buttons, 2) });
}

async function askFuel(chatId, slug, env, messageId) {
  const prices = await getPrices(env);
  const city = prices.prices[slug];
  if (!city) return send(env, chatId, 'Bu ili bulamadım. /start ile yeniden başlayalım.');

  const lines = FUEL_KEYS.map(f => `${FUELS[f].label}: <b>${city[f] != null ? money(city[f]) + ' ₺' : '—'}</b>`);
  const text = `<b>${escape(city.name)}</b> için hangi yakıtı takip edelim?\n\nBugünkü litre fiyatları:\n${lines.join('\n')}`;
  const keyboard = {
    inline_keyboard: [
      FUEL_KEYS.map(f => ({ text: FUELS[f].label, callback_data: `f:${slug}:${f}` })),
      [{ text: 'Hepsi', callback_data: `f:${slug}:hepsi` }],
    ],
  };
  return messageId ? edit(env, chatId, messageId, text, keyboard) : send(env, chatId, text, keyboard);
}

async function subscribe(chatId, slug, fuel, env, messageId) {
  const prices = await getPrices(env);
  const city = prices.prices[slug];
  if (!city) return send(env, chatId, 'Bu ili bulamadım. /start ile yeniden başlayalım.');

  await env.DB
    .prepare(
      `INSERT INTO subscribers (chat_id, city, fuel) VALUES (?, ?, ?)
       ON CONFLICT(chat_id) DO UPDATE SET city = excluded.city, fuel = excluded.fuel, updated_at = datetime('now')`,
    )
    .bind(chatId, slug, fuel)
    .run();

  const what = fuel === 'hepsi'
    ? `${escape(city.name)} benzin, motorin ve LPG`
    : `${escape(city.name)} ${FUELS[fuel].label.toLocaleLowerCase('tr-TR').replace('lpg', 'LPG')}`;
  const now = fuel === 'hepsi'
    ? FUEL_KEYS.map(f => `${FUELS[f].label}: <b>${city[f] != null ? money(city[f]) + ' ₺' : '—'}</b>`).join('\n')
    : `Şu an litresi <b>${city[fuel] != null ? money(city[fuel]) + ' ₺' : '—'}</b>.`;

  const text =
    `✅ Tamam! <b>${what}</b> fiyatı değiştiği an sana yazacağım.\n\n${now}\n\n` +
    '/fiyat güncel fiyatlar\n/degistir ili ya da yakıtı değiştir\n/test örnek bildirim\n/durdur bildirimleri kapat';
  return messageId ? edit(env, chatId, messageId, text) : send(env, chatId, text);
}

async function onPrice(chatId, env) {
  const sub = await getSub(chatId, env);
  if (!sub) return askCity(chatId, env, 'Önce ilini seçelim. Hangi ilde yakıt alıyorsun?');
  const prices = await getPrices(env);
  const city = prices.prices[sub.city];
  if (!city) return send(env, chatId, 'Bu ilin fiyatını şu an bulamadım. Birazdan tekrar dener misin?');

  const lines = FUEL_KEYS.map(f => {
    const mine = sub.fuel === f;
    const p = city[f] != null ? `${money(city[f])} ₺` : '—';
    return mine ? `${FUELS[f].label}: <b>${p}</b> ← takip ettiğin` : `${FUELS[f].label}: ${p}`;
  });

  let extra = '';
  if (FUEL_KEYS.includes(sub.fuel) && city[sub.fuel] != null) {
    const all = Object.values(prices.prices).map(c => c[sub.fuel]).filter(v => v != null);
    const avg = all.reduce((s, v) => s + v, 0) / all.length;
    const diff = city[sub.fuel] - avg;
    extra = Math.abs(diff) < 0.005
      ? '\nTürkiye ortalamasıyla aynı.'
      : `\nTürkiye ortalamasından ${money(Math.abs(diff))} ₺ ${diff < 0 ? 'ucuz' : 'pahalı'}.`;
  }

  return send(
    env,
    chatId,
    `<b>${escape(city.name)}</b>, litre fiyatları (KDV dahil)\n\n${lines.join('\n')}\n${extra}\n\nSon değişiklik: ${date(city.changedAt)}`,
  );
}

async function onStop(chatId, env) {
  await env.DB.prepare('DELETE FROM subscribers WHERE chat_id = ?').bind(chatId).run();
  return send(env, chatId, 'Bildirimleri kapattım, artık sana yazmayacağım. 👋\n\nFikrini değiştirirsen /start yazman yeterli.');
}

async function onTest(chatId, env) {
  const sub = await getSub(chatId, env);
  if (!sub) return askCity(chatId, env, 'Örnek bildirim için önce ilini seçelim. Hangi ilde yakıt alıyorsun?');
  const prices = await getPrices(env);
  const city = prices.prices[sub.city];
  const fuel = FUEL_KEYS.includes(sub.fuel) ? sub.fuel : 'motorin';
  const now = city?.[fuel] ?? 50;
  const sample = changeMessage(city?.name ?? sub.city, fuel, now - 1, now);
  return send(env, chatId, `🧪 <i>Deneme bildirimi. Gerçek bir zam olduğunda böyle bir mesaj alacaksın:</i>\n\n${sample}`);
}

async function onHelp(chatId, env) {
  return send(
    env,
    chatId,
    'Petrol Ofisi\'nin 81 il fiyatlarını 15 dakikada bir kontrol ediyorum. ' +
      'Senin ilinde, senin yakıtında fiyat değiştiği an sana yazıyorum. Başka illerle seni yormuyorum.\n\n' +
      '/start il ve yakıt seç\n/fiyat güncel fiyatlar\n/degistir ili ya da yakıtı değiştir\n/test örnek bildirim\n/durdur bildirimleri kapat\n\n' +
      'Açık kaynak: github.com/ozkurtomer/depo-dolu',
  );
}

async function onCallback(cq, env) {
  const chatId = cq.message?.chat?.id;
  const messageId = cq.message?.message_id;
  const data = cq.data ?? '';
  await tg(env, 'answerCallbackQuery', { callback_query_id: cq.id });
  if (!chatId || cq.message?.chat?.type !== 'private') return;

  if (data.startsWith('c:')) return askFuel(chatId, data.slice(2), env, messageId);
  if (data.startsWith('f:')) {
    const [, slug, fuel] = data.split(':');
    if (fuel === 'hepsi' || FUEL_KEYS.includes(fuel)) return subscribe(chatId, slug, fuel, env, messageId);
  }
}

async function getSub(chatId, env) {
  return env.DB.prepare('SELECT city, fuel FROM subscribers WHERE chat_id = ?').bind(chatId).first();
}

// ---------------------------------------------------------------- Mesaj biçimi
// Toplayıcıdaki BotNotifier ile aynı biçim; /test gerçeğiyle birebir görünsün.

export function changeMessage(cityName, fuel, oldPrice, newPrice) {
  const up = newPrice > oldPrice;
  const delta = Math.abs(newPrice - oldPrice);
  const head = up ? `⛽ <b>${escape(cityName)}: ${FUELS[fuel].dative} zam</b>` : `🟢 <b>${escape(cityName)}: ${FUELS[fuel].locative} indirim</b>`;
  const line = `Litre ${money(oldPrice)} → <b>${money(newPrice)} ₺</b> (${up ? '+' : '−'}${money(delta)} ₺)`;
  const tail = up ? `50 litrelik depo artık ${whole(newPrice * 50)} ₺.` : 'Depoyu doldurmanın tam zamanı.';
  return `${head}\n${line}\n${tail}\n\n<i>/fiyat tüm fiyatlar · /durdur bildirimleri kapat</i>`;
}

// ---------------------------------------------------------------- Yardımcılar

async function getPrices(env) {
  const res = await fetch(`${env.DATA_URL}/latest.json`, { cf: { cacheTtl: 300, cacheEverything: true } });
  if (!res.ok) throw new Error(`Fiyatlar alınamadı (${res.status})`);
  return res.json();
}

async function tg(env, method, payload) {
  const res = await fetch(`https://api.telegram.org/bot${env.BOT_TOKEN}/${method}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const body = await res.json().catch(() => ({}));
  if (!body.ok && !(method === 'editMessageText' && /not modified/.test(body.description ?? ''))) {
    console.error(`Telegram ${method} hatası`, body.description);
  }
  return body;
}

function send(env, chatId, text, replyMarkup) {
  return tg(env, 'sendMessage', {
    chat_id: chatId,
    text,
    parse_mode: 'HTML',
    disable_web_page_preview: true,
    ...(replyMarkup ? { reply_markup: replyMarkup } : {}),
  });
}

function edit(env, chatId, messageId, text, replyMarkup) {
  return tg(env, 'editMessageText', {
    chat_id: chatId,
    message_id: messageId,
    text,
    parse_mode: 'HTML',
    disable_web_page_preview: true,
    ...(replyMarkup ? { reply_markup: replyMarkup } : {}),
  });
}

export function fold(s) {
  return String(s)
    .toLocaleLowerCase('tr-TR')
    .replace(/ı/g, 'i').replace(/ş/g, 's').replace(/ğ/g, 'g')
    .replace(/ü/g, 'u').replace(/ö/g, 'o').replace(/ç/g, 'c')
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

const moneyFmt = new Intl.NumberFormat('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const wholeFmt = new Intl.NumberFormat('tr-TR', { maximumFractionDigits: 0 });
export const money = v => moneyFmt.format(v);
const whole = v => wholeFmt.format(Math.round(v));

const MONTHS = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];
function date(iso) {
  if (!iso) return 'bilinmiyor';
  const d = new Date(new Date(iso).getTime() + 3 * 3600 * 1000); // Türkiye saati
  const hh = String(d.getUTCHours()).padStart(2, '0');
  const mm = String(d.getUTCMinutes()).padStart(2, '0');
  return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]}, ${hh}:${mm}`;
}

function escape(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function chunk(arr, n) {
  const out = [];
  for (let i = 0; i < arr.length; i += n) out.push(arr.slice(i, i + n));
  return out;
}

function json(body, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json; charset=utf-8' } });
}
