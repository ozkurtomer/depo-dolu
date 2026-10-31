import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  EMPTY_LOG, addFill, monthlySpend, parseLog, realConsumption, removeVehicle, toCsv, upsertVehicle,
} from '../src/app/fuel-log.ts';
import { alarmState, validateTarget } from '../src/app/alarm.ts';
import { CITY_COORDS } from '../src/app/trip.ts';
import { applyHead, cityPage, mapPage, priceClasses, project, withAnalytics } from '../tools/seo-pages.mjs';

const latestData = JSON.parse(readFileSync(new URL('../../data/latest.json', import.meta.url), 'utf8'));
const car = { id: 'a', name: 'Aracım', fuel: 'motorin', consumption: 6 };
const fill = (id, at, liters, odometer, full = true, total = liters * 50) =>
  ({ id, vehicleId: 'a', at, liters, total, odometer, full });

test('gerçek tüketim tam dolumdan tam doluma hesaplanır, ara dolumlar dahil', () => {
  const fills = [
    fill('1', '2026-10-01T10:00:00Z', 40, 10_000),
    fill('2', '2026-10-05T10:00:00Z', 15, 10_200, false), // yarım dolum
    fill('3', '2026-10-10T10:00:00Z', 21, 10_600),
  ];
  const r = realConsumption(fills);
  assert.equal(r.km, 600);
  assert.equal(r.liters, 36); // 15 + 21; ilk tam dolumun litresi sayılmaz
  assert.equal(r.per100, 6);
});

test('km yazılmamış tam dolum zinciri koparır; tek dolumla sonuç yok', () => {
  assert.equal(realConsumption([fill('1', '2026-10-01T10:00:00Z', 40, 10_000)]), null);
  const broken = [
    fill('1', '2026-10-01T10:00:00Z', 40, 10_000),
    fill('2', '2026-10-05T10:00:00Z', 30, null),
    fill('3', '2026-10-10T10:00:00Z', 30, 10_500),
  ];
  assert.equal(realConsumption(broken), null);
  // Yanlış yazılmış km saçma sonuç verir; gösterilmez.
  assert.equal(realConsumption([fill('1', '2026-10-01T10:00:00Z', 40, 10_000), fill('2', '2026-10-02T10:00:00Z', 40, 10_010)]), null);
});

test('aylık harcama takvim ayına göre', () => {
  const now = new Date(2026, 10, 15);
  const fills = [
    fill('1', new Date(2026, 9, 20).toISOString(), 40, null, true, 2000),
    fill('2', new Date(2026, 10, 2).toISOString(), 30, null, true, 1500),
    fill('3', new Date(2026, 10, 10).toISOString(), 10, null, false, 500),
    fill('4', new Date(2026, 7, 10).toISOString(), 10, null, false, 999),
  ];
  assert.deepEqual(monthlySpend(fills, now), { thisMonth: 2000, lastMonth: 2000, thisLiters: 40 });
});

test('defter kaydı doğrulanır; bozuk ve sahipsiz kayıtlar atılır', () => {
  assert.deepEqual(parseLog(null), EMPTY_LOG);
  assert.deepEqual(parseLog({ vehicles: 'x' }), EMPTY_LOG);
  const log = parseLog({
    vehicles: [car, { id: 'b', name: 'Bozuk', fuel: 'mazot', consumption: 6 }],
    fills: [fill('1', '2026-10-02T00:00:00Z', 30, null), { ...fill('2', '2026-10-01T00:00:00Z', 30, null), vehicleId: 'yok' },
      { ...fill('3', '2026-10-01T00:00:00Z', -5, null) }],
    activeId: 'b',
  });
  assert.deepEqual(log.vehicles.map(v => v.id), ['a']);
  assert.deepEqual(log.fills.map(f => f.id), ['1']);
  assert.equal(log.activeId, 'a');
});

test('araç ekleme, silme ve CSV', () => {
  let log = upsertVehicle(EMPTY_LOG, car);
  log = upsertVehicle(log, { id: 'b', name: 'İş; "kamyonet"', fuel: 'benzin', consumption: 9 });
  assert.equal(log.activeId, 'b', 'yeni araç seçili olur');
  log = addFill(log, { ...fill('1', '2026-10-02T09:00:00Z', 30.5, 1200), vehicleId: 'b', total: 2440.25 });
  const csv = toCsv(log).trim().split('\n');
  assert.equal(csv[0], 'tarih;arac;litre;tutar_tl;litre_fiyati_tl;km_sayaci;tam_dolum');
  assert.equal(csv[1], '2026-10-02;"İş; ""kamyonet""";30,5;2440,25;80,01;1200;evet');
  log = removeVehicle(log, 'b');
  assert.equal(log.fills.length, 0);
  assert.equal(log.activeId, 'a');
});

test('fiyat alarmı sadece kendi il ve yakıtında çalışır', () => {
  const alarm = { city: 'bursa', fuel: 'motorin', below: 45 };
  assert.equal(alarmState(null, 'bursa', 'motorin', 50).kind, 'none');
  assert.equal(alarmState(alarm, 'bursa', 'lpg', 20).kind, 'elsewhere');
  assert.deepEqual(alarmState(alarm, 'bursa', 'motorin', 46.5), { kind: 'waiting', alarm, gap: 1.5 });
  assert.equal(alarmState(alarm, 'bursa', 'motorin', 45).kind, 'reached');
  assert.equal(alarmState(alarm, 'bursa', 'motorin', null).kind, 'unknown');
  assert.equal(validateTarget(44, 46), null);
  assert.match(validateTarget(47, 46), /zaten/);
  assert.match(validateTarget(null, 46), /Hedef/);
});

test('harita: her bölge sınırlar içinde, beş renk sınıfı', () => {
  for (const slug of Object.keys(latestData.prices)) {
    const [x, y] = project(CITY_COORDS[slug]);
    assert.ok(x > 0 && x < 1000 && y > 0 && y < 440, `${slug}: ${x},${y}`);
  }
  const { classOf } = priceClasses([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  assert.deepEqual([1, 3, 5, 7, 10].map(classOf), [0, 1, 2, 3, 4]);
  const html = mapPage(latestData, 'https://x.test/', CITY_COORDS);
  assert.equal((html.match(/<circle /g) ?? []).length, Object.keys(latestData.prices).length * 3);
  assert.match(html, /href="\.\.\/bursa\/motorin\/"/);
});

test('il sayfası kendi paylaşım görselini bağlar; sayaç isteğe bağlı', () => {
  const page = cityPage({ latest: latestData, history: [], slug: 'bursa', fuel: 'lpg', baseUrl: 'https://x.test/' });
  assert.equal(page.image.url, 'https://x.test/og/bursa-lpg.png');
  const html = applyHead('<head><meta property="og:image" content="old.png"></head>', page);
  assert.match(html, /og:image" content="https:\/\/x\.test\/og\/bursa-lpg\.png"/);
  assert.match(html, /og:image:width" content="1200"/);
  assert.equal(withAnalytics('<head></head>', ''), '<head></head>');
  assert.match(withAnalytics('<head></head>', 'depodolu'), /depodolu\.goatcounter\.com\/count/);
  assert.throws(() => withAnalytics('<head></head>', 'x"><script>'));
});
