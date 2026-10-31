import type { FuelKey } from './models';

/** Bilinen il anahtarları: latest.json'un `prices` alanı ya da aynı anahtarlı herhangi bir kayıt. */
type KnownCities = { prices: Record<string, unknown> };

const FUEL_KEYS: FuelKey[] = ['benzin', 'motorin', 'lpg'];

/**
 * Seçimi iki biçimden okur: statik il sayfası (`/depo-dolu/bursa/motorin/`)
 * ve eski paylaşım bağlantısı (`?il=bursa&yakit=motorin`).
 */
export function selectionFromUrl(url: URL, latest: KnownCities): { city: string; fuel: FuelKey } | null {
  const fromQuery = pick(url.searchParams.get('il'), url.searchParams.get('yakit'), latest);
  if (fromQuery) return fromQuery;
  const parts = url.pathname.split('/').filter(Boolean);
  return parts.length >= 2 ? pick(parts[parts.length - 2], parts[parts.length - 1], latest) : null;
}

function pick(city: string | null, fuel: string | null, latest: KnownCities): { city: string; fuel: FuelKey } | null {
  if (!city || !Object.hasOwn(latest.prices, city) || !fuel || !FUEL_KEYS.includes(fuel as FuelKey)) return null;
  return { city, fuel: fuel as FuelKey };
}

/** Statik il/yakıt sayfasının göreli yolu: "bursa/motorin/". */
export const cityPagePath = (city: string, fuel: FuelKey) => `${city}/${fuel}/`;

/**
 * Paylaşım bağlantısı statik il sayfasını açar: WhatsApp ve Telegram önizlemesinde
 * o ilin fiyatı görünür, uygulama da aynı il ve yakıtla açılır.
 */
export function priceShareUrl(base: string, city: string, fuel: FuelKey): string {
  const root = new URL(base);
  root.search = '';
  root.hash = '';
  if (!root.pathname.endsWith('/')) root.pathname += '/';
  return new URL(cityPagePath(city, fuel), root).toString();
}
