import { Injectable, computed, inject, signal } from '@angular/core';
import { Preferences } from '@capacitor/preferences';
import {
  EMPTY_LOG, FillUp, FuelLog, Vehicle, addFill, fillsOf, monthlySpend, parseLog, realConsumption, removeFill,
  removeVehicle, upsertVehicle,
} from '../fuel-log';
import { SettingsService } from './settings.service';

const KEY = 'depodolu.log.v1';

/** Yakıt defteri ve araçlar. Cihazda saklanır; sunucuya hiçbir şey gönderilmez. */
@Injectable({ providedIn: 'root' })
export class FuelLogService {
  private settings = inject(SettingsService);

  readonly log = signal<FuelLog>(EMPTY_LOG);
  readonly loaded = signal(false);

  readonly active = computed(() => {
    const log = this.log();
    return log.vehicles.find(v => v.id === log.activeId) ?? null;
  });
  readonly activeFills = computed(() => fillsOf(this.log(), this.log().activeId));
  readonly real = computed(() => realConsumption(this.activeFills()));
  readonly spend = computed(() => monthlySpend(this.activeFills()));

  async load(): Promise<void> {
    if (this.loaded()) return;
    try {
      const { value } = await Preferences.get({ key: KEY });
      if (value) this.log.set(parseLog(JSON.parse(value)));
    } catch {
      // Bozuk kayıt: boş defterle devam et, eskisinin üstüne ilk kayıtta yazılır.
    }
    this.loaded.set(true);
  }

  private async save(next: FuelLog) {
    this.log.set(next);
    await Preferences.set({ key: KEY, value: JSON.stringify(next) });
  }

  async saveVehicle(vehicle: Vehicle) {
    const wasActive = this.log().activeId;
    await this.save(upsertVehicle(this.log(), vehicle));
    if (this.log().activeId === vehicle.id) await this.applyToSettings(vehicle, wasActive !== vehicle.id);
  }

  async deleteVehicle(id: string) {
    await this.save(removeVehicle(this.log(), id));
    const next = this.active();
    if (next) await this.applyToSettings(next, true);
  }

  /** Aracı seçince ana ekran onun yakıtını, yolculuk ve bütçe hesabı onun tüketimini kullanır. */
  async activate(id: string) {
    const vehicle = this.log().vehicles.find(v => v.id === id);
    if (!vehicle || this.log().activeId === id) return;
    await this.save({ ...this.log(), activeId: id });
    await this.applyToSettings(vehicle, true);
  }

  async addFill(fill: FillUp) {
    await this.save(addFill(this.log(), fill));
    // Gerçek tüketim çıktıysa tahmini değerin yerine geçer.
    const real = this.real();
    if (real) await this.settings.update({ consumption: Math.round(real.per100 * 10) / 10 });
  }

  async deleteFill(id: string) {
    await this.save(removeFill(this.log(), id));
  }

  private async applyToSettings(vehicle: Vehicle, switchFuel: boolean) {
    const s = this.settings.settings();
    const real = this.real();
    await this.settings.update({ consumption: real ? Math.round(real.per100 * 10) / 10 : vehicle.consumption });
    if (switchFuel && s.city && s.fuel !== vehicle.fuel) await this.settings.select(s.city, vehicle.fuel);
  }
}
