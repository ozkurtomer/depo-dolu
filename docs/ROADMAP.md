# Roadmap

Depo Dolu aims to make Turkish fuel prices easy to check, share and reuse. An unchecked item is a proposal, not a delivery date.

## Available now

- [x] Web app: 81 provinces, 82 regions, three fuels.
- [x] Tank cost and comparison across Petrol Ofisi province list prices.
- [x] Public JSON data and per-province history.
- [x] Province/fuel share links and sharing from the price screen.
- [x] Telegram summaries and FCM collector support.
- [x] Collector validation, retryable notification queue and CI checks.

## Next: reach people where they already are

- [x] **Android app:** Capacitor 8 project (API 36), app icon, splash, notification icon and channel, native share sheet, CI debug APK. [Build guide](ANDROID.md).
- [ ] **Google Play release:** signed bundle, closed testing (12 testers × 14 days for new personal accounts), store listing.
- [x] **Local Chrome extension beta:** Manifest V3 popup, optional alerts, price history, local demo scenarios and dependency-free tests. [Load unpacked](../extension/README.md).
- [ ] **Chrome Web Store publication:** package, screenshots, listing copy and privacy answers are ready ([release guide](../extension/STORE.md)); waiting for store review.
- [ ] **iOS:** validate native notification/topic support and distribution requirements before promising availability.
- [x] **Installable web app:** manifest, service worker that caches only the app shell, install prompt (and iPhone instructions); offline prices are always labelled as last stored.
- [x] **Search and share previews:** a static page per province and fuel (`/bursa/motorin/`), an all-provinces table and a sitemap, rebuilt four times a day.
- [x] **Trip and budget tools:** trip cost with estimated distance between province centres, where-to-fill-up advice, monthly budget.
- [x] **More channels:** optional X (Twitter) summaries. WhatsApp Channels have no public posting API; posts there stay manual.
- [x] **Fuel log and vehicles:** fill-ups, real consumption, monthly spend, CSV export, several vehicles.
- [x] **Price alarm and Android widget:** hourly background check with one local notification per drop.
- [x] **Shareable visuals:** per-province share images and a price map page.
- [x] **Telegram in groups:** `/fiyat <province>` and inline mode.
- [x] **Operations:** hourly data health check; optional cookie-free web visit counter.

## More useful data

- [ ] Add another distributor behind a versioned, backward-compatible schema.
- [ ] District-level prices where a reliable public source exists.
- [x] Pre-change announcements with a separate source and a clear distinction from observed pump list prices (`data/announcements.json`, added via a manual workflow).
- [x] A small embeddable widget ([WIDGET.md](WIDGET.md)), a typed JS client and a Home Assistant example.
- [ ] Publish the JS client to npm and submit the API to public lists (drafts in [LAUNCH_COPY.md](LAUNCH_COPY.md)).
- [ ] Long-range charts against the exchange rate or inflation once a year of history has accumulated.
- [ ] "Why did the price change?" card (Brent, USD/TRY); needs a keyed data source (TCMB EVDS) and accumulated history.
- [ ] Electric vehicle charging prices once a reliable public source exists.
- [ ] English interface.

## Good first contributions

These are suggested tasks, not existing GitHub issues. Open an issue to coordinate before starting.

- Check search and keyboard navigation with Turkish province names on small screens.
- Add tests for date formatting around midnight and timezone changes.
- Write a small example that consumes the JSON API in another language.
- Improve English/Turkish documentation parity.
- Test the web app with a screen reader and document a reproducible issue.
