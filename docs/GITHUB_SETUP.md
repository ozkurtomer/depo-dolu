# GitHub görünürlüğü için son ayarlar

Bu rehber, repo dosyalarından bağımsız GitHub ayarlarını tamamlamak içindir. Hazırlanmış değerler `.github/repository-setup.json` içindedir. Bu dosyayı commit etmek tek başına GitHub ayarlarını değiştirmez.

## Elle, birkaç dakikada

1. Repo ana sayfasında **About → dişli** bölümünü aç. Description alanına şunu yaz:

   > Turkey fuel prices for 81 provinces: open JSON API, price history, tank calculator and alerts. Built with .NET, Angular and Ionic.

2. Website: `https://ozkurtomer.github.io/depo-dolu/`
3. Topics alanına ilgili etiketleri ekle: `fuel-prices`, `turkey`, `open-data`, `open-source`, `dotnet`, `csharp`, `angular`, `typescript`, `ionic`, `capacitor`, `telegram-bot`, `github-actions`. Bunlar Description alanındaki virgüllü bir liste değildir; ayrı Topics alanına yazılır.
4. **Settings → General → Social preview** bölümüne `docs/social-preview.png` dosyasını yükle. Görsel 1280 × 640 pikseldir. README kapağı ile web paylaşım kartı da aynı tasarımı kullanır.
5. `.github/first-contributions/` içindeki üç taslağı issue olarak yayımla. Başlıkları `.github/repository-setup.json` içindedir; `good first issue` ve `help wanted` etiketlerini ekle. Bunlar hazırlık dosyalarıdır, henüz yayımlanmış issue değillerdir.

## İsteğe bağlı: GitHub CLI ile

[GitHub CLI](https://cli.github.com/) kurulu ve kendi hesabınla `gh auth login` yapılmışsa repo kökünden:

```bash
# Yalnızca planı gösterir; GitHub'a hiçbir şey yazmaz
python tools/github_setup.py

# Açıklama, web adresi, topics, iki etiket ve üç katkı issue'sunu uygular
python tools/github_setup.py --apply
```

Araç commit, push, dal, release veya profil değişikliği yapmaz. Aynı başlıkla açık/kapalı issue varsa yeniden açmaz. Ayarları ve etiket açıklamalarını JSON'daki değerlere günceller. Sosyal önizleme yüklemesi bu araca dahil değildir; yukarıdaki elle yükleme adımını kullan.

Araç GitHub'a yazan gerçek bir işlemdir; önce önizlemeyi ve JSON dosyasını kontrol et. API veya oturum hatası alırsan yetkini kontrol et; token'ı issue'ya veya sohbet mesajına yapıştırma.

## Push'tan sonra kontrol

- CI ve Web demo akışlarının yeşil olduğunu kontrol et. Kilit dosyası, GitHub Actions'taki npm 10 ile temiz kurulum için yeniden üretildi.
- Demo bağlantısını, bir il paylaşım bağlantısını ve API örneğini dene.
- About açıklaması, topics ve sosyal önizlemeyi repo ana sayfasında doğrula.
- İlk tanıtımı çalışan demo ve kısa kullanım videosuyla yap. Hazır metinler: [LAUNCH_COPY.md](LAUNCH_COPY.md).

Sonraki aşamalar [yol haritasında](ROADMAP.md): mobil uygulama ve Chrome eklentisi henüz yayımlanmış değildir.
