import { createController } from './controller.js';
import { DATA_BASE, STATE_KEY, POLL_MINUTES, money, fuelLabel, selectionUrl } from './data.js';

const ALARM = 'depodolu-price-check';
async function json(url) {
  const response = await fetch(url, { cache: 'no-store', signal: AbortSignal.timeout(12000), credentials: 'omit' });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.json();
}

const controller = createController({
  read: async () => (await chrome.storage.local.get(STATE_KEY))[STATE_KEY],
  write: state => chrome.storage.local.set({ [STATE_KEY]: state }),
  loadDemo: () => json(chrome.runtime.getURL('fixtures/latest.json')),
  fetchLatest: () => json(`${DATA_BASE}/latest.json?t=${Math.floor(Date.now() / 900000)}`),
  fetchHistory: slug => json(`${DATA_BASE}/history/${slug}.json?t=${Math.floor(Date.now() / 900000)}`),
  hasNotifications: () => chrome.permissions.contains({ permissions: ['notifications'] }),
  notify: (id, content) => chrome.notifications.create(id, { type: 'basic', iconUrl: 'icons/icon-128.png', ...content }),
  alarm: async enabled => {
    const existing = await chrome.alarms.get(ALARM);
    if (enabled && (!existing || existing.periodInMinutes !== POLL_MINUTES))
      await chrome.alarms.create(ALARM, { delayInMinutes: POLL_MINUTES, periodInMinutes: POLL_MINUTES });
    else if (!enabled && existing) await chrome.alarms.clear(ALARM);
  },
  badge: async state => {
    const price = state.current.price;
    const text = state.settings.badge && typeof price === 'number' ? (price < 100 ? price.toFixed(1).replace('.', ',') : price.toFixed(0)) : '';
    await chrome.action.setBadgeText({ text });
    await chrome.action.setBadgeBackgroundColor({ color: state.current.error ? '#627378' : state.settings.mode === 'demo' ? '#9a7300' : '#0e3b4a' });
    const title = state.current.city && price != null
      ? `${state.settings.mode === 'demo' ? 'DENEME · ' : ''}${state.current.city.name} · ${fuelLabel(state.settings.fuel)} ${money(price)} ₺/L${state.current.error ? ' · Önbellek' : ''}` : 'Depo Dolu · İlini seç';
    await chrome.action.setTitle({ title });
  },
});

chrome.runtime.onMessage.addListener((message, sender, respond) => {
  if (sender.id !== chrome.runtime.id || !message || typeof message.type !== 'string') return false;
  controller.handle(message.type, message.payload).then(state => respond({ ok: true, state }),
    error => respond({ ok: false, error: error.message }));
  return true;
});
chrome.runtime.onInstalled.addListener(() => { void controller.handle('init'); });
chrome.runtime.onStartup.addListener(() => { void controller.handle('init').then(state => state.settings.notify && controller.handle('refresh')); });
chrome.alarms.onAlarm.addListener(alarm => { if (alarm.name === ALARM) void controller.handle('refresh', { force: true }); });
chrome.permissions.onRemoved.addListener(permissions => {
  if (permissions.permissions?.includes('notifications')) void controller.handle('notify', { value: false });
});
async function onNotificationClick(id) {
  const topic = /^dd:([a-z0-9-]+)_(benzin|motorin|lpg):/.exec(id);
  if (topic) await chrome.tabs.create({ url: selectionUrl(topic[1], topic[2]) });
  if (id.startsWith('dd:')) await chrome.notifications.clear(id);
}
let notificationListener = false;
function registerNotificationListener() {
  if (!notificationListener && chrome.notifications?.onClicked) {
    chrome.notifications.onClicked.addListener(onNotificationClick);
    notificationListener = true;
  }
}
registerNotificationListener();
chrome.permissions.onAdded.addListener(registerNotificationListener);
void controller.handle('init').catch(error => console.error('Depo Dolu başlatılamadı', error));
