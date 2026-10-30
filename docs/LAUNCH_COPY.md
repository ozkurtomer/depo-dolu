# Launch copy / Tanıtım metinleri

Drafts for the owner to review and post. Nothing in this file has been published automatically. Verify the deployed demo and current CI status before sharing.

## Türkçe — LinkedIn / geliştirici toplulukları

Türkiye'de akaryakıt fiyatlarını takip etmek ve veriyi başka projelerde kullanmak için Depo Dolu'yu geliştiriyorum.

81 ilde benzin, motorin ve LPG fiyatını görebiliyor; depo maliyetini hesaplayabiliyor ve seçtiğin ilin fiyatını bağlantısıyla paylaşabiliyorsun. Geliştiriciler için anahtarsız, herkese açık JSON verisi de var.

Teknik tarafta .NET toplayıcı, Angular/Ionic arayüz ve GitHub Actions kullanıyorum. Fiyatlar Petrol Ofisi il listesinden alınıyor; kontroller 15 dakikalık aralıklarla planlanıyor. Chrome eklentisi de var: fiyat araç çubuğunda, zam gelince bildirim. Mobil uygulama sonraki adım.

Demo: https://ozkurtomer.github.io/depo-dolu/
Kod ve API: https://github.com/ozkurtomer/depo-dolu

Bir il seçip denersen deneyimini duymak isterim. Açık veriyle bot veya başka bir araç geliştirmek isteyenlerin katkısına da açığım. İşine yaradıysa GitHub'da ⭐ verebilirsin.

## Türkçe — kısa paylaşım

Depo Dolu: 81 ilde benzin, motorin ve LPG fiyatları; depo maliyeti ve paylaşılabilir il bağlantıları. Açık kaynak, geliştiriciler için anahtarsız JSON verisi var. Kaynak: Petrol Ofisi il listesi.

Dene: https://ozkurtomer.github.io/depo-dolu/
Kod/API: https://github.com/ozkurtomer/depo-dolu

## English — Show DEV / technical introduction

I built Depo Dolu, an open-source fuel price tracker and public JSON dataset for Turkey's 81 provinces.

The web app lets you choose gasoline, diesel or LPG, compare region list prices, calculate a tank and share a province/fuel link. Developers can consume the JSON without an API key or account.

The project combines a .NET collector, GitHub Actions, Angular/Ionic and Telegram/FCM delivery. One challenge was handling partial source data and failed notifications; the collector validates snapshots and persists unfinished deliveries for retry.

The source is Petrol Ofisi's public province list. Checks are scheduled every 15 minutes and may be delayed; this is not a market-wide station-price comparison. A Chrome extension shows the price on the toolbar and can alert on changes; native mobile distribution is planned.

Try it: https://ozkurtomer.github.io/depo-dolu/
Source and API: https://github.com/ozkurtomer/depo-dolu

I'd appreciate feedback on the data contract and first-use experience. Small contribution ideas are in the roadmap.
