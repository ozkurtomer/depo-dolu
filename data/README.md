# Depo Dolu veri klasörü

Bu klasör herkese açık, ücretsiz bir akaryakıt fiyat API'si gibi çalışır. Toplayıcı, Petrol Ofisi'nin il liste fiyatlarını 15 dakikada bir kontrol eder ve fiyat değiştiğinde buradaki dosyaları günceller.

Temel adres:

```
https://raw.githubusercontent.com/ozkurtomer/depo-dolu/main/data/
```

Tüm fiyatlar **TL/litre, KDV dahildir**. Tarihler ISO 8601 biçiminde ve UTC'dir.

## `latest.json`: güncel fiyatlar

```json
{
  "source": "Petrol Ofisi",
  "sourceUrl": "https://www.petrolofisi.com.tr/akaryakit-fiyatlari",
  "updatedAt": "2026-10-25T18:20:00+00:00",
  "prices": {
    "bursa": {
      "name": "Bursa",
      "benzin": 77.40,
      "motorin": 97.80,
      "lpg": 40.60,
      "changedAt": "2026-10-25T18:20:00+00:00"
    }
  }
}
```

| Alan | Açıklama |
|---|---|
| `updatedAt` | Bu dosyanın en son yazıldığı an, yani herhangi bir ilde fiyatın son değiştiği an |
| `prices` | İl anahtarı → fiyatlar. 82 kayıt: 81 il, İstanbul Avrupa ve Anadolu ayrı |
| `name` | İlin Türkçe adı |
| `benzin` | Kurşunsuz 95 |
| `motorin` | Dizel |
| `lpg` | Otogaz. Eski kayıtlardaki `null` değerlerini istemci tarafında ele al; yeni eksik fiyatlar reddedilir |
| `changedAt` | O ilde herhangi bir yakıtın en son değiştiği an |

İl anahtarları küçük harftir ve Türkçe karakter içermez: `istanbul-avrupa`, `istanbul-anadolu`, `ankara`, `izmir`, `sanliurfa`, `canakkale`, `afyon` (Afyonkarahisar)… Anahtarlar kalıcıdır, değişmez.

## `history/{il}.json`: fiyat geçmişi

Sadece fiyatın değiştiği anlar kaydedilir. Her il için en fazla 400 kayıt tutulur.

```json
[
  { "at": "2026-10-24T21:00:00+00:00", "benzin": 77.40, "motorin": 96.10, "lpg": 40.60 },
  { "at": "2026-10-25T21:00:00+00:00", "benzin": 77.40, "motorin": 97.80, "lpg": 40.60 }
]
```

## `changes.json`: Türkiye geneli son değişiklikler

En yeni değişiklik en üstte, en fazla 300 kayıt. Henüz hiç değişiklik olmadıysa boş liste (`[]`) döner.

```json
[
  { "at": "2026-10-25T21:00:00+00:00", "city": "bursa", "name": "Bursa", "fuel": "motorin", "old": 96.10, "new": 97.80 }
]
```

## Kullanım notları

- `raw.githubusercontent.com` dosyaları birkaç dakika önbellekte tutar. Daha taze veri için adrese `?t=<zaman>` ekleyebilirsin.
- CORS açıktır, tarayıcıdan doğrudan `fetch` edebilirsin.
- Geçmişin tamamına bu klasörün git geçmişinden de ulaşabilirsin: fiyat commitleri değişiklikleri, bildirim commitleri teslim durumlarını kaydeder.
- Fiyatlar il liste fiyatıdır, istasyonlar arasında küçük farklar olabilir.

## Güncellik ve kapsam

Kontroller 15 dakikalık aralıklarla planlanır, gecikebilir. `updatedAt` son veri yazımını gösterir; son başarılı kontrolü göstermez. GitHub'ın kullanılabilirlik, önbellek ve kullanım sınırları geçerlidir; sınırsız servis veya anlık teslim garantisi yoktur.

Fiyatlar tek dağıtıcının il liste fiyatlarıdır. Uygulamadaki Türkiye ortalaması, bu veri kümesindeki bölgelerin ağırlıksız ortalamasıdır; tüm istasyonların piyasa ortalaması değildir.

`notifications.pending.json` dosyası varsa iç bildirim kuyruğudur; API sözleşmesine dahil değildir. [English API reference](../docs/API.md).
