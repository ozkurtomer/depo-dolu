import { Component, computed, inject, signal } from '@angular/core';
import { fuelLabel } from '../models';
import { PricesService } from '../services/prices.service';
import { SettingsService } from '../services/settings.service';
import { tl, tlWhole, trCompare } from '../format';
import { estimateRoadKm, fillAdvice, tripCost } from '../trip';

/** "İstanbul–Ankara kaç TL tutar?": seçili ilin fiyatıyla yolculuğun yakıt maliyeti. */
@Component({
  selector: 'dd-trip',
  template: `
    <section class="card">
      <h2>Yolculuk ne tutar?</h2>
      <div class="fields">
        <label class="wide">Nereye?
          <select (change)="chooseDestination($any($event.target).value)">
            <option value="">İl seç (isteğe bağlı)</option>
            @for (c of destinations(); track c.slug) {
              <option [value]="c.slug" [selected]="c.slug === destination()">{{ c.name }}</option>
            }
          </select>
        </label>
        <label>Mesafe (km)
          <input type="number" inputmode="numeric" min="1" max="5000" [value]="km() ?? ''"
            (input)="setKm($any($event.target).valueAsNumber)" placeholder="ör. 450" />
        </label>
        <label>Tüketim (L/100 km)
          <input type="number" inputmode="decimal" min="1" max="40" step="0.1" [value]="settings().consumption"
            (change)="setConsumption($any($event.target).valueAsNumber)" />
        </label>
        <label>Kişi sayısı
          <input type="number" inputmode="numeric" min="1" max="9" [value]="people()"
            (input)="people.set($any($event.target).valueAsNumber || 1)" />
        </label>
        <label class="check">
          <input type="checkbox" [checked]="roundTrip()" (change)="roundTrip.set($any($event.target).checked)" />
          Gidiş-dönüş
        </label>
      </div>

      @if (result(); as r) {
        <div class="result" aria-live="polite">
          <p class="big">{{ tlWhole(r.cost) }} <small>₺</small></p>
          <p class="sub">
            {{ tlWhole(r.km) }} km · {{ tl(r.liters) }} L {{ fuelName() }} · km başına {{ tl(r.perKm) }} ₺
            @if (people() > 1) { · kişi başı {{ tlWhole(r.perPerson) }} ₺ }
          </p>
        </div>
      } @else {
        <p class="note">Mesafeyi yaz ya da varış ilini seç.</p>
      }

      @if (advice(); as a) {
        <p class="note">
          @if (a.where === 'same') {
            {{ originName() }} ve {{ destinationName() }} fiyatı aynı.
          } @else if (a.where === 'destination') {
            <span class="good">{{ destinationName() }} daha ucuz: varınca doldurursan {{ settings().liters }} L depoda {{ tlWhole(a.saving) }} ₺ kazanırsın.</span>
          } @else {
            <span class="good">{{ originName() }} daha ucuz: yola çıkmadan doldurursan {{ settings().liters }} L depoda {{ tlWhole(a.saving) }} ₺ kazanırsın.</span>
          }
        </p>
      }
      @if (estimated()) {
        <p class="note">Mesafe il merkezleri arasından tahmin edildi (kuş uçuşu × 1,3). Gerçek güzergâh km'sini yazabilirsin.</p>
      }
    </section>
  `,
  styleUrl: './tools.scss',
})
export class TripComponent {
  private prices = inject(PricesService);
  private settingsService = inject(SettingsService);

  readonly settings = this.settingsService.settings;
  readonly tl = tl;
  readonly tlWhole = tlWhole;

  readonly destination = signal<string | null>(null);
  readonly km = signal<number | null>(null);
  readonly estimated = signal(false);
  readonly people = signal(1);
  readonly roundTrip = signal(false);

  readonly fuelName = computed(() => fuelLabel(this.settings().fuel).toLocaleLowerCase('tr-TR'));
  readonly originName = computed(() => this.cityName(this.settings().city));
  readonly destinationName = computed(() => this.cityName(this.destination()));

  readonly destinations = computed(() => {
    const latest = this.prices.latest();
    const origin = this.settings().city;
    if (!latest) return [];
    return Object.entries(latest.prices)
      .filter(([slug]) => slug !== origin)
      .map(([slug, c]) => ({ slug, name: c.name }))
      .sort((a, b) => trCompare(a.name, b.name));
  });

  private readonly price = computed(() => {
    const s = this.settings();
    return s.city ? this.prices.latest()?.prices[s.city]?.[s.fuel] ?? null : null;
  });

  readonly result = computed(() => {
    const price = this.price();
    const km = this.km();
    if (price == null || km == null) return null;
    return tripCost({ km, consumption: this.settings().consumption, price, roundTrip: this.roundTrip(), people: this.people() });
  });

  readonly advice = computed(() => {
    const dest = this.destination();
    const origin = this.price();
    const there = dest ? this.prices.latest()?.prices[dest]?.[this.settings().fuel] ?? null : null;
    return origin == null || there == null ? null : fillAdvice(origin, there, this.settings().liters);
  });

  chooseDestination(slug: string) {
    this.destination.set(slug || null);
    const origin = this.settings().city;
    const km = slug && origin ? estimateRoadKm(origin, slug) : null;
    if (km != null) {
      this.km.set(km);
      this.estimated.set(true);
    }
  }

  setKm(value: number) {
    this.km.set(Number.isFinite(value) && value > 0 ? value : null);
    this.estimated.set(false);
  }

  setConsumption(value: number) {
    if (Number.isFinite(value) && value > 0 && value <= 40) this.settingsService.update({ consumption: value });
  }

  private cityName(slug: string | null) {
    return slug ? this.prices.latest()?.prices[slug]?.name ?? '' : '';
  }
}
