import { Component, computed, inject, input, output, signal } from '@angular/core';
import { IonContent } from '@ionic/angular/standalone';
import { FUELS, FuelKey } from '../models';
import { PricesService } from '../services/prices.service';
import { PushService } from '../services/push.service';
import { SettingsService } from '../services/settings.service';
import { fold, tl, trCompare } from '../format';

/**
 * İlk açılış ve "Değiştir" ekranı: önce il, sonra yakıt.
 * Yakıt adımında seçilen ilin güncel fiyatları da görünür, kullanıcı neyi takip edeceğini görerek seçer.
 */
@Component({
  selector: 'dd-setup',
  imports: [IonContent],
  templateUrl: './setup.component.html',
  styleUrl: './setup.component.scss',
  host: { class: 'ion-page' },
})
export class SetupComponent {
  private prices = inject(PricesService);
  private settings = inject(SettingsService);
  readonly push = inject(PushService);

  /** "Değiştir" ile açıldıysa geri dönülebilir. */
  readonly canCancel = input(false);
  readonly done = output<void>();
  readonly cancel = output<void>();

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

  readonly filtered = computed(() => {
    const q = fold(this.query().trim());
    return q ? this.cities().filter(c => c.key.includes(q)) : this.cities();
  });

  readonly cityPrices = computed(() => {
    const slug = this.city();
    return slug ? this.prices.latest()?.prices[slug] ?? null : null;
  });

  pickCity(slug: string) {
    this.city.set(slug);
    this.step.set('fuel');
  }

  async save() {
    const city = this.city();
    if (!city || this.saving()) return;
    this.saving.set(true);

    const before = this.settings.settings();
    const previousTopic = before.notify && before.city ? `${before.city}_${before.fuel}` : null;
    const topic = `${city}_${this.fuel()}`;

    let notify = false;
    if (this.notify()) {
      notify = (await this.push.enable(topic, previousTopic)) === 'ok';
    } else {
      await this.push.disable(previousTopic);
    }

    await this.settings.update({ city, fuel: this.fuel(), notify });
    this.saving.set(false);
    this.done.emit();
  }
}
