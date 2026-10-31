import { Component, computed, inject, signal } from '@angular/core';
import { fuelLabel } from '../models';
import { alarmState, validateTarget } from '../alarm';
import { PricesService } from '../services/prices.service';
import { PushService } from '../services/push.service';
import { SettingsService } from '../services/settings.service';
import { WidgetService } from '../services/widget.service';
import { tl } from '../format';

/** "Motorin 45 ₺'nin altına inince haber ver." Android'de arka planda saatte bir kontrol edilir. */
@Component({
  selector: 'dd-alarm',
  template: `
    <section class="card">
      <h2>Fiyat alarmı</h2>
      @switch (state().kind) {
        @case ('reached') {
          <p class="big good">Hedefin geldi</p>
          <p class="sub">{{ cityName() }} {{ fuelName() }} şu an {{ tl(price()!) }} ₺; hedefin {{ tl(alarm()!.below) }} ₺ idi.</p>
        }
        @case ('waiting') {
          <p class="sub">{{ cityName() }} {{ fuelName() }} <strong>{{ tl(alarm()!.below) }} ₺</strong> ya da altına inince haber vereceğiz.
            Şu an {{ tl(price()!) }} ₺, hedefe {{ tl(gap()) }} ₺ var.</p>
        }
        @case ('unknown') {
          <p class="sub">Hedefin {{ tl(alarm()!.below) }} ₺. Fiyat bilgisi gelince durumu göreceksin.</p>
        }
        @default {
          <p class="sub">{{ fuelName() }} fiyatı istediğin seviyeye inince haber verelim.</p>
          <div class="fields form">
            <label>Hedef fiyat (₺/L)
              <input type="number" inputmode="decimal" min="1" max="999" step="0.01" [value]="target() ?? ''"
                (input)="target.set(numOrNull($any($event.target).valueAsNumber))"
                [placeholder]="price() != null ? tl(price()! - 1) : 'ör. 45,50'" />
            </label>
            <div class="actions" style="align-self: end">
              <button type="button" class="btn" (click)="save()">Alarmı kur</button>
            </div>
          </div>
          @if (error(); as e) { <p class="note bad" role="alert">{{ e }}</p> }
          @if (state().kind === 'elsewhere') {
            <p class="note">Şu anki alarmın başka bir il ya da yakıt için ({{ tl(alarm()!.below) }} ₺). Yenisi onun yerine geçer.</p>
          }
        }
      }
      @if (alarm() && state().kind !== 'elsewhere' && state().kind !== 'none') {
        <div class="actions" style="margin-top: 0.75rem">
          <button type="button" class="btn ghost small" (click)="clear()">Alarmı kaldır</button>
        </div>
      }
      <p class="note">
        @if (widget.supported) {
          Telefonun fiyatı saatte bir kontrol eder, hedefe inince bildirim gönderir.
        } @else {
          Uygulamayı açtığında burada görürsün. Arka planda bildirim Android uygulamasında.
        }
      </p>
      @if (permissionNote()) { <p class="note bad" role="status">{{ permissionNote() }}</p> }
    </section>
  `,
  styleUrl: './tools.scss',
})
export class AlarmComponent {
  private prices = inject(PricesService);
  private push = inject(PushService);
  private settingsService = inject(SettingsService);
  readonly widget = inject(WidgetService);

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
  readonly fuelName = computed(() => {
    const label = fuelLabel(this.settings().fuel);
    return label === 'LPG' ? label : label.toLocaleLowerCase('tr-TR');
  });

  numOrNull = (v: number) => (Number.isFinite(v) ? v : null);

  async save() {
    const s = this.settings();
    const below = this.target();
    const problem = validateTarget(below, this.price());
    if (problem || !s.city || below == null) return this.error.set(problem ?? 'Önce il seç.');
    this.error.set(null);
    await this.settingsService.update({ alarm: { city: s.city, fuel: s.fuel, below: Math.round(below * 100) / 100 } });
    this.target.set(null);
    if (this.widget.supported) {
      const granted = await this.push.requestPermission();
      this.permissionNote.set(granted ? null
        : 'Bildirim izni kapalı. Alarm yine de burada görünür; telefon ayarlarından Depo Dolu bildirimlerine izin verebilirsin.');
    }
  }

  async clear() {
    await this.settingsService.update({ alarm: null });
    this.permissionNote.set(null);
  }
}
