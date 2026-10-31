import { Component, OnInit, computed, effect, inject, signal } from '@angular/core';
import { IonApp } from '@ionic/angular/standalone';
import { HomeComponent } from './home/home.component';
import { InstallService } from './services/install.service';
import { PricesService } from './services/prices.service';
import { SettingsService } from './services/settings.service';
import { SetupComponent } from './setup/setup.component';
import { cityPagePath, selectionFromUrl } from './share';
import { CITY_COORDS } from './trip';

@Component({
  selector: 'app-root',
  imports: [IonApp, HomeComponent, SetupComponent],
  template: `
    <ion-app>
      @if (settings.loaded()) {
        @if (showSetup()) {
          <dd-setup [mode]="settings.settings().city ? 'city' : 'onboard'" (done)="pickingCity.set(false)" />
        } @else {
          <dd-home (pickCity)="pickingCity.set(true)" />
        }
      }
    </ion-app>
  `,
})
export class AppComponent implements OnInit {
  readonly settings = inject(SettingsService);
  private prices = inject(PricesService);
  // Tarayıcının kurulum olayı sayfa açılır açılmaz gelir; servis şimdiden dinlemeli.
  private install = inject(InstallService);

  readonly pickingCity = signal(false);
  readonly showSetup = computed(() => this.pickingCity() || !this.settings.settings().city);

  /** Statik il sayfasından (bursa/motorin/) açıldıysa adres seçimle birlikte değişir. */
  private onCityPage = signal(false);

  constructor() {
    effect(() => {
      const { city, fuel } = this.settings.settings();
      if (!this.onCityPage() || !city) return;
      const next = new URL(cityPagePath(city, fuel), document.baseURI);
      if (next.pathname !== window.location.pathname) history.replaceState(null, '', next);
    });
  }

  async ngOnInit() {
    const pricesLoaded = this.prices.loadLatest();
    await this.settings.load();
    // Paylaşılan seçim fiyatlar gelmeden uygulanır: il sayfasından gelen yeni kullanıcı
    // önce "Hangi ilde?" ekranını görmesin. İl anahtarları sabit listeyle doğrulanır.
    const url = new URL(window.location.href);
    const shared = selectionFromUrl(url, { prices: CITY_COORDS });
    if (shared) {
      await this.settings.select(shared.city, shared.fuel);
      this.onCityPage.set(!url.searchParams.has('il'));
    }
    await pricesLoaded;
  }
}
