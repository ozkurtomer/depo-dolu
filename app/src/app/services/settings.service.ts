import { Injectable, inject, signal } from '@angular/core';
import { Preferences } from '@capacitor/preferences';
import { FuelKey, Settings, topicFor } from '../models';
import { PushResult, PushService } from './push.service';

const KEY = 'depodolu.settings.v1';

const DEFAULTS: Settings = { city: null, fuel: 'benzin', notify: false, liters: 50 };

/** Kullanıcının seçimleri. Cihazda saklanır; sunucuya hiçbir şey gönderilmez. */
@Injectable({ providedIn: 'root' })
export class SettingsService {
  private push = inject(PushService);

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

  /**
   * İl ya da yakıt değişince bildirim aboneliğini de taşır:
   * eski konudan çıkar, yenisine abone olur.
   */
  async select(city: string, fuel: FuelKey): Promise<void> {
    const before = this.settings();
    await this.update({ city, fuel });
    if (before.notify && before.city && (before.city !== city || before.fuel !== fuel)) {
      const ok = await this.push.enable(topicFor(city, fuel), topicFor(before.city, before.fuel));
      if (ok !== 'ok') await this.update({ notify: false });
    }
  }

  async setNotify(on: boolean): Promise<PushResult | 'off'> {
    const s = this.settings();
    if (!s.city) return 'error';
    const topic = topicFor(s.city, s.fuel);
    if (!on) {
      await this.push.disable(topic);
      await this.update({ notify: false });
      return 'off';
    }
    const result = await this.push.enable(topic);
    await this.update({ notify: result === 'ok' });
    return result;
  }
}
