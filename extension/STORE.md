# Chrome Web Store yayın rehberi

Bu dosya, Depo Dolu eklentisini Chrome Web Store'a göndermek için gereken her şeyi tek yerde toplar: paket, görseller, mağaza metinleri ve gizlilik sekmesine yapıştırılacak cevaplar.

Kaynak: Google'ın güncel belgeleri ([yayınlama](https://developer.chrome.com/docs/webstore/publish), [mağaza sayfası](https://developer.chrome.com/docs/webstore/cws-dashboard-listing), [gizlilik sekmesi](https://developer.chrome.com/docs/webstore/cws-dashboard-privacy), [görseller](https://developer.chrome.com/docs/webstore/images)). Panel arayüzü İngilizce görünebilir; aşağıda düğme adları paneldeki haliyle yazıldı.

## 0. Hazırlık (bir kerelik)

1. [Chrome Developer Dashboard](https://chrome.google.com/webstore/devconsole) adresini aç ve Google hesabınla gir.
2. İlk girişte kayıt ekranı çıkar: geliştirici sözleşmesini kabul et, **tek seferlik kayıt ücretini** öde (5 ABD doları).
3. Geliştirici e-postası sonradan değiştirilemez; kalıcı kullanacağın adresi seç.
4. Yeni yayıncılar başlangıçta en fazla iki eklenti yayınlayabilir. Depo Dolu için sorun değil.

## 1. Paketi oluştur

Repo kökünden:

```bash
cd extension
npm test
npm run check
npm run package
```

Çıktı: `extension/dist/depo-dolu-chrome-<sürüm>.zip`. ZIP'in kökünde doğrudan `manifest.json` vardır; mağazaya bu dosya yüklenir. `dist/` klasörü repoya girmez.

Her yeni sürümde `manifest.json` içindeki `version` değerini büyüt (ör. `1.0.0` → `1.0.1`). `popup.html` ve `devtools.html` içindeki sürüm etiketi de aynı olmalı; `npm run check` farkı yakalar.

## 2. Yükle

1. Panelde **Add new item** düğmesine bas.
2. **Choose file** ile ZIP'i seç, **Upload** de.
3. Açılan sayfanın solunda sekmeler var: **Package**, **Store Listing**, **Privacy**, **Distribution**, **Test instructions**. Aşağıdaki bölümler bu sırayla gidiyor.

## 3. Store Listing (mağaza sayfası)

| Alan | Değer |
|---|---|
| Language | Turkish – Türkçe |
| Category | Tools (Araçlar). Alternatif: Productivity |
| Store icon | `icons/icon-128.png` (zaten ZIP içinde, ayrıca istenirse aynı dosya) |
| Screenshots | `store/screenshot-1.png` … `store/screenshot-5.png` (1280×800, bu sırayla) |
| Small promo tile | `store/promo-small-440x280.png` |
| Marquee promo tile | `store/promo-marquee-1400x560.png` |
| Homepage URL | `https://github.com/ozkurtomer/depo-dolu` |
| Support URL | `https://github.com/ozkurtomer/depo-dolu/issues` |
| Mature content | Kapalı |

Başlık ve kısa açıklama `manifest.json` dosyasından otomatik gelir:

- **Ad:** Depo Dolu — Akaryakıt Fiyatları
- **Kısa açıklama:** İlindeki benzin, motorin ve LPG fiyatını gör. Depo maliyetini hesapla, fiyat değişikliklerini takip et.

### Detailed description (aynen yapıştır)

```text
İlindeki benzin, motorin ve LPG fiyatını tek tıkla gör. Fiyat değişince haber al.

Depo Dolu, Türkiye'deki 81 ilin akaryakıt fiyatlarını araç çubuğuna getirir. İstanbul Avrupa ve Anadolu yakası ayrı listelenir.

NELER VAR
• İl ve yakıt seç: benzin, motorin, LPG. Türkçe karakter yazmadan da arayabilirsin.
• Simgenin üstünde fiyat: seçtiğin yakıtın litre fiyatı araç çubuğunda görünür.
• Bir depo ne kadar: 30–70 litre arası depo maliyetini anında hesapla.
• Karşılaştırma: Türkiye ortalamasından ne kadar ucuz ya da pahalı olduğunu, en ucuz bölgeyi gör.
• Fiyat geçmişi: her zam ve indirim grafikte.
• Bildirim (isteğe bağlı): seçtiğin il ve yakıtta fiyat değişince masaüstü bildirimi gelir.
• Telegram botu: Chrome kapalıyken de haber almak istersen tek tıkla @depodolu_bot'a bağlan.
• Paylaş: fiyatı ve bağlantıyı kopyala.

GİZLİLİK
Hesap yok, reklam yok, analiz yok. Gezdiğin sayfalar okunmaz, sayfalara kod eklenmez. İl ve yakıt tercihin yalnızca cihazında saklanır. Eklenti sadece herkese açık fiyat dosyalarını GitHub'dan indirir.

AÇIK KAYNAK
Depo Dolu açık kaynaklıdır (MIT lisansı). Kod, veri ve fiyat API'si GitHub'da: github.com/ozkurtomer/depo-dolu

BİLMEN GEREKENLER
• Fiyatlar Petrol Ofisi'nin il liste fiyatlarıdır; istasyondaki fiyat farklı olabilir.
• Fiyatlar 15 dakikada bir kontrol edilir. Chrome kapalıyken kontrol yapılmaz, bildirim gecikebilir.
• Depo Dolu bağımsız bir projedir; Petrol Ofisi ile bir bağlantısı yoktur.
```

İsteğe bağlı İngilizce açıklama için **Add a language** ile English ekleyip şunu kullan:

```text
See petrol, diesel and LPG (autogas) prices for any province in Turkey in one click, and get notified when they change.

• Pick a province and a fuel; the price per litre appears on the toolbar icon.
• Tank calculator for 30–70 litres, comparison with the national average and the cheapest region.
• Price history chart of every increase and decrease.
• Optional desktop notifications when your selected price changes, plus a Telegram bot for your phone.

No account, no ads, no analytics. The extension never reads the pages you visit; your choices stay on your device. It only downloads public price files from the open-source Depo Dolu project on GitHub (MIT): github.com/ozkurtomer/depo-dolu

Prices are Petrol Ofisi province list prices; station prices may differ. Depo Dolu is an independent project and is not affiliated with Petrol Ofisi.
```

## 4. Privacy (gizlilik sekmesi)

**Single purpose description**

```text
Kullanıcının seçtiği Türkiye ilindeki akaryakıt (benzin, motorin, LPG) fiyatını göstermek, depo maliyetini hesaplamak ve bu fiyat değişince kullanıcıyı isteğe bağlı olarak bilgilendirmek.
```

**Permission justification** (her izin için ayrı kutu):

| İzin | Gerekçe |
|---|---|
| `storage` | Kullanıcının seçtiği il, yakıt, depo büyüklüğü ve bildirim tercihi ile son indirilen herkese açık fiyat verisi cihazda saklanır. Aynı fiyat için tekrar bildirim göndermemek için son bildirilen fiyat da burada tutulur. |
| `alarms` | Kullanıcı bildirimleri açtığında fiyat verisi 15 dakikada bir kontrol edilir. Bildirimler kapatılınca alarm silinir. |
| `notifications` (isteğe bağlı) | Yalnızca kullanıcı ayarlardan bildirimi açtığında istenir. Seçili il ve yakıtın fiyatı değişince yerel Chrome bildirimi göstermek için kullanılır. |
| Host permission `https://raw.githubusercontent.com/*` | Fiyatlar, açık kaynak Depo Dolu reposundaki herkese açık JSON dosyalarından okunur (`raw.githubusercontent.com/ozkurtomer/depo-dolu/main/data/`). Başka hiçbir siteye erişilmez; sayfa içeriği okunmaz. |

**Remote code:** "No, I am not using remote code." seç. Tüm JavaScript paketin içinde; uzaktan sadece JSON veri indiriliyor.

**Data usage:** Hiçbir veri türünü işaretleme (kişisel bilgi, sağlık, finans, kimlik doğrulama, iletişim, konum, web geçmişi, kullanıcı etkinliği, web sitesi içeriği). Eklenti bunların hiçbirini toplamıyor. Altındaki üç onay kutusunu işaretle ("Certify your data use practices"):

- Kullanıcı verisini onaylanmış kullanım dışında üçüncü taraflara satmıyorum/aktarmıyorum.
- Ana işlevle ilgisiz amaçlarla kullanmıyorum/aktarmıyorum.
- Kredi değerliliği veya borç verme amacıyla kullanmıyorum/aktarmıyorum.

**Privacy policy URL**

```text
https://github.com/ozkurtomer/depo-dolu/blob/main/extension/PRIVACY.md
```

## 5. Distribution

- **Payments:** Free
- **Visibility:** Public. İlk denemede sadece bağlantıyla paylaşmak istersen Unlisted seçebilirsin.
- **Regions:** All regions. Sadece Türkiye için Turkey seçmek de yeterli.

## 6. Test instructions

Hesap veya giriş gerekmediği için çoğunlukla boş bırakılabilir. İstersen şunu yaz:

```text
No login needed. Click the toolbar icon, choose a province (e.g. Bursa) and a fuel. To test notifications without waiting for a real price change: Settings → "Yerel deneme alanı" → "Deneme modunu aç", enable notifications, then press "Zam +1,30".
```

## 7. Gönder

1. Sağ üstte **Submit for Review** düğmesine bas, açılan pencerede onayla.
2. Pencerede onaylandığında otomatik yayınlanma kutusu işaretlidir. İşareti kaldırırsan inceleme bitince yayın senin elinle yapılır (onaydan sonra 30 gün içinde).
3. İnceleme süresi değişkendir; genelde birkaç gün sürer. Ret olursa e-posta gelir ve gerekçe panelde görünür.
4. Yayınlanınca mağaza adresini (`https://chromewebstore.google.com/detail/...`) README'lerdeki Chrome bölümüne ve web uygulamasına ekle.

## Güncelleme yayınlamak

1. `manifest.json` sürümünü büyüt, `popup.html` ve `devtools.html` etiketlerini güncelle.
2. `npm test && npm run check && npm run package`
3. Panelde eklentiyi aç → **Package** → **Upload new package** → yeni ZIP → **Submit for Review**.

## Görselleri yeniden üretmek

`store/` içindeki görseller, eklenti gerçek Chromium'a yüklenip canlı veriyle çekilen ekranlardan üretildi. Arayüz değişirse yeni ekran görüntüsü al ve aynı boyutlarda kaydet: ekran görüntüleri 1280×800, küçük tanıtım 440×280, büyük tanıtım 1400×560. Kenar boşluğu ve köşe yuvarlatma eklenmemeli.
