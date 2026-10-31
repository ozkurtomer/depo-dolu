# Gizlilik / Privacy — Depo Dolu (web ve Android)

Son güncelleme: 1 Kasım 2026

## Türkçe

Depo Dolu hesap ve reklam kullanmaz. Android uygulamasında analiz/telemetri yoktur.

- **Seçimlerin cihazında kalır.** İl, yakıt, depo büyüklüğü, bildirim tercihi, fiyat alarmı, araçların ve yakıt defterindeki dolumlar cihazın yerel depolamasında saklanır; geliştiriciye gönderilmez. Yakıt defterini "Dışa aktar" ile kendin paylaşabilirsin.
- **Ana ekran kutusu ve fiyat alarmı (Android):** Kutu eklediysen ya da alarm kurduysan telefon saatte bir herkese açık fiyat dosyasını indirir ve karşılaştırmayı cihazda yapar. Alarm bildirimi telefonun kendisi tarafından gösterilir; hiçbir sunucuya alarm bilgisi gitmez.
- **Web ziyaret sayacı (sadece web sitesi):** Web sayfalarında [GoatCounter](https://www.goatcounter.com/help/privacy) ile çerezsiz, toplu ziyaret sayımı yapılabilir: hangi sayfanın açıldığı, yönlendiren site, tarayıcı türü ve ülke. Kişiyi tanımlayan veri ya da çerez tutulmaz. Android uygulamasında bu sayaç yoktur.
- **Fiyat verisi:** Uygulama herkese açık fiyat dosyalarını `raw.githubusercontent.com/ozkurtomer/depo-dolu` adresinden indirir. GitHub, normal ağ bağlantısı bilgilerini (IP adresi gibi) kendi koşullarına göre işler.
- **Bildirimler (Android, isteğe bağlı):** Bildirimi açarsan uygulama Google Firebase Cloud Messaging'de `bursa_motorin` gibi bir konuya abone olur. Firebase bunun için cihaza özel bir bildirim kimliği oluşturur ve Google'ın [gizlilik koşullarına](https://firebase.google.com/support/privacy) göre işler. Depo Dolu bu kimliği görmez ve saklamaz; fiyat değişince sadece konuya mesaj gönderir. Bildirimi kapatınca abonelik kaldırılır.
- **Telegram botu (isteğe bağlı):** [@depodolu_bot](https://t.me/depodolu_bot) kullanırsan, sana mesaj gönderebilmek için Telegram sohbet kimliğin ve seçtiğin il/yakıt Cloudflare D1 veritabanında saklanır. Bu bilgi bu repoya yazılmaz. `/durdur` kaydı siler.
- **Paylaşım:** "Paylaş" düğmesi telefonun paylaşım menüsünü açar; nereye gönderileceğini sen seçersin.
- Uygulamayı silmek cihazdaki tüm Depo Dolu verilerini siler.

Chrome eklentisinin gizlilik metni: [extension/PRIVACY.md](../extension/PRIVACY.md).

İletişim: [GitHub Issues](https://github.com/ozkurtomer/depo-dolu/issues)

## English

Depo Dolu has no accounts or ads, and the Android app has no analytics or telemetry. Your province, fuel, tank size, notification choice, price alarm, vehicles and fuel log stay in local storage on your device. With a home screen widget or price alarm, the Android app downloads the public price file hourly and compares on the device; alarm notifications are shown locally. The website may count visits with cookie-free, aggregate [GoatCounter](https://www.goatcounter.com/help/privacy) analytics (page, referrer, browser type, country); no cookies or personal identifiers are stored, and the Android app does not include it. Public price files are downloaded from `raw.githubusercontent.com/ozkurtomer/depo-dolu`; GitHub processes ordinary connection data under its own terms.

If you turn on notifications in the Android app, the app subscribes to a Firebase Cloud Messaging topic such as `bursa_motorin`. Firebase creates a device-specific messaging token and processes it under Google's [privacy terms](https://firebase.google.com/support/privacy). Depo Dolu never receives or stores that token; it only sends messages to the topic. Turning notifications off removes the subscription.

If you use the optional Telegram bot, your Telegram chat ID and chosen province/fuel are stored in Cloudflare D1 so the bot can message you. They are never written to this repository, and `/durdur` deletes them. Uninstalling the app deletes all of its local data.

Contact: [GitHub Issues](https://github.com/ozkurtomer/depo-dolu/issues)
