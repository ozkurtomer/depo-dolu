import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { STATE_KEY } from '../src/data.js';

function event() { const listeners = []; return { listeners, addListener(fn) { listeners.push(fn); }, async fire(...args) { for (const fn of listeners) await fn(...args); } }; }

test('service worker wiring: optional permission, alarm, persisted change and click URL', async () => {
  let latest = JSON.parse(await readFile(new URL('../fixtures/latest.json', import.meta.url), 'utf8'));
  const data = {}, alarms = new Map(), deliveries = [], tabs = [], badges = [];
  let granted = false;
  const notificationApi = { onClicked: event(), create: async (id, options) => { deliveries.push({ id, options }); return id; }, clear: async () => true };
  globalThis.chrome = {
    runtime: { id: 'test-extension', getURL: path => `https://extension.invalid/${path}`, onMessage: event(), onInstalled: event(), onStartup: event() },
    storage: { local: { get: async key => ({ [key]: structuredClone(data[key]) }), set: async patch => Object.assign(data, structuredClone(patch)) } },
    alarms: { get: async name => alarms.get(name), create: async (name, alarm) => { alarms.set(name, alarm); }, clear: async name => alarms.delete(name), onAlarm: event() },
    permissions: { contains: async () => granted, onAdded: event(), onRemoved: event() },
    action: { setBadgeText: async value => { badges.push(value); }, setBadgeBackgroundColor: async () => {}, setTitle: async () => {} },
    tabs: { create: async options => { tabs.push(options); } },
  };
  globalThis.fetch = async () => new Response(JSON.stringify(latest), { status: 200 });
  await import('../src/service-worker.js');
  const handler = chrome.runtime.onMessage.listeners[0];
  assert.equal(handler({ type: 'refresh' }, { id: 'another-extension' }, () => {}), false);
  const message = (type, payload) => new Promise(resolve => { assert.equal(handler({ type, payload }, { id: 'test-extension' }, resolve), true); });
  await message('refresh', { force: true });
  await message('select', { city: 'bursa', fuel: 'motorin' });
  assert.equal(alarms.size, 0);
  const denied = await message('notify', { value: true });
  assert.equal(denied.ok, false);
  assert.equal(data[STATE_KEY].settings.notify, false);

  chrome.notifications = notificationApi;
  granted = true;
  await chrome.permissions.onAdded.fire({ permissions: ['notifications'] });
  assert.equal(notificationApi.onClicked.listeners.length, 1);
  assert.equal((await message('notify', { value: true })).ok, true);
  assert.equal(alarms.get('depodolu-price-check').periodInMinutes, 15);
  latest.prices.bursa.motorin = 99.1;
  await chrome.alarms.onAlarm.fire({ name: 'depodolu-price-check' });
  await message('get');
  assert.equal(deliveries.length, 1);
  assert.match(deliveries[0].options.message, /99,10/);
  assert.ok(badges.some(item => item.text === '99.1'));
  await notificationApi.onClicked.fire(deliveries[0].id);
  assert.equal(new URL(tabs[0].url).searchParams.get('il'), 'bursa');
  granted = false;
  await chrome.permissions.onRemoved.fire({ permissions: ['notifications'] });
  await message('get');
  assert.equal(data[STATE_KEY].settings.notify, false);
  assert.equal(alarms.size, 0);
  delete globalThis.chrome;
});
