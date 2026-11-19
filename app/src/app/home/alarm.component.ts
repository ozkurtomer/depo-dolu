import { Component, computed, inject, signal } from '@angular/core';
import { fuelLabel } from '../models';
import { alarmState, validateTarget } from '../alarm';
import { PricesService } from '../services/prices.service';
import { PushService } from '../services/push.service';
import { SettingsService } from '../services/settings.service';
import { WidgetService } from '../services/widget.service';
import { tl } from '../format';
import { locale, t } from '../i18n';
import { LangService } from '../services/lang.service';

/** "Motorin 45 ₺'nin altına inince haber ver." Android'de arka planda saatte bir kontrol edilir. */
@Component({
  selector: 'dd-alarm',
  template: `
    <section class="card">
      <h2>{{ t('alarm.title') }}</h2>
      @switch (state().kind) {
        @case ('reached') {
          <p class="big good">{{ t('alarm.reached') }}</p>
          <p class="sub">{{ t('alarm.reachedSub', { city: cityName(), fuel: fuelName(), price: tl(price()!), target: tl(alarm()!.below) }) }}</p>
        }
        @case ('waiting') {
          <p class="sub">{{ t('alarm.waitPre', { city: cityName(), fuel: fuelName() }) }} <strong>{{ tl(alarm()!.below) }} ₺</strong>
            {{ t('alarm.waitPost', { price: tl(price()!), gap: tl(gap()) }) }}</p>
        }
        @case ('unknown') {
          <p class="sub">{{ t('alarm.unknown', { target: tl(alarm()!.below) }) }}</p>
        }
        @default {
          <p class="sub">{{ t('alarm.intro', { fuel: introFuel() }) }}</p>
          <div class="fields form">
            <label>{{ t('alarm.target') }}
              <input type="number" inputmode="decimal" min="1" max="999" step="0.01" [value]="target() ?? ''"
                (input)="target.set(numOrNull($any($event.target).valueAsNumber))"
                [placeholder]="price() != null ? tl(price()! - 1) : t('alarm.example')" />
            </label>
            <div class="actions" style="align-self: end">
              <button type="button" class="btn" (click)="save()">{{ t('alarm.set') }}</button>
            </div>
          </div>
          @if (error(); as e) { <p class="note bad" role="alert">{{ e }}</p> }
          @if (state().kind === 'elsewhere') {
            <p class="note">{{ t('alarm.elsewhere', { target: tl(alarm()!.below) }) }}</p>
          }
        }
      }
      @if (alarm() && state().kind !== 'elsewhere' && state().kind !== 'none') {
        <div class="actions" style="margin-top: 0.75rem">
          <button type="button" class="btn ghost small" (click)="clear()">{{ t('alarm.remove') }}</button>
        </div>
      }
      <p class="note">
        @if (widget.supported) {
          {{ t('alarm.native') }}
        } @else {
          {{ t('alarm.web') }}
        }
      </p>
      @if (permissionNote()) { <p class="note bad" role="status">{{ t(permissionNote()!) }}</p> }
    </section>
  `,
  styleUrl: './tools.scss',
})
export class AlarmComponent {
  private prices = inject(PricesService);
  private push = inject(PushService);
  private settingsService = inject(SettingsService);
  readonly widget = inject(WidgetService);
  private lang = inject(LangService);
  readonly t = t;

  readonly tl = tl;
  readonly target = signal<number | null>(null);
  readonly error = signal<string | null>(null);
  readonly permissionNote = signal<string | null>(null);

  private readonly settings = this.settingsService.settings;
  readonly alarm = computed(() => this.settings().alarm);
  readonly price = computed(() => {
    const s = this.settings();
    return s.city ? this.prices.latest()?.prices[s.city]?.[s.fuel] ?? null : null;
  });
  readonly state = computed(() => alarmState(this.alarm(), this.settings().city, this.settings().fuel, this.price()));
  readonly gap = computed(() => {
    const s = this.state();
    return s.kind === 'waiting' ? s.gap : 0;
  });
  readonly cityName = computed(() => {
    const slug = this.settings().city;
    return slug ? this.prices.latest()?.prices[slug]?.name ?? '' : '';
  });
  /** Türkçede cümle başında büyük harf, İngilizcede cümle içinde küçük harf. */
  readonly introFuel = computed(() => (this.lang.lang() === 'tr' ? this.fuelTitle() : this.fuelName()));
  readonly fuelTitle = computed(() => { this.lang.lang(); return fuelLabel(this.settings().fuel); });
  readonly fuelName = computed(() => {
    this.lang.lang();
    const label = fuelLabel(this.settings().fuel);
    return label === 'LPG' ? label : label.toLocaleLowerCase(locale());
  });

  numOrNull = (v: number) => (Number.isFinite(v) ? v : null);

  async save() {
    const s = this.settings();
    const below = this.target();
    const problem = validateTarget(below, this.price());
    if (problem || !s.city || below == null) return this.error.set(problem ?? t('alarm.pickCityFirst'));
    this.error.set(null);
    await this.settingsService.update({ alarm: { city: s.city, fuel: s.fuel, below: Math.round(below * 100) / 100 } });
    this.target.set(null);
    if (this.widget.supported) {
      const granted = await this.push.requestPermission();
      this.permissionNote.set(granted ? null : 'alarm.permission');
    }
  }

  async clear() {
    await this.settingsService.update({ alarm: null });
    this.permissionNote.set(null);
  }
}
