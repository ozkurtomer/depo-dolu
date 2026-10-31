import { Component, computed, inject, signal } from '@angular/core';
import { Capacitor } from '@capacitor/core';
import { Share } from '@capacitor/share';
import { FUELS, FuelKey, fuelLabel } from '../models';
import { FillUp, Vehicle, newId, toCsv } from '../fuel-log';
import { FuelLogService } from '../services/fuel-log.service';
import { PricesService } from '../services/prices.service';
import { SettingsService } from '../services/settings.service';
import { tl, tlWhole } from '../format';

const shortDate = new Intl.DateTimeFormat('tr-TR', { day: 'numeric', month: 'short' });
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
        <h2>Yakıt defteri</h2>
        @if (log().fills.length) {
          <button type="button" class="btn ghost small" (click)="exportCsv()">Dışa aktar</button>
        }
      </div>

      @if (log().vehicles.length) {
        <div class="chips" role="radiogroup" aria-label="Araç">
          @for (v of log().vehicles; track v.id) {
            <button type="button" role="radio" class="chip" [class.on]="v.id === log().activeId"
              [attr.aria-checked]="v.id === log().activeId" (click)="service.activate(v.id)">
              {{ v.name }} <small>{{ fuelLabel(v.fuel) }}</small>
            </button>
          }
          <button type="button" class="chip add" (click)="openVehicle(null)">+ Araç</button>
          @if (service.active(); as a) {
            <button type="button" class="chip add" (click)="openVehicle(a)">Düzenle</button>
          }
        </div>
      }

      @if (vehicle(); as v) {
        <div class="fields form">
          <label class="wide">Araç adı
            <input type="text" maxlength="40" [value]="v.name" (input)="patchVehicle({ name: $any($event.target).value })"
              placeholder="ör. Aile arabası" />
          </label>
          <label>Yakıt
            <select (change)="patchVehicle({ fuel: $any($event.target).value })">
              @for (f of fuels; track f.key) {
                <option [value]="f.key" [selected]="f.key === v.fuel">{{ f.label }}</option>
              }
            </select>
          </label>
          <label>Tüketim (L/100 km)
            <input type="number" inputmode="decimal" min="1" max="40" step="0.1" [value]="v.consumption"
              (input)="patchVehicle({ consumption: $any($event.target).valueAsNumber })" />
          </label>
          <div class="actions wide">
            <button type="button" class="btn" (click)="saveVehicle()">Kaydet</button>
            <button type="button" class="btn ghost" (click)="vehicle.set(null)">Vazgeç</button>
            @if (v.id) {
              <button type="button" class="btn ghost bad" (click)="deleteVehicle(v.id)">Aracı sil</button>
            }
          </div>
          @if (formError(); as e) { <p class="note bad wide" role="alert">{{ e }}</p> }
        </div>
      } @else if (!log().vehicles.length && !filling()) {
        <p class="sub">Her dolumu kaydet; gerçek tüketimini ve aylık harcamanı gör. Kayıtlar sadece bu cihazda kalır.</p>
      }

      @if (service.active() && service.activeFills().length && !vehicle()) {
        <div class="stats">
          <div><small>Bu ay</small><strong>{{ tlWhole(service.spend().thisMonth) }} ₺</strong>
            <span>{{ tl(service.spend().thisLiters) }} L</span></div>
          <div><small>Geçen ay</small><strong>{{ tlWhole(service.spend().lastMonth) }} ₺</strong>
            @if (monthDelta(); as d) { <span [class.bad]="d > 0" [class.good]="d < 0">{{ d > 0 ? '+' : '−' }}{{ tlWhole(d < 0 ? -d : d) }} ₺ fark</span> }
          </div>
          <div><small>Gerçek tüketim</small>
            @if (service.real(); as r) {
              <strong>{{ tl(r.per100) }}</strong><span>L/100 km · {{ tlWhole(r.km) }} km</span>
            } @else {
              <strong>–</strong><span>2 tam dolum + km gerekir</span>
            }
          </div>
        </div>
      }

      @if (filling()) {
        <div class="fields form">
          <label>Litre
            <input type="number" inputmode="decimal" min="0.1" max="500" step="0.01" [value]="liters() ?? ''"
              (input)="liters.set(numOrNull($any($event.target).valueAsNumber))" placeholder="ör. 42,5" />
          </label>
          <label>Tutar (₺)
            <input type="number" inputmode="decimal" min="0.01" max="100000" step="0.01" [value]="total() ?? ''"
              (input)="total.set(numOrNull($any($event.target).valueAsNumber))"
              [placeholder]="suggested() ? tl(suggested()!) : 'ör. 2.000'" />
          </label>
          <label>Km sayacı <small>(isteğe bağlı)</small>
            <input type="number" inputmode="numeric" min="0" max="5000000" [value]="odometer() ?? ''"
              (input)="odometer.set(numOrNull($any($event.target).valueAsNumber))" placeholder="ör. 84250" />
          </label>
          <label>Tarih
            <input type="date" [max]="maxDate" [value]="date()" (input)="date.set($any($event.target).value)" />
          </label>
          <label class="check wide">
            <input type="checkbox" [checked]="full()" (change)="full.set($any($event.target).checked)" />
            Depoyu tam doldurdum
          </label>
          @if (suggested() && total() == null) {
            <p class="note wide">Tutarı boş bırakırsan bugünkü fiyatla {{ tl(suggested()!) }} ₺ yazılır.</p>
          }
          <div class="actions wide">
            <button type="button" class="btn" (click)="saveFill()">Kaydet</button>
            <button type="button" class="btn ghost" (click)="filling.set(false)">Vazgeç</button>
          </div>
          @if (formError(); as e) { <p class="note bad wide" role="alert">{{ e }}</p> }
        </div>
      } @else if (!vehicle()) {
        <button type="button" class="btn" (click)="openFill()">⛽ Yakıt aldım</button>
      }

      @if (recent().length && !filling() && !vehicle()) {
        <ul class="log-list">
          @for (f of recent(); track f.id) {
            <li>
              <span>{{ day(f.at) }}</span>
              <span>{{ tl(f.liters) }} L{{ f.full ? '' : '*' }}</span>
              <strong>{{ tlWhole(f.total) }} ₺</strong>
              <span class="soft">{{ tl(f.total / f.liters) }} ₺/L</span>
              <button type="button" class="x" (click)="service.deleteFill(f.id)" [attr.aria-label]="day(f.at) + ' dolumunu sil'">×</button>
            </li>
          }
        </ul>
        @if (hasPartial()) { <p class="note">* Depo tam doldurulmadı.</p> }
      }
      @if (message(); as m) { <p class="note" role="status">{{ m }}</p> }
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
  day = (iso: string) => shortDate.format(new Date(iso));

  openVehicle(v: Vehicle | null) {
    const s = this.settingsService.settings();
    this.filling.set(false);
    this.formError.set(null);
    this.vehicle.set(v ? { ...v } : {
      id: null, name: this.log().vehicles.length ? '' : 'Aracım', fuel: s.fuel, consumption: s.consumption,
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
    if (!name) return this.formError.set('Araca bir ad ver.');
    if (!Number.isFinite(v.consumption) || v.consumption < 1 || v.consumption > 40)
      return this.formError.set('Tüketim 1 ile 40 L/100 km arasında olmalı.');
    await this.service.saveVehicle({ id: v.id ?? newId(), name, fuel: v.fuel, consumption: v.consumption });
    this.vehicle.set(null);
    this.formError.set(null);
  }

  async deleteVehicle(id: string) {
    const v = this.log().vehicles.find(x => x.id === id);
    const count = this.log().fills.filter(f => f.vehicleId === id).length;
    if (!v || !confirm(`${v.name} ve ${count} dolum kaydı silinsin mi?`)) return;
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
    if (!liters || liters < 0.1 || liters > 500) return this.formError.set('Litreyi yaz (0,1 – 500).');
    if (!total || total <= 0 || total > 100_000) return this.formError.set('Ödediğin tutarı yaz.');
    if (odometer != null && (odometer < 0 || odometer > 5_000_000)) return this.formError.set('Km sayacı geçersiz.');
    const d = this.date();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(d) || d > today()) return this.formError.set('Tarih bugünden ileri olamaz.');
    const at = d === today() ? new Date().toISOString() : new Date(`${d}T12:00:00`).toISOString();

    // İlk dolumda araç yoksa seçili yakıtla varsayılan bir araç açılır.
    let vehicle = this.service.active();
    if (!vehicle) {
      const s = this.settingsService.settings();
      vehicle = { id: newId(), name: 'Aracım', fuel: s.fuel, consumption: s.consumption };
      await this.service.saveVehicle(vehicle);
    }
    const fill: FillUp = { id: newId(), vehicleId: vehicle.id, at, liters, total, odometer, full: this.full() };
    await this.service.addFill(fill);
    this.filling.set(false);
    this.formError.set(null);
    this.message.set(this.service.real() ? null : odometer == null && this.full()
      ? 'Kaydedildi. Gerçek tüketimi görmek için dolumlarda km sayacını da yaz.' : 'Kaydedildi.');
  }

  async exportCsv() {
    const csv = toCsv(this.log());
    try {
      if (Capacitor.isNativePlatform()) {
        await Share.share({ title: 'Depo Dolu yakıt defteri', text: csv, dialogTitle: 'Yakıt defterini paylaş' });
        return;
      }
      const url = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' }));
      const a = document.createElement('a');
      a.href = url;
      a.download = `depodolu-yakit-defteri-${today()}.csv`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch {
      this.message.set('Dışa aktarılamadı.');
    }
  }
}
