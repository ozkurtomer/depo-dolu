# Android uygulaması

Depo Dolu'nun Android uygulaması, web uygulamasıyla aynı Angular + Ionic kodunu Capacitor 8 ile telefona taşır. Farkı: seçtiğin il ve yakıtta fiyat değişince **telefona bildirim** gelir (Firebase Cloud Messaging, konu aboneliği; hesap yok).

```
app/
├── src/                  Angular + Ionic arayüz (web ile ortak)
├── android/              Android Studio projesi (Capacitor 8, hedef API 36)
├── assets/               Simge ve açılış ekranı kaynakları (1024 / 2732 px)
├── tools/generate_native_assets.py   Simge + bildirim simgesi üretici
└── capacitor.config.ts   Uygulama kimliği: com.omerozkurt.depodolu
```

## Gerekenler

- Node.js 22.18+
- [Android Studio](https://developer.android.com/studio) Otter (2025.2.1) veya daha yeni. JDK Android Studio ile birlikte gelir.
- Telefon (USB hata ayıklama açık) ya da Android Studio'daki emülatör.

## 1. İlk çalıştırma (Firebase'siz, 5 dakika)

```bash
cd app
npm install
npm run android
```

Son komut web kodunu derler, Android projesine kopyalar ve Android Studio'yu açar. Android Studio ilk açılışta Gradle senkronizasyonu yapar (birkaç dakika sürebilir). Sonra üstte cihazını seç ve yeşil **Run ▶** düğmesine bas.

Firebase dosyası olmadan da uygulama açılır, fiyatlar ve depo hesabı çalışır. Sadece bildirim düğmesi "Bildirim ayarı değiştirilemedi" der. Bildirim için 2. adım gerekli.

Telefonda USB hata ayıklama: **Ayarlar → Telefon hakkında → Yapım numarası**'na 7 kez dokun → geri dön → **Geliştirici seçenekleri → USB hata ayıklama** açık. Telefonu kabloyla bağla, telefonda çıkan izni onayla.

## 2. Bildirimler (Firebase)

Toplayıcı (GitHub Actions) fiyat değişince `bursa_motorin` gibi bir konuya mesaj atar. Telefon o konuya abone olur. Bunun için uygulamanın Firebase projesine bağlanması gerekir:

1. [Firebase Console](https://console.firebase.google.com/) → Depo Dolu projesi (toplayıcının `FIREBASE_SERVICE_ACCOUNT` sırrı hangi projedense o).
2. Proje özetinde **Add app** (Uygulama ekle) → **Android** simgesi.
3. **Android package name:** `com.omerozkurt.depodolu` (birebir aynı olmalı). Takma ad: Depo Dolu. SHA-1 boş kalabilir.
4. **Register app** → `google-services.json` dosyasını indir.
5. Dosyayı şuraya koy: `app/android/app/google-services.json`
6. Android Studio'da **File → Sync Project with Gradle Files**, sonra tekrar **Run ▶**.

`google-services.json` herkese açık repoya girmesin diye `.gitignore` içinde. Kaybetmemek için Firebase'den her zaman tekrar indirebilirsin.

**Deneme:** Uygulamada il ve yakıt seç, bildirimi aç, izin ver. Sonra GitHub → **Actions → Test bildirimi gönder → Run workflow**: aynı il ve yakıtı seç, "Telegram kanalına da gönder" kutusu boş kalsın. Uygulama arka plandayken telefona "🧪 Test" bildirimi gelir.

## 3. APK'yı GitHub'dan indir (Android Studio'suz)

Her push'ta **CI** iş akışı bir test APK'sı (`app-debug.apk`) üretir:

1. GitHub → **Actions → CI** → en son başarılı çalıştırma.
2. Sayfanın altındaki **Artifacts** bölümünden `depo-dolu-android-debug` dosyasını indir, ZIP'i aç.
3. APK'yı telefona at ve aç. Telefon "bilinmeyen kaynaklardan yükleme" izni ister.

Bu APK'da bildirimlerin çalışması için `google-services.json` içeriğini GitHub'a sır olarak ekle: **Settings → Secrets and variables → Actions → New repository secret**, ad `GOOGLE_SERVICES_JSON`, değer dosyanın tüm içeriği.

## 4. Google Play'e yükleme

1. [Play Console](https://play.google.com/console) hesabı aç (tek seferlik 25 ABD doları, kimlik doğrulaması istenir).
2. **Create app** → ad: Depo Dolu, dil: Türkçe, Uygulama, Ücretsiz.
3. Android Studio → **Build → Generate Signed App Bundle or APK → Android App Bundle**. Yeni bir anahtar deposu (keystore) oluştur.
   - **Keystore dosyasını ve şifresini kaybetme, repoya koyma.** `.jks`/`.keystore` dosyaları `.gitignore` içinde. Play App Signing açık olduğunda bu "yükleme anahtarı" olur; kaybolursa Play Console'dan sıfırlanabilir ama zahmetlidir.
4. Üretilen `app-release.aab` dosyasını Play Console'da **Test and release → Testing → Closed testing** kanalına yükle.
5. Yeni kişisel geliştirici hesaplarında üretime çıkmadan önce **en az 12 test kullanıcısının 14 gün kesintisiz** kapalı testte kalması gerekiyor. Arkadaş ve aileni test listesine ekle, Telegram kanalından da gönüllü toplayabilirsin.
6. Mağaza sayfası için uygulama simgesi `app/assets/icon-only.png` (512 px'e küçült), açıklamalar için `extension/STORE.md` içindeki metinler uyarlanabilir. Gizlilik politikası adresi: `https://github.com/ozkurtomer/depo-dolu/blob/main/docs/PRIVACY.md`. Play Console'daki **Veri güvenliği** formunda: veri toplanmıyor; Firebase bildirim kimliği yalnızca bildirim için ve Google tarafından işleniyor.

Her yeni sürümde `app/android/app/build.gradle` içindeki `versionCode` değerini 1 artır, `versionName`'i güncelle.

## Günlük geliştirme

```bash
cd app
npm start              # tarayıcıda hızlı geliştirme (localhost:4200)
npm run cap:sync       # web değişikliklerini Android projesine kopyala
npm run android        # derle + kopyala + Android Studio'yu aç
```

Simgeyi değiştirmek için `tools/generate_native_assets.py` içindeki çizimi düzenle ve `npm run assets:native` çalıştır (Python + Pillow gerekir). Bu komut uygulama simgesini, açılış ekranını ve bildirim çubuğundaki beyaz pompa simgesini (`ic_stat_fuel`) üretir.

## Sık sorunlar

| Belirti | Çözüm |
|---|---|
| Android Studio "SDK location not found" | Android Studio'yu bir kez normal açıp SDK kurulumunu tamamla, sonra projeyi yeniden aç. |
| Gradle "Unsupported class file major version" | **Settings → Build Tools → Gradle → Gradle JDK**: Android Studio'nun kendi JDK'sını (jbr-21) seç. |
| Bildirim düğmesi hata veriyor | `google-services.json` yok ya da paket adı `com.omerozkurt.depodolu` değil. |
| Bildirim gelmiyor | Uygulama açıkken Android bildirimi göstermez; uygulamayı arka plana al. Telefon ayarlarında Depo Dolu bildirimleri açık mı kontrol et. |
| Web değişikliği telefonda görünmüyor | `npm run cap:sync` çalıştır, sonra tekrar **Run ▶**. |
