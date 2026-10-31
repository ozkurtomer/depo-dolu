// ng build'den sonra çalışır: her il ve yakıt için statik sayfa, tüm iller tablosu,
// sitemap.xml ve robots.txt üretir.
//   node tools/prerender.mjs --dist dist/browser --data ../data --base https://ozkurtomer.github.io/depo-dolu/
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { FUELS, allPricesPage, applyBody, applyHead, cityPage, homeBody, sitemap } from './seo-pages.mjs';

const arg = (name, fallback) => {
  const i = process.argv.indexOf(name);
  return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : fallback;
};

const dist = arg('--dist', 'dist/browser');
const dataDir = arg('--data', '../data');
let baseUrl = arg('--base', 'https://ozkurtomer.github.io/depo-dolu/');
if (!baseUrl.endsWith('/')) baseUrl += '/';

const readJson = path => JSON.parse(readFileSync(path, 'utf8'));
const write = (path, content) => {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, content);
};

const template = readFileSync(join(dist, 'index.html'), 'utf8');
const latest = readJson(join(dataDir, 'latest.json'));

const entries = [{ url: baseUrl, lastmod: latest.updatedAt }, { url: baseUrl + 'fiyatlar/', lastmod: latest.updatedAt }];

// Ana sayfa: uygulama aynı kalır, sadece JavaScript'siz okunabilen özet eklenir.
write(join(dist, 'index.html'), applyBody(template, homeBody(latest)));
write(join(dist, 'fiyatlar', 'index.html'), allPricesPage(latest, baseUrl));

let pages = 0;
for (const slug of Object.keys(latest.prices)) {
  const historyPath = join(dataDir, 'history', `${slug}.json`);
  const history = existsSync(historyPath) ? readJson(historyPath) : [];
  for (const { key } of FUELS) {
    const page = cityPage({ latest, history, slug, fuel: key, baseUrl });
    if (!page) continue;
    write(join(dist, page.path, 'index.html'), applyBody(applyHead(template, page), page.body));
    entries.push({ url: page.url, lastmod: page.lastmod });
    pages++;
  }
}

write(join(dist, 'sitemap.xml'), sitemap(entries));
write(join(dist, 'robots.txt'), `User-agent: *\nAllow: /\n\nSitemap: ${baseUrl}sitemap.xml\n`);

console.log(`✓ ${pages} il/yakıt sayfası, tüm iller tablosu ve sitemap (${entries.length} adres) yazıldı.`);
