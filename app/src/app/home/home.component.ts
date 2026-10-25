import { Component, computed, effect, inject, output, signal } from '@angular/core';
import { IonContent, IonRefresher, IonRefresherContent } from '@ionic/angular/standalone';
import { ChangeEntry, FUELS, FuelKey, HistoryEntry, fuelLabel } from '../models';
import { PricesService } from '../services/prices.service';
import { PushService } from '../services/push.service';
import { SettingsService } from '../services/settings.service';
import { REPO_URL, TELEGRAM_URL } from '../config';
import { ago, tl, tlWhole } from '../format';
import { PriceChartComponent } from './price-chart.component';

const TANK_SIZES = [30, 40, 50, 60, 70];

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

  readonly pickCity = output<void>();

  readonly fuels = FUELS;
  readonly tanks = TANK_SIZES;
  readonly telegramUrl = TELEGRAM_URL;
  readonly repoUrl = REPO_URL;
  readonly tl = tl;
  readonly tlWhole = tlWhole;
  readonly ago = ago;
  readonly fuelLabel = fuelLabel;

  readonly settings = this.settingsService.settings;
  readonly history = signal<HistoryEntry[]>([]);
  readonly feed = signal<ChangeEntry[]>([]);
  readonly pushMessage = signal<string | null>(null);
  readonly busy = signal(false);

  readonly city = computed(() => {
    const slug = this.settings().city;
    return slug ? this.prices.latest()?.prices[slug] ?? null : null;
  });

  readonly price = computed(() => this.city()?.[this.settings().fuel] ?? null);

  /** "97,80" → ["97", "80"] */
  readonly digits = computed(() => {
    const p = this.price();
    return p == null ? null : tl(p).split(',');
  });

  readonly series = computed(() => PricesService.series(this.history(), this.settings().fuel));

  readonly lastMove = computed(() => {
    const s = this.series();
    if (s.length < 2) return null;
    const delta = s[s.length - 1].price - s[s.length - 2].price;
    return { delta: Math.abs(delta), up: delta > 0, at: s[s.length - 1].at };
  });

  /** Seçili yakıt için Türkiye geneli: ortalama, en ucuz, en pahalı ve bu ilin sırası. */
  readonly country = computed(() => {
    const latest = this.prices.latest();
    const fuel = this.settings().fuel;
    const mine = this.price();
    if (!latest || mine == null) return null;

    const all = Object.entries(latest.prices)
      .map(([slug, c]) => ({ slug, name: c.name, price: c[fuel] }))
      .filter((c): c is { slug: string; name: string; price: number } => c.price != null)
      .sort((a, b) => a.price - b.price);
    if (all.length < 2) return null;

    const avg = all.reduce((s, c) => s + c.price, 0) / all.length;
    const diff = mine - avg;
    const rank = all.filter(c => c.price < mine).length + 1;
    return { avg, diff, rank, total: all.length, cheapest: all[0], priciest: all[all.length - 1] };
  });

  readonly tank = computed(() => (this.price() ?? 0) * this.settings().liters);

  readonly cityFeed = computed(() => this.feed().filter(c => c.city === this.settings().city).slice(0, 5));

  constructor() {
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

  async chooseFuel(fuel: FuelKey) {
    const s = this.settings();
    if (!s.city || s.fuel === fuel) return;
    await this.settingsService.select(s.city, fuel);
  }

  setLiters(liters: number) {
    this.settingsService.update({ liters });
  }

  async toggleNotify() {
    if (this.busy()) return;
    this.busy.set(true);
    const result = await this.settingsService.setNotify(!this.settings().notify);
    this.busy.set(false);

    this.pushMessage.set(
      result === 'denied' ? 'Bildirim izni kapalı. Telefonun ayarlarından Depo Dolu için bildirimlere izin ver.'
      : result === 'error' ? 'Bildirim açılamadı. İnternet bağlantını kontrol edip tekrar dene.'
      : null,
    );
  }
}
