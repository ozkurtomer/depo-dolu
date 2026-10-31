import { Component, computed, inject, signal } from '@angular/core';
import { Announcement } from '../announcements';
import { fuelLabel } from '../models';
import { PricesService } from '../services/prices.service';
import { SettingsService } from '../services/settings.service';
import { tl } from '../format';

const when = new Intl.DateTimeFormat('tr-TR', { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' });

/**
 * Seçili yakıt için yaklaşan zam/indirim duyurusu. Duyuru gözlenen fiyat değildir:
 * tahmini yeni fiyat ayrıca etiketlenir, asıl fiyat kartı değişmez.
 */
@Component({
  selector: 'dd-announcement',
  template: `
    @for (a of mine(); track a.id) {
      <section class="card notice" [class.up]="a.change > 0" role="status">
        <h2>{{ a.change > 0 ? 'Zam bekleniyor' : 'İndirim bekleniyor' }}</h2>
        <p class="sub">
          <strong>{{ fuel(a) }}</strong> litre fiyatına
          <strong [class.bad]="a.change > 0" [class.good]="a.change < 0">{{ a.change > 0 ? '+' : '−' }}{{ tl(abs(a.change)) }} ₺</strong>,
          {{ format(a.effectiveAt) }} itibarıyla.
        </p>
        @if (estimate(a); as e) {
          <p class="sub">{{ cityName() }} için tahmini yeni fiyat: <strong>{{ tl(e) }} ₺</strong></p>
        }
        <p class="note">
          Kaynak:
          @if (a.sourceUrl) { <a [href]="a.sourceUrl" target="_blank" rel="noopener">{{ a.source }}</a> } @else { {{ a.source }} }.
          Bu bir duyurudur; Petrol Ofisi fiyatına yansıyınca yukarıdaki fiyat güncellenir. İl bazında tutar farklı olabilir.
        </p>
      </section>
    }
  `,
  styleUrl: './tools.scss',
  styles: `
    .notice { border-color: var(--dd-down); }
    .notice.up { border-color: var(--dd-up); }
    .note a { color: var(--dd-brand); font-weight: 600; }
  `,
})
export class AnnouncementComponent {
  private prices = inject(PricesService);
  private settings = inject(SettingsService).settings;

  readonly tl = tl;
  readonly abs = Math.abs;
  private readonly all = signal<Announcement[]>([]);

  /** İlde fiyat duyurunun saatinde ya da sonra değiştiyse duyuru artık geçmiştir (tahmin iki kez eklenmesin). */
  readonly mine = computed(() => {
    const s = this.settings();
    const changedAt = s.city ? this.prices.latest()?.prices[s.city]?.changedAt : undefined;
    const observed = changedAt ? Date.parse(changedAt) : -Infinity;
    return this.all().filter(a => a.fuel === s.fuel && observed < Date.parse(a.effectiveAt) - 30 * 60_000);
  });
  readonly cityName = computed(() => {
    const slug = this.settings().city;
    return slug ? this.prices.latest()?.prices[slug]?.name ?? '' : '';
  });

  constructor() {
    this.prices.announcements().then(items => this.all.set(items));
  }

  fuel(a: Announcement) {
    return fuelLabel(a.fuel);
  }

  format(iso: string) {
    return when.format(new Date(iso));
  }

  estimate(a: Announcement): number | null {
    const s = this.settings();
    const now = s.city ? this.prices.latest()?.prices[s.city]?.[a.fuel] ?? null : null;
    return now == null ? null : Math.max(0, now + a.change);
  }
}
