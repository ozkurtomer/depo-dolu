import { Injectable, signal } from '@angular/core';
import { Preferences } from '@capacitor/preferences';
import { FuelKey, Settings } from '../models';

const KEY = 'depodolu.settings.v1';

const DEFAULTS: Settings = { city: null, fuel: 'benzin', notify: false, liters: 50 };

/** Kullanıcının seçimleri. Cihazda saklanır; sunucuya hiçbir şey gönderilmez. */
@Injectable({ providedIn: 'root' })
export class SettingsService {
  readonly settings = signal<Settings>(DEFAULTS);
  readonly loaded = signal(false);

  async load(): Promise<void> {
    try {
      const { value } = await Preferences.get({ key: KEY });
      if (value) this.settings.set({ ...DEFAULTS, ...JSON.parse(value) });
    } catch {
      // Bozuk kayıt: varsayılanlarla devam et.
    }
    this.loaded.set(true);
  }

  async update(patch: Partial<Settings>): Promise<Settings> {
    const next = { ...this.settings(), ...patch };
    this.settings.set(next);
    await Preferences.set({ key: KEY, value: JSON.stringify(next) });
    return next;
  }

  setCityAndFuel(city: string, fuel: FuelKey) {
    return this.update({ city, fuel });
  }
}
