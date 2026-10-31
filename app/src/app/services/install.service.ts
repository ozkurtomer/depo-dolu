import { Injectable, signal } from '@angular/core';
import { Capacitor } from '@capacitor/core';

interface InstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const DISMISSED_KEY = 'depodolu.install.dismissed.v1';

/**
 * Web sürümünü ana ekrana ekleme. Chrome/Edge/Android'de tarayıcının kendi kurulum
 * penceresini açar; iPhone'da Safari'nin "Ana Ekrana Ekle" adımını tarif eder.
 * Uygulama başlarken oluşturulmalı: tarayıcı kurulum olayını sayfa açılır açılmaz gönderir.
 */
@Injectable({ providedIn: 'root' })
export class InstallService {
  private deferred: InstallPromptEvent | null = null;

  readonly canPrompt = signal(false);
  readonly iosHint = signal(false);
  readonly dismissed = signal(readDismissed());

  constructor() {
    if (typeof window === 'undefined' || Capacitor.isNativePlatform() || isStandalone()) return;
    window.addEventListener('beforeinstallprompt', event => {
      event.preventDefault();
      this.deferred = event as InstallPromptEvent;
      this.canPrompt.set(true);
    });
    window.addEventListener('appinstalled', () => {
      this.deferred = null;
      this.canPrompt.set(false);
    });
    this.iosHint.set(/iphone|ipad|ipod/i.test(navigator.userAgent));
  }

  async install(): Promise<void> {
    const event = this.deferred;
    if (!event) return;
    await event.prompt();
    const { outcome } = await event.userChoice;
    this.deferred = null;
    this.canPrompt.set(false);
    if (outcome === 'dismissed') this.dismiss();
  }

  dismiss(): void {
    this.dismissed.set(true);
    try { localStorage.setItem(DISMISSED_KEY, '1'); } catch { /* gizli pencere: sadece bu oturum */ }
  }
}

function isStandalone(): boolean {
  return window.matchMedia?.('(display-mode: standalone)').matches
    || (navigator as Navigator & { standalone?: boolean }).standalone === true;
}

function readDismissed(): boolean {
  try { return localStorage.getItem(DISMISSED_KEY) === '1'; } catch { return false; }
}
