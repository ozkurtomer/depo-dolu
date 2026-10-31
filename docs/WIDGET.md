# Fiyat kutusu (widget) / Embeddable price box

Haber siteleri, bloglar ve forumlar için tek satırlık fiyat kutusu. Çerez, analiz ve reklam yok; kutu bir `iframe` içinde çalışır, sayfanın stilini etkilemez. Veri her açılışta herkese açık `latest.json`'dan okunur.

## Kullanım

```html
<div data-depodolu-il="bursa" data-depodolu-yakit="motorin"></div>
<script src="https://ozkurtomer.github.io/depo-dolu/widget.js" async></script>
```

Bir sayfaya birden çok kutu koyabilirsin; betik bir kez yüklenir.

| Özellik | Değer | Varsayılan |
| --- | --- | --- |
| `data-depodolu-il` | İl anahtarı: `bursa`, `istanbul-avrupa`, `sanliurfa`… ([liste](../data/README.md)) | zorunlu |
| `data-depodolu-yakit` | `benzin`, `motorin`, `lpg` | yoksa üçü birden |
| `data-depodolu-tema` | `acik`, `koyu` | `acik` |
| `data-depodolu-genislik` | piksel | `320` |

JavaScript eklemek istemiyorsan doğrudan iframe:

```html
<iframe src="https://ozkurtomer.github.io/depo-dolu/embed.html?il=izmir&yakit=benzin&tema=koyu"
        width="320" height="150" style="border:0" loading="lazy" title="İzmir benzin fiyatı"></iframe>
```

Kutuya tıklayan okur, o ilin ve yakıtın Depo Dolu sayfasına gider. Fiyatın altında kaynak (Petrol Ofisi il liste fiyatı, KDV dahil) ve son değişiklik tarihi yazar; lütfen bu bilgiyi gizleme.

## English

Add the `div` and the script above. Attributes: province key (required), fuel (`benzin` = gasoline, `motorin` = diesel, `lpg`), theme (`acik` light / `koyu` dark) and width. The box is an iframe with no cookies or analytics and links back to the province page. Keep the source line visible.
