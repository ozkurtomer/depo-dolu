# Depo Dolu · Chrome eklentisi

Manifest V3 tabanlı, derleme ve npm paketi kurulumu gerektirmeyen eklenti. İl/yakıt fiyatı, ülke karşılaştırması, depo maliyeti, geçmiş, paylaşım, Telegram botu bağlantısı ve isteğe bağlı fiyat değişikliği bildirimleri içerir.

**Sürüm 1.0.0 · Chrome Web Store'a hazır.** Paket, görseller ve mağaza metinleri hazır; yayın adımları [STORE.md](STORE.md) dosyasında. Mağaza bağlantısı yayınlanınca buraya eklenecek.

<p align="center"><img src="store/screenshot-1.png" alt="Depo Dolu Chrome eklentisi" width="100%"></p>

## Chrome'a yerel yükleme

1. Chrome'da `chrome://extensions` adresini aç.
2. Sağ üstte **Geliştirici modu**nu aç.
3. **Paketlenmemiş öğe yükle** düğmesine bas.
4. Bu klasörü seç: `D:\CorporateApps\DepoDolu\depo-dolu\extension`.
5. Araç çubuğundaki yapboz simgesinden **Depo Dolu**'yu sabitle ve aç.

Seçilecek klasörün içinde doğrudan `manifest.json` bulunmalı. ZIP dosyasını değil, klasörü seç. Kaynak dosyaları değiştirdikten sonra `chrome://extensions` sayfasındaki eklenti kartının yenile düğmesine bas ve popup'ı yeniden aç.

Gereksinim: Chrome 120+. İlk fiyat yüklemesi için internet gerekir. İstersen “Örnek veriyle dene” düğmesiyle tamamen yerel deneme verisini kullanabilirsin.

## Hızlı kullanım

- İlini seç; İstanbul'un iki yakası ayrı listelenir. Türkçe karakter yazmadan da arayabilirsin.
- Benzin / Motorin / LPG sekmesinden yakıt seç.
- 30–70 L arası depo maliyetini gör; geçmiş bölümünde kaynak kayıtlarını incele.
- Ayarlar'dan bildirimleri aç. Chrome izni ancak bu adımda istenir.
- “Simge üzerinde fiyat” rozetini istersen kapat. Rozet yuvarlanmıştır; simge üzerinde bekleyince tam fiyat görünür.
- Fiyat ve bağlantıyı kopyala; link, web uygulamasında aynı il/yakıtı açar.
- Ayarlar'daki **Telefonuna da gelsin** kartı, seçili il ve yakıtla [@depodolu_bot](https://t.me/depodolu_bot)'u açar. Telegram, Chrome kapalıyken de haber verir.

## Yerel test senaryoları

Popup → **Ayarlar → Yerel deneme alanı** sayfasını aç. Sağdaki pencere gerçek popup dosyasını kullanır.

1. **Deneme modunu aç**: örnek veri gelir; her ekranda sarı deneme etiketi görünür.
2. İl ve yakıt seç. **Bildirimleri aç**; ilk kontrol yalnızca başlangıç fiyatını kaydeder.
3. **Zam +1,30** veya **İndirim −0,50** düğmesini kullan. Fiyat, depo hesabı ve geçmiş güncellenir. İzin varsa test etiketli Chrome bildirimi gönderilir.
4. **Bağlantı hatasını benzet**: son veri korunur; önbellek uyarısı görünür. **Bağlantıyı geri getir** ile çık.
5. **Örnek veriyi sıfırla** yalnızca örnek fiyat ve geçmişini sıfırlar.
6. **Canlı verilere dön**: canlı önbellek ayrı kalır; örnek fiyatlar gerçek veriye yazılmaz. Yeni canlı başlangıç kontrolü eski test fiyatlarıyla karşılaştırılmaz.

Bildirim Windows/macOS ayarlarında veya Odaklanma / Rahatsız etmeyin modunda gizlenebilir. “Test Chrome'a iletildi” mesajı işletim sisteminin bildirimi gösterdiği garantisi değildir.

## Otomatik kontroller

Node.js 22.18+ ile, bu klasörden:

```bash
npm test
npm run check
```

Bağımlılık yok; `npm install` veya `npm ci` gerekmez. Testler veri doğrulama, ilk bildirim, tekrar gönderme, servis çalışanı yeniden başlatma, seçim değişikliği, izin reddi/iptali, çevrimdışı çalışma ve canlı/örnek veri ayrımını kapsar. Chrome API'leri otomatik testlerde taklit edilir; yüklenmiş eklentiyi ayrıca elle dene.

İsteğe bağlı ZIP (Python 3.9+):

```bash
npm run package
```

Çıktı `dist/depo-dolu-chrome-<sürüm>.zip` olur (şu an `1.0.0`). Bu ZIP doğrudan Chrome Web Store'a yüklenir. Komut kendisi yükleme, mağaza yayını, commit veya push yapmaz.

## Chrome Web Store

- Yayın ve güncelleme adımları, mağaza açıklaması, izin gerekçeleri ve gizlilik cevapları: [STORE.md](STORE.md)
- Mağaza görselleri: [`store/`](store/) (beş adet 1280×800 ekran görüntüsü, 440×280 ve 1400×560 tanıtım görseli)
- Gizlilik politikası adresi: `https://github.com/ozkurtomer/depo-dolu/blob/main/extension/PRIVACY.md`

## Kurmadan tasarım önizlemesi

Repo kökünden:

```bash
python -m http.server 4310 --bind 127.0.0.1 --directory extension
```

`http://127.0.0.1:4310/devtools.html` adresini aç. Bu görünüm yalnızca yerel örnek veri ve taklit Chrome API'leri kullanır; gerçek Chrome bildirimi veya arka plan alarmı çalıştırmaz. Gerçek eklentiyle önizlemenin kayıtları birbirinden ayrıdır.

## İzinler ve veri

- `storage`: cihazdaki tercihler, fiyat önbelleği ve tekrar bildirimleri önleyen son fiyat.
- `alarms`: bildirimler açıkken 15 dakikalık kontrol. Bildirimler kapatıldığında alarm kaldırılır.
- `notifications` (isteğe bağlı): yalnızca kullanıcı açtığında istenir.
- `raw.githubusercontent.com` erişimi: fiyat JSON dosyaları. Kod yalnızca bu reponun sabit veri adreslerini kullanır.

Sekme içeriği, tarama geçmişi, konum, hesap veya Firebase kurulumu gerekmez. İçerik betiği ve uzaktan çalıştırılan kod yoktur. Daha fazla ayrıntı: [PRIVACY.md](PRIVACY.md).

## Zamanlama ve sınırlar

Chrome kapalıyken kontrol yapılmaz; uyku ve tarayıcı zamanlaması alarmları geciktirebilir. “Son kontrol” eklentinin son başarılı veri isteğidir; fiyat kaydı kaynak verinin son yazım tarihidir. Fiyatlar yalnızca Petrol Ofisi il listesidir, tüm istasyonların ortalaması değildir.

Veri çekme başarısız olursa son fiyat korunur. Bildirim gönderimi başarısız olursa son bildirilen fiyat ilerletilmez ve sonraki kontrolde tekrar denenir. İşlem veya cihaz tam gönderim sırasında kapanırsa tekrar teslim mümkündür; tam olarak bir kez teslim garantisi yoktur.

Görseller yerel Depo Dolu çizimlerinden üretilmiştir. Barlow yazı tipleri pakete dahildir; lisansları `fonts/` içindedir. Simgeyi yeniden üretmek için isteğe bağlı olarak Python + Pillow ile `python tools/generate_icons.py` kullanılabilir.
