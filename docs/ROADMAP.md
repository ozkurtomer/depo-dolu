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

- [ ] **Android app:** package the existing Ionic/Capacitor client, add native assets and Firebase configuration, test on real devices, and prepare a store release.
- [x] **Local Chrome extension beta:** Manifest V3 popup, optional alerts, price history, local demo scenarios and dependency-free tests. [Load unpacked](../extension/README.md).
- [ ] **Chrome Web Store publication:** package, screenshots, listing copy and privacy answers are ready ([release guide](../extension/STORE.md)); waiting for store review.
- [ ] **iOS:** validate native notification/topic support and distribution requirements before promising availability.
- [ ] **Installable web app:** an explicit offline policy and install flow, without presenting cached prices as live.

## More useful data

- [ ] Add another distributor behind a versioned, backward-compatible schema.
- [ ] District-level prices where a reliable public source exists.
- [ ] Pre-change announcements with a separate source and a clear distinction from observed pump list prices.
- [ ] A small embeddable widget and examples built by the community.

## Good first contributions

These are suggested tasks, not existing GitHub issues. Open an issue to coordinate before starting.

- Check search and keyboard navigation with Turkish province names on small screens.
- Add tests for date formatting around midnight and timezone changes.
- Write a small example that consumes the JSON API in another language.
- Improve English/Turkish documentation parity.
- Test the web app with a screen reader and document a reproducible issue.
