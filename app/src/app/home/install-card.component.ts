import { Component, computed, inject } from '@angular/core';
import { InstallService } from '../services/install.service';

/** Web sürümünü ana ekrana ekleme önerisi. Kapatılınca bir daha gösterilmez. */
@Component({
  selector: 'dd-install-card',
  template: `
    @if (visible()) {
      <section class="card">
        <h2>Ana ekrana ekle</h2>
        @if (install.canPrompt()) {
          <p class="sub">Depo Dolu'yu uygulama gibi tek dokunuşla aç. Mağaza yok, hesap yok.</p>
          <p class="actions">
            <button type="button" class="btn" (click)="install.install()">Ekle</button>
            <button type="button" class="btn ghost" (click)="install.dismiss()">Şimdi değil</button>
          </p>
        } @else {
          <p class="sub">Safari'de <strong>Paylaş</strong> düğmesine, ardından <strong>Ana Ekrana Ekle</strong>'ye dokun.</p>
          <p class="actions"><button type="button" class="btn ghost" (click)="install.dismiss()">Tamam</button></p>
        }
        <p class="note">Çevrimdışıyken son kaydedilen fiyatlar açıkça belirtilerek gösterilir.</p>
      </section>
    }
  `,
  styleUrl: './tools.scss',
  styles: `.actions { display: flex; gap: 0.5rem; margin: 0.75rem 0 0; }`,
})
export class InstallCardComponent {
  readonly install = inject(InstallService);
  readonly visible = computed(() => !this.install.dismissed() && (this.install.canPrompt() || this.install.iosHint()));
}
