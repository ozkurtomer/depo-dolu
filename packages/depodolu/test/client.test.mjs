import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { DepoDoluError, createClient } from '../index.js';

// Gerçek ağ yerine repodaki data/ klasörü.
const dataDir = new URL('../../../data/', import.meta.url);
const localFetch = async url => {
  const path = new URL(url).pathname.replace(/^\/data\//, '');
  try {
    const body = await readFile(new URL(path, dataDir), 'utf8');
    return { ok: true, status: 200, json: async () => JSON.parse(body) };
  } catch {
    return { ok: false, status: 404, json: async () => null };
  }
};
const client = createClient({ baseUrl: 'https://example.test/data', fetch: localFetch });

test('il ve yakıt fiyatı döner', async () => {
  const r = await client.getPrice('bursa', 'motorin');
  assert.equal(r.name, 'Bursa');
  assert.ok(r.price > 0);
});

test('bilinmeyen il, yakıt, prototip anahtarı ve yol hilesi hata verir', async () => {
  await assert.rejects(client.getPrice('atlantis', 'benzin'), DepoDoluError);
  await assert.rejects(client.getPrice('__proto__', 'benzin'), DepoDoluError);
  await assert.rejects(client.getPrice('bursa', 'kerosen'), DepoDoluError);
  await assert.rejects(client.getHistory('../latest'), DepoDoluError);
});

test('il listesi Türkçe alfabetik', async () => {
  const cities = await client.getCities();
  assert.equal(cities.length, 82);
  const names = cities.map(c => c.name);
  assert.ok(names.indexOf('Bursa') < names.indexOf('Çanakkale'));
  assert.ok(names.indexOf('Çanakkale') < names.indexOf('Denizli'));
});

test('geçmiş, değişiklikler ve duyurular okunur', async () => {
  assert.ok(Array.isArray(await client.getHistory('bursa')));
  assert.ok(Array.isArray(await client.getChanges()));
  assert.ok(Array.isArray(await client.getAnnouncements()));
});

test('HTTP hatası anlaşılır mesajla döner', async () => {
  await assert.rejects(client.getHistory('yok'), /HTTP 404/);
});
