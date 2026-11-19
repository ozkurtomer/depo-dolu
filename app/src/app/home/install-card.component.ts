import { Component, computed, inject } from '@angular/core';
import { InstallService } from '../services/install.service';
import { t } from '../i18n';

/** Web sürümünü ana ekrana ekleme önerisi. Kapatılınca bir daha gösterilmez. */
@Component({
  selector: 'dd-install-card',
  template: `
    @if (visible()) {
      <section class="card">
        <h2>{{ t('install.title') }}</h2>
        @if (install.canPrompt()) {
          <p class="sub">{{ t('install.sub') }}</p>
          <p class="actions">
            <button type="button" class="btn" (click)="install.install()">{{ t('install.add') }}</button>
            <button type="button" class="btn ghost" (click)="install.dismiss()">{{ t('install.notNow') }}</button>
          </p>
        } @else {
          <p class="sub">{{ t('install.ios1') }} <strong>{{ t('install.share') }}</strong>{{ t('install.ios2') }}<strong>{{ t('install.addHome') }}</strong>{{ t('install.ios3') }}</p>
          <p class="actions"><button type="button" class="btn ghost" (click)="install.dismiss()">{{ t('install.ok') }}</button></p>
        }
        <p class="note">{{ t('install.note') }}</p>
      </section>
    }
  `,
  styleUrl: './tools.scss',
  styles: `.actions { display: flex; gap: 0.5rem; margin: 0.75rem 0 0; }`,
})
export class InstallCardComponent {
  readonly install = inject(InstallService);
  readonly t = t;
  readonly visible = computed(() => !this.install.dismissed() && (this.install.canPrompt() || this.install.iosHint()));
}
