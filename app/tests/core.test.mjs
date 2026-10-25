import { test } from 'node:test';
import assert from 'node:assert/strict';
import { TopicSubscriptions } from '../src/app/subscription-state.ts';
import { isLatestFile } from '../src/app/price-data.ts';
import { priceShareUrl, selectionFromUrl } from '../src/app/share.ts';

const latest = { updatedAt: '2026-10-25T18:00:00Z', prices: {
  bursa: { name: 'Bursa', benzin: 77.4, motorin: 97.8, lpg: 40.6 },
} };

test('paylaşım bağlantısı il ve yakıt seçimini geri getirir', () => {
  const url = new URL(priceShareUrl('https://example.com/app/?old=1#old', 'bursa', 'motorin'));
  assert.deepEqual(selectionFromUrl(url, latest), { city: 'bursa', fuel: 'motorin' });
  assert.equal(url.searchParams.has('old'), false);
  assert.equal(url.hash, '');
});

test('tanınmayan il, yakıt ve prototip anahtarı paylaşım seçimi olamaz', () => {
  for (const query of ['il=unknown&yakit=benzin', 'il=bursa&yakit=unknown', 'il=__proto__&yakit=benzin', 'il=bursa'])
    assert.equal(selectionFromUrl(new URL(`https://example.com/?${query}`), latest), null);
});

test('bozuk veya sayısal olmayan fiyat verisi kullanılmaz', () => {
  assert.equal(isLatestFile(latest), true);
  for (const value of [null, {}, { ...latest, updatedAt: 'bad' }, { ...latest, prices: [] },
    { ...latest, prices: { bursa: { ...latest.prices.bursa, motorin: '97.8' } } }])
    assert.equal(isLatestFile(value), false);
});

test('abonelik temizliği başarısız olursa sonraki denemeye saklanır', async () => {
  let topics = ['bursa_motorin'];
  const calls = [];
  let fail = true;
  const subscriptions = new TopicSubscriptions({
    subscribe: async topic => { calls.push(`+${topic}`); },
    unsubscribe: async topic => { calls.push(`-${topic}`); if (fail) throw new Error('offline'); },
  }, { read: async () => topics, write: async next => { topics = [...next]; } });
  await assert.rejects(subscriptions.reconcile('izmir_benzin'));
  assert.deepEqual(topics, ['bursa_motorin', 'izmir_benzin']);
  fail = false;
  await subscriptions.reconcile(null);
  assert.deepEqual(topics, []);
  assert.deepEqual(calls, ['+izmir_benzin', '-bursa_motorin', '-bursa_motorin', '-izmir_benzin']);
});

test('yeni abonelik başarısız olunca eskisi silinmez', async () => {
  let topics = ['bursa_motorin'];
  let removed = false;
  const subscriptions = new TopicSubscriptions({
    subscribe: async () => { throw new Error('offline'); },
    unsubscribe: async () => { removed = true; },
  }, { read: async () => topics, write: async next => { topics = [...next]; } });
  await assert.rejects(subscriptions.reconcile('izmir_benzin'));
  assert.equal(removed, false);
  assert.ok(topics.includes('bursa_motorin'));
});

test('hızlı seçimler sırayla işlenir ve son seçim tek abonelik kalır', async () => {
  let topics = [];
  const actual = new Set();
  const subscriptions = new TopicSubscriptions({
    subscribe: async topic => { await Promise.resolve(); actual.add(topic); },
    unsubscribe: async topic => { actual.delete(topic); },
  }, { read: async () => topics, write: async next => { topics = [...next]; } });
  await Promise.all([subscriptions.reconcile('bursa_motorin'), subscriptions.reconcile('izmir_benzin')]);
  assert.deepEqual([...actual], ['izmir_benzin']);
  assert.deepEqual(topics, ['izmir_benzin']);
});
