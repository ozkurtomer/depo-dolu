# Public price data

English reference. Türkçe: [data/README.md](../data/README.md).

Base URL: `https://raw.githubusercontent.com/ozkurtomer/depo-dolu/main/data/`

No API key or account is required. These are static JSON files hosted by GitHub, subject to GitHub availability, caching and usage limits. There is no uptime or latency guarantee. Checks are scheduled every 15 minutes and may be delayed.

| File | Shape | Meaning |
| --- | --- | --- |
| `latest.json` | object | Current prices for 82 regions in 81 provinces |
| `history/{province}.json` | array, oldest first | Snapshots for one province, up to 400 entries |
| `changes.json` | array, newest first | Up to 300 individual province/fuel changes |

`notifications.pending.json`, when present, is an internal delivery queue. It is not part of the public API contract.

## Read a price

```js
const base = 'https://raw.githubusercontent.com/ozkurtomer/depo-dolu/main/data';
const response = await fetch(`${base}/latest.json`);
if (!response.ok) throw new Error(`Price data unavailable: ${response.status}`);
const data = await response.json();
console.log(data.prices.bursa.motorin); // TRY per litre
console.log(data.updatedAt);           // Last stored data update, not last successful check
```

Fuel fields: `benzin` = gasoline (95 octane), `motorin` = diesel, `lpg` = autogas. Prices are numbers in Turkish lira per litre, VAT included. Consumers should handle `null` for older or incomplete records. The collector now rejects new snapshots with missing fuel values.

`prices` is keyed by stable ASCII province slugs, including `istanbul-avrupa`, `istanbul-anadolu`, `sanliurfa` and `afyon`. Read all keys from `latest.json`; do not derive them from display names.

Each province has `name`, the three fuel fields, and `changedAt`. `changedAt` applies to the province snapshot, not necessarily to every fuel. History items contain `at` and the three fuel fields. Change items contain `at`, `city`, `name`, `fuel`, `old`, `new`.

Times use ISO 8601 with an explicit offset. If prices do not change, the collector does not update the price timestamp. A recent HTTP fetch alone does not prove that the upstream collection is healthy. Display the timestamp and source; cache responsibly and use a reasonable polling interval.

The source is [Petrol Ofisi's public province list](https://www.petrolofisi.com.tr/akaryakit-fiyatlari). It is one distributor's list price, not an average across all fuel stations or a guaranteed pump price. The app's “Türkiye ortalaması” is the unweighted mean of available region prices in this dataset.

## Open a province in the app

`https://ozkurtomer.github.io/depo-dolu/?il=bursa&yakit=motorin`

Valid fuels are `benzin`, `motorin`, `lpg`. Unknown provinces and fuels are ignored. The link opens the selected price; it does not enable notifications by itself for a new user.

## Compatibility

Existing province slugs and fuel names are public identifiers. New distributors or breaking schema changes need an explicit versioning plan. Prefer reading only the fields you need and ignoring additional fields.
