# depodolu

Türkiye akaryakıt fiyatları için küçük, bağımlılıksız JavaScript istemcisi. [Depo Dolu](https://github.com/ozkurtomer/depo-dolu) açık JSON verisini okur: 81 il (82 bölge), benzin, motorin ve LPG. Anahtar ve hesap gerekmez. Node 18+ ve tarayıcılarda çalışır, TypeScript tipleri dahil.

> Henüz npm'de yayımlanmadı. Şimdilik `index.js` (ve istersen `index.d.ts`) dosyasını projene kopyalayarak kullanabilirsin.

```js
import { getPrice, getCities, getHistory } from 'depodolu';

const bursa = await getPrice('bursa', 'motorin');
console.log(`${bursa.name} motorin: ${bursa.price} ₺/L`); // TL/litre, KDV dahil

const cities = await getCities();           // [{ key: 'adana', name: 'Adana' }, …]
const history = await getHistory('izmir');  // fiyatın değiştiği anlar, eskiden yeniye
```

Kendi önbelleğin, vekil sunucun ya da testlerin için:

```js
import { createClient } from 'depodolu';
const client = createClient({ baseUrl: 'https://senin-aynan.example/data/', timeoutMs: 5000 });
```

| Fonksiyon | Döner |
| --- | --- |
| `getLatest()` | `latest.json` olduğu gibi |
| `getPrice(il, yakıt)` | `{ city, name, fuel, price, changedAt, updatedAt, source }` |
| `getCities()` | il anahtarları ve adları, Türkçe alfabetik |
| `getHistory(il)` | `history/{il}.json` |
| `getChanges()` | Türkiye geneli son değişiklikler |
| `getAnnouncements()` | beklenen zam/indirim duyuruları (gözlenen fiyat değildir) |

Hatalar `DepoDoluError` olarak gelir: bilinmeyen il/yakıt, ağ hatası, HTTP hatası.

Veri Petrol Ofisi il liste fiyatıdır; tüm istasyonların ortalaması değildir. `updatedAt` son veri yazımını gösterir, son başarılı kontrolü göstermez. GitHub'ın önbellek ve kullanım sınırları geçerlidir: makul aralıklarla sorgula. Lisans: MIT.

## English

Tiny dependency-free client for Turkey's fuel prices (gasoline `benzin`, diesel `motorin`, `lpg`) from the Depo Dolu open dataset. Same API as above; prices are TRY per litre, VAT included. Not yet published to npm.
