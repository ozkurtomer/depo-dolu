import { Component, inject } from '@angular/core';
import { t } from './i18n';
import { LangService } from './services/lang.service';

/** TR / EN düğmesi. Düğmedeki kısaltma geçilecek dili gösterir. */
@Component({
  selector: 'dd-lang-switch',
  template: `
    <button type="button" class="lang" (click)="i18n.toggle()" [attr.aria-label]="t('lang.switch')" [attr.lang]="i18n.lang() === 'tr' ? 'en' : 'tr'">
      {{ t('lang.short') }}
    </button>
  `,
  styles: `
    .lang {
      font: 700 12px var(--dd-body); letter-spacing: 0.04em; cursor: pointer;
      color: var(--dd-brand); background: transparent; border: 1.5px solid var(--dd-line);
      border-radius: 999px; padding: 0.3rem 0.65rem;
    }
    .lang:hover { border-color: var(--dd-brand); }
  `,
})
export class LangSwitchComponent {
  readonly i18n = inject(LangService);
  readonly t = t;
}
