<div align="center">

<img src="docs/social-preview.png" alt="Depo Dolu — fuel prices for Turkey, open data and easier tracking" width="100%">

# Depo Dolu

**English** · [Türkçe](README.tr.md)

**Fuel prices for all 81 provinces of Turkey. Check a price, calculate a tank, share it, or build with the open JSON API.**

[Try the web app](https://ozkurtomer.github.io/depo-dolu/) · [Use the API](docs/API.md) · [Code examples](examples/README.md) · [Telegram alerts](https://t.me/depodolu_bot) · [Contribute](CONTRIBUTING.md)

[![CI](https://img.shields.io/github/actions/workflow/status/ozkurtomer/depo-dolu/ci.yml?label=tests)](https://github.com/ozkurtomer/depo-dolu/actions/workflows/ci.yml)
[![Collector](https://img.shields.io/github/actions/workflow/status/ozkurtomer/depo-dolu/collect.yml?label=collector)](https://github.com/ozkurtomer/depo-dolu/actions/workflows/collect.yml)
[![MIT](https://img.shields.io/badge/license-MIT-0e3b4a)](LICENSE)
[![Stars](https://img.shields.io/github/stars/ozkurtomer/depo-dolu?style=social)](https://github.com/ozkurtomer/depo-dolu/stargazers)

</div>

Fuel prices are easier to understand when you can see what they mean for your own tank. Depo Dolu brings province prices, comparisons, history and alerts together in a small, open-source project. No account or advertising in the app.

## Try it in a minute

1. [Open the app](https://ozkurtomer.github.io/depo-dolu/) and choose a province and fuel.
2. Compare the price with other regions and choose your tank size.
3. Use **“Bu fiyatı paylaş”** to share the price and a link that opens the same province and fuel.

Example: [Bursa · diesel](https://ozkurtomer.github.io/depo-dolu/?il=bursa&yakit=motorin). For alerts without installing anything, open [@depodolu_bot](https://t.me/depodolu_bot) on Telegram and type your province: you only hear about your own province and fuel. The [@depodolu](https://t.me/depodolu) channel posts a nationwide summary.

<p align="center"><img src="docs/ekranlar.png" alt="Province selection, fuel selection, tank cost and price history" width="100%"></p>
<p align="center"><sub>Illustrative app overview; the history shown is sample data. The live demo contains the actual collected history.</sub></p>

## What is available?

| For drivers | For developers |
| --- | --- |
| Gasoline, diesel and LPG in 81 provinces (82 regions) | Public JSON, no API key or account |
| Tank cost, region comparison and price history | .NET collector with no production NuGet dependencies |
| Shareable province and fuel links | Angular + Ionic web client, ready for further native work |
| Personal Telegram alerts for your province ([@depodolu_bot](https://t.me/depodolu_bot)) | FCM topics, Telegram bot on Cloudflare Workers + D1 ([bot/](bot/README.md)), retry queue and tests |

**Current scope:** prices come from Petrol Ofisi province lists. Checks are scheduled every 15 minutes, can be delayed, and do not guarantee instant alerts. A [local Chrome extension](extension/README.md) is included as an unpacked beta. Native mobile distribution and Chrome Web Store publication remain [planned](docs/ROADMAP.md). The web app does not receive push alerts.

## Chrome extension · local beta

Load the `extension/` folder through `chrome://extensions` → Developer mode → Load unpacked. No build or dependency install is required. It includes province/fuel selection, tank cost, price history, an optional badge and optional desktop alerts.

The built-in local test panel can simulate price increases, decreases and connection failures without editing live data. [Install and test the extension](extension/README.md) · [Privacy](extension/PRIVACY.md). This is not a Chrome Web Store release.

## Latest stored prices

This table is maintained by the collector. Its date is the last stored update, not the last successful check.

<!-- FIYATLAR:BASLA -->
| Province | Gasoline | Diesel | LPG |
|:---|---:|---:|---:|
| **İstanbul (Avrupa)** | 76.30 | 96.80 | 41.20 |
| **İstanbul (Anadolu)** | 76.10 | 96.60 | 40.60 |
| **Ankara** | 77.30 | 97.90 | 41.29 |
| **İzmir** | 77.50 | 98.10 | 41.20 |
| **Bursa** | 77.40 | 97.80 | 40.60 |
| **Antalya** | 78.50 | 99.20 | 41.40 |
| **Adana** | 78.10 | 98.70 | 41.61 |
| **Konya** | 78.30 | 99.00 | 41.29 |
| **Gaziantep** | 78.20 | 98.80 | 41.41 |
| **Kocaeli** | 76.70 | 97.10 | 40.40 |

<sub>Price per liter in Turkish lira (₺), VAT included. 🔺 increase / 🔻 decrease in the last 36 hours. Last update: Oct 25, 2026, 21:22 (Turkey time). [All 81 provinces](data/latest.json)</sub>
<!-- FIYATLAR:BITIR -->

## Build with the data

```js
const url = 'https://raw.githubusercontent.com/ozkurtomer/depo-dolu/main/data/latest.json';
const response = await fetch(url);
if (!response.ok) throw new Error(`Price data unavailable: ${response.status}`);
const { prices, updatedAt } = await response.json();
console.log(prices.bursa.motorin, updatedAt); // TRY per litre, last stored update
```

| File | Contents |
| --- | --- |
| [`latest.json`](data/latest.json) | Current prices for every region |
| [`history/bursa.json`](data/history/bursa.json) | A province's stored price history |
| [`changes.json`](data/changes.json) | Latest individual price changes; empty until a change is recorded |

`benzin` = gasoline, `motorin` = diesel, `lpg` = autogas. All prices are TRY per litre, VAT included. Hosting is subject to GitHub availability and usage limits. See [API fields, timestamps and sharing links](docs/API.md).

**Ready-to-run examples:** [Python and Node.js](examples/README.md), including an offline mode using the bundled data. No third-party packages required.

Built something with this data? [Tell us in an issue](https://github.com/ozkurtomer/depo-dolu/issues/new) so others can discover it.

## Run locally

Requires **Node.js 22.18+** and **.NET 8 SDK**. From the repository root:

```bash
git clone https://github.com/ozkurtomer/depo-dolu.git
cd depo-dolu
cd app
npm ci
npm start
```

Open `http://localhost:4200`. Development uses the bundled local `data/` directory; no Firebase account is needed.

In another terminal, from the repository root:

```bash
dotnet test collector/DepoDolu.sln
dotnet run --project collector/DepoDolu.Collector -- --data .local-data --html collector/DepoDolu.Collector.Tests/Fixtures/po-2026-10-25.html --dry-run
```

App checks, from `app/`:

```bash
npm test
npm run build
```

## How it works

```mermaid
flowchart LR
    PO[Petrol Ofisi province list] --> C[.NET collector on GitHub Actions]
    C --> D[Public JSON and price history]
    C --> Q[Persisted notification queue]
    D --> W[Angular / Ionic web app]
    D -. planned .-> E[Chrome extension]
    Q --> T[Telegram channel: nationwide summary]
    Q --> B[Telegram bot: only the subscriber's province]
    B <--> S[(Cloudflare D1: chat id, province, fuel)]
    Q --> F[FCM topics for native clients]
```

Validation rejects missing fuel values, duplicate or unknown province rows, too few rows and large detected jumps. Failed configured notification deliveries stay queued for retry. This reduces errors; it is not a guarantee of price accuracy or exactly-once delivery. [Operation and fork setup](docs/OPERATIONS.md).

The app stores selections and a last-price cache on the device. This repository does not collect user accounts; Firebase and Telegram process their own service data. The Telegram bot stores only the chat ID and the chosen province and fuel in Cloudflare D1, never in this repository; `/durdur` deletes the record. [Security notes](SECURITY.md).

## Help it grow

Try it, share a province link, report a reproducible bug, or build an API example. A star helps other developers discover the project if you find it useful.

- [Contributing guide](CONTRIBUTING.md) — English and Turkish, with checks to run.
- [Roadmap and first contribution ideas](docs/ROADMAP.md) — Android, Chrome extension and more data sources.
- [Help](SUPPORT.md) · [Community guidelines](CODE_OF_CONDUCT.md) · [Changelog](CHANGELOG.md).
- Maintainers: [GitHub setup](docs/GITHUB_SETUP.md) · [Launch checklist](docs/LAUNCH.md).

---

Prices are Petrol Ofisi's public province list prices, not an all-station market average; individual pump prices may differ. This project is not affiliated with Petrol Ofisi. Code license: [MIT](LICENSE). By [Ömer Özkurt](https://github.com/ozkurtomer).
