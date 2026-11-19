import { Component, computed, inject } from '@angular/core';
import { PricesService } from '../services/prices.service';
import { SettingsService } from '../services/settings.service';
import { tl, tlWhole } from '../format';
import { monthlyBudget } from '../trip';
import { t } from '../i18n';

/** Aylık yakıt bütçesi. Km ve tüketim cihazda saklanır, hiçbir yere gönderilmez. */
@Component({
  selector: 'dd-budget',
  template: `
    <section class="card">
      <h2>{{ t('budget.title') }}</h2>
      <div class="fields">
        <label>{{ t('budget.km') }}
          <input type="number" inputmode="numeric" min="1" max="20000" step="50" [value]="settings().monthlyKm"
            (change)="setMonthlyKm($any($event.target).valueAsNumber)" />
        </label>
        <label>{{ t('trip.consumption') }}
          <input type="number" inputmode="decimal" min="1" max="40" step="0.1" [value]="settings().consumption"
            (change)="setConsumption($any($event.target).valueAsNumber)" />
        </label>
      </div>
      @if (budget(); as b) {
        <div class="result" aria-live="polite">
          <p class="big">{{ tlWhole(b.monthly) }} <small>{{ t('budget.unit') }}</small></p>
          <p class="sub">{{ t('budget.sub', { liters: tlWhole(b.liters), yearly: tlWhole(b.yearly) }) }}</p>
        </div>
        <p class="note">{{ t('budget.hikeA') }} <span class="bad">+{{ tlWhole(b.perLiraHike) }} ₺</span> {{ t('budget.hikeB') }}</p>
      } @else {
        <p class="note">{{ t('home.needPrice') }}</p>
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
  readonly t = t;
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
