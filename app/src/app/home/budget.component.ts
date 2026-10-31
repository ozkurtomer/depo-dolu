import { Component, computed, inject } from '@angular/core';
import { PricesService } from '../services/prices.service';
import { SettingsService } from '../services/settings.service';
import { tl, tlWhole } from '../format';
import { monthlyBudget } from '../trip';

/** Aylık yakıt bütçesi. Km ve tüketim cihazda saklanır, hiçbir yere gönderilmez. */
@Component({
  selector: 'dd-budget',
  template: `
    <section class="card">
      <h2>Aylık yakıt bütçen</h2>
      <div class="fields">
        <label>Ayda kaç km?
          <input type="number" inputmode="numeric" min="1" max="20000" step="50" [value]="settings().monthlyKm"
            (change)="setMonthlyKm($any($event.target).valueAsNumber)" />
        </label>
        <label>Tüketim (L/100 km)
          <input type="number" inputmode="decimal" min="1" max="40" step="0.1" [value]="settings().consumption"
            (change)="setConsumption($any($event.target).valueAsNumber)" />
        </label>
      </div>
      @if (budget(); as b) {
        <div class="result" aria-live="polite">
          <p class="big">{{ tlWhole(b.monthly) }} <small>₺/ay</small></p>
          <p class="sub">{{ tlWhole(b.liters) }} L · yılda {{ tlWhole(b.yearly) }} ₺</p>
        </div>
        <p class="note">Litreye 1 ₺ zam bütçene ayda <span class="bad">+{{ tlWhole(b.perLiraHike) }} ₺</span> ekler.</p>
      } @else {
        <p class="note">Hesaplamak için fiyat bilgisi gerekiyor.</p>
      }
    </section>
  `,
  styleUrl: './tools.scss',
})
export class BudgetComponent {
  private prices = inject(PricesService);
  private settingsService = inject(SettingsService);

  readonly settings = this.settingsService.settings;
  readonly tl = tl;
  readonly tlWhole = tlWhole;

  readonly budget = computed(() => {
    const s = this.settings();
    const price = s.city ? this.prices.latest()?.prices[s.city]?.[s.fuel] ?? null : null;
    return price == null ? null : monthlyBudget(s.monthlyKm, s.consumption, price);
  });

  setMonthlyKm(value: number) {
    if (Number.isFinite(value) && value > 0 && value <= 20000) this.settingsService.update({ monthlyKm: value });
  }

  setConsumption(value: number) {
    if (Number.isFinite(value) && value > 0 && value <= 40) this.settingsService.update({ consumption: value });
  }
}
