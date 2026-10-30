import { createController } from './controller.js';
import { STATE_KEY, snapshot, stateFrom } from './data.js';

export const isExtension = Boolean(globalThis.chrome?.runtime?.id);
const listeners = new Set();
const PREVIEW_KEY = `${STATE_KEY}.preview`;
let preview;

if (!isExtension) {
  const read = async () => {
    try { return JSON.parse(localStorage.getItem(PREVIEW_KEY) || 'null'); } catch { return null; }
  };
  preview = createController({
    read,
    write: async state => {
      localStorage.setItem(PREVIEW_KEY, JSON.stringify(state));
      for (const listener of listeners) listener(snapshot(state));
      window.dispatchEvent(new CustomEvent('depodolu-preview-state', { detail: snapshot(state) }));
    },
    loadDemo: async () => (await fetch('./fixtures/latest.json')).json(),
    fetchLatest: async () => { throw new Error('Önizleme yalnızca örnek veri kullanır'); },
    fetchHistory: async () => { throw new Error('Önizleme yalnızca örnek veri kullanır'); },
    hasNotifications: async () => true,
    notify: async (id, content) => {
      window.dispatchEvent(new CustomEvent('depodolu-preview-notification', { detail: { id, ...content } }));
    },
    alarm: async () => {},
  });
  window.addEventListener('storage', event => {
    if (event.key === PREVIEW_KEY) {
      for (const listener of listeners) listener(snapshot(stateFrom(JSON.parse(event.newValue || 'null'))));
    }
  });
}

export async function send(type, payload) {
  if (!isExtension) {
    if (type === 'init') {
      await preview.handle('init');
      const state = await preview.handle('get');
      if (state.settings.mode !== 'demo') return preview.handle('mode', { value: 'demo' });
    }
    if (type === 'mode' && payload.value === 'live') throw new Error('Canlı modu Chrome’a yükledikten sonra deneyebilirsin.');
    return preview.handle(type, payload);
  }
  const result = await chrome.runtime.sendMessage({ type, payload });
  if (!result?.ok) throw new Error(result?.error || 'Eklentiye bağlanılamadı. Sayfayı tekrar aç.');
  return result.state;
}

export function onState(callback) {
  if (isExtension) chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'local' && changes[STATE_KEY]?.newValue) callback(snapshot(stateFrom(changes[STATE_KEY].newValue)));
  });
  else listeners.add(callback);
}

export async function requestNotifications() {
  if (!isExtension) return true; // Yalnızca yerel önizlemede taklit edilir; OS bildirimi göstermez.
  return chrome.permissions.request({ permissions: ['notifications'] });
}
export function openPage(path) {
  const url = isExtension ? chrome.runtime.getURL(path) : new URL(path, window.location.href).href;
  if (isExtension) return chrome.tabs.create({ url });
  window.open(url, '_blank', 'noopener');
}
