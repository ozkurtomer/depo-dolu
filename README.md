# ⛽ Depo Dolu

**İlini ve yakıtını seç, fiyat değiştiği an bildirim al.**

Benzin, motorin ya da LPG fiyatı senin ilinde değiştiğinde telefonuna anında bildirim gelir:

> ⛽ **Bursa: Motorine zam**
> Litre 97,80 → 99,10 ₺ (+1,30 ₺). 50 litrelik depo artık 4.955 ₺.

Hesap yok, kayıt yok, reklam yok. Sunucu da yok: bütün sistem GitHub Actions ve Firebase'in ücretsiz katmanında çalışır.

![Depo Dolu ekranları](docs/ekranlar.png)
<sub>Ekran görüntülerindeki fiyat geçmişi örnek veridir.</sub>

---

## Nasıl çalışır?

```
 Petrol Ofisi             GitHub Actions (15 dk'da bir)                 Telefon
 81 il fiyat tablosu ──▶  Toplayıcı (.NET 8)                           Depo Dolu
                          1. Tabloyu okur                              (Ionic + Angular)
                          2. Önceki fiyatla karşılaştırır
                          3. data/ klasörüne commit'ler ─────────────▶ Fiyatları GitHub'dan okur
                          4. Firebase'e "bursa_motorin" konusuna ────▶ Bildirim gelir
                             tek mesaj atar
```

- **Veri kaynağı:** Petrol Ofisi'nin il bazında yayınladığı liste fiyatları (KDV dahil). İstanbul Avrupa ve Anadolu yakası ayrı ayrı takip edilir, toplam 82 bölge.
- **Bildirim:** Firebase Cloud Messaging konu (topic) aboneliği. Telefon `bursa_motorin` gibi bir konuya abone olur. Sunucu kimin abone olduğunu bilmez, kişisel veri tutulmaz.
- **Veri deposu:** Reponun kendisi. `data/` klasörü herkese açık bir JSON API'si gibi çalışır:

| Dosya | İçerik |
|---|---|
| `data/latest.json` | 82 bölgenin güncel benzin, motorin, LPG fiyatı |
| `data/history/{il}.json` | O ilin fiyat geçmişi, sadece değişiklik anları |
| `data/changes.json` | Türkiye genelinde son 300 fiyat değişikliği |

### Yanlış bildirime karşı emniyet kemerleri

Binlerce kişiye yanlış "zam geldi" bildirimi gitmesin diye toplayıcı şüpheli veride hiçbir şey yazmadan durur:

- 75'ten az il okunduysa (sayfa yarım yüklendiyse),
- bir fiyat tek seferde %20'den fazla oynadıysa (okuma hatası),
- fiyat tablosu bulunamadıysa (site tasarımı değiştiyse).

İlk çalıştırmada sadece başlangıç verisi yazılır, bildirim gönderilmez. Fiyat değişmediyse hiçbir dosyaya dokunulmaz, gereksiz commit oluşmaz.

---

## Proje yapısı

```
depo-dolu/
├── collector/                     .NET 8 toplayıcı (sıfır NuGet bağımlılığı)
│   ├── DepoDolu.Collector/        PoParser, PriceStore, FcmNotifier, GoogleAccessToken
│   └── DepoDolu.Collector.Tests/  xUnit testleri + gerçek fiyatlarla test sayfası
├── app/                           Ionic 8 + Angular 19 + Capacitor 7 mobil uygulama
├── data/                          Toplayıcının yazdığı fiyat verisi (uygulama buradan okur)
├── tools/                         Test sayfası üretici
└── .github/workflows/             collect.yml (15 dk'da bir) ve ci.yml
```

---

## Kurulum

### 1. Repoyu aç

Bu klasörü GitHub'a `depo-dolu` adıyla gönder. Sonra `app/src/app/config.ts` içindeki `KULLANICI_ADI` kısmını kendi GitHub kullanıcı adınla değiştir.

Toplayıcı hemen çalışmaya başlar: **Actions → Fiyatları topla → Run workflow** ile elle de tetikleyebilirsin.

> GitHub, 60 gün hiç commit olmayan repolarda zamanlanmış işleri durdurur. Fiyatlar değiştikçe toplayıcı commit attığı için bu pratikte sorun olmaz.

### 2. Firebase projesi

1. [Firebase konsolunda](https://console.firebase.google.com) yeni proje aç.
2. **Proje ayarları → Hizmet hesapları → Yeni özel anahtar oluştur** ile bir JSON indir.
3. GitHub reposunda **Settings → Secrets and variables → Actions → New repository secret**:
   - Ad: `FIREBASE_SERVICE_ACCOUNT`
   - Değer: indirdiğin JSON dosyasının tüm içeriği

Bu secret yoksa toplayıcı her şeyi yapar ama bildirim göndermez, sadece loglara yazar.

### 3. Mobil uygulama

```bash
cd app
npm install
npm start                # tarayıcıda dener; yerel data/ klasörünü kullanır
```

Android:

```bash
npx cap add android
# Firebase konsolunda Android uygulaması ekle (paket adı: capacitor.config.ts → appId)
# google-services.json dosyasını app/android/app/ içine koy
npm run cap:sync
npx cap open android     # Android Studio açılır, telefona yükle
```

iOS için `npx cap add ios`, `GoogleService-Info.plist` ve Firebase'e APNs anahtarı yüklemek gerekir. Ayrıntılar: [@capacitor-firebase/messaging](https://github.com/capawesome-team/capacitor-firebase/tree/main/packages/messaging).

---

## Geliştirme

```bash
# Toplayıcıyı yerel test sayfasıyla çalıştır (siteye istek atmaz)
dotnet run --project collector/DepoDolu.Collector -- --data /tmp/data \
  --html collector/DepoDolu.Collector.Tests/Fixtures/po-2026-10-25.html

# Testler
dotnet test collector/DepoDolu.sln
```

Test sayfası, 25 Ekim 2026'nın gerçek fiyatlarıyla `tools/make_fixture.py` tarafından üretilir. Petrol Ofisi sayfası değişirse gerçek sayfayı tarayıcıdan kaydedip `Fixtures/` içine koyarak parser'ı ona karşı test edebilirsin.

---

## Yol haritası

- [ ] **Zam öncesi uyarı:** "Bu gece motorine zam geliyor" haberlerini takip edip pompaya yansımadan önce bildirmek
- [ ] Opet ve Shell fiyatlarını da ekleyip ildeki en ucuz dağıtıcıyı göstermek
- [ ] İlçe bazında fiyat
- [ ] Ana ekran widget'ı

Katkıya açık: issue aç ya da pull request gönder.

---

## Yasal not

Fiyatlar Petrol Ofisi'nin herkese açık sayfasındaki il liste fiyatlarıdır. İstasyonlar arasında küçük farklar olabilir. Bu proje Petrol Ofisi ile bağlantılı değildir.

## English

**Depo Dolu** ("tank full") sends a push notification the moment fuel prices change in your Turkish province. A dependency-free .NET 8 collector runs on GitHub Actions every 15 minutes, commits price data to this repo as a static JSON API, and fans out Firebase topic messages. The mobile app is Ionic + Angular + Capacitor. No servers, no accounts, no personal data. MIT licensed.
