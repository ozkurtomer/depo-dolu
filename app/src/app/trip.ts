import type { PricePoint } from './models';

/**
 * İl merkezlerinin yaklaşık koordinatları (enlem, boylam). Sadece yolculuk mesafesini
 * tahmin etmek için: kuş uçuşu mesafe × yol katsayısı. Kullanıcı gerçek km'yi yazabilir.
 */
export const CITY_COORDS: Record<string, [number, number]> = {
  adana: [37.00, 35.32], adiyaman: [37.76, 38.28], afyon: [38.76, 30.54], agri: [39.72, 43.05],
  aksaray: [38.37, 34.03], amasya: [40.65, 35.83], ankara: [39.93, 32.86], antalya: [36.90, 30.70],
  ardahan: [41.11, 42.70], artvin: [41.18, 41.82], aydin: [37.85, 27.84], balikesir: [39.65, 27.88],
  bartin: [41.63, 32.34], batman: [37.88, 41.13], bayburt: [40.26, 40.23], bilecik: [40.14, 29.98],
  bingol: [38.88, 40.50], bitlis: [38.40, 42.11], bolu: [40.73, 31.61], burdur: [37.72, 30.29],
  bursa: [40.19, 29.06], canakkale: [40.15, 26.41], cankiri: [40.60, 33.61], corum: [40.55, 34.95],
  denizli: [37.78, 29.09], diyarbakir: [37.91, 40.23], duzce: [40.84, 31.16], edirne: [41.68, 26.56],
  elazig: [38.68, 39.22], erzincan: [39.75, 39.49], erzurum: [39.90, 41.27], eskisehir: [39.78, 30.52],
  gaziantep: [37.07, 37.38], giresun: [40.91, 38.39], gumushane: [40.46, 39.48], hakkari: [37.58, 43.74],
  hatay: [36.20, 36.16], igdir: [39.92, 44.04], isparta: [37.76, 30.55], 'istanbul-anadolu': [41.00, 29.10],
  'istanbul-avrupa': [41.04, 28.95], izmir: [38.42, 27.14], kahramanmaras: [37.58, 36.94], karabuk: [41.20, 32.62],
  karaman: [37.18, 33.22], kars: [40.60, 43.10], kastamonu: [41.38, 33.78], kayseri: [38.73, 35.48],
  kilis: [36.72, 37.12], kirikkale: [39.85, 33.51], kirklareli: [41.73, 27.22], kirsehir: [39.15, 34.16],
  kocaeli: [40.77, 29.92], konya: [37.87, 32.48], kutahya: [39.42, 29.98], malatya: [38.35, 38.31],
  manisa: [38.61, 27.43], mardin: [37.31, 40.74], mersin: [36.81, 34.64], mugla: [37.22, 28.36],
  mus: [38.74, 41.49], nevsehir: [38.62, 34.71], nigde: [37.97, 34.68], ordu: [40.98, 37.88],
  osmaniye: [37.07, 36.25], rize: [41.02, 40.52], sakarya: [40.78, 30.40], samsun: [41.29, 36.33],
  sanliurfa: [37.16, 38.79], siirt: [37.93, 41.94], sinop: [42.03, 35.15], sirnak: [37.52, 42.46],
  sivas: [39.75, 37.02], tekirdag: [40.98, 27.51], tokat: [40.31, 36.55], trabzon: [41.00, 39.72],
  tunceli: [39.11, 39.55], usak: [38.68, 29.41], van: [38.50, 43.38], yalova: [40.65, 29.27],
  yozgat: [39.82, 34.81], zonguldak: [41.45, 31.79],
};

/** Türkiye'de karayolu mesafesi kuş uçuşunun yaklaşık 1,3 katı (İstanbul–Ankara: ~350 → ~450 km). */
export const ROAD_FACTOR = 1.3;

/** İki il merkezi arasındaki tahmini karayolu mesafesi (km), yuvarlanmış. Koordinat yoksa null. */
export function estimateRoadKm(from: string, to: string): number | null {
  const a = CITY_COORDS[from];
  const b = CITY_COORDS[to];
  if (!a || !b) return null;
  if (from === to) return 0;
  const rad = (d: number) => d * Math.PI / 180;
  const dLat = rad(b[0] - a[0]);
  const dLon = rad(b[1] - a[1]);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a[0])) * Math.cos(rad(b[0])) * Math.sin(dLon / 2) ** 2;
  const crow = 2 * 6371 * Math.asin(Math.sqrt(h));
  return Math.max(5, Math.round(crow * ROAD_FACTOR / 5) * 5);
}

export interface TripInput {
  km: number;
  /** L/100 km */
  consumption: number;
  price: number;
  roundTrip: boolean;
  people: number;
}

export interface TripResult {
  km: number;
  liters: number;
  cost: number;
  perPerson: number;
  perKm: number;
}

/** Yolculuğun yakıt maliyeti. Geçersiz girişte null. */
export function tripCost(input: TripInput): TripResult | null {
  const { km, consumption, price, roundTrip, people } = input;
  if (!(km > 0) || !(consumption > 0) || !(price > 0)) return null;
  const totalKm = roundTrip ? km * 2 : km;
  const liters = totalKm * consumption / 100;
  const cost = liters * price;
  return { km: totalKm, liters, cost, perPerson: cost / Math.max(1, Math.floor(people) || 1), perKm: cost / totalKm };
}

/**
 * Nerede doldurmalı: çıkış ve varış ilinin fiyat farkı, bir depo için.
 * Pozitif `saving` varışta doldurmanın ucuz olduğunu söyler.
 */
export function fillAdvice(originPrice: number, destinationPrice: number, liters: number) {
  const diff = originPrice - destinationPrice;
  if (Math.abs(diff) < 0.005) return { where: 'same' as const, saving: 0 };
  return { where: diff > 0 ? 'destination' as const : 'origin' as const, saving: Math.abs(diff) * liters };
}

export interface BudgetResult {
  liters: number;
  monthly: number;
  yearly: number;
  /** Litrede 1 ₺ zamın aylık etkisi. */
  perLiraHike: number;
}

/** Aylık yakıt bütçesi: aylık km ve tüketimden. */
export function monthlyBudget(monthlyKm: number, consumption: number, price: number): BudgetResult | null {
  if (!(monthlyKm > 0) || !(consumption > 0) || !(price > 0)) return null;
  const liters = monthlyKm * consumption / 100;
  return { liters, monthly: liters * price, yearly: liters * price * 12, perLiraHike: liters };
}

export type RangeKey = '1a' | '3a' | '1y' | 'all';

export const RANGES: { key: RangeKey; label: string; days: number | null }[] = [
  { key: '1a', label: '1 ay', days: 30 },
  { key: '3a', label: '3 ay', days: 91 },
  { key: '1y', label: '1 yıl', days: 365 },
  { key: 'all', label: 'Tümü', days: null },
];

/**
 * Fiyat serisini bir zaman aralığına keser. Aralığın başındaki geçerli fiyat korunur
 * (basamaklı grafikte çizgi aralığın başından başlasın diye).
 */
export function sliceSeries(points: PricePoint[], days: number | null, now = new Date()): PricePoint[] {
  if (days == null || points.length === 0) return points;
  const start = now.getTime() - days * 86_400_000;
  const inside = points.filter(p => p.at.getTime() >= start);
  const before = points.filter(p => p.at.getTime() < start);
  if (!before.length) return inside;
  return [{ at: new Date(start), price: before[before.length - 1].price }, ...inside];
}

/** Aralıktaki değişim: ilk ve son fiyat arasındaki fark ve yüzde. */
export function seriesChange(points: PricePoint[]): { delta: number; percent: number } | null {
  if (points.length < 2) return null;
  const first = points[0].price;
  const last = points[points.length - 1].price;
  return { delta: last - first, percent: first ? (last - first) / first * 100 : 0 };
}

/** Sadece verinin kapsadığı aralıkları göster: geçmiş 40 günse "1 yıl" düğmesi anlamsız. */
export function availableRanges(points: PricePoint[], now = new Date()) {
  if (points.length < 2) return [];
  const spanDays = (now.getTime() - points[0].at.getTime()) / 86_400_000;
  const useful = RANGES.filter(r => r.days != null && r.days < spanDays);
  return useful.length ? [...useful, RANGES[RANGES.length - 1]] : [];
}
