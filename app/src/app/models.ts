export type FuelKey = 'benzin' | 'motorin' | 'lpg';

export const FUELS: { key: FuelKey; label: string; hint: string }[] = [
  { key: 'benzin', label: 'Benzin', hint: 'Kurşunsuz 95' },
  { key: 'motorin', label: 'Motorin', hint: 'Dizel' },
  { key: 'lpg', label: 'LPG', hint: 'Otogaz' },
];

export const fuelLabel = (key: FuelKey) => FUELS.find(f => f.key === key)!.label;

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
}

/** Bildirim konusu — sunucudaki PriceChange.Topic ile aynı olmalı. */
export const topicFor = (city: string, fuel: FuelKey) => `${city}_${fuel}`;
