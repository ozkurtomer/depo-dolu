import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { IonApp } from '@ionic/angular/standalone';
import { HomeComponent } from './home/home.component';
import { PricesService } from './services/prices.service';
import { SettingsService } from './services/settings.service';
import { SetupComponent } from './setup/setup.component';
import { selectionFromUrl } from './share';

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

  readonly pickingCity = signal(false);
  readonly showSetup = computed(() => this.pickingCity() || !this.settings.settings().city);

  async ngOnInit() {
    await Promise.all([this.settings.load(), this.prices.loadLatest()]);
    const latest = this.prices.latest();
    const shared = latest ? selectionFromUrl(new URL(window.location.href), latest) : null;
    if (shared) await this.settings.select(shared.city, shared.fuel);
  }
}
