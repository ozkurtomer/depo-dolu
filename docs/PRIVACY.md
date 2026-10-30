# Gizlilik / Privacy — Depo Dolu (web ve Android)

Son güncelleme: 31 Ekim 2026

## Türkçe

Depo Dolu hesap, reklam veya analiz/telemetri hizmeti kullanmaz.

- **Seçimlerin cihazında kalır.** İl, yakıt, depo büyüklüğü ve bildirim tercihi cihazın yerel depolamasında saklanır; geliştiriciye gönderilmez.
- **Fiyat verisi:** Uygulama herkese açık fiyat dosyalarını `raw.githubusercontent.com/ozkurtomer/depo-dolu` adresinden indirir. GitHub, normal ağ bağlantısı bilgilerini (IP adresi gibi) kendi koşullarına göre işler.
- **Bildirimler (Android, isteğe bağlı):** Bildirimi açarsan uygulama Google Firebase Cloud Messaging'de `bursa_motorin` gibi bir konuya abone olur. Firebase bunun için cihaza özel bir bildirim kimliği oluşturur ve Google'ın [gizlilik koşullarına](https://firebase.google.com/support/privacy) göre işler. Depo Dolu bu kimliği görmez ve saklamaz; fiyat değişince sadece konuya mesaj gönderir. Bildirimi kapatınca abonelik kaldırılır.
- **Telegram botu (isteğe bağlı):** [@depodolu_bot](https://t.me/depodolu_bot) kullanırsan, sana mesaj gönderebilmek için Telegram sohbet kimliğin ve seçtiğin il/yakıt Cloudflare D1 veritabanında saklanır. Bu bilgi bu repoya yazılmaz. `/durdur` kaydı siler.
- **Paylaşım:** "Paylaş" düğmesi telefonun paylaşım menüsünü açar; nereye gönderileceğini sen seçersin.
- Uygulamayı silmek cihazdaki tüm Depo Dolu verilerini siler.

Chrome eklentisinin gizlilik metni: [extension/PRIVACY.md](../extension/PRIVACY.md).

İletişim: [GitHub Issues](https://github.com/ozkurtomer/depo-dolu/issues)

## English

Depo Dolu has no accounts, ads, analytics or telemetry. Your province, fuel, tank size and notification choice stay in local storage on your device. Public price files are downloaded from `raw.githubusercontent.com/ozkurtomer/depo-dolu`; GitHub processes ordinary connection data under its own terms.

If you turn on notifications in the Android app, the app subscribes to a Firebase Cloud Messaging topic such as `bursa_motorin`. Firebase creates a device-specific messaging token and processes it under Google's [privacy terms](https://firebase.google.com/support/privacy). Depo Dolu never receives or stores that token; it only sends messages to the topic. Turning notifications off removes the subscription.

If you use the optional Telegram bot, your Telegram chat ID and chosen province/fuel are stored in Cloudflare D1 so the bot can message you. They are never written to this repository, and `/durdur` deletes them. Uninstalling the app deletes all of its local data.

Contact: [GitHub Issues](https://github.com/ozkurtomer/depo-dolu/issues)
