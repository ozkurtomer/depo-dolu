# Gizlilik / Privacy

Depo Dolu Chrome eklentisi kullanıcı hesabı, reklam veya analiz/telemetri hizmeti içermez. Tarama geçmişini, ziyaret edilen sayfaların içeriğini veya konumunu okumaz. Sayfalara içerik betiği eklemez.

İl, yakıt, depo büyüklüğü, bildirim ve rozet tercihleri; son fiyat verisi, geçmiş önbelleği ve son bildirilen fiyat cihazdaki `chrome.storage.local` alanında saklanır. Deneme fiyatları ayrı bir alanda tutulur. Son on fiyat değişikliği teslim kaydı yerel test panelinde gösterilir; bunlar kullanıcı kimliği içermez. Tarayıcı hesabına senkronizasyon kullanılmaz.

Canlı kullanımda HTTPS istekleri yalnızca `raw.githubusercontent.com/ozkurtomer/depo-dolu/main/data/` altındaki herkese açık fiyat JSON dosyalarına gider. GitHub kendi hizmet koşulları kapsamında bu istekleri işler; eklenti kullanıcı kimliği, tercihi veya ziyaret geçmişi içeren özel bir yük göndermez. Her isteğin normal ağ bağlantısı bilgileri sunucu tarafından görülebilir.

Bildirimler isteğe bağlıdır. İzin kullanıcı tarafından açılır; Chrome'un yerel notifications API'si kullanılır, Firebase veya başka bir push servisine cihaz kaydı yapılmaz. Bildirimler kapatıldığında arka plan kontrol alarmı kaldırılır. Fiyat bağlantısını kopyalamak paylaşım yapmaz; gönderileceği yeri kullanıcı seçer.

Web uygulaması, GitHub veya Telegram botu (`t.me/depodolu_bot`) bağlantılarına tıklamak ilgili siteyi yeni sekmede açar; eklenti bu sitelere kendiliğinden veri göndermez. Telegram bağlantısı yalnızca seçili il ve yakıtı başlangıç parametresi olarak taşır. Deneme modu ve localhost tasarım önizlemesi örnek verileri canlı kaynağa yazmaz. Eklentiyi kaldırmak yerel Chrome eklenti depolamasını kaldırır; tarayıcı yedekleme ve cihaz politikaları ayrıca geçerli olabilir.

English: Preferences and cached public prices stay in local extension storage. No browsing history, page content, location, account, ads, analytics or cloud preference sync is used. Public price JSON is fetched from the fixed GitHub repository; GitHub receives normal network requests. Notifications are optional and use Chrome's local API. No Firebase registration is performed. Demo data is separate from live data. External links (web app, GitHub, Telegram bot) open only after user interaction; the Telegram link carries only the selected province and fuel.
