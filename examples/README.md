# Build with Depo Dolu / Kullanım örnekleri

Two small clients, no API keys and no third-party dependencies. Run these commands from the repository root. They print a province/fuel price, source context and the **last stored update**, which is not the last successful collection time.

## Python 3.9+

```bash
# Offline: use the data included in this repository
python examples/prices.py --file data/latest.json --city bursa --fuel motorin

# Public API
python examples/prices.py --city izmir --fuel benzin
```

## Node.js 22.18+

```bash
# Offline
node examples/prices.mjs --file data/latest.json --city bursa --fuel motorin

# Public API
node examples/prices.mjs --city istanbul-avrupa --fuel lpg
```

Illustrative output, not a live price quote:

```text
Bursa / motorin: 97.80 TRY/L
Last stored update: 2026-10-25T18:22:00+00:00
Source: Petrol Ofisi province list; individual pump prices may differ.
```

`benzin` is gasoline, `motorin` diesel, `lpg` autogas. Both examples return a nonzero exit code for missing files, unavailable prices, unknown provinces or network errors. Valid province keys come from `latest.json`, not display names. See [API documentation](../docs/API.md) for the contract and hosting limitations.

Türkçe: `--file data/latest.json` ile internete çıkmadan deneyebilirsin. `--city` kalıcı il anahtarını, `--fuel` yakıt türünü seçer. Fiyatlar TL/litre ve KDV dahildir.
