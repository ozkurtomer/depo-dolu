import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createController } from '../src/controller.js';
import { STATE_KEY, validLatest, stateFrom, series, selectionUrl, fold } from '../src/data.js';

const fixture = JSON.parse(await readFile(new URL('../fixtures/latest.json', import.meta.url), 'utf8'));
function harness(initial) {
  let stored = initial ? structuredClone(initial) : undefined;
  let latest = structuredClone(fixture);
  let permitted = true, offline = false, notificationFailure = false, fetchCount = 0;
  const notifications = [], alarms = [];
  const io = {
    now: () => Date.parse('2026-10-25T19:00:00Z'),
    read: async () => structuredClone(stored),
    write: async value => { stored = structuredClone(value); },
    fetchLatest: async () => { fetchCount++; if (offline) throw new Error('offline'); return structuredClone(latest); },
    fetchHistory: async () => { if (offline) throw new Error('offline'); return [{ at: latest.updatedAt, ...latest.prices.bursa }]; },
    loadDemo: async () => structuredClone(fixture),
    hasNotifications: async () => permitted,
    notify: async (id, content) => { if (notificationFailure) throw new Error('provider failed'); notifications.push({ id, ...content }); },
    alarm: async enabled => { alarms.push(enabled); },
  };
  let controller = createController(io);
  return { send: (...args) => controller.handle(...args), notifications, alarms,
    stored: () => structuredClone(stored),
    price: (value, fuel = 'motorin', city = 'bursa') => { latest.prices[city][fuel] = value; },
    offline: value => { offline = value; }, permission: value => { permitted = value; },
    failNotification: value => { notificationFailure = value; },
    restart: () => { controller = createController(io); },
    response: value => { latest = structuredClone(value); }, fetchCount: () => fetchCount,
  };
}
async function ready(h, notify = false) {
  await h.send('init'); await h.send('refresh', { force: true });
  await h.send('select', { city: 'bursa', fuel: 'motorin' });
  if (notify) await h.send('notify', { value: true });
}

test('first open and enabling notifications never announce a historical change', async () => {
  const h = harness(); await ready(h, true);
  assert.equal(h.notifications.length, 0);
  assert.equal(h.stored().baseline.price, fixture.prices.bursa.motorin);
  assert.equal(h.alarms.at(-1), true);
});
test('a detected change is delivered once, including after a service worker restart', async () => {
  const h = harness(); await ready(h, true);
  h.price(99.1); await h.send('refresh', { force: true });
  h.restart(); await h.send('refresh', { force: true });
  assert.equal(h.notifications.length, 1);
  assert.match(h.notifications[0].message, /97,80 → 99,10/);
  assert.equal(h.stored().baseline.price, 99.1);
});
test('failed notification delivery is retried and does not advance the baseline', async () => {
  const h = harness(); await ready(h, true); h.price(99.1); h.failNotification(true);
  await h.send('refresh', { force: true });
  assert.equal(h.stored().baseline.price, 97.8);
  assert.equal(h.stored().cache.live.latest.prices.bursa.motorin, 99.1);
  assert.ok(h.stored().notificationError);
  h.failNotification(false); h.restart(); await h.send('refresh', { force: true });
  assert.equal(h.notifications.length, 1);
  assert.equal(h.stored().notificationError, null);
});
test('switching city or fuel resets the baseline without a false alarm', async () => {
  const h = harness(); await ready(h, true);
  await h.send('select', { city: 'izmir', fuel: 'benzin' });
  assert.equal(h.notifications.length, 0);
  assert.equal(h.stored().baseline.topic, 'izmir_benzin');
});
test('offline fallback preserves both data and successful-check timestamp', async () => {
  const h = harness(); await ready(h, true); const previous = h.stored(); h.offline(true);
  const state = await h.send('refresh', { force: true });
  assert.ok(state.current.error);
  assert.equal(state.current.checkedAt, previous.cache.live.checkedAt);
  assert.equal(state.current.price, 97.8);
  assert.equal(h.notifications.length, 0);
});
test('first network failure is recoverable without corrupting defaults', async () => {
  const h = harness(null); h.offline(true);
  let state = await h.send('refresh', { force: true });
  assert.equal(state.current.latest, null); assert.ok(state.current.error);
  h.offline(false); state = await h.send('refresh', { force: true });
  assert.equal(state.current.error, null); assert.ok(state.current.latest);
});
test('revoked permission turns off alerts and removes polling', async () => {
  const h = harness(); await ready(h, true); h.permission(false);
  const state = await h.send('refresh', { force: true });
  assert.equal(state.settings.notify, false);
  assert.equal(state.baseline, null);
  assert.equal(h.alarms.at(-1), false);
});
test('permission denied cannot be stored as notifications enabled', async () => {
  const h = harness(); await ready(h); h.permission(false);
  await assert.rejects(h.send('notify', { value: true }), /izni/);
  assert.equal(h.stored().settings.notify, false);
});
test('turning off notifications clears the baseline and background alarm', async () => {
  const h = harness(); await ready(h, true);
  const state = await h.send('notify', { value: false });
  assert.equal(state.baseline, null); assert.equal(h.alarms.at(-1), false);
});
test('demo changes cannot modify the live cache or be invoked in live mode', async () => {
  const h = harness(); await ready(h, true);
  await assert.rejects(h.send('demo-change', { delta: 1.3 }), /deneme modu/);
  await h.send('mode', { value: 'demo' });
  await h.send('demo-change', { delta: 1.3 });
  assert.equal(h.stored().cache.live.latest.prices.bursa.motorin, 97.8);
  assert.equal(h.stored().cache.demo.latest.prices.bursa.motorin, 99.1);
  assert.match(h.notifications[0].title, /Deneme/);
  await h.send('mode', { value: 'live' });
  assert.equal(h.notifications.length, 1);
});
test('demo offline scenario keeps sample prices clearly in demo mode', async () => {
  const h = harness(); await h.send('mode', { value: 'demo' }); await h.send('select', { city: 'bursa' });
  const state = await h.send('demo-offline', { value: true });
  assert.equal(state.settings.mode, 'demo'); assert.ok(state.current.error); assert.ok(state.current.latest);
  await h.send('demo-reset'); assert.equal(h.stored().demo.offline, false);
});
test('history failures retain a previous history and expose an error', async () => {
  const h = harness(); await ready(h); await h.send('history', { force: true }); h.offline(true);
  const state = await h.send('history', { force: true });
  assert.equal(state.current.history.length, 1);
  assert.ok(state.current.histories.bursa.error);
});
test('rapid selections are serialized and the last selection is persisted', async () => {
  const h = harness(); await ready(h);
  await Promise.all([h.send('select', { city: 'izmir' }), h.send('select', { city: 'ankara' })]);
  assert.equal(h.stored().settings.city, 'ankara');
});
test('unknown/prototype slugs and arbitrary test values are rejected', async () => {
  const h = harness(); await ready(h);
  for (const city of ['unknown', '__proto__', 'constructor']) await assert.rejects(h.send('select', { city }));
  await assert.rejects(h.send('liters', { value: 999 }));
  await assert.rejects(h.send('arbitrary-fetch', { url: 'https://example.invalid' }));
});
test('data validation, series and sharing keep the public contract', () => {
  assert.equal(validLatest(fixture), true);
  const bad = structuredClone(fixture); bad.prices.bursa.motorin = '<script>';
  assert.equal(validLatest(bad), false);
  assert.equal(validLatest({ ...fixture, prices: { bursa: fixture.prices.bursa } }), false);
  assert.deepEqual(series([{ at: '2026-10-24T00:00:00Z', motorin: 98 }, { at: '2026-10-25T00:00:00Z', motorin: 98 }], 'motorin'), [{ at: '2026-10-24T00:00:00Z', price: 98 }]);
  assert.equal(new URL(selectionUrl('istanbul-avrupa', 'lpg')).searchParams.get('il'), 'istanbul-avrupa');
  assert.equal(fold('Şanlıurfa Iğdır İZMİR'), 'sanliurfa igdir izmir');
  assert.equal(stateFrom(null).settings.city, null); assert.ok(STATE_KEY);
});

test('partial network data never replaces the last complete snapshot', async () => {
  const h = harness(); await ready(h, true);
  h.response({ ...fixture, prices: { bursa: fixture.prices.bursa } });
  const state = await h.send('refresh', { force: true });
  assert.ok(state.current.error);
  assert.equal(Object.keys(state.current.latest.prices).length, 82);
  assert.equal(h.notifications.length, 0);
});
test('reopening during the cache interval does not poll the provider again', async () => {
  const h = harness(); await ready(h); const count = h.fetchCount();
  h.restart(); await h.send('init'); await h.send('refresh'); await h.send('refresh');
  assert.equal(h.fetchCount(), count);
});
