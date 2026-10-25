# Katkı rehberi

Depo Dolu'ya katkı vermek istediğin için teşekkürler. Küçük bir yazım düzeltmesi de olur, yeni bir dağıtıcı eklemek de.

## Nereden başlamalı?

- [`good first issue`](https://github.com/ozkurtomer/depo-dolu/labels/good%20first%20issue) etiketli işler ilk katkı için uygun.
- Büyük bir değişiklik düşünüyorsan önce bir issue açıp konuşalım, emeğin boşa gitmesin.
- Bir hata gördüysen: hangi il, hangi yakıt, ne bekliyordun, ne oldu? Bunları yazman yeterli.

## Geliştirme ortamı

İhtiyacın olanlar: .NET 8 SDK ve Node.js 20 veya üstü.

```bash
# Toplayıcı testleri
dotnet test collector/DepoDolu.sln

# Toplayıcıyı siteye istek atmadan çalıştır
dotnet run --project collector/DepoDolu.Collector -- --data /tmp/data \
  --html collector/DepoDolu.Collector.Tests/Fixtures/po-2026-10-25.html

# Uygulama (http://localhost:4200, yerel data/ klasörünü kullanır)
cd app && npm install && npm start
```

## Kurallar

- **Toplayıcı NuGet paketi kullanmaz.** Bu bilinçli bir seçim: GitHub Actions'ta hızlı ve kırılmaz çalışsın. Yeni bir şey gerekiyorsa önce .NET'in kendi kütüphanelerine bak.
- **Yanlış bildirim, hiç bildirim olmamasından kötüdür.** Toplayıcıya eklenen her veri kaynağı `PriceStore.Validate` kontrolünden geçmeli.
- **İl anahtarları (`bursa`, `istanbul-avrupa`…) asla değişmez.** Kullanıcıların bildirim aboneliği bunlara bağlı.
- `data/` klasörünü elle düzenleme; o klasörü sadece toplayıcı yazar.
- Kod ve commit mesajları Türkçe ya da İngilizce olabilir. Arayüz metinleri Türkçe.

## Pull request

1. Fork'la ve bir dal aç.
2. Değişikliğini yap, testleri çalıştır.
3. Pull request açarken ne değiştiğini ve neden değiştiğini kısaca yaz. Arayüz değişikliğiyse ekran görüntüsü ekle.

## Yeni bir dağıtıcı eklemek (Opet, Shell…)

En çok istenen katkılardan biri. Kabaca şu adımlar gerekiyor:

1. `collector/DepoDolu.Collector/` içine `PoParser` benzeri bir ayrıştırıcı ekle.
2. Gerçek sayfanın bir kopyasını `Fixtures/` klasörüne koyup testini yaz.
3. Veri biçimini nasıl genişleteceğimizi (ör. `prices.bursa.opet.benzin`) issue'da birlikte kararlaştıralım. Mevcut API'yi kullananlar bozulmamalı.
