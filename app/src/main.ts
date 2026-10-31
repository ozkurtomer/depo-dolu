import { isDevMode } from '@angular/core';
import { bootstrapApplication } from '@angular/platform-browser';
import { Capacitor } from '@capacitor/core';
import { appConfig } from './app/app.config';
import { AppComponent } from './app/app.component';

bootstrapApplication(AppComponent, appConfig)
  .catch((err) => console.error(err));

// Web sürümü ana ekrana eklenebilir ve çevrimdışı açılabilir (bkz. public/sw.js).
// Android uygulaması dosyaları zaten cihazdan açar, orada service worker gerekmez.
if (!isDevMode() && !Capacitor.isNativePlatform() && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register(new URL('sw.js', document.baseURI)).catch(() => { });
  });
}
