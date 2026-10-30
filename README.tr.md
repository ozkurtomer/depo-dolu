<div align="center">

<img src="docs/social-preview.png" alt="Depo Dolu — Türkiye akaryakıt fiyatları, açık veri ve daha kolay takip" width="100%">

# Depo Dolu

[English](README.md) · **Türkçe**

**81 ilde akaryakıt fiyatları. Fiyatı gör, depo maliyetini hesapla, paylaş veya açık JSON API ile kendi uygulamanı geliştir.**

[Web'de dene](https://ozkurtomer.github.io/depo-dolu/) · [API'yi kullan](data/README.md) · [Kod örnekleri](examples/README.md) · [Telegram bildirimleri](https://t.me/depodolu_bot) · [Katkı ver](CONTRIBUTING.md)

[![Testler](https://img.shields.io/github/actions/workflow/status/ozkurtomer/depo-dolu/ci.yml?label=testler)](https://github.com/ozkurtomer/depo-dolu/actions/workflows/ci.yml)
[![Toplayıcı](https://img.shields.io/github/actions/workflow/status/ozkurtomer/depo-dolu/collect.yml?label=toplayici)](https://github.com/ozkurtomer/depo-dolu/actions/workflows/collect.yml)
[![MIT](https://img.shields.io/badge/lisans-MIT-0e3b4a)](LICENSE)
[![Yıldız](https://img.shields.io/github/stars/ozkurtomer/depo-dolu?style=social)](https://github.com/ozkurtomer/depo-dolu/stargazers)

</div>

Litre fiyatının kendi depomuz için ne anlama geldiğini görmek daha faydalı. Depo Dolu; il fiyatını, karşılaştırmayı, geçmişi ve bildirimleri küçük, açık kaynak bir projede birleştirir. Uygulamada hesap açma ve reklam yok.

## Bir dakikada dene

1. [Uygulamayı aç](https://ozkurtomer.github.io/depo-dolu/), ilini ve yakıtını seç.
2. Fiyatı diğer bölgelerle karşılaştır, depo litresini seç.
3. **“Bu fiyatı paylaş”** düğmesiyle fiyatı ve aynı il/yakıtı açan bağlantıyı paylaş.

Örnek: [Bursa · motorin](https://ozkurtomer.github.io/depo-dolu/?il=bursa&yakit=motorin). Uygulama kurmadan bildirim almak için Telegram'da [@depodolu_bot](https://t.me/depodolu_bot) botunu aç ve ilini yaz: sadece kendi ilin ve yakıtın için mesaj alırsın. [@depodolu](https://t.me/depodolu) kanalı ise Türkiye geneli özeti paylaşır.

<p align="center"><img src="docs/ekranlar.png" alt="İl seçimi, yakıt seçimi, depo maliyeti ve fiyat geçmişi" width="100%"></p>
<p align="center"><sub>Uygulamanın örnek görünümü; görseldeki fiyat geçmişi örnek veridir. Gerçek birikmiş geçmiş web demosundadır.</sub></p>

## Neler var?

| Sürücüler için | Geliştiriciler için |
| --- | --- |
| 81 il, 82 bölge için benzin, motorin ve LPG | Anahtarsız, hesapsız, herkese açık JSON |
| Depo maliyeti, bölge karşılaştırması ve fiyat geçmişi | Üretimde NuGet bağımlılığı olmayan .NET toplayıcı |
| İl ve yakıt seçimini taşıyan paylaşım bağlantıları | Angular + Ionic web uygulaması |
| İline özel Telegram bildirimi ([@depodolu_bot](https://t.me/depodolu_bot)) | FCM konuları, Cloudflare Workers + D1 üzerinde Telegram botu ([bot/](bot/README.md)), kalıcı kuyruk ve testler |

**Mevcut kapsam:** fiyatlar Petrol Ofisi'nin il listesinden alınır. Kontroller 15 dakikalık aralıklarla planlanır; gecikebilir, anlık bildirim garantisi yoktur. [Chrome eklentisi](#chrome-eklentisi) Chrome Web Store'a hazır. Mobil uygulamanın dağıtımı [planlanıyor](docs/ROADMAP.md). Web sürümü push bildirimi almaz.

## Chrome eklentisi

<p align="center"><img src="extension/store/screenshot-1.png" alt="Depo Dolu Chrome eklentisi: Bursa motorin fiyatı, Türkiye ortalamasıyla karşılaştırma ve araç çubuğundaki fiyat" width="100%"></p>

İlinin fiyatı araç çubuğunda, tek tık uzağında. İl ve yakıtı seçersin, litre fiyatı simgenin üstünde görünür. Açılan pencerede depo maliyeti (30–70 L), Türkiye ortalamasıyla karşılaştırma, fiyat geçmişi ve Telegram botu bağlantısı var. İstersen seçtiğin fiyat değişince masaüstü bildirimi gelir.

Hesap yok, reklam yok, analiz yok, sayfalara kod eklenmez. Seçimlerin `chrome.storage.local` içinde kalır; tek ağ isteği bu repodaki herkese açık JSON dosyalarıdır. Manifest V3, derleme yok, npm bağımlılığı yok.

- **Chrome Web Store:** mağaza sayfası incelemede. Yayınlanınca bağlantısı buraya eklenecek.
- **Şimdi kaynaktan kur:** `chrome://extensions` → Geliştirici modu → **Paketlenmemiş öğe yükle** → `extension/` klasörünü seç.
- [Eklenti rehberi ve yerel test senaryoları](extension/README.md) · [Gizlilik](extension/PRIVACY.md) · [Mağaza yayın rehberi](extension/STORE.md)

## Son kaydedilen fiyatlar

Bu tabloyu toplayıcı günceller. Tarih, son veri güncellemesini gösterir; son başarılı kontrolü göstermez.

<!-- FIYATLAR:BASLA -->
| İl | Benzin | Motorin | LPG |
|:---|---:|---:|---:|
| **İstanbul (Avrupa)** | 76,30 | 🔺 96,90 | 41,20 |
| **İstanbul (Anadolu)** | 🔺 76,20 | 🔺 96,70 | 40,60 |
| **Ankara** | 77,30 | 🔺 98,00 | 41,29 |
| **İzmir** | 🔺 77,60 | 🔺 98,30 | 41,20 |
| **Bursa** | 🔺 77,50 | 🔺 97,90 | 40,60 |
| **Antalya** | 🔺 78,60 | 🔺 99,30 | 41,40 |
| **Adana** | 🔺 78,20 | 🔺 98,80 | 41,61 |
| **Konya** | 🔺 78,40 | 🔺 99,10 | 41,29 |
| **Gaziantep** | 🔺 78,30 | 🔺 98,90 | 41,41 |
| **Kocaeli** | 🔺 76,80 | 🔺 97,20 | 40,40 |

<sub>Litre fiyatı, KDV dahil, ₺. 🔺 zam / 🔻 indirim: son 36 saat. Son güncelleme: 28 Ekim 2026, 01:56. [81 ilin tamamı](data/latest.json)</sub>

**Son fiyat değişiklikleri**

- 🔺 28 Ekim 2026, 01:56: **İstanbul (Avrupa)** motorin 96,80 → 96,90 ₺ (+0,10)
- 🔺 28 Ekim 2026, 01:56: **İstanbul (Anadolu)** benzin 76,10 → 76,20 ₺ (+0,10)
- 🔺 28 Ekim 2026, 01:56: **İstanbul (Anadolu)** motorin 96,60 → 96,70 ₺ (+0,10)
- 🔺 28 Ekim 2026, 01:56: **Ankara** motorin 97,90 → 98,00 ₺ (+0,10)
- 🔺 28 Ekim 2026, 01:56: **İzmir** benzin 77,50 → 77,60 ₺ (+0,10)
<!-- FIYATLAR:BITIR -->

## Veriyi kendi projende kullan

```js
const url = 'https://raw.githubusercontent.com/ozkurtomer/depo-dolu/main/data/latest.json';
const response = await fetch(url);
if (!response.ok) throw new Error(`Fiyat verisi alınamadı: ${response.status}`);
const { prices, updatedAt } = await response.json();
console.log(prices.bursa.motorin, updatedAt); // TL/litre, son veri güncellemesi
```

| Dosya | İçerik |
| --- | --- |
| [`latest.json`](data/latest.json) | Tüm bölgelerin son fiyatları |
| [`history/bursa.json`](data/history/bursa.json) | Bir ilin fiyat geçmişi |
| [`changes.json`](data/changes.json) | Son fiyat değişiklikleri; ilk değişikliğe kadar boş liste |

Fiyatlar TL/litre ve KDV dahildir. GitHub'ın erişilebilirlik, önbellek ve kullanım sınırları geçerlidir. [Türkçe veri rehberi](data/README.md) · [English API reference](docs/API.md).

**Hazır kullanım örnekleri:** [Python ve Node.js](examples/README.md). Ek paket gerektirmez; yerel JSON dosyasıyla internete çıkmadan da çalışır.

Bu veriyle bir şey geliştirdiysen [issue açıp anlat](https://github.com/ozkurtomer/depo-dolu/issues/new); başkaları da keşfetsin.

## Yerel çalıştırma

**Node.js 22.18+** ve **.NET 8 SDK** gerekir. Repo kökünden:

```bash
git clone https://github.com/ozkurtomer/depo-dolu.git
cd depo-dolu
cd app
npm ci
npm start
```

`http://localhost:4200` adresini aç. Geliştirme sürümü yerel `data/` klasörünü kullanır; Firebase hesabı gerekmez.

Başka bir terminalde, repo kökünden:

```bash
dotnet test collector/DepoDolu.sln
dotnet run --project collector/DepoDolu.Collector -- --data .local-data --html collector/DepoDolu.Collector.Tests/Fixtures/po-2026-10-25.html --dry-run
```

Uygulama kontrolleri, `app/` klasöründen:

```bash
npm test
npm run build
```

## Nasıl çalışır?

```mermaid
flowchart LR
    PO[Petrol Ofisi il listesi] --> C[.NET toplayıcı / GitHub Actions]
    C --> D[Açık JSON ve fiyat geçmişi]
    C --> Q[Kalıcı bildirim kuyruğu]
    D --> W[Angular / Ionic web uygulaması]
    D --> E[Chrome eklentisi: rozet + yerel bildirim]
    Q --> T[Telegram kanalı: Türkiye özeti]
    Q --> B[Telegram botu: sadece abonenin ili]
    B <--> S[(Cloudflare D1: sohbet kimliği, il, yakıt)]
    Q --> F[Mobil istemciler için FCM konuları]
```

Eksik yakıt fiyatı, tekrarlanan veya tanınmayan il satırı, az sayıda satır ve büyük fiyat sıçraması reddedilir. Ayarlanmış kanallarda başarısız olan bildirimler sonraki çalıştırmada tekrar denenir. Bu önlemler fiyat doğruluğunu veya bir mesajın yalnızca bir kez teslimini garanti etmez. [İşletim ve fork kurulumu](docs/OPERATIONS.md).

Seçimler ve son fiyat önbelleği cihazda tutulur. Bu repo kullanıcı hesabı toplamaz; Firebase ve Telegram kendi hizmet verilerini işler. Telegram botu yalnızca sohbet kimliğini ve seçilen il ile yakıtı Cloudflare D1'de tutar, bu repoya asla yazmaz; `/durdur` kaydı siler. [Güvenlik notları](SECURITY.md).

## Birlikte büyütelim

Uygulamayı dene, bir ilin fiyat bağlantısını paylaş, tekrarlanabilir bir hata bildir veya API örneği yaz. İşine yaradıysa vereceğin ⭐ başka geliştiricilerin projeyi keşfetmesine yardımcı olur.

- [Katkı rehberi](CONTRIBUTING.md) — Türkçe ve İngilizce başlangıç bilgileri.
- [Yol haritası ve ilk katkı fikirleri](docs/ROADMAP.md) — Android, iOS ve yeni kaynaklar.
- [Yardım](SUPPORT.md) · [Topluluk ilkeleri](CODE_OF_CONDUCT.md) · [Değişiklikler](CHANGELOG.md).
- Bakımcılar: [GitHub ayarları](docs/GITHUB_SETUP.md) · [Tanıtım kontrol listesi](docs/LAUNCH.md).

---

Veri, Petrol Ofisi il liste fiyatlarıdır; tüm istasyonların piyasa ortalaması değildir. Pompa fiyatları farklı olabilir. Proje Petrol Ofisi ile bağlantılı değildir. Kod lisansı: [MIT](LICENSE). Geliştiren: [Ömer Özkurt](https://github.com/ozkurtomer).
