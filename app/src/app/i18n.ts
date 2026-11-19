/**
 * Hafif çalışma zamanı çeviri katmanı (Türkçe + İngilizce). Angular'dan bağımsızdır;
 * böylece saf fonksiyonlar (format, alarm, yakıt defteri) Node testlerinde de kullanılır.
 * Varsayılan dil Türkçedir. Tarayıcıda dili LangService seçer ve değiştirir.
 */
export type Lang = 'tr' | 'en';

let current: Lang = 'tr';
const listeners = new Set<(lang: Lang) => void>();

export const getLang = (): Lang => current;

export function setLang(lang: Lang) {
  if (lang === current) return;
  current = lang;
  listeners.forEach(fn => fn(lang));
}

export const onLangChange = (fn: (lang: Lang) => void) => {
  listeners.add(fn);
  return () => listeners.delete(fn);
};

/** Sayı ve tarih biçimi için yerel ayar. İngilizce arayüzde nokta ondalık kullanılır. */
export const locale = (lang: Lang = current) => (lang === 'en' ? 'en-GB' : 'tr-TR');

type Dict = Record<string, string>;

const tr: Dict = {
  // Yakıtlar
  'fuel.benzin': 'Benzin', 'fuel.benzin.hint': 'Kurşunsuz 95',
  'fuel.motorin': 'Motorin', 'fuel.motorin.hint': 'Dizel',
  'fuel.lpg': 'LPG', 'fuel.lpg.hint': 'Otogaz',
  'fuel.label': 'Yakıt',

  // Zaman ifadeleri
  'ago.now': 'az önce', 'ago.min': '{n} dk önce', 'ago.hour': '{n} saat önce',
  'ago.yesterday': 'dün', 'ago.days': '{n} gün önce',
  'range.1a': '1 ay', 'range.3a': '3 ay', 'range.1y': '1 yıl', 'range.all': 'Tümü',
  'lang.switch': 'Switch to English', 'lang.short': 'EN',

  // Ana ekran
  'home.changeCity': 'İli değiştir', 'home.pickCity': 'İl seç',
  'home.offline': 'Bağlantı kurulamadı. Son kaydedilen fiyatları görüyorsun.',
  'home.retry': 'Tekrar dene',
  'home.priceLabel': '{fuel} litre fiyatı', 'home.priceAria': '{price} lira',
  'home.up': 'zam', 'home.down': 'indirim',
  'home.tracking': 'Takipteyiz. Fiyat değişince burada göreceksin.',
  'home.cheaper': 'Türkiye ortalamasından {amount} ₺ ucuz',
  'home.pricier': 'Türkiye ortalamasından {amount} ₺ pahalı',
  'home.same': 'Türkiye ortalamasıyla aynı',
  'home.cheapest': 'En ucuz', 'home.average': 'Ortalama', 'home.priciest': 'En pahalı', 'home.regions': '{n} bölge',
  'home.notifyOn': 'Bildirimler açık', 'home.notifyAsk': 'Zam gelince haber verelim mi?',
  'home.notifyOnText': '{city} {fuel} fiyatındaki zam ve indirimleri takip ediyorsun.',
  'home.notifyOffText': 'Fiyatlar 15 dakikalık aralıklarla kontrol edilir.',
  'home.turnOff': 'Kapat', 'home.turnOn': 'Aç',
  'home.getNotified': 'Zam gelince haber al',
  'home.botText': "{city} {fuel} fiyatı değişince Telegram'dan sana yazalım. Sadece senin ilin.",
  'home.channelText': 'Bildirimler mobil uygulamada. Şimdilik her zamı Telegram kanalımızdan takip edebilirsin.',
  'home.soonText': 'Anlık bildirimler Android uygulamasında. Uygulama çok yakında mağazada.',
  'home.pushDenied': 'Bildirim izni kapalı. Telefonun ayarlarından Depo Dolu için bildirimlere izin ver.',
  'home.pushError': 'Bildirim ayarı değiştirilemedi. Bağlantını kontrol edip tekrar dene.',
  'home.tankTitle': 'Depoyu doldurmak kaça?', 'home.tankAria': 'Depo litresi',
  'home.needPrice': 'Hesaplamak için fiyat bilgisi gerekiyor.',
  'home.history': 'Fiyat geçmişi', 'home.rangeAria': 'Zaman aralığı', 'home.inRange': 'Bu aralıkta',
  'home.feed': '{city} son değişiklikler',
  'home.share': '↗ Bu fiyatı paylaş', 'home.copy': 'Bağlantıyı kopyala',
  'home.shareText': '{city} {fuel}: {price} ₺/L. Kaynak: Petrol Ofisi il liste fiyatı. Depo Dolu ile takip et.',
  'home.shareDialog': 'Fiyatı paylaş',
  'home.copied': 'Fiyat ve bağlantı kopyalandı. İstediğin yerde paylaşabilirsin.',
  'home.shareFail': 'Paylaşılamadı. Tarayıcının paylaş menüsünü deneyebilirsin.',
  'home.footer': "Fiyatlar Petrol Ofisi'nin il liste fiyatıdır, KDV dahil. İstasyonlar arasında küçük farklar olabilir.",
  'home.dataDate': 'Verinin son güncellenmesi: {ago}. Bu tarih son başarılı kontrolü göstermez.',
  'home.linkTable': '81 ilin fiyat tablosu', 'home.linkMap': 'Türkiye fiyat haritası',
  'home.linkSource': 'Fiyat kaynağını gör', 'home.linkRepo': "Açık kaynak, GitHub'da",

  // İl ve yakıt seçimi
  'setup.back': '‹ Geri', 'setup.change': 'İlini değiştir', 'setup.hello': 'Merhaba 👋',
  'setup.which': 'Hangi ilde yakıt alıyorsun?',
  'setup.lede': 'Benzin, motorin ve LPG fiyatını takip et. Hesap açmadan, ücretsiz.',
  'setup.search': 'İl ara', 'setup.loading': 'İller yükleniyor…',
  'setup.popular': 'Sık seçilenler', 'setup.all': 'Tüm iller', 'setup.selected': 'seçili',
  'setup.notFound': '"{q}" diye bir il bulamadık. Yazımı kontrol eder misin?',
  'setup.whatFuel': 'Aracın ne yakıyor?', 'setup.todayPrices': '{city} için bugünkü litre fiyatları.',
  'setup.fuelType': 'Yakıt tipi',
  'setup.notify': 'Fiyat değişince haber ver', 'setup.notifySub': 'Zam ve indirimler, 15 dakikalık kontrollerle.',
  'setup.start': 'Başla', 'setup.preparing': 'Hazırlanıyor…',

  // Yolculuk
  'trip.title': 'Yolculuk ne tutar?', 'trip.where': 'Nereye?', 'trip.optional': 'İl seç (isteğe bağlı)',
  'trip.distance': 'Mesafe (km)', 'trip.example': 'ör. 450', 'trip.consumption': 'Tüketim (L/100 km)',
  'trip.people': 'Kişi sayısı', 'trip.round': 'Gidiş-dönüş',
  'trip.sub': '{km} km · {liters} L {fuel} · km başına {perKm} ₺', 'trip.perPerson': ' · kişi başı {n} ₺',
  'trip.hint': 'Mesafeyi yaz ya da varış ilini seç.',
  'trip.same': '{a} ve {b} fiyatı aynı.',
  'trip.destCheaper': '{place} daha ucuz: varınca doldurursan {liters} L depoda {saving} ₺ kazanırsın.',
  'trip.originCheaper': '{place} daha ucuz: yola çıkmadan doldurursan {liters} L depoda {saving} ₺ kazanırsın.',
  'trip.estimated': "Mesafe il merkezleri arasından tahmin edildi (kuş uçuşu × 1,3). Gerçek güzergâh km'sini yazabilirsin.",

  // Bütçe
  'budget.title': 'Aylık yakıt bütçen', 'budget.km': 'Ayda kaç km?', 'budget.unit': '₺/ay',
  'budget.sub': '{liters} L · yılda {yearly} ₺',
  'budget.hikeA': 'Litreye 1 ₺ zam bütçene ayda', 'budget.hikeB': 'ekler.',

  // Grafik
  'chart.today': 'bugün',
  'chart.empty': 'Henüz değişiklik yok. İlk zam ya da indirimde grafik burada çizilecek.',
  'chart.label': '{start} ile bugün arasında fiyat {min} ile {max} TL arasında değişti',

  // Ana ekrana ekle
  'install.title': 'Ana ekrana ekle',
  'install.sub': "Depo Dolu'yu uygulama gibi tek dokunuşla aç. Mağaza yok, hesap yok.",
  'install.add': 'Ekle', 'install.notNow': 'Şimdi değil', 'install.ok': 'Tamam',
  'install.ios1': "Safari'de", 'install.share': 'Paylaş', 'install.ios2': ' düğmesine, ardından ',
  'install.addHome': 'Ana Ekrana Ekle', 'install.ios3': "'ye dokun.",
  'install.note': 'Çevrimdışıyken son kaydedilen fiyatlar açıkça belirtilerek gösterilir.',

  // Duyuru
  'ann.up': 'Zam bekleniyor', 'ann.down': 'İndirim bekleniyor',
  'ann.perLitre': 'litre fiyatına', 'ann.effective': '{when} itibarıyla.',
  'ann.estimate': '{city} için tahmini yeni fiyat:', 'ann.source': 'Kaynak:',
  'ann.disclaimer': 'Bu bir duyurudur; Petrol Ofisi fiyatına yansıyınca yukarıdaki fiyat güncellenir. İl bazında tutar farklı olabilir.',

  // Alarm
  'alarm.title': 'Fiyat alarmı', 'alarm.reached': 'Hedefin geldi',
  'alarm.reachedSub': '{city} {fuel} şu an {price} ₺; hedefin {target} ₺ idi.',
  'alarm.waitPre': '{city} {fuel}', 'alarm.waitPost': 'ya da altına inince haber vereceğiz. Şu an {price} ₺, hedefe {gap} ₺ var.',
  'alarm.unknown': 'Hedefin {target} ₺. Fiyat bilgisi gelince durumu göreceksin.',
  'alarm.intro': '{fuel} fiyatı istediğin seviyeye inince haber verelim.',
  'alarm.target': 'Hedef fiyat (₺/L)', 'alarm.example': 'ör. 45,50', 'alarm.set': 'Alarmı kur',
  'alarm.elsewhere': 'Şu anki alarmın başka bir il ya da yakıt için ({target} ₺). Yenisi onun yerine geçer.',
  'alarm.remove': 'Alarmı kaldır',
  'alarm.native': 'Telefonun fiyatı saatte bir kontrol eder, hedefe inince bildirim gönderir.',
  'alarm.web': 'Uygulamayı açtığında burada görürsün. Arka planda bildirim Android uygulamasında.',
  'alarm.permission': 'Bildirim izni kapalı. Alarm yine de burada görünür; telefon ayarlarından Depo Dolu bildirimlerine izin verebilirsin.',
  'alarm.pickCityFirst': 'Önce il seç.',
  'alarm.enterTarget': 'Hedef fiyatı yaz (ör. 45,50).',
  'alarm.alreadyBelow': 'Fiyat zaten {target} ₺ ya da altında. Daha düşük bir hedef yaz.',

  // Yakıt defteri
  'log.title': 'Yakıt defteri', 'log.export': 'Dışa aktar', 'log.vehicle': 'Araç',
  'log.addVehicle': '+ Araç', 'log.edit': 'Düzenle', 'log.vehicleName': 'Araç adı',
  'log.vehicleExample': 'ör. Aile arabası', 'log.fuel': 'Yakıt', 'log.consumption': 'Tüketim (L/100 km)',
  'log.save': 'Kaydet', 'log.cancel': 'Vazgeç', 'log.deleteVehicle': 'Aracı sil',
  'log.intro': 'Her dolumu kaydet; gerçek tüketimini ve aylık harcamanı gör. Kayıtlar sadece bu cihazda kalır.',
  'log.thisMonth': 'Bu ay', 'log.lastMonth': 'Geçen ay', 'log.diff': '{delta} ₺ fark',
  'log.real': 'Gerçek tüketim', 'log.realNeeds': '2 tam dolum + km gerekir', 'log.realSub': 'L/100 km · {km} km',
  'log.liters': 'Litre', 'log.litersExample': 'ör. 42,5', 'log.total': 'Tutar (₺)', 'log.totalExample': 'ör. 2.000',
  'log.odometer': 'Km sayacı', 'log.optional': '(isteğe bağlı)', 'log.odoExample': 'ör. 84250',
  'log.date': 'Tarih', 'log.fullTank': 'Depoyu tam doldurdum',
  'log.suggest': 'Tutarı boş bırakırsan bugünkü fiyatla {total} ₺ yazılır.',
  'log.filled': '⛽ Yakıt aldım', 'log.partial': '* Depo tam doldurulmadı.',
  'log.deleteFill': '{day} dolumunu sil',
  'log.defaultName': 'Aracım',
  'log.errName': 'Araca bir ad ver.', 'log.errConsumption': 'Tüketim 1 ile 40 L/100 km arasında olmalı.',
  'log.confirmDelete': '{name} ve {count} dolum kaydı silinsin mi?',
  'log.errLiters': 'Litreyi yaz (0,1 – 500).', 'log.errTotal': 'Ödediğin tutarı yaz.',
  'log.errOdo': 'Km sayacı geçersiz.', 'log.errDate': 'Tarih bugünden ileri olamaz.',
  'log.savedHint': 'Kaydedildi. Gerçek tüketimi görmek için dolumlarda km sayacını da yaz.',
  'log.saved': 'Kaydedildi.', 'log.exportFail': 'Dışa aktarılamadı.',
  'log.shareTitle': 'Depo Dolu yakıt defteri', 'log.shareDialog': 'Yakıt defterini paylaş',
  'log.csvHeader': 'tarih;arac;litre;tutar_tl;litre_fiyati_tl;km_sayaci;tam_dolum',
  'log.yes': 'evet', 'log.no': 'hayır',

  // Servisler
  'err.prices': 'Fiyatlar alınamadı. Bağlantını kontrol edip tekrar dene.',
};

const en: Dict = {
  'fuel.benzin': 'Gasoline', 'fuel.benzin.hint': 'Unleaded 95',
  'fuel.motorin': 'Diesel', 'fuel.motorin.hint': 'Motorin',
  'fuel.lpg': 'LPG', 'fuel.lpg.hint': 'Autogas',
  'fuel.label': 'Fuel',

  'ago.now': 'just now', 'ago.min': '{n} min ago', 'ago.hour': '{n} h ago',
  'ago.yesterday': 'yesterday', 'ago.days': '{n} days ago',
  'range.1a': '1 mo', 'range.3a': '3 mo', 'range.1y': '1 yr', 'range.all': 'All',
  'lang.switch': "Türkçe'ye geç", 'lang.short': 'TR',

  'home.changeCity': 'Change province', 'home.pickCity': 'Choose province',
  'home.offline': 'Could not connect. Showing the last saved prices.',
  'home.retry': 'Try again',
  'home.priceLabel': '{fuel} price per litre', 'home.priceAria': '{price} Turkish lira',
  'home.up': 'increase', 'home.down': 'decrease',
  'home.tracking': 'We are tracking it. You will see price changes here.',
  'home.cheaper': '{amount} ₺ below the Turkey average',
  'home.pricier': '{amount} ₺ above the Turkey average',
  'home.same': 'Same as the Turkey average',
  'home.cheapest': 'Cheapest', 'home.average': 'Average', 'home.priciest': 'Most expensive', 'home.regions': '{n} regions',
  'home.notifyOn': 'Notifications are on', 'home.notifyAsk': 'Want to hear about price hikes?',
  'home.notifyOnText': 'You are following price hikes and cuts for {city} {fuel}.',
  'home.notifyOffText': 'Prices are checked every 15 minutes.',
  'home.turnOff': 'Turn off', 'home.turnOn': 'Turn on',
  'home.getNotified': 'Get notified of price hikes',
  'home.botText': 'We will message you on Telegram when the {city} {fuel} price changes. Only your province.',
  'home.channelText': 'Notifications are in the mobile app. For now you can follow every hike on our Telegram channel.',
  'home.soonText': 'Instant notifications are in the Android app. The app will be in the store very soon.',
  'home.pushDenied': 'Notification permission is off. Allow notifications for Depo Dolu in your phone settings.',
  'home.pushError': 'Could not change the notification setting. Check your connection and try again.',
  'home.tankTitle': 'How much to fill the tank?', 'home.tankAria': 'Tank size in litres',
  'home.needPrice': 'A price is needed to calculate this.',
  'home.history': 'Price history', 'home.rangeAria': 'Time range', 'home.inRange': 'In this range',
  'home.feed': '{city} recent changes',
  'home.share': '↗ Share this price', 'home.copy': 'Copy link',
  'home.shareText': '{city} {fuel}: {price} ₺/L. Source: Petrol Ofisi province list price. Track it with Depo Dolu.',
  'home.shareDialog': 'Share price',
  'home.copied': 'Price and link copied. You can share it anywhere.',
  'home.shareFail': "Could not share. Try your browser's share menu.",
  'home.footer': "Prices are Petrol Ofisi's province list prices, VAT included. Individual stations may differ slightly.",
  'home.dataDate': 'Data last updated: {ago}. This is not the time of the last successful check.',
  'home.linkTable': 'Price table for all 81 provinces', 'home.linkMap': 'Turkey price map',
  'home.linkSource': 'View price source', 'home.linkRepo': 'Open source on GitHub',

  'setup.back': '‹ Back', 'setup.change': 'Change your province', 'setup.hello': 'Hello 👋',
  'setup.which': 'Which province do you fill up in?',
  'setup.lede': 'Track gasoline, diesel and LPG prices. Free, no account.',
  'setup.search': 'Search provinces', 'setup.loading': 'Loading provinces…',
  'setup.popular': 'Popular', 'setup.all': 'All provinces', 'setup.selected': 'selected',
  'setup.notFound': 'We could not find a province called "{q}". Check the spelling?',
  'setup.whatFuel': 'What does your car run on?', 'setup.todayPrices': "Today's per-litre prices for {city}.",
  'setup.fuelType': 'Fuel type',
  'setup.notify': 'Notify me when prices change', 'setup.notifySub': 'Hikes and cuts, checked every 15 minutes.',
  'setup.start': 'Start', 'setup.preparing': 'Getting ready…',

  'trip.title': 'What does a trip cost?', 'trip.where': 'Where to?', 'trip.optional': 'Choose a province (optional)',
  'trip.distance': 'Distance (km)', 'trip.example': 'e.g. 450', 'trip.consumption': 'Consumption (L/100 km)',
  'trip.people': 'People', 'trip.round': 'Round trip',
  'trip.sub': '{km} km · {liters} L {fuel} · {perKm} ₺ per km', 'trip.perPerson': ' · {n} ₺ per person',
  'trip.hint': 'Enter the distance or choose a destination.',
  'trip.same': '{a} and {b} have the same price.',
  'trip.destCheaper': '{place} is cheaper: filling up on arrival saves you {saving} ₺ on a {liters} L tank.',
  'trip.originCheaper': '{place} is cheaper: filling up before you leave saves you {saving} ₺ on a {liters} L tank.',
  'trip.estimated': 'Distance is estimated between province centres (straight line × 1.3). You can enter the real route distance.',

  'budget.title': 'Your monthly fuel budget', 'budget.km': 'Kilometres per month?', 'budget.unit': '₺/month',
  'budget.sub': '{liters} L · {yearly} ₺ per year',
  'budget.hikeA': 'A 1 ₺ rise per litre adds', 'budget.hikeB': 'a month to your budget.',

  'chart.today': 'today',
  'chart.empty': 'No changes yet. The chart will be drawn here after the first hike or cut.',
  'chart.label': 'Between {start} and today the price ranged from {min} to {max} TL',

  'install.title': 'Add to home screen',
  'install.sub': 'Open Depo Dolu like an app with one tap. No store, no account.',
  'install.add': 'Add', 'install.notNow': 'Not now', 'install.ok': 'OK',
  'install.ios1': 'In Safari, tap', 'install.share': 'Share', 'install.ios2': ', then ',
  'install.addHome': 'Add to Home Screen', 'install.ios3': '.',
  'install.note': 'When offline, the last saved prices are shown and clearly labelled.',

  'ann.up': 'Price hike expected', 'ann.down': 'Price cut expected',
  'ann.perLitre': 'per-litre price', 'ann.effective': 'effective {when}.',
  'ann.estimate': 'Estimated new price for {city}:', 'ann.source': 'Source:',
  'ann.disclaimer': 'This is an announcement; the price above updates once it reaches Petrol Ofisi prices. Amounts may differ by province.',

  'alarm.title': 'Price alarm', 'alarm.reached': 'Target reached',
  'alarm.reachedSub': '{city} {fuel} is now {price} ₺; your target was {target} ₺.',
  'alarm.waitPre': 'We will notify you when {city} {fuel} drops to', 'alarm.waitPost': 'or below. It is {price} ₺ now, {gap} ₺ away.',
  'alarm.unknown': 'Your target is {target} ₺. You will see the status once price data arrives.',
  'alarm.intro': 'We will notify you when the {fuel} price drops to the level you want.',
  'alarm.target': 'Target price (₺/L)', 'alarm.example': 'e.g. 45.50', 'alarm.set': 'Set alarm',
  'alarm.elsewhere': 'Your current alarm is for another province or fuel ({target} ₺). A new one replaces it.',
  'alarm.remove': 'Remove alarm',
  'alarm.native': 'Your phone checks the price hourly and notifies you when it reaches the target.',
  'alarm.web': 'You will see it here when you open the app. Background notifications are in the Android app.',
  'alarm.permission': 'Notification permission is off. The alarm still shows here; you can allow Depo Dolu notifications in phone settings.',
  'alarm.pickCityFirst': 'Choose a province first.',
  'alarm.enterTarget': 'Enter a target price (e.g. 45.50).',
  'alarm.alreadyBelow': 'The price is already {target} ₺ or lower. Enter a lower target.',

  'log.title': 'Fuel log', 'log.export': 'Export', 'log.vehicle': 'Vehicle',
  'log.addVehicle': '+ Vehicle', 'log.edit': 'Edit', 'log.vehicleName': 'Vehicle name',
  'log.vehicleExample': 'e.g. Family car', 'log.fuel': 'Fuel', 'log.consumption': 'Consumption (L/100 km)',
  'log.save': 'Save', 'log.cancel': 'Cancel', 'log.deleteVehicle': 'Delete vehicle',
  'log.intro': 'Record every fill-up to see your real consumption and monthly spend. Records stay on this device only.',
  'log.thisMonth': 'This month', 'log.lastMonth': 'Last month', 'log.diff': '{delta} ₺ difference',
  'log.real': 'Real consumption', 'log.realNeeds': 'Needs 2 full fill-ups + km', 'log.realSub': 'L/100 km · {km} km',
  'log.liters': 'Litres', 'log.litersExample': 'e.g. 42.5', 'log.total': 'Amount (₺)', 'log.totalExample': 'e.g. 2,000',
  'log.odometer': 'Odometer', 'log.optional': '(optional)', 'log.odoExample': 'e.g. 84250',
  'log.date': 'Date', 'log.fullTank': 'I filled the tank',
  'log.suggest': "If you leave the amount empty, today's price is used: {total} ₺.",
  'log.filled': '⛽ I filled up', 'log.partial': '* Tank was not filled completely.',
  'log.deleteFill': 'Delete the {day} fill-up',
  'log.defaultName': 'My car',
  'log.errName': 'Give the vehicle a name.', 'log.errConsumption': 'Consumption must be between 1 and 40 L/100 km.',
  'log.confirmDelete': 'Delete {name} and {count} fill-up records?',
  'log.errLiters': 'Enter the litres (0.1 – 500).', 'log.errTotal': 'Enter the amount you paid.',
  'log.errOdo': 'The odometer value is invalid.', 'log.errDate': 'The date cannot be in the future.',
  'log.savedHint': 'Saved. Add the odometer reading to your fill-ups to see real consumption.',
  'log.saved': 'Saved.', 'log.exportFail': 'Could not export.',
  'log.shareTitle': 'Depo Dolu fuel log', 'log.shareDialog': 'Share fuel log',
  'log.csvHeader': 'date;vehicle;litres;total_try;price_per_litre_try;odometer_km;full_tank',
  'log.yes': 'yes', 'log.no': 'no',

  'err.prices': 'Could not load prices. Check your connection and try again.',
};

const dictionaries: Record<Lang, Dict> = { tr, en };

/** Çeviri: anahtar bulunamazsa Türkçeye, o da yoksa anahtarın kendisine döner. {ad} yer tutucuları doldurulur. */
export function t(key: string, params?: Record<string, string | number>, lang: Lang = current): string {
  const text = dictionaries[lang][key] ?? tr[key] ?? key;
  return params ? text.replace(/\{(\w+)\}/g, (m, name) => (name in params ? String(params[name]) : m)) : text;
}

export const dictionaryKeys = (lang: Lang) => Object.keys(dictionaries[lang]);
