import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.depodolu.app', // Mağazaya çıkmadan önce kendi alan adına göre değiştir (ör. com.omerozkurt.depodolu)
  appName: 'Depo Dolu',
  webDir: 'dist/browser',
  plugins: {
    FirebaseMessaging: {
      // Uygulama açıkken gelen bildirim de görünsün.
      presentationOptions: ['badge', 'sound', 'alert'],
    },
  },
};

export default config;
