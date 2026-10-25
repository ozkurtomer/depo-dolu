import { Component, computed, input } from '@angular/core';
import { PricePoint } from '../models';
import { shortDate, tl } from '../format';

const W = 340;
const H = 150;
const PAD = { top: 14, right: 58, bottom: 26, left: 4 };

/**
 * Basamaklı fiyat grafiği. Akaryakıt fiyatı sürekli kaymaz, gece yarısı bir anda değişir;
 * bu yüzden çizgi yerine merdiven çizilir — her basamak bir zam ya da indirim.
 */
@Component({
  selector: 'dd-price-chart',
  template: `
    @if (model(); as m) {
      <svg [attr.viewBox]="'0 0 ' + W + ' ' + H" role="img" [attr.aria-label]="m.label">
        <line class="grid" [attr.x1]="PAD.left" [attr.x2]="W - PAD.right" [attr.y1]="m.yMax" [attr.y2]="m.yMax" />
        <line class="grid" [attr.x1]="PAD.left" [attr.x2]="W - PAD.right" [attr.y1]="m.yMin" [attr.y2]="m.yMin" />
        <path class="area" [attr.d]="m.area" />
        <path class="step" [attr.d]="m.path" />
        <circle class="now" [attr.cx]="m.lastX" [attr.cy]="m.lastY" r="4.5" />
        <text class="val" [attr.x]="W - PAD.right + 8" [attr.y]="m.yMax + 4">{{ m.maxText }}</text>
        <text class="val" [attr.x]="W - PAD.right + 8" [attr.y]="m.yMin + 4">{{ m.minText }}</text>
        <text class="date" [attr.x]="PAD.left" [attr.y]="H - 6">{{ m.startText }}</text>
        <text class="date end" [attr.x]="W - PAD.right" [attr.y]="H - 6">bugün</text>
      </svg>
    } @else {
      <p class="empty">Henüz değişiklik yok. İlk zam ya da indirimde grafik burada çizilecek.</p>
    }
  `,
  styles: `
    :host { display: block; }
    svg { width: 100%; height: auto; display: block; overflow: visible; }
    .grid { stroke: var(--dd-line); stroke-width: 1; stroke-dasharray: 2 4; }
    .area { fill: var(--dd-brand); opacity: 0.08; }
    .step { fill: none; stroke: var(--dd-brand); stroke-width: 2.5; stroke-linejoin: round; }
    .now { fill: var(--dd-accent); stroke: var(--dd-ink); stroke-width: 2; }
    .val { font: 700 14px var(--dd-num); fill: var(--dd-ink); font-variant-numeric: tabular-nums; }
    .date { font: 500 12px var(--dd-body); fill: var(--dd-soft); }
    .date.end { text-anchor: end; }
    .empty { margin: 0; padding: 1.5rem 0; color: var(--dd-soft); }
  `,
})
export class PriceChartComponent {
  readonly points = input.required<PricePoint[]>();
  readonly W = W;
  readonly H = H;
  readonly PAD = PAD;

  readonly model = computed(() => {
    const pts = this.points();
    if (pts.length < 2) return null;

    const now = Date.now();
    const t0 = pts[0].at.getTime();
    const span = Math.max(now - t0, 1);
    const prices = pts.map(p => p.price);
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    const range = max - min || 1;

    const x = (t: number) => PAD.left + ((t - t0) / span) * (W - PAD.left - PAD.right);
    const y = (v: number) => PAD.top + (1 - (v - min) / range) * (H - PAD.top - PAD.bottom);

    let path = `M${x(t0)},${y(pts[0].price)}`;
    for (let i = 1; i < pts.length; i++) {
      const xi = x(pts[i].at.getTime());
      path += ` H${xi} V${y(pts[i].price)}`;
    }
    const lastY = y(pts[pts.length - 1].price);
    const endX = W - PAD.right;
    path += ` H${endX}`;
    const bottom = H - PAD.bottom;
    const area = `${path} V${bottom} H${x(t0)} Z`;

    return {
      path,
      area,
      lastX: endX,
      lastY,
      yMin: y(min),
      yMax: y(max),
      minText: tl(min),
      maxText: tl(max),
      startText: shortDate(pts[0].at),
      label: `${shortDate(pts[0].at)} ile bugün arasında fiyat ${tl(min)} ile ${tl(max)} TL arasında değişti`,
    };
  });
}
