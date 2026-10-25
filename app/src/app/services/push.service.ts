import { Injectable } from '@angular/core';
import { Capacitor } from '@capacitor/core';
import { FirebaseMessaging } from '@capacitor-firebase/messaging';

export type PushResult = 'ok' | 'denied' | 'unsupported' | 'error';

/**
 * Bildirimler konu (topic) aboneliğiyle çalışır: "bursa_motorin" gibi.
 * Telefon bu konuya abone olur; sunucu kimin abone olduğunu bilmez, sadece konuya mesaj atar.
 * Hesap yok, kişisel veri yok.
 */
@Injectable({ providedIn: 'root' })
export class PushService {
  readonly supported = Capacitor.isNativePlatform();

  async enable(topic: string, previousTopic?: string | null): Promise<PushResult> {
    if (!this.supported) return 'unsupported';
    try {
      let { receive } = await FirebaseMessaging.checkPermissions();
      if (receive === 'prompt' || receive === 'prompt-with-rationale') {
        ({ receive } = await FirebaseMessaging.requestPermissions());
      }
      if (receive !== 'granted') return 'denied';

      if (Capacitor.getPlatform() === 'android') {
        await FirebaseMessaging.createChannel({
          id: 'fiyat',
          name: 'Fiyat değişiklikleri',
          description: 'Seçtiğin ilde yakıt fiyatı değişince',
          importance: 4,
        });
      }

      if (previousTopic && previousTopic !== topic) {
        await FirebaseMessaging.unsubscribeFromTopic({ topic: previousTopic }).catch(() => {});
      }
      await FirebaseMessaging.subscribeToTopic({ topic });
      return 'ok';
    } catch (e) {
      console.error('Bildirim aboneliği başarısız', e);
      return 'error';
    }
  }

  async disable(topic: string | null): Promise<void> {
    if (!this.supported || !topic) return;
    await FirebaseMessaging.unsubscribeFromTopic({ topic }).catch(() => {});
  }
}
