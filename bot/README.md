# Depo Dolu Telegram botu

[@depodolu_bot](https://t.me/depodolu_bot): kullanıcı ilini ve yakıtını seçer, **sadece o il ve yakıtta** fiyat değişince mesaj alır.

```
Kullanıcı: /start
Bot:       Hangi ilde yakıt alıyorsun?  [İstanbul (Avrupa)] [Ankara] [Bursa] ...
Kullanıcı: bursa
Bot:       Bursa için hangi yakıtı takip edelim?  [Benzin] [Motorin] [LPG] [Hepsi]
Kullanıcı: (Motorin'e dokunur)
Bot:       ✅ Tamam! Bursa motorin fiyatı değiştiği an sana yazacağım.

... zam gelince ...

Bot:       ⛽ Bursa: Motorine zam
           Litre 97,80 → 99,10 ₺ (+1,30 ₺)
           50 litrelik depo artık 4.955 ₺.
```

Komutlar: `/fiyat`, `/degistir`, `/durdur`, `/test`, `/yardim`.
Web uygulamasındaki Telegram düğmesi seçili ili bota taşır (`t.me/depodolu_bot?start=bursa_motorin`), kullanıcı tek dokunuşla abone olur.

## Nasıl çalışır?

```
Telegram ──webhook──▶ Cloudflare Worker (bu klasör) ──▶ D1: chat_id, il, yakıt
                              ▲
GitHub Actions toplayıcısı ───┘ zam olunca abone listesini alır,
                                her kişiye kendi ilinin mesajını Telegram'dan gönderir
```

- **Worker** konuşmayı yönetir ve abone listesini tutar. Ücretsiz plan (günde 100 bin istek, D1'de günde 100 bin yazma) bu iş için fazlasıyla yeter.
- **Mesajları toplayıcı gönderir** (`collector/DepoDolu.Collector/BotNotifier.cs`). Worker'ın istek başına alt istek sınırı olduğu için binlerce kişiye gönderim GitHub Actions'ta yapılır. Saniyede ~25 mesajla Telegram sınırının altında kalınır; botu engelleyenler listeden silinir.
- **Gizlilik:** Sadece Telegram sohbet kimliği ve seçilen il/yakıt tutulur. Bu bilgi repoya **hiç** yazılmaz. `/durdur` kaydı siler.

## Kurulum (bir kerelik, ~15 dakika)

Gerekenler: ücretsiz bir [Cloudflare hesabı](https://dash.cloudflare.com/sign-up), Node.js 20+ ve BotFather'dan alınmış bot token'ı.

### 1. Cloudflare'e bağlan ve veritabanını oluştur

```bash
cd bot
npm install
npx wrangler login                      # tarayıcı açılır, Cloudflare hesabınla onayla
npx wrangler d1 create depodolu-bot     # çıktıdaki database_id'yi kopyala
```

`wrangler.toml` içindeki `database_id = "BURAYA_D1_ID"` satırına bu kimliği yaz, sonra tabloyu oluştur:

```bash
npm run db:init
```

### 2. Gizli değerleri ekle

İki uzun rastgele metin üret (PowerShell'de):

```powershell
-join ((48..57)+(65..90)+(97..122) | Get-Random -Count 40 | % {[char]$_})
```

Bu komutu iki kez çalıştır; birini `WEBHOOK_SECRET`, diğerini `API_SECRET` için kullan. Sonra:

```bash
npx wrangler secret put BOT_TOKEN        # BotFather'ın verdiği token
npx wrangler secret put WEBHOOK_SECRET   # 1. rastgele metin
npx wrangler secret put API_SECRET       # 2. rastgele metin (aşağıda GitHub'a da eklenecek)
```

### 3. Yayınla ve Telegram'a bağla

```bash
npm run deploy
```

Çıktıda `https://depodolu-bot.<hesabın>.workers.dev` gibi bir adres görürsün. Tarayıcıda şunu aç:

```
https://depodolu-bot.<hesabın>.workers.dev/setup?key=WEBHOOK_SECRET_DEĞERİ
```

`"webhook":{"ok":true` görürsen bot bağlandı. Telegram'da [@depodolu_bot](https://t.me/depodolu_bot)'u aç, `/start` yaz.

### 4. Toplayıcıya bağla (GitHub)

Repo → **Settings → Secrets and variables → Actions**:

| Sekme | Ad | Değer |
|---|---|---|
| Variables | `BOT_API_URL` | `https://depodolu-bot.<hesabın>.workers.dev` |
| Secrets | `BOT_API_SECRET` | 2. adımdaki `API_SECRET` ile aynı |

`TELEGRAM_BOT_TOKEN` zaten tanımlı; toplayıcı kişisel mesajları da bu token ile gönderir.

## Günlük kullanım

```bash
npm test               # konuşma akışı testleri (Node 22.5+)
npm run deploy         # kod değişince yeniden yayınla
npm run logs           # canlı Worker logları
```

Kaç kişi abone?

```bash
curl -H "Authorization: Bearer API_SECRET_DEĞERİ" https://depodolu-bot.<hesabın>.workers.dev/stats
```
