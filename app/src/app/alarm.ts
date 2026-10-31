import type { FuelKey, PriceAlarm } from './models';

export type AlarmState =
  | { kind: 'none' }
  | { kind: 'elsewhere'; alarm: PriceAlarm }
  | { kind: 'waiting'; alarm: PriceAlarm; gap: number }
  | { kind: 'reached'; alarm: PriceAlarm }
  | { kind: 'unknown'; alarm: PriceAlarm };

/** Alarm seçili il/yakıt için mi, hedefe ulaşıldı mı? Android'deki PriceWorker aynı kuralı uygular. */
export function alarmState(alarm: PriceAlarm | null, city: string | null, fuel: FuelKey, price: number | null): AlarmState {
  if (!alarm) return { kind: 'none' };
  if (alarm.city !== city || alarm.fuel !== fuel) return { kind: 'elsewhere', alarm };
  if (price == null) return { kind: 'unknown', alarm };
  // Kuruş yuvarlama farkı alarmı kaçırmasın.
  return price <= alarm.below + 0.001 ? { kind: 'reached', alarm } : { kind: 'waiting', alarm, gap: price - alarm.below };
}

/** Kullanıcının yazdığı hedefi doğrular. Hata metni ya da null döner. */
export function validateTarget(below: number | null, price: number | null): string | null {
  if (below == null || !Number.isFinite(below) || below <= 0 || below >= 1000) return 'Hedef fiyatı yaz (ör. 45,50).';
  if (price != null && below >= price) return `Fiyat zaten ${below.toLocaleString('tr-TR')} ₺ ya da altında. Daha düşük bir hedef yaz.`;
  return null;
}
