import { Injectable } from '@angular/core';
import { Capacitor } from '@capacitor/core';
import { FirebaseMessaging } from '@capacitor-firebase/messaging';
import { Preferences } from '@capacitor/preferences';
import { TopicSubscriptions } from '../subscription-state';

export type PushResult = 'ok' | 'denied' | 'unsupported' | 'error';

/**
 * Bildirimler konu (topic) aboneliğiyle çalışır: "bursa_motorin" gibi.
 * Telefon bu konuya abone olur; sunucu kimin abone olduğunu bilmez, sadece konuya mesaj atar.
 * Hesap yok, kişisel veri yok.
 */
@Injectable({ providedIn: 'root' })
export class PushService {
  readonly supported = Capacitor.isNativePlatform();
  private topics = new TopicSubscriptions({
    subscribe: async topic => { await FirebaseMessaging.subscribeToTopic({ topic }); },
    unsubscribe: async topic => { await FirebaseMessaging.unsubscribeFromTopic({ topic }); },
  }, {
    read: async () => {
      const { value } = await Preferences.get({ key: 'depodolu.topics.v1' });
      const topics: unknown = value ? JSON.parse(value) : [];
      if (!Array.isArray(topics) || !topics.every(t => typeof t === 'string'))
        throw new Error('Bildirim kaydı okunamadı');
      return topics;
    },
    write: async topics => { await Preferences.set({ key: 'depodolu.topics.v1', value: JSON.stringify(topics) }); },
  });

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

      await this.topics.reconcile(topic, previousTopic);
      return 'ok';
    } catch (e) {
      console.error('Bildirim aboneliği başarısız', e);
      return 'error';
    }
  }

  async disable(topic: string | null): Promise<void> {
    if (!this.supported) return;
    await this.topics.reconcile(null, topic);
  }
}
