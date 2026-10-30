import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.omerozkurt.depodolu',
  appName: 'Depo Dolu',
  webDir: 'dist/browser',
  plugins: {
    // Uygulama zemini açık renk: durum çubuğu ve alt çubuk ikonları koyu olsun (telefon karanlık modda olsa da).
    // index.html viewport-fit=cover kullanıyor; Capacitor env(safe-area-inset-*) değerlerini doğru verir.
    SystemBars: {
      style: 'LIGHT',
      initialViewportFitValueHint: 'cover',
    },
    FirebaseMessaging: {
      presentationOptions: ['badge', 'sound', 'alert'],
    },
  },
};

export default config;
