import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { IonApp } from '@ionic/angular/standalone';
import { HomeComponent } from './home/home.component';
import { PricesService } from './services/prices.service';
import { SettingsService } from './services/settings.service';
import { SetupComponent } from './setup/setup.component';

@Component({
  selector: 'app-root',
  imports: [IonApp, HomeComponent, SetupComponent],
  template: `
    <ion-app>
      @if (settings.loaded()) {
        @if (showSetup()) {
          <dd-setup [canCancel]="!!settings.settings().city" (done)="editing.set(false)" (cancel)="editing.set(false)" />
        } @else {
          <dd-home (change)="editing.set(true)" />
        }
      }
    </ion-app>
  `,
})
export class AppComponent implements OnInit {
  readonly settings = inject(SettingsService);
  private prices = inject(PricesService);

  readonly editing = signal(false);
  readonly showSetup = computed(() => this.editing() || !this.settings.settings().city);

  async ngOnInit() {
    await Promise.all([this.settings.load(), this.prices.loadLatest()]);
  }
}
