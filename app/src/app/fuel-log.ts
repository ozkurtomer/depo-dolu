import { FUELS, type FuelKey } from './models';

/**
 * Yakıt defteri: kullanıcının araçları ve dolumları. Sadece cihazda saklanır.
 * Saf fonksiyonlar; kayıt/okuma FuelLogService'te.
 */
export interface Vehicle {
  id: string;
  name: string;
  fuel: FuelKey;
  /** Kullanıcının yazdığı tüketim (L/100 km). Gerçek tüketim hesaplanınca o kullanılır. */
  consumption: number;
}

export interface FillUp {
  id: string;
  vehicleId: string;
  /** ISO tarih. */
  at: string;
  liters: number;
  /** Ödenen tutar, ₺. */
  total: number;
  /** Kilometre sayacı; gerçek tüketim için gerekir, isteğe bağlı. */
  odometer: number | null;
  /** Depo tam dolduruldu mu? Gerçek tüketim tam dolumdan tam doluma hesaplanır. */
  full: boolean;
}

export interface FuelLog {
  vehicles: Vehicle[];
  fills: FillUp[];
  activeId: string | null;
}

export const EMPTY_LOG: FuelLog = { vehicles: [], fills: [], activeId: null };

const FUEL_KEYS = FUELS.map(f => f.key);
const num = (v: unknown, min: number, max: number) => typeof v === 'number' && Number.isFinite(v) && v >= min && v <= max;

export function isVehicle(v: unknown): v is Vehicle {
  const x = v as Vehicle;
  return !!x && typeof x.id === 'string' && typeof x.name === 'string' && x.name.length <= 40
    && FUEL_KEYS.includes(x.fuel) && num(x.consumption, 1, 40);
}

export function isFillUp(v: unknown): v is FillUp {
  const x = v as FillUp;
  return !!x && typeof x.id === 'string' && typeof x.vehicleId === 'string' && !Number.isNaN(Date.parse(x.at))
    && num(x.liters, 0.1, 500) && num(x.total, 0.01, 100_000)
    && (x.odometer === null || num(x.odometer, 0, 5_000_000)) && typeof x.full === 'boolean';
}

/** Kayıttan okunan veriyi doğrular; bozuk kayıtları atar, araçsız dolumları da. */
export function parseLog(raw: unknown): FuelLog {
  const x = raw as Partial<FuelLog> | null;
  if (!x || !Array.isArray(x.vehicles) || !Array.isArray(x.fills)) return EMPTY_LOG;
  const vehicles = x.vehicles.filter(isVehicle);
  const ids = new Set(vehicles.map(v => v.id));
  const fills = x.fills.filter(isFillUp).filter(f => ids.has(f.vehicleId)).sort(byDate);
  const activeId = typeof x.activeId === 'string' && ids.has(x.activeId) ? x.activeId : vehicles[0]?.id ?? null;
  return { vehicles, fills, activeId };
}

const byDate = (a: FillUp, b: FillUp) => a.at.localeCompare(b.at) || (a.odometer ?? 0) - (b.odometer ?? 0);

export const newId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

export function upsertVehicle(log: FuelLog, vehicle: Vehicle): FuelLog {
  const exists = log.vehicles.some(v => v.id === vehicle.id);
  const vehicles = exists ? log.vehicles.map(v => (v.id === vehicle.id ? vehicle : v)) : [...log.vehicles, vehicle];
  return { ...log, vehicles, activeId: exists ? log.activeId : vehicle.id };
}

export function removeVehicle(log: FuelLog, id: string): FuelLog {
  const vehicles = log.vehicles.filter(v => v.id !== id);
  return {
    vehicles,
    fills: log.fills.filter(f => f.vehicleId !== id),
    activeId: log.activeId === id ? vehicles[0]?.id ?? null : log.activeId,
  };
}

export function addFill(log: FuelLog, fill: FillUp): FuelLog {
  return { ...log, fills: [...log.fills, fill].sort(byDate) };
}

export function removeFill(log: FuelLog, id: string): FuelLog {
  return { ...log, fills: log.fills.filter(f => f.id !== id) };
}

export const fillsOf = (log: FuelLog, vehicleId: string | null) => log.fills.filter(f => f.vehicleId === vehicleId);

/**
 * Gerçek tüketim, tam dolumdan tam doluma: iki tam dolum arasında depoya giren litre
 * (ara dolumlar + ikinci tam dolum) / aradaki km. Km'siz bir tam dolum zinciri koparır.
 */
export function realConsumption(fills: FillUp[]): { per100: number; km: number; liters: number } | null {
  let lastFullOdo: number | null = null;
  let pending = 0;
  let km = 0;
  let liters = 0;
  for (const f of [...fills].sort(byDate)) {
    if (!f.full) {
      pending += f.liters;
      continue;
    }
    if (f.odometer == null) {
      lastFullOdo = null;
      pending = 0;
      continue;
    }
    if (lastFullOdo != null && f.odometer > lastFullOdo) {
      km += f.odometer - lastFullOdo;
      liters += pending + f.liters;
    }
    lastFullOdo = f.odometer;
    pending = 0;
  }
  if (km <= 0) return null;
  const per100 = (liters / km) * 100;
  // Yanlış yazılmış km ya da litre saçma bir sonuç verir; göstermemek daha dürüst.
  return per100 >= 1 && per100 <= 40 ? { per100, km, liters } : null;
}

/** Bu ay ve geçen ay harcanan tutar (cihazın saatine göre takvim ayı). */
export function monthlySpend(fills: FillUp[], now = new Date()) {
  const key = (d: Date) => d.getFullYear() * 12 + d.getMonth();
  const current = key(now);
  let thisMonth = 0;
  let lastMonth = 0;
  let thisLiters = 0;
  for (const f of fills) {
    const k = key(new Date(f.at));
    if (k === current) {
      thisMonth += f.total;
      thisLiters += f.liters;
    } else if (k === current - 1) lastMonth += f.total;
  }
  return { thisMonth, lastMonth, thisLiters };
}

/** Kullanıcının kendi verisini dışa aktarması için CSV (Excel Türkçe ayarı için ; ayraçlı). */
export function toCsv(log: FuelLog): string {
  const name = new Map(log.vehicles.map(v => [v.id, v.name]));
  const cell = (s: string) => (/[;"\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s);
  const dec = (n: number) => String(Math.round(n * 100) / 100).replace('.', ',');
  const rows = log.fills.map(f => [
    f.at.slice(0, 10), cell(name.get(f.vehicleId) ?? ''), dec(f.liters), dec(f.total), dec(f.total / f.liters),
    f.odometer == null ? '' : String(f.odometer), f.full ? 'evet' : 'hayır',
  ].join(';'));
  return ['tarih;arac;litre;tutar_tl;litre_fiyati_tl;km_sayaci;tam_dolum', ...rows].join('\n') + '\n';
}
