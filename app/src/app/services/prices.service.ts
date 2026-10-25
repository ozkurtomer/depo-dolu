import { HttpClient } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { Preferences } from '@capacitor/preferences';
import { firstValueFrom, timeout } from 'rxjs';
import { DATA_BASE_URL } from '../config';
import { ChangeEntry, FuelKey, HistoryEntry, LatestFile, PricePoint } from '../models';
import { isLatestFile } from '../price-data';

const CACHE_KEY = 'depodolu.latest.v1';

@Injectable({ providedIn: 'root' })
export class PricesService {
  private http = inject(HttpClient);

  readonly latest = signal<LatestFile | null>(null);
  readonly error = signal<string | null>(null);
  readonly offline = signal(false);
  readonly loading = signal(false);

  /** Güncel fiyatları getirir. İnternet yoksa son kaydedilen veriyi gösterir. */
  async loadLatest(): Promise<void> {
    this.loading.set(true);
    try {
      const data = await this.get<LatestFile>('latest.json');
      if (!isLatestFile(data)) throw new Error('Geçersiz fiyat verisi');
      this.latest.set(data);
      this.error.set(null);
      this.offline.set(false);
      await Preferences.set({ key: CACHE_KEY, value: JSON.stringify(data) }).catch(() => { });
    } catch {
      let cached: unknown = null;
      try {
        const { value } = await Preferences.get({ key: CACHE_KEY });
        cached = value ? JSON.parse(value) : null;
      } catch { /* Önceki başarılı oturumun bellekteki verisini de kullanabiliriz. */ }
      if (isLatestFile(cached) || this.latest()) {
        if (isLatestFile(cached)) this.latest.set(cached);
        this.offline.set(true);
        this.error.set(null);
      } else {
        this.error.set('Fiyatlar alınamadı. Bağlantını kontrol edip tekrar dene.');
      }
    } finally {
      this.loading.set(false);
    }
  }

  async history(city: string): Promise<HistoryEntry[]> {
    try {
      return await this.get<HistoryEntry[]>(`history/${city}.json`);
    } catch {
      return [];
    }
  }

  async changes(): Promise<ChangeEntry[]> {
    try {
      return await this.get<ChangeEntry[]>('changes.json');
    } catch {
      return []; // Henüz hiç değişiklik olmadıysa dosya yoktur.
    }
  }

  /** Geçmişten tek yakıtın fiyat serisini çıkarır; aynı fiyatın tekrarlarını atar. */
  static series(history: HistoryEntry[], fuel: FuelKey): PricePoint[] {
    const points: PricePoint[] = [];
    for (const h of history) {
      const price = h[fuel];
      if (price == null) continue;
      if (points.length && points[points.length - 1].price === price) continue;
      points.push({ at: new Date(h.at), price });
    }
    return points;
  }

  private get<T>(path: string): Promise<T> {
    // raw.githubusercontent birkaç dakika önbellekler; dakika damgası her açılışta taze veri sağlar.
    const bust = Math.floor(Date.now() / 60_000);
    return firstValueFrom(this.http.get<T>(`${DATA_BASE_URL}/${path}?t=${bust}`).pipe(timeout(15_000)));
  }
}
