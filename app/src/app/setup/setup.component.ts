import { Component, computed, inject, input, output, signal } from '@angular/core';
import { IonContent } from '@ionic/angular/standalone';
import { FUELS, FuelKey } from '../models';
import { PricesService } from '../services/prices.service';
import { PushService } from '../services/push.service';
import { SettingsService } from '../services/settings.service';
import { fold, tl, trCompare } from '../format';

const POPULAR = ['istanbul-avrupa', 'istanbul-anadolu', 'ankara', 'izmir', 'bursa', 'antalya'];

/**
 * onboard: ilk açılış. Önce il, sonra yakıt ve bildirim.
 * city:    ana ekrandan il değiştirme. İl seçilince doğrudan geri döner.
 */
@Component({
  selector: 'dd-setup',
  imports: [IonContent],
  templateUrl: './setup.component.html',
  styleUrl: './setup.component.scss',
  host: { class: 'ion-page' },
})
export class SetupComponent {
  readonly prices = inject(PricesService);
  private settings = inject(SettingsService);
  readonly push = inject(PushService);

  readonly mode = input<'onboard' | 'city'>('onboard');
  readonly done = output<void>();

  readonly fuels = FUELS;
  readonly tl = tl;

  readonly query = signal('');
  readonly city = signal<string | null>(this.settings.settings().city);
  readonly fuel = signal<FuelKey>(this.settings.settings().fuel);
  readonly notify = signal(this.push.supported);
  readonly step = signal<'city' | 'fuel'>('city');
  readonly saving = signal(false);

  readonly cities = computed(() => {
    const latest = this.prices.latest();
    if (!latest) return [];
    return Object.entries(latest.prices)
      .map(([slug, c]) => ({ slug, name: c.name, key: fold(c.name) }))
      .sort((a, b) => trCompare(a.name, b.name));
  });

  readonly popular = computed(() => {
    const all = new Map(this.cities().map(c => [c.slug, c]));
    return POPULAR.map(s => all.get(s)).filter(c => !!c);
  });

  readonly filtered = computed(() => {
    const q = fold(this.query().trim());
    return q ? this.cities().filter(c => c.key.includes(q)) : this.cities();
  });

  readonly cityPrices = computed(() => {
    const slug = this.city();
    return slug ? this.prices.latest()?.prices[slug] ?? null : null;
  });

  async pickCity(slug: string) {
    this.city.set(slug);
    if (this.mode() === 'city') {
      await this.settings.select(slug, this.settings.settings().fuel);
      this.done.emit();
      return;
    }
    this.step.set('fuel');
  }

  async start() {
    const city = this.city();
    if (!city || this.saving()) return;
    this.saving.set(true);
    await this.settings.update({ city, fuel: this.fuel() });
    if (this.notify() && this.push.supported) await this.settings.setNotify(true);
    this.saving.set(false);
    this.done.emit();
  }
}
