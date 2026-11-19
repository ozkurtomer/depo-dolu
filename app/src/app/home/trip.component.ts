import { Component, computed, inject, signal } from '@angular/core';
import { fuelLabel } from '../models';
import { PricesService } from '../services/prices.service';
import { SettingsService } from '../services/settings.service';
import { tl, tlWhole, trCompare } from '../format';
import { estimateRoadKm, fillAdvice, tripCost } from '../trip';
import { locale, t } from '../i18n';
import { LangService } from '../services/lang.service';

/** "İstanbul–Ankara kaç TL tutar?": seçili ilin fiyatıyla yolculuğun yakıt maliyeti. */
@Component({
  selector: 'dd-trip',
  template: `
    <section class="card">
      <h2>{{ t('trip.title') }}</h2>
      <div class="fields">
        <label class="wide">{{ t('trip.where') }}
          <select (change)="chooseDestination($any($event.target).value)">
            <option value="">{{ t('trip.optional') }}</option>
            @for (c of destinations(); track c.slug) {
              <option [value]="c.slug" [selected]="c.slug === destination()">{{ c.name }}</option>
            }
          </select>
        </label>
        <label>{{ t('trip.distance') }}
          <input type="number" inputmode="numeric" min="1" max="5000" [value]="km() ?? ''"
            (input)="setKm($any($event.target).valueAsNumber)" [placeholder]="t('trip.example')" />
        </label>
        <label>{{ t('trip.consumption') }}
          <input type="number" inputmode="decimal" min="1" max="40" step="0.1" [value]="settings().consumption"
            (change)="setConsumption($any($event.target).valueAsNumber)" />
        </label>
        <label>{{ t('trip.people') }}
          <input type="number" inputmode="numeric" min="1" max="9" [value]="people()"
            (input)="people.set($any($event.target).valueAsNumber || 1)" />
        </label>
        <label class="check">
          <input type="checkbox" [checked]="roundTrip()" (change)="roundTrip.set($any($event.target).checked)" />
          {{ t('trip.round') }}
        </label>
      </div>

      @if (result(); as r) {
        <div class="result" aria-live="polite">
          <p class="big">{{ tlWhole(r.cost) }} <small>₺</small></p>
          <p class="sub">
            {{ t('trip.sub', { km: tlWhole(r.km), liters: tl(r.liters), fuel: fuelName(), perKm: tl(r.perKm) }) }}
            @if (people() > 1) { {{ t('trip.perPerson', { n: tlWhole(r.perPerson) }) }} }
          </p>
        </div>
      } @else {
        <p class="note">{{ t('trip.hint') }}</p>
      }

      @if (advice(); as a) {
        <p class="note">
          @if (a.where === 'same') {
            {{ t('trip.same', { a: originName(), b: destinationName() }) }}
          } @else if (a.where === 'destination') {
            <span class="good">{{ t('trip.destCheaper', { place: destinationName(), liters: settings().liters, saving: tlWhole(a.saving) }) }}</span>
          } @else {
            <span class="good">{{ t('trip.originCheaper', { place: originName(), liters: settings().liters, saving: tlWhole(a.saving) }) }}</span>
          }
        </p>
      }
      @if (estimated()) {
        <p class="note">{{ t('trip.estimated') }}</p>
      }
    </section>
  `,
  styleUrl: './tools.scss',
})
export class TripComponent {
  private prices = inject(PricesService);
  private settingsService = inject(SettingsService);
  private lang = inject(LangService);
  readonly t = t;

  readonly settings = this.settingsService.settings;
  readonly tl = tl;
  readonly tlWhole = tlWhole;

  readonly destination = signal<string | null>(null);
  readonly km = signal<number | null>(null);
  readonly estimated = signal(false);
  readonly people = signal(1);
  readonly roundTrip = signal(false);

  readonly fuelName = computed(() => {
    this.lang.lang();
    const label = fuelLabel(this.settings().fuel);
    return label === 'LPG' ? label : label.toLocaleLowerCase(locale());
  });
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
