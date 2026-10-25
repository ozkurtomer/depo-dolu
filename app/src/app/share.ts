import type { FuelKey, LatestFile } from './models';

const FUEL_KEYS: FuelKey[] = ['benzin', 'motorin', 'lpg'];

export function selectionFromUrl(url: URL, latest: LatestFile): { city: string; fuel: FuelKey } | null {
  const city = url.searchParams.get('il');
  const fuel = url.searchParams.get('yakit') as FuelKey | null;
  if (!city || !Object.hasOwn(latest.prices, city) || !fuel || !FUEL_KEYS.includes(fuel)) return null;
  return { city, fuel };
}

export function priceShareUrl(base: string, city: string, fuel: FuelKey): string {
  const url = new URL(base);
  url.search = '';
  url.hash = '';
  url.searchParams.set('il', city);
  url.searchParams.set('yakit', fuel);
  return url.toString();
}
