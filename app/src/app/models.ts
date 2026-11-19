export type FuelKey = 'benzin' | 'motorin' | 'lpg';

import { t } from './i18n';

/** `label` ve `hint` her okunduğunda geçerli dile göre çevrilir. */
export const FUELS: { key: FuelKey; readonly label: string; readonly hint: string }[] = (['benzin', 'motorin', 'lpg'] as const).map(key => ({
  key,
  get label() { return t(`fuel.${key}`); },
  get hint() { return t(`fuel.${key}.hint`); },
}));

export const fuelLabel = (key: FuelKey) => t(`fuel.${key}`);

export interface LatestCity {
  name: string;
  benzin: number | null;
  motorin: number | null;
  lpg: number | null;
  changedAt: string;
}

export interface LatestFile {
  source: string;
  sourceUrl: string;
  updatedAt: string;
  prices: Record<string, LatestCity>;
}

export interface HistoryEntry {
  at: string;
  benzin: number | null;
  motorin: number | null;
  lpg: number | null;
}

export interface ChangeEntry {
  at: string;
  city: string;
  name: string;
  fuel: FuelKey;
  old: number;
  new: number;
}

/** Bir yakıtın zaman içindeki fiyatı: sadece değiştiği anlar. */
export interface PricePoint {
  at: Date;
  price: number;
}

export interface Settings {
  city: string | null;
  fuel: FuelKey;
  notify: boolean;
  liters: number;
  /** Aracın ortalama tüketimi, L/100 km. Yolculuk ve bütçe hesabında kullanılır. */
  consumption: number;
  /** Aylık sürüş, km. */
  monthlyKm: number;
  /** Fiyat alarmı: bu il ve yakıtta fiyat `below` ₺ ya da altına inince haber ver. */
  alarm: PriceAlarm | null;
}

export interface PriceAlarm {
  city: string;
  fuel: FuelKey;
  below: number;
}

/** Bildirim konusu — sunucudaki PriceChange.Topic ile aynı olmalı. */
export const topicFor = (city: string, fuel: FuelKey) => `${city}_${fuel}`;
