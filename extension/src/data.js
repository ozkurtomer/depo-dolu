export const DATA_BASE = 'https://raw.githubusercontent.com/ozkurtomer/depo-dolu/main/data';
export const WEB_URL = 'https://ozkurtomer.github.io/depo-dolu/';
export const TELEGRAM_BOT_URL = 'https://t.me/depodolu_bot';
export const FUELS = Object.freeze([{ key: 'benzin', label: 'Benzin' }, { key: 'motorin', label: 'Motorin' }, { key: 'lpg', label: 'LPG' }]);
export const TANKS = Object.freeze([30, 40, 50, 60, 70]);
export const POLL_MINUTES = 15;
export const STATE_KEY = 'depodolu.extension.v1';
export const fuelLabel = key => FUELS.find(f => f.key === key)?.label ?? 'Yakıt';
export const money = value => new Intl.NumberFormat('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value);
export const whole = value => new Intl.NumberFormat('tr-TR', { maximumFractionDigits: 0 }).format(value);
export const topicFor = settings => settings.city ? `${settings.city}_${settings.fuel}` : null;
export const validPrice = price => typeof price === 'number' && Number.isFinite(price) && price > 0 && price <= 1000;
export const validDate = date => typeof date === 'string' && Number.isFinite(Date.parse(date));

export function validLatest(data) {
  if (!data || !validDate(data.updatedAt) || !data.prices || typeof data.prices !== 'object' || Array.isArray(data.prices)) return false;
  const entries = Object.entries(data.prices);
  return entries.length >= 75 && entries.length <= 100 && entries.every(([slug, city]) =>
    /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) && city && typeof city.name === 'string' && city.name.length < 100 &&
    FUELS.every(({ key }) => city[key] === null || validPrice(city[key])));
}

export function validHistory(data) {
  return Array.isArray(data) && data.length <= 1000 && data.every(entry => entry && validDate(entry.at) &&
    FUELS.every(({ key }) => entry[key] === null || validPrice(entry[key])));
}

export function series(history, fuel) {
  const points = [];
  for (const entry of [...history].sort((a, b) => Date.parse(a.at) - Date.parse(b.at))) {
    if (validPrice(entry[fuel]) && points.at(-1)?.price !== entry[fuel]) points.push({ at: entry.at, price: entry[fuel] });
  }
  return points;
}

export function comparison(latest, city, fuel) {
  const mine = latest?.prices?.[city]?.[fuel];
  if (!validPrice(mine)) return null;
  const all = Object.entries(latest.prices).map(([slug, row]) => ({ slug, name: row.name, price: row[fuel] }))
    .filter(row => validPrice(row.price)).sort((a, b) => a.price - b.price);
  const average = all.reduce((sum, row) => sum + row.price, 0) / all.length;
  return { average, difference: mine - average, cheapest: all[0], priciest: all.at(-1), count: all.length };
}

export function selectionUrl(city, fuel) {
  const url = new URL(WEB_URL);
  if (city) url.searchParams.set('il', city);
  url.searchParams.set('yakit', fuel);
  return url.href;
}

export function telegramUrl(city, fuel) {
  return city ? `${TELEGRAM_BOT_URL}?start=${city}_${fuel}` : TELEGRAM_BOT_URL;
}

export function fold(text) {
  return text.toLocaleLowerCase('tr-TR').replaceAll('ı', 'i').replaceAll('ş', 's').replaceAll('ğ', 'g')
    .replaceAll('ü', 'u').replaceAll('ö', 'o').replaceAll('ç', 'c').normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

export function ago(date, now = Date.now()) {
  if (!validDate(date)) return 'Henüz kontrol edilmedi';
  const minutes = Math.max(0, Math.floor((now - Date.parse(date)) / 60000));
  if (minutes < 1) return 'Az önce';
  if (minutes < 60) return `${minutes} dk önce`;
  if (minutes < 1440) return `${Math.floor(minutes / 60)} saat önce`;
  return new Intl.DateTimeFormat('tr-TR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }).format(new Date(date));
}

export const DEFAULT_SETTINGS = Object.freeze({ city: null, fuel: 'benzin', liters: 50, notify: false, badge: true, mode: 'live' });
export function settingsFrom(raw = {}) {
  if (!raw || typeof raw !== 'object') raw = {};
  return {
    city: typeof raw.city === 'string' && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(raw.city) ? raw.city : null,
    fuel: FUELS.some(f => f.key === raw.fuel) ? raw.fuel : DEFAULT_SETTINGS.fuel,
    liters: TANKS.includes(raw.liters) ? raw.liters : 50,
    notify: raw.notify === true, badge: raw.badge !== false, mode: raw.mode === 'demo' ? 'demo' : 'live',
  };
}

export function stateFrom(raw = {}) {
  if (!raw || typeof raw !== 'object') raw = {};
  const record = value => value && typeof value === 'object' && !Array.isArray(value) ? value : {};
  const cache = {};
  for (const mode of ['live', 'demo']) {
    const item = raw.cache?.[mode] ?? {};
    cache[mode] = { latest: validLatest(item.latest) ? item.latest : null,
      checkedAt: validDate(item.checkedAt) ? item.checkedAt : null,
      error: typeof item.error === 'string' ? item.error : null,
      histories: record(item.histories),
    };
  }
  const baseline = raw.baseline;
  return { version: 1, settings: settingsFrom(raw.settings), cache,
    baseline: baseline && typeof baseline.topic === 'string' && validPrice(baseline.price) && ['live', 'demo'].includes(baseline.mode) ? baseline : null,
    demo: { latest: validLatest(raw.demo?.latest) ? raw.demo.latest : null, offline: raw.demo?.offline === true, histories: record(raw.demo?.histories) },
    notificationError: typeof raw.notificationError === 'string' ? raw.notificationError : null,
    deliveries: Array.isArray(raw.deliveries) ? raw.deliveries.slice(-10) : [],
  };
}

export function snapshot(state) {
  const cache = state.cache[state.settings.mode];
  const city = Object.hasOwn(cache.latest?.prices ?? {}, state.settings.city) ? cache.latest.prices[state.settings.city] : null;
  const history = cache.histories[state.settings.city]?.entries;
  return { ...state, current: { ...cache, city, price: city?.[state.settings.fuel] ?? null,
    history: validHistory(history) ? history : [] } };
}

export function notificationChange(state, latest) {
  const { settings, baseline } = state;
  const city = latest.prices[settings.city];
  const price = city?.[settings.fuel];
  if (!settings.notify || !city || !validPrice(price)) return null;
  if (!baseline || baseline.topic !== topicFor(settings) || baseline.mode !== settings.mode || Math.abs(price - baseline.price) < 0.009) return null;
  return { city: settings.city, name: city.name, fuel: settings.fuel, old: baseline.price, new: price,
    at: latest.updatedAt, mode: settings.mode };
}

export function notificationMessage(change) {
  const delta = Math.round((change.new - change.old) * 100) / 100;
  return { title: `${change.mode === 'demo' ? '🧪 Deneme · ' : ''}${change.name}: ${fuelLabel(change.fuel)} ${delta > 0 ? 'zam' : 'indirim'}`,
    message: `${money(change.old)} → ${money(change.new)} ₺/L (${delta > 0 ? '+' : '−'}${money(Math.abs(delta))} ₺). 50 L depo: ${whole(change.new * 50)} ₺.` };
}

export function demoHistory(city, now) {
  return [21, 12, 5, 0].map((days, i) => ({ at: new Date(now - days * 86400000).toISOString(),
    ...Object.fromEntries(FUELS.map(({ key }) => [key, city[key] == null ? null : Math.round((city[key] - [1.8, 0.9, 1.2, 0][i]) * 100) / 100])) }));
}
