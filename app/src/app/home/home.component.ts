import { Component, computed, effect, inject, output, signal } from '@angular/core';
import { IonContent, IonRefresher, IonRefresherContent } from '@ionic/angular/standalone';
import { ChangeEntry, FUELS, HistoryEntry, fuelLabel, topicFor } from '../models';
import { PricesService } from '../services/prices.service';
import { PushService } from '../services/push.service';
import { SettingsService } from '../services/settings.service';
import { ago, tl, tlWhole } from '../format';
import { PriceChartComponent } from './price-chart.component';

@Component({
  selector: 'dd-home',
  imports: [IonContent, IonRefresher, IonRefresherContent, PriceChartComponent],
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss',
  host: { class: 'ion-page' },
})
export class HomeComponent {
  readonly prices = inject(PricesService);
  readonly push = inject(PushService);
  private settingsService = inject(SettingsService);

  readonly change = output<void>();

  readonly tl = tl;
  readonly tlWhole = tlWhole;
  readonly ago = ago;
  readonly fuelLabel = fuelLabel;

  readonly settings = this.settingsService.settings;
  readonly history = signal<HistoryEntry[]>([]);
  readonly feed = signal<ChangeEntry[]>([]);
  readonly pushMessage = signal<string | null>(null);

  readonly city = computed(() => {
    const slug = this.settings().city;
    return slug ? this.prices.latest()?.prices[slug] ?? null : null;
  });

  readonly price = computed(() => this.city()?.[this.settings().fuel] ?? null);

  /** Pompa ekranındaki rakamlar: "97,80" → ["97", "80"] */
  readonly digits = computed(() => {
    const p = this.price();
    return p == null ? null : tl(p).split(',');
  });

  readonly others = computed(() =>
    FUELS.filter(f => f.key !== this.settings().fuel).map(f => ({ label: f.label, price: this.city()?.[f.key] ?? null })),
  );

  readonly series = computed(() => PricesService.series(this.history(), this.settings().fuel));

  /** Seçili yakıtın en son değişikliği: kaç lira, ne zaman. */
  readonly lastMove = computed(() => {
    const s = this.series();
    if (s.length < 2) return null;
    const prev = s[s.length - 2];
    const last = s[s.length - 1];
    const delta = last.price - prev.price;
    return { delta, up: delta > 0, at: last.at };
  });

  readonly tank = computed(() => (this.price() ?? 0) * this.settings().liters);

  readonly cityFeed = computed(() => this.feed().filter(c => c.city === this.settings().city).slice(0, 6));

  constructor() {
    // İl değişince o ilin geçmişini yükle.
    effect(() => {
      const slug = this.settings().city;
      if (slug) this.loadHistory(slug);
    });
    this.prices.changes().then(f => this.feed.set(f));
  }

  private async loadHistory(slug: string) {
    this.history.set(await this.prices.history(slug));
  }

  async refresh(event: CustomEvent) {
    const slug = this.settings().city;
    await Promise.all([
      this.prices.loadLatest(),
      slug ? this.loadHistory(slug) : Promise.resolve(),
      this.prices.changes().then(f => this.feed.set(f)),
    ]);
    (event.target as HTMLIonRefresherElement).complete();
  }

  stepLiters(by: number) {
    const liters = Math.min(150, Math.max(5, this.settings().liters + by));
    this.settingsService.update({ liters });
  }

  async toggleNotify() {
    const s = this.settings();
    if (!s.city) return;
    const topic = topicFor(s.city, s.fuel);

    if (s.notify) {
      await this.push.disable(topic);
      await this.settingsService.update({ notify: false });
      this.pushMessage.set(null);
      return;
    }

    const result = await this.push.enable(topic);
    if (result === 'ok') {
      await this.settingsService.update({ notify: true });
      this.pushMessage.set(null);
    } else if (result === 'denied') {
      this.pushMessage.set('Bildirim izni kapalı. Telefon ayarlarından Depo Dolu için bildirimlere izin ver.');
    } else if (result === 'unsupported') {
      this.pushMessage.set('Bildirimler Android ve iOS uygulamasında çalışır.');
    } else {
      this.pushMessage.set('Bildirim açılamadı. İnternet bağlantını kontrol edip tekrar dene.');
    }
  }
}
