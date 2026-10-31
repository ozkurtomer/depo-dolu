// ng build'den sonra çalışır: her il ve yakıt için statik sayfa, tüm iller tablosu,
// fiyat haritası, sitemap.xml ve robots.txt üretir.
//   node tools/prerender.mjs --dist dist/browser --data ../data --base https://ozkurtomer.github.io/depo-dolu/
// İsteğe bağlı: --analytics <goatcounter-kodu> (ya da GOATCOUNTER_CODE ortam değişkeni)
// tüm web sayfalarına çerezsiz ziyaret sayacını ekler. Android uygulaması bu adımdan geçmez.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { CITY_COORDS } from '../src/app/trip.ts';
import { FUELS, allPricesPage, applyBody, applyHead, cityPage, homeBody, mapPage, sitemap, withAnalytics } from './seo-pages.mjs';

const arg = (name, fallback) => {
  const i = process.argv.indexOf(name);
  return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : fallback;
};

const dist = arg('--dist', 'dist/browser');
const dataDir = arg('--data', '../data');
let baseUrl = arg('--base', 'https://ozkurtomer.github.io/depo-dolu/');
if (!baseUrl.endsWith('/')) baseUrl += '/';
const analytics = arg('--analytics', process.env.GOATCOUNTER_CODE ?? '').trim();

const readJson = path => JSON.parse(readFileSync(path, 'utf8'));
const write = (path, content) => {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, path.endsWith('.html') ? withAnalytics(content, analytics) : content);
};

const template = readFileSync(join(dist, 'index.html'), 'utf8');
const latest = readJson(join(dataDir, 'latest.json'));

const entries = [baseUrl, baseUrl + 'fiyatlar/', baseUrl + 'harita/'].map(url => ({ url, lastmod: latest.updatedAt }));

// Ana sayfa: uygulama aynı kalır, sadece JavaScript'siz okunabilen özet eklenir.
write(join(dist, 'index.html'), applyBody(template, homeBody(latest)));
write(join(dist, 'fiyatlar', 'index.html'), allPricesPage(latest, baseUrl));
write(join(dist, 'harita', 'index.html'), mapPage(latest, baseUrl, CITY_COORDS));
// Derlemeden kopyalanan sayfalar da sayılsın (gömülü kutu hangi sitelerde kullanılıyor?).
for (const name of ['404.html', 'embed.html']) {
  const path = join(dist, name);
  if (existsSync(path)) write(path, readFileSync(path, 'utf8'));
}

let pages = 0;
let images = 0;
for (const slug of Object.keys(latest.prices)) {
  const historyPath = join(dataDir, 'history', `${slug}.json`);
  const history = existsSync(historyPath) ? readJson(historyPath) : [];
  for (const { key } of FUELS) {
    const page = cityPage({ latest, history, slug, fuel: key, baseUrl });
    if (!page) continue;
    // Paylaşım görseli (make_share_images.py) üretilmediyse genel kapak görseli kalır.
    if (existsSync(join(dist, 'og', `${slug}-${key}.png`))) images++;
    else page.image = undefined;
    write(join(dist, page.path, 'index.html'), applyBody(applyHead(template, page), page.body));
    entries.push({ url: page.url, lastmod: page.lastmod });
    pages++;
  }
}

write(join(dist, 'sitemap.xml'), sitemap(entries));
write(join(dist, 'robots.txt'), `User-agent: *\nAllow: /\n\nSitemap: ${baseUrl}sitemap.xml\n`);

console.log(`✓ ${pages} il/yakıt sayfası (${images} paylaşım görseli), tablo, harita ve sitemap (${entries.length} adres) yazıldı.` +
  (analytics ? ` Ziyaret sayacı: ${analytics}.goatcounter.com` : ''));
