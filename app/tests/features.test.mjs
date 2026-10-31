import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  CITY_COORDS, availableRanges, estimateRoadKm, fillAdvice, monthlyBudget, seriesChange, sliceSeries, tripCost,
} from '../src/app/trip.ts';
import { upcoming } from '../src/app/announcements.ts';
import { cityPagePath, priceShareUrl, selectionFromUrl } from '../src/app/share.ts';
import { applyBody, applyHead, cityPage, fuelChanges, sitemap } from '../tools/seo-pages.mjs';

const latestData = JSON.parse(readFileSync(new URL('../../data/latest.json', import.meta.url), 'utf8'));
const day = 86_400_000;

test('her bölgenin koordinatı var, mesafe tahmini makul', () => {
  for (const slug of Object.keys(latestData.prices)) assert.ok(CITY_COORDS[slug], `${slug} koordinatı yok`);
  const ist = estimateRoadKm('istanbul-avrupa', 'ankara');
  assert.ok(ist >= 400 && ist <= 520, `İstanbul–Ankara ${ist} km`);
  const izm = estimateRoadKm('izmir', 'antalya');
  assert.ok(izm >= 350 && izm <= 520, `İzmir–Antalya ${izm} km`);
  assert.equal(estimateRoadKm('bursa', 'bursa'), 0);
  assert.equal(estimateRoadKm('bursa', 'atlantis'), null);
});

test('yolculuk maliyeti: gidiş-dönüş ve kişi başı', () => {
  const r = tripCost({ km: 450, consumption: 6, price: 100, roundTrip: true, people: 3 });
  assert.equal(r.km, 900);
  assert.equal(r.liters, 54);
  assert.equal(r.cost, 5400);
  assert.equal(r.perPerson, 1800);
  assert.equal(r.perKm, 6);
  assert.equal(tripCost({ km: 0, consumption: 6, price: 100, roundTrip: false, people: 1 }), null);
  assert.equal(tripCost({ km: 10, consumption: 6, price: 100, roundTrip: false, people: 0 }).perPerson, 60);
});

test('nerede doldurmalı', () => {
  assert.deepEqual(fillAdvice(98, 97, 50), { where: 'destination', saving: 50 });
  assert.deepEqual(fillAdvice(97, 98.5, 40), { where: 'origin', saving: 60 });
  assert.equal(fillAdvice(97, 97, 50).where, 'same');
});

test('aylık bütçe ve 1 ₺ zamın etkisi', () => {
  const b = monthlyBudget(1200, 7, 80);
  assert.equal(b.liters, 84);
  assert.equal(b.monthly, 6720);
  assert.equal(b.yearly, 80640);
  assert.equal(b.perLiraHike, 84);
  assert.equal(monthlyBudget(1200, 7, 0), null);
});

test('grafik aralığı başlangıç fiyatını korur ve değişimi hesaplar', () => {
  const now = new Date('2026-10-31T12:00:00Z');
  const pts = [
    { at: new Date(now - 200 * day), price: 90 },
    { at: new Date(now - 60 * day), price: 95 },
    { at: new Date(now - 10 * day), price: 97 },
  ];
  const month = sliceSeries(pts, 30, now);
  assert.equal(month.length, 2);
  assert.equal(month[0].price, 95);
  assert.equal(month[0].at.getTime(), now - 30 * day);
  assert.deepEqual(seriesChange(month).delta, 2);
  assert.equal(sliceSeries(pts, null, now), pts);
  assert.deepEqual(availableRanges(pts, now).map(r => r.key), ['1a', '3a', 'all']);
  assert.deepEqual(availableRanges(pts.slice(2), now), []);
});

test('duyurular: geçersiz, kaynaksız ve süresi geçmiş olanlar gösterilmez', () => {
  const now = new Date('2026-10-31T12:00:00Z');
  const base = { id: 'a', fuel: 'motorin', change: 1.2, source: 'EPDK', publishedAt: '2026-10-31T10:00:00Z' };
  const items = [
    { ...base, id: 'later', effectiveAt: '2026-11-02T21:00:00Z' },
    { ...base, id: 'soon', effectiveAt: '2026-10-31T21:00:00Z' },
    { ...base, id: 'grace', effectiveAt: '2026-10-31T10:30:00Z' },
    { ...base, id: 'old', effectiveAt: '2026-10-30T21:00:00Z' },
    { ...base, id: 'nosource', source: ' ', effectiveAt: '2026-11-01T21:00:00Z' },
    { ...base, id: 'badfuel', fuel: 'kerosen', effectiveAt: '2026-11-01T21:00:00Z' },
    { ...base, id: 'http', sourceUrl: 'http://x', effectiveAt: '2026-11-01T21:00:00Z' },
    { ...base, id: 'zero', change: 0, effectiveAt: '2026-11-01T21:00:00Z' },
  ];
  assert.deepEqual(upcoming({ items }, now).map(a => a.id), ['grace', 'soon', 'later']);
  assert.deepEqual(upcoming(null, now), []);
  assert.deepEqual(upcoming({ items: 'x' }, now), []);
});

test('statik il sayfası yolu seçimi geri getirir, eski sorgu bağlantısı da çalışır', () => {
  const share = priceShareUrl('https://ozkurtomer.github.io/depo-dolu/', 'bursa', 'motorin');
  assert.equal(share, 'https://ozkurtomer.github.io/depo-dolu/bursa/motorin/');
  assert.deepEqual(selectionFromUrl(new URL(share), latestData), { city: 'bursa', fuel: 'motorin' });
  assert.deepEqual(selectionFromUrl(new URL('https://x.test/depo-dolu/?il=izmir&yakit=lpg'), latestData), { city: 'izmir', fuel: 'lpg' });
  assert.equal(selectionFromUrl(new URL('https://x.test/depo-dolu/fiyatlar/'), latestData), null);
  assert.equal(selectionFromUrl(new URL('https://x.test/depo-dolu/'), latestData), null);
  assert.equal(cityPagePath('van', 'lpg'), 'van/lpg/');
});

test('SEO sayfası başlık, açıklama, kanonik adres ve okunur içerik taşır', () => {
  const latest = { updatedAt: '2026-10-28T00:00:00Z', prices: {
    bursa: { name: 'Bursa', benzin: 77.5, motorin: 97.9, lpg: 40.6, changedAt: '2026-10-28T00:00:00Z' },
    izmir: { name: 'İzmir', benzin: 77.6, motorin: 98.3, lpg: 41.2, changedAt: '2026-10-27T00:00:00Z' },
  } };
  const history = [
    { at: '2026-10-25T18:00:00Z', benzin: 77.4, motorin: 97.8, lpg: 40.6 },
    { at: '2026-10-28T00:00:00Z', benzin: 77.5, motorin: 97.9, lpg: 40.6 },
  ];
  const page = cityPage({ latest, history, slug: 'bursa', fuel: 'motorin', baseUrl: 'https://x.test/dd/' });
  assert.equal(page.title, 'Bursa motorin fiyatı bugün: 97,90 ₺ | Depo Dolu');
  assert.match(page.description, /Benzin 77,50 ₺, LPG 40,60 ₺/);
  assert.match(page.body, /Türkiye ortalamasından 0,20 ₺ ucuz/);
  assert.match(page.body, /href="izmir\/motorin\/"/);
  assert.equal(cityPage({ latest, history, slug: 'yok', fuel: 'motorin', baseUrl: '' }), null);

  const template = '<html><head><title>X</title>\n<meta name="description"\n content="eski">' +
    '<meta property="og:title" content="eski"><link rel="canonical" href="eski"></head><body><app-root></app-root></body></html>';
  const html = applyBody(applyHead(template, page), page.body);
  assert.match(html, /<title>Bursa motorin fiyatı bugün: 97,90 ₺ \| Depo Dolu<\/title>/);
  assert.match(html, /<link rel="canonical" href="https:\/\/x.test\/dd\/bursa\/motorin\/">/);
  assert.match(html, /<meta property="og:url" content="https:\/\/x.test\/dd\/bursa\/motorin\/">/);
  assert.doesNotMatch(html, /eski/);
  assert.match(html, /<app-root>\s*<article class="dd-static">/);
  assert.match(html, /BreadcrumbList/);

  assert.deepEqual(fuelChanges(history, 'lpg').length, 1);
  assert.match(sitemap([{ url: 'https://x.test/a&b', lastmod: '2026-10-28T00:00:00Z' }]), /<loc>https:\/\/x.test\/a&amp;b<\/loc><lastmod>2026-10-28<\/lastmod>/);
});

test('il adındaki özel karakterler HTML olarak kaçırılır', () => {
  const latest = { updatedAt: '2026-10-28T00:00:00Z', prices: {
    x: { name: '<script>', benzin: 1, motorin: 2, lpg: 3, changedAt: '2026-10-28T00:00:00Z' },
  } };
  const page = cityPage({ latest, history: [], slug: 'x', fuel: 'benzin', baseUrl: 'https://x.test/' });
  assert.doesNotMatch(page.body, /<script>/);
  assert.match(page.body, /&lt;script&gt;/);
});
