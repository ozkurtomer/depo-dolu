// Botun konuşma akışını gerçek fiyat verisiyle, sahte Telegram ve SQLite tabanlı sahte D1 ile dener.
// Çalıştırma: npm test   (Node 22.5+; node:sqlite kullanır)
import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import worker, { handleUpdate, fold, changeMessage } from '../src/index.js';

const root = new URL('../../', import.meta.url);
const latest = readFileSync(new URL('data/latest.json', root), 'utf8');
const schema = readFileSync(new URL('../schema.sql', import.meta.url), 'utf8');
const P = JSON.parse(latest).prices;
const tr = v => new Intl.NumberFormat('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(v);

/** node:sqlite üzerinde Cloudflare D1 arayüzünün kullandığımız kısmı. */
function fakeD1() {
  const db = new DatabaseSync(':memory:');
  db.exec(schema);
  const wrap = (sql, args = []) => ({
    bind: (...a) => wrap(sql, a),
    run: async () => db.prepare(sql).run(...args),
    all: async () => ({ results: db.prepare(sql).all(...args).map(r => ({ ...r })) }),
    first: async () => { const r = db.prepare(sql).get(...args); return r ? { ...r } : null; },
  });
  return { prepare: sql => wrap(sql), batch: async stmts => Promise.all(stmts.map(s => s.run())), raw: db };
}

let sent, env;
const CHAT = 4242;

beforeEach(() => {
  sent = [];
  env = { DB: fakeD1(), BOT_TOKEN: 'x', WEBHOOK_SECRET: 'hook', API_SECRET: 'api', DATA_URL: 'https://data.test' };
  globalThis.fetch = async (url, init) => {
    url = String(url);
    if (url.endsWith('/latest.json')) return new Response(latest);
    if (url.startsWith('https://api.telegram.org/')) {
      sent.push({ method: url.split('/').pop(), ...JSON.parse(init.body) });
      return Response.json({ ok: true, result: {} });
    }
    throw new Error('beklenmeyen istek ' + url);
  };
});

const say = text => handleUpdate({ message: { chat: { id: CHAT, type: 'private' }, text } }, env);
const tap = data => handleUpdate({ callback_query: { id: 'cq', data, message: { message_id: 7, chat: { id: CHAT, type: 'private' } } } }, env);
const last = () => sent.filter(m => m.method !== 'answerCallbackQuery').at(-1);
const row = () => env.DB.raw.prepare('SELECT city, fuel FROM subscribers WHERE chat_id = ?').get(CHAT);

test('/start il sorar, sık seçilen illeri düğme olarak verir', async () => {
  await say('/start');
  const m = last();
  assert.match(m.text, /Hangi ilde yakıt alıyorsun/);
  const buttons = m.reply_markup.inline_keyboard.flat().map(b => b.text);
  assert.deepEqual(buttons, ['İstanbul (Avrupa)', 'İstanbul (Anadolu)', 'Ankara', 'İzmir', 'Bursa', 'Antalya']);
});

test('il yazınca yakıt sorar, yakıt seçince abone eder', async () => {
  await say('bursa');
  assert.match(last().text, /<b>Bursa<\/b> için hangi yakıtı/);
  assert.ok(last().text.includes(`Motorin: <b>${tr(P.bursa.motorin)} ₺</b>`));

  await tap('f:bursa:motorin');
  assert.equal(last().method, 'editMessageText');
  assert.match(last().text, /Bursa motorin<\/b> fiyatı değiştiği an/);
  assert.deepEqual({ ...row() }, { city: 'bursa', fuel: 'motorin' });
});

test('Türkçe karaktersiz ve kısmi yazım çalışır, birden fazla eşleşmede seçenek sunar', async () => {
  await say('sanliurfa');
  assert.match(last().text, /Şanlıurfa/);

  await say('istanbul');
  const names = last().reply_markup.inline_keyboard.flat().map(b => b.text);
  assert.deepEqual(names, ['İstanbul (Anadolu)', 'İstanbul (Avrupa)']);

  await say('Kahramanmaraş');
  assert.match(last().text, /Kahramanmaraş/);
});

test('bilinmeyen il anlaşılır hata verir', async () => {
  await say('Atlantis');
  assert.match(last().text, /"Atlantis" diye bir il bulamadım/);
});

test('web derin bağlantısı: /start bursa_motorin doğrudan abone eder', async () => {
  await say('/start bursa_motorin');
  assert.match(last().text, /✅ Tamam! <b>Bursa motorin<\/b>/);
  assert.deepEqual({ ...row() }, { city: 'bursa', fuel: 'motorin' });

  await say('/start istanbul-avrupa');
  assert.match(last().text, /İstanbul \(Avrupa\)<\/b> için hangi yakıtı/);
});

test('hepsi seçeneği üç yakıtı da listeler', async () => {
  await tap('f:izmir:hepsi');
  assert.match(last().text, /İzmir benzin, motorin ve LPG<\/b>/);
  assert.deepEqual({ ...row() }, { city: 'izmir', fuel: 'hepsi' });
});

test('/fiyat takip edilen yakıtı ve ortalamaya göre farkı gösterir', async () => {
  await tap('f:bursa:motorin');
  await say('/fiyat');
  assert.ok(last().text.includes(`Motorin: <b>${tr(P.bursa.motorin)} ₺</b> ← takip ettiğin`));
  assert.match(last().text, /Türkiye ortalamasından [\d,]+ ₺ (ucuz|pahalı)/);
});

test('/degistir yeni il sorar, seçim aboneliği günceller (tek satır kalır)', async () => {
  await tap('f:bursa:motorin');
  await say('/degistir');
  assert.match(last().text, /Hangi ile geçelim/);
  await tap('c:ankara');
  await tap('f:ankara:lpg');
  assert.deepEqual({ ...row() }, { city: 'ankara', fuel: 'lpg' });
  assert.equal(env.DB.raw.prepare('SELECT COUNT(*) n FROM subscribers').get().n, 1);
});

test('/durdur siler', async () => {
  await tap('f:bursa:motorin');
  await say('/durdur');
  assert.equal(row(), undefined);
  assert.match(last().text, /Bildirimleri kapattım/);
});

test('/test gerçek bildirim biçiminde örnek gönderir', async () => {
  await tap('f:bursa:motorin');
  await say('/test');
  assert.match(last().text, /Deneme bildirimi/);
  assert.ok(last().text.includes(`⛽ <b>Bursa: Motorine zam</b>\nLitre ${tr(P.bursa.motorin - 1)} → <b>${tr(P.bursa.motorin)} ₺</b> (+1,00 ₺)`));
});

test('grup sohbetleri yok sayılır', async () => {
  await handleUpdate({ message: { chat: { id: -100, type: 'group' }, text: '/start' } }, env);
  assert.equal(sent.length, 0);
});

test('HTTP: webhook gizli anahtar ister, abone listesi Bearer ister', async () => {
  const ctx = { waitUntil: p => p };
  let res = await worker.fetch(new Request('https://bot.test/tg', { method: 'POST', body: '{}' }), env, ctx);
  assert.equal(res.status, 403);

  await tap('f:bursa:motorin');
  res = await worker.fetch(new Request('https://bot.test/subscribers'), env, ctx);
  assert.equal(res.status, 401);
  res = await worker.fetch(new Request('https://bot.test/subscribers', { headers: { Authorization: 'Bearer api' } }), env, ctx);
  assert.deepEqual(await res.json(), { subscribers: [{ chat_id: CHAT, city: 'bursa', fuel: 'motorin' }] });

  res = await worker.fetch(new Request('https://bot.test/unsubscribe', {
    method: 'POST', headers: { Authorization: 'Bearer api' }, body: JSON.stringify({ chat_ids: [CHAT] }),
  }), env, ctx);
  assert.deepEqual(await res.json(), { removed: 1 });
  assert.equal(row(), undefined);
});

test('yardımcılar', () => {
  assert.equal(fold('  İSTANBUL  (Avrupa) '), 'istanbul (avrupa)');
  assert.equal(fold('Çanakkale'), 'canakkale');
  assert.equal(changeMessage('Van', 'lpg', 42.31, 41.81),
    '🟢 <b>Van: LPG\'de indirim</b>\nLitre 42,31 → <b>41,81 ₺</b> (−0,50 ₺)\nDepoyu doldurmanın tam zamanı.\n\n<i>/fiyat tüm fiyatlar · /durdur bildirimleri kapat</i>');
  assert.equal(changeMessage('Bursa', 'motorin', 97.8, 99.1),
    '⛽ <b>Bursa: Motorine zam</b>\nLitre 97,80 → <b>99,10 ₺</b> (+1,30 ₺)\n50 litrelik depo artık 4.955 ₺.\n\n<i>/fiyat tüm fiyatlar · /durdur bildirimleri kapat</i>');
});
