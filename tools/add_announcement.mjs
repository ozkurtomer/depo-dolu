// Yaklaşan zam/indirim duyurusunu data/announcements.json'a ekler; süresi geçenleri temizler.
// GitHub'da "Zam duyurusu ekle" iş akışı bunu telefondan da çalıştırmayı sağlar.
//
//   node tools/add_announcement.mjs --fuel motorin --change 1.20 --at "2026-11-01 00:00" \
//     --source "EPDK duyurusu" --url https://... [--file data/announcements.json] [--telegram]
//
// --at Türkiye saatidir (UTC+3). --telegram verilirse ve TELEGRAM_BOT_TOKEN + TELEGRAM_CHAT_ID
// ortam değişkenleri varsa, duyuru kanala da gönderilir.
import { existsSync, readFileSync, writeFileSync } from 'node:fs';

const FUELS = { benzin: 'Benzine', motorin: 'Motorine', lpg: "LPG'ye" };

const arg = name => {
  const i = process.argv.indexOf(name);
  return i >= 0 && i + 1 < process.argv.length ? process.argv[i + 1].trim() : '';
};
const fail = msg => { console.error(`✗ ${msg}`); process.exit(1); };

const file = arg('--file') || 'data/announcements.json';
const fuel = arg('--fuel');
const change = Number(arg('--change').replace(',', '.'));
const atText = arg('--at');
const source = arg('--source');
const sourceUrl = arg('--url');

if (!FUELS[fuel]) fail('Yakıt benzin, motorin ya da lpg olmalı.');
if (!Number.isFinite(change) || change === 0 || Math.abs(change) >= 50) fail('Değişim litre başına ₺ olmalı, ör. 1.20 ya da -0.85.');
const m = /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})$/.exec(atText);
if (!m) fail('Tarih "YYYY-AA-GG SS:DD" biçiminde olmalı (Türkiye saati), ör. 2026-11-01 00:00.');
const effectiveAt = new Date(`${m[1]}-${m[2]}-${m[3]}T${m[4]}:${m[5]}:00+03:00`);
if (!Number.isFinite(effectiveAt.getTime())) fail('Geçersiz tarih.');
if (!source) fail('Kaynak boş olamaz: duyuruyu kimin yaptığını yaz.');
if (sourceUrl && !/^https:\/\//.test(sourceUrl)) fail('Kaynak bağlantısı https:// ile başlamalı.');

const now = new Date();
if (effectiveAt.getTime() < now.getTime() - 3 * 3_600_000) fail('Bu tarih geçmişte kaldı.');

const data = existsSync(file) ? JSON.parse(readFileSync(file, 'utf8')) : { items: [] };
const items = (Array.isArray(data.items) ? data.items : [])
  // Süresi bir günden fazla geçmiş duyurular dosyada kalmasın.
  .filter(a => Date.parse(a.effectiveAt) > now.getTime() - 86_400_000)
  // Aynı yakıt ve saat için yeni duyuru eskisinin yerini alır (düzeltme).
  .filter(a => !(a.fuel === fuel && Date.parse(a.effectiveAt) === effectiveAt.getTime()));

const item = {
  id: `${fuel}-${effectiveAt.toISOString().slice(0, 16).replace(/[-:T]/g, '')}`,
  fuel,
  change: Math.round(change * 100) / 100,
  effectiveAt: effectiveAt.toISOString().replace('.000Z', '+00:00'),
  source,
  ...(sourceUrl ? { sourceUrl } : {}),
  publishedAt: now.toISOString().replace(/\.\d{3}Z$/, '+00:00'),
};
items.push(item);
items.sort((a, b) => Date.parse(a.effectiveAt) - Date.parse(b.effectiveAt));
writeFileSync(file, JSON.stringify({ items }, null, 2) + '\n');

const money = new Intl.NumberFormat('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const when = new Intl.DateTimeFormat('tr-TR', { timeZone: 'Europe/Istanbul', weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' });
const word = change > 0 ? 'zam' : 'indirim';
const text = `📢 ${FUELS[fuel]} ${word} bekleniyor: litre başına ${change > 0 ? '+' : '−'}${money.format(Math.abs(change))} ₺, ` +
  `${when.format(effectiveAt)} itibarıyla.\nKaynak: ${source}${sourceUrl ? ` (${sourceUrl})` : ''}\n` +
  `Bu bir duyurudur; pompa fiyatına yansıyınca ayrıca bildirim gelir. İl bazında tutar farklı olabilir.`;
console.log(`✓ Duyuru eklendi (${item.id}).\n${text}`);

if (process.argv.includes('--telegram')) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chat = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chat) {
    console.log('  (Telegram ayarlı değil, kanala gönderilmedi)');
  } else {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ chat_id: chat, text, disable_web_page_preview: true }),
    });
    if (!res.ok) fail(`Telegram gönderilemedi (HTTP ${res.status}). Duyuru dosyaya yine de yazıldı.`);
    console.log('  ✓ Telegram kanalına gönderildi.');
  }
}
