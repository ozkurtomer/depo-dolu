import { Component, computed, inject, signal } from '@angular/core';
import { Capacitor } from '@capacitor/core';
import { Share } from '@capacitor/share';
import { FUELS, FuelKey, fuelLabel } from '../models';
import { FillUp, Vehicle, newId, toCsv } from '../fuel-log';
import { FuelLogService } from '../services/fuel-log.service';
import { PricesService } from '../services/prices.service';
import { SettingsService } from '../services/settings.service';
import { tl, tlWhole } from '../format';
import { locale, t } from '../i18n';

const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

interface VehicleDraft { id: string | null; name: string; fuel: FuelKey; consumption: number }

/** Yakıt defteri: dolumlar, gerçek tüketim, aylık harcama ve birden fazla araç. */
@Component({
  selector: 'dd-fuel-log',
  template: `
    <section class="card">
      <div class="head">
        <h2>{{ t('log.title') }}</h2>
        @if (log().fills.length) {
          <button type="button" class="btn ghost small" (click)="exportCsv()">{{ t('log.export') }}</button>
        }
      </div>

      @if (log().vehicles.length) {
        <div class="chips" role="radiogroup" [attr.aria-label]="t('log.vehicle')">
          @for (v of log().vehicles; track v.id) {
            <button type="button" role="radio" class="chip" [class.on]="v.id === log().activeId"
              [attr.aria-checked]="v.id === log().activeId" (click)="service.activate(v.id)">
              {{ v.name }} <small>{{ fuelLabel(v.fuel) }}</small>
            </button>
          }
          <button type="button" class="chip add" (click)="openVehicle(null)">{{ t('log.addVehicle') }}</button>
          @if (service.active(); as a) {
            <button type="button" class="chip add" (click)="openVehicle(a)">{{ t('log.edit') }}</button>
          }
        </div>
      }

      @if (vehicle(); as v) {
        <div class="fields form">
          <label class="wide">{{ t('log.vehicleName') }}
            <input type="text" maxlength="40" [value]="v.name" (input)="patchVehicle({ name: $any($event.target).value })"
              [placeholder]="t('log.vehicleExample')" />
          </label>
          <label>{{ t('log.fuel') }}
            <select (change)="patchVehicle({ fuel: $any($event.target).value })">
              @for (f of fuels; track f.key) {
                <option [value]="f.key" [selected]="f.key === v.fuel">{{ f.label }}</option>
              }
            </select>
          </label>
          <label>{{ t('log.consumption') }}
            <input type="number" inputmode="decimal" min="1" max="40" step="0.1" [value]="v.consumption"
              (input)="patchVehicle({ consumption: $any($event.target).valueAsNumber })" />
          </label>
          <div class="actions wide">
            <button type="button" class="btn" (click)="saveVehicle()">{{ t('log.save') }}</button>
            <button type="button" class="btn ghost" (click)="vehicle.set(null)">{{ t('log.cancel') }}</button>
            @if (v.id) {
              <button type="button" class="btn ghost bad" (click)="deleteVehicle(v.id)">{{ t('log.deleteVehicle') }}</button>
            }
          </div>
          @if (formError(); as e) { <p class="note bad wide" role="alert">{{ t(e) }}</p> }
        </div>
      } @else if (!log().vehicles.length && !filling()) {
        <p class="sub">{{ t('log.intro') }}</p>
      }

      @if (service.active() && service.activeFills().length && !vehicle()) {
        <div class="stats">
          <div><small>{{ t('log.thisMonth') }}</small><strong>{{ tlWhole(service.spend().thisMonth) }} ₺</strong>
            <span>{{ tl(service.spend().thisLiters) }} L</span></div>
          <div><small>{{ t('log.lastMonth') }}</small><strong>{{ tlWhole(service.spend().lastMonth) }} ₺</strong>
            @if (monthDelta(); as d) { <span [class.bad]="d > 0" [class.good]="d < 0">{{ d > 0 ? '+' : '−' }}{{ t('log.diff', { delta: tlWhole(d < 0 ? -d : d) }) }}</span> }
          </div>
          <div><small>{{ t('log.real') }}</small>
            @if (service.real(); as r) {
              <strong>{{ tl(r.per100) }}</strong><span>{{ t('log.realSub', { km: tlWhole(r.km) }) }}</span>
            } @else {
              <strong>–</strong><span>{{ t('log.realNeeds') }}</span>
            }
          </div>
        </div>
      }

      @if (filling()) {
        <div class="fields form">
          <label>{{ t('log.liters') }}
            <input type="number" inputmode="decimal" min="0.1" max="500" step="0.01" [value]="liters() ?? ''"
              (input)="liters.set(numOrNull($any($event.target).valueAsNumber))" [placeholder]="t('log.litersExample')" />
          </label>
          <label>{{ t('log.total') }}
            <input type="number" inputmode="decimal" min="0.01" max="100000" step="0.01" [value]="total() ?? ''"
              (input)="total.set(numOrNull($any($event.target).valueAsNumber))"
              [placeholder]="suggested() ? tl(suggested()!) : t('log.totalExample')" />
          </label>
          <label>{{ t('log.odometer') }} <small>{{ t('log.optional') }}</small>
            <input type="number" inputmode="numeric" min="0" max="5000000" [value]="odometer() ?? ''"
              (input)="odometer.set(numOrNull($any($event.target).valueAsNumber))" [placeholder]="t('log.odoExample')" />
          </label>
          <label>{{ t('log.date') }}
            <input type="date" [max]="maxDate" [value]="date()" (input)="date.set($any($event.target).value)" />
          </label>
          <label class="check wide">
            <input type="checkbox" [checked]="full()" (change)="full.set($any($event.target).checked)" />
            {{ t('log.fullTank') }}
          </label>
          @if (suggested() && total() == null) {
            <p class="note wide">{{ t('log.suggest', { total: tl(suggested()!) }) }}</p>
          }
          <div class="actions wide">
            <button type="button" class="btn" (click)="saveFill()">{{ t('log.save') }}</button>
            <button type="button" class="btn ghost" (click)="filling.set(false)">{{ t('log.cancel') }}</button>
          </div>
          @if (formError(); as e) { <p class="note bad wide" role="alert">{{ e }}</p> }
        </div>
      } @else if (!vehicle()) {
        <button type="button" class="btn" (click)="openFill()">{{ t('log.filled') }}</button>
      }

      @if (recent().length && !filling() && !vehicle()) {
        <ul class="log-list">
          @for (f of recent(); track f.id) {
            <li>
              <span>{{ day(f.at) }}</span>
              <span>{{ tl(f.liters) }} L{{ f.full ? '' : '*' }}</span>
              <strong>{{ tlWhole(f.total) }} ₺</strong>
              <span class="soft">{{ tl(f.total / f.liters) }} ₺/L</span>
              <button type="button" class="x" (click)="service.deleteFill(f.id)" [attr.aria-label]="t('log.deleteFill', { day: day(f.at) })">×</button>
            </li>
          }
        </ul>
        @if (hasPartial()) { <p class="note">{{ t('log.partial') }}</p> }
      }
      @if (message(); as m) { <p class="note" role="status">{{ t(m) }}</p> }
    </section>
  `,
  styleUrl: './tools.scss',
})
export class FuelLogComponent {
  readonly service = inject(FuelLogService);
  private prices = inject(PricesService);
  private settingsService = inject(SettingsService);

  readonly fuels = FUELS;
  readonly fuelLabel = fuelLabel;
  readonly t = t;
  readonly tl = tl;
  readonly tlWhole = tlWhole;
  readonly maxDate = today();
  readonly log = this.service.log;

  readonly vehicle = signal<VehicleDraft | null>(null);
  readonly filling = signal(false);
  readonly liters = signal<number | null>(null);
  readonly total = signal<number | null>(null);
  readonly odometer = signal<number | null>(null);
  readonly date = signal(today());
  readonly full = signal(true);
  readonly formError = signal<string | null>(null);
  readonly message = signal<string | null>(null);

  readonly recent = computed(() => [...this.service.activeFills()].reverse().slice(0, 5));
  readonly hasPartial = computed(() => this.recent().some(f => !f.full));
  readonly monthDelta = computed(() => {
    const s = this.service.spend();
    return s.lastMonth > 0 && s.thisMonth > 0 ? s.thisMonth - s.lastMonth : null;
  });

  /** Dolumun yakıtındaki bugünkü il fiyatı × litre: tutar alanının önerisi. */
  readonly suggested = computed(() => {
    const s = this.settingsService.settings();
    const fuel = this.service.active()?.fuel ?? s.fuel;
    const price = s.city ? this.prices.latest()?.prices[s.city]?.[fuel] ?? null : null;
    const liters = this.liters();
    return price != null && liters ? Math.round(price * liters * 100) / 100 : null;
  });

  constructor() {
    this.service.load();
  }

  numOrNull = (v: number) => (Number.isFinite(v) ? v : null);
  day = (iso: string) => new Intl.DateTimeFormat(locale(), { day: 'numeric', month: 'short' }).format(new Date(iso));

  openVehicle(v: Vehicle | null) {
    const s = this.settingsService.settings();
    this.filling.set(false);
    this.formError.set(null);
    this.vehicle.set(v ? { ...v } : {
      id: null, name: this.log().vehicles.length ? '' : t('log.defaultName'), fuel: s.fuel, consumption: s.consumption,
    });
  }

  patchVehicle(patch: Partial<VehicleDraft>) {
    const v = this.vehicle();
    if (v) this.vehicle.set({ ...v, ...patch });
  }

  async saveVehicle() {
    const v = this.vehicle();
    if (!v) return;
    const name = v.name.trim();
    if (!name) return this.formError.set('log.errName');
    if (!Number.isFinite(v.consumption) || v.consumption < 1 || v.consumption > 40)
      return this.formError.set('log.errConsumption');
    await this.service.saveVehicle({ id: v.id ?? newId(), name, fuel: v.fuel, consumption: v.consumption });
    this.vehicle.set(null);
    this.formError.set(null);
  }

  async deleteVehicle(id: string) {
    const v = this.log().vehicles.find(x => x.id === id);
    const count = this.log().fills.filter(f => f.vehicleId === id).length;
    if (!v || !confirm(t('log.confirmDelete', { name: v.name, count }))) return;
    await this.service.deleteVehicle(id);
    this.vehicle.set(null);
  }

  openFill() {
    this.vehicle.set(null);
    this.formError.set(null);
    this.message.set(null);
    this.liters.set(null);
    this.total.set(null);
    this.odometer.set(null);
    this.date.set(today());
    this.full.set(true);
    this.filling.set(true);
  }

  async saveFill() {
    const liters = this.liters();
    const total = this.total() ?? this.suggested();
    const odometer = this.odometer();
    if (!liters || liters < 0.1 || liters > 500) return this.formError.set('log.errLiters');
    if (!total || total <= 0 || total > 100_000) return this.formError.set('log.errTotal');
    if (odometer != null && (odometer < 0 || odometer > 5_000_000)) return this.formError.set('log.errOdo');
    const d = this.date();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(d) || d > today()) return this.formError.set('log.errDate');
    const at = d === today() ? new Date().toISOString() : new Date(`${d}T12:00:00`).toISOString();

    // İlk dolumda araç yoksa seçili yakıtla varsayılan bir araç açılır.
    let vehicle = this.service.active();
    if (!vehicle) {
      const s = this.settingsService.settings();
      vehicle = { id: newId(), name: t('log.defaultName'), fuel: s.fuel, consumption: s.consumption };
      await this.service.saveVehicle(vehicle);
    }
    const fill: FillUp = { id: newId(), vehicleId: vehicle.id, at, liters, total, odometer, full: this.full() };
    await this.service.addFill(fill);
    this.filling.set(false);
    this.formError.set(null);
    this.message.set(this.service.real() ? null : odometer == null && this.full()
      ? 'log.savedHint' : 'log.saved');
  }

  async exportCsv() {
    const csv = toCsv(this.log());
    try {
      if (Capacitor.isNativePlatform()) {
        await Share.share({ title: t('log.shareTitle'), text: csv, dialogTitle: t('log.shareDialog') });
        return;
      }
      const url = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' }));
      const a = document.createElement('a');
      a.href = url;
      a.download = `depodolu-yakit-defteri-${today()}.csv`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch {
      this.message.set('log.exportFail');
    }
  }
}
