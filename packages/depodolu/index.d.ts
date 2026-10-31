export type Fuel = 'benzin' | 'motorin' | 'lpg';

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
  fuel: Fuel;
  old: number;
  new: number;
}

export interface Announcement {
  id: string;
  fuel: Fuel;
  /** Litre başına beklenen değişim, ₺. Zam pozitif, indirim negatif. */
  change: number;
  effectiveAt: string;
  source: string;
  sourceUrl?: string;
  publishedAt: string;
}

export interface PriceResult {
  city: string;
  name: string;
  fuel: Fuel;
  price: number;
  changedAt: string;
  updatedAt: string;
  source: string;
}

export interface ClientOptions {
  baseUrl?: string;
  fetch?: typeof fetch;
  timeoutMs?: number;
}

export interface Client {
  getLatest(): Promise<LatestFile>;
  getPrice(city: string, fuel: Fuel): Promise<PriceResult>;
  getCities(): Promise<{ key: string; name: string }[]>;
  getHistory(city: string): Promise<HistoryEntry[]>;
  getChanges(): Promise<ChangeEntry[]>;
  getAnnouncements(): Promise<Announcement[]>;
}

export declare const DEFAULT_BASE_URL: string;
export declare const FUELS: Fuel[];
export declare class DepoDoluError extends Error {}
export declare function createClient(options?: ClientOptions): Client;
export declare function getLatest(): Promise<LatestFile>;
export declare function getPrice(city: string, fuel: Fuel): Promise<PriceResult>;
export declare function getCities(): Promise<{ key: string; name: string }[]>;
export declare function getHistory(city: string): Promise<HistoryEntry[]>;
export declare function getChanges(): Promise<ChangeEntry[]>;
export declare function getAnnouncements(): Promise<Announcement[]>;
