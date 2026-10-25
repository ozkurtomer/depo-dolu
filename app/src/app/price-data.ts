import type { LatestFile } from './models';

/** Ağdan ve cihaz önbelleğinden gelen veri aynı kontrolden geçer. */
export function isLatestFile(value: unknown): value is LatestFile {
  if (!value || typeof value !== 'object') return false;
  const data = value as LatestFile;
  if (typeof data.updatedAt !== 'string' || !Number.isFinite(Date.parse(data.updatedAt)) ||
    !data.prices || typeof data.prices !== 'object' || Array.isArray(data.prices)) return false;
  const cities = Object.values(data.prices);
  return cities.length > 0 && cities.every(c => c && typeof c.name === 'string' &&
    ['benzin', 'motorin', 'lpg'].every(f => {
      const price = c[f as 'benzin' | 'motorin' | 'lpg'];
      return price === null || (typeof price === 'number' && Number.isFinite(price) && price > 0);
    }));
}
