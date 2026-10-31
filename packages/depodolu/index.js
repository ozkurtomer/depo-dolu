// Depo Dolu istemcisi: herkese açık JSON dosyalarını okur. Bağımlılık yok, anahtar yok.
// Node 18+ ve tarayıcılarda çalışır (global fetch).

export const DEFAULT_BASE_URL = 'https://raw.githubusercontent.com/ozkurtomer/depo-dolu/main/data/';
export const FUELS = ['benzin', 'motorin', 'lpg'];

export class DepoDoluError extends Error {
  constructor(message, options) {
    super(message, options);
    this.name = 'DepoDoluError';
  }
}

/**
 * @param {{ baseUrl?: string, fetch?: typeof fetch, timeoutMs?: number }} [options]
 */
export function createClient(options = {}) {
  let baseUrl = options.baseUrl ?? DEFAULT_BASE_URL;
  if (!baseUrl.endsWith('/')) baseUrl += '/';
  const doFetch = options.fetch ?? globalThis.fetch;
  const timeoutMs = options.timeoutMs ?? 15_000;
  if (typeof doFetch !== 'function') throw new DepoDoluError('fetch bulunamadı; Node 18+ kullan ya da options.fetch ver.');

  async function get(path) {
    const url = `${baseUrl}${path}?t=${Math.floor(Date.now() / 60_000)}`;
    let res;
    try {
      res = await doFetch(url, { signal: AbortSignal.timeout(timeoutMs) });
    } catch (cause) {
      throw new DepoDoluError(`Veri alınamadı: ${path}`, { cause });
    }
    if (!res.ok) throw new DepoDoluError(`Veri alınamadı: ${path} (HTTP ${res.status})`);
    return res.json();
  }

  async function getLatest() {
    const data = await get('latest.json');
    if (!data || typeof data.prices !== 'object') throw new DepoDoluError('Geçersiz latest.json');
    return data;
  }

  return {
    getLatest,

    /** Tek il ve yakıtın litre fiyatı (TL, KDV dahil). */
    async getPrice(city, fuel) {
      if (!FUELS.includes(fuel)) throw new DepoDoluError(`Bilinmeyen yakıt: ${fuel}`);
      const latest = await getLatest();
      const entry = Object.hasOwn(latest.prices, city) ? latest.prices[city] : null;
      if (!entry) throw new DepoDoluError(`Bilinmeyen il anahtarı: ${city}`);
      const price = entry[fuel];
      if (typeof price !== 'number') throw new DepoDoluError(`${entry.name} için ${fuel} fiyatı yok`);
      return { city, name: entry.name, fuel, price, changedAt: entry.changedAt, updatedAt: latest.updatedAt, source: latest.source };
    },

    /** İl anahtarları ve Türkçe adları, alfabetik. */
    async getCities() {
      const latest = await getLatest();
      return Object.entries(latest.prices)
        .map(([key, c]) => ({ key, name: c.name }))
        .sort((a, b) => a.name.localeCompare(b.name, 'tr'));
    },

    getHistory(city) {
      if (!/^[a-z-]+$/.test(city)) return Promise.reject(new DepoDoluError(`Bilinmeyen il anahtarı: ${city}`));
      return get(`history/${city}.json`);
    },

    getChanges: () => get('changes.json'),

    async getAnnouncements() {
      const data = await get('announcements.json');
      return Array.isArray(data?.items) ? data.items : [];
    },
  };
}

let shared;
const client = () => (shared ??= createClient());

export const getLatest = () => client().getLatest();
export const getPrice = (city, fuel) => client().getPrice(city, fuel);
export const getCities = () => client().getCities();
export const getHistory = city => client().getHistory(city);
export const getChanges = () => client().getChanges();
export const getAnnouncements = () => client().getAnnouncements();
