# Changelog

## Unreleased

### Added
- Static, indexable page for every province and fuel (`/bursa/motorin/`) with its own title, description, share preview and readable price summary; an all-provinces table at `/fiyatlar/`; generated `sitemap.xml` and `robots.txt`. Pages redeploy four times a day.
- Share links now open the province page, so chat previews show that province's price. Old `?il=&yakit=` links still work.
- Installable web app: manifest, app-shell service worker (price data is never cached by it) and an install card with iPhone instructions.
- Trip cost calculator (estimated distance between province centres, consumption, round trip, per-person split) with where-to-fill-up advice.
- Monthly fuel budget and the monthly effect of a 1 ₺/L increase; consumption and monthly distance are stored on the device.
- Price history ranges (1 month / 3 months / 1 year / all) appear as history accumulates, with the change over the selected range.
- `data/announcements.json` and the "Zam duyurusu ekle" workflow for sourced, upcoming price changes, shown as "expected" and hidden once the price changes; optional Telegram post.
- Embeddable price box (`widget.js`, `embed.html`) and `docs/WIDGET.md`.
- Optional X (Twitter) summaries in the collector (OAuth 1.0a without NuGet) with independent delivery tracking in the queue.
- Typed, dependency-free JavaScript client in `packages/depodolu` and a Home Assistant REST sensor example.
- Android app (`app/android/`): Capacitor 8 targeting Android 16 / API 36, Depo Dolu icon and splash, white `ic_stat_fuel` notification icon, default `fiyat` channel and FCM metadata.
- Native share sheet on Android/iOS via `@capacitor/share`.
- CI builds a debug APK on every push (`depo-dolu-android-debug` artifact); optional `GOOGLE_SERVICES_JSON` secret enables push in that build.
- `docs/ANDROID.md` (build, Firebase, APK, Google Play) and `docs/PRIVACY.md` for the web and Android app.
- `app/tools/generate_native_assets.py` and `npm run assets:native` to regenerate native icons.
- Chrome extension 1.0.0, ready for the Chrome Web Store: store screenshots and promo tiles (`extension/store/`), listing copy, permission justifications and a step-by-step release guide (`extension/STORE.md`).
- Extension settings link to the Telegram bot with the selected province and fuel (`t.me/depodolu_bot?start=…`).
- Manifest checks for store limits (name, description, version) and matching version labels.
- Local Manifest V3 Chrome extension with province/fuel selection, price history, tank calculator and sharing.
- Optional local desktop alerts and toolbar badge; 15-minute checks only while alerts are enabled.
- Isolated demo mode with simulated price changes/offline behavior, privacy notes and local ZIP packaging.
- Dependency-free extension tests and manifest checks; local extension CI job prepared.
- Repository and web social preview card, sharing metadata and an app sitemap.
- Dependency-free Python/Node API examples with offline input.
- Support/community documents and prepared first-contribution issue drafts.
- Optional GitHub CLI setup tool (preview by default; no commits or pushes).
- Shareable province and fuel links and a price sharing button.
- Durable notification queue with independent FCM topic and Telegram delivery tracking.
- Frontend tests for sharing, data validation and notification subscription recovery.
- Windows and Linux collector checks, API documentation and contribution templates.

### Fixed
- Pin schema-utils 4.x to an Angular 19-compatible version to fix Linux npm CI/Pages installs.
- Regenerate the npm lockfile with npm 10 to resolve clean-install failures in GitHub CI and Pages.
- Missing fuel prices and duplicate province rows no longer pass collector validation.
- Previously stored missing prices can recover without generating a false price alert.
- Failed notification requests no longer report success; unfinished deliveries are retried.
- First-load failures show a retry action; malformed local cache no longer blocks recovery.
- Old notification subscriptions remain available for cleanup after network errors.
- Telegram message line endings are consistent across Windows and Linux.

### Changed
- Upgrade Capacitor and plugins from 7 to 8; Firebase JS SDK 11 → 12 (plugin peer requirement).
- Extension badge uses a Turkish decimal comma (97,9).
- Extension 128 px icon follows Chrome Web Store padding guidance (96 px artwork, 16 px transparent margin).
- Describe scheduled checks accurately instead of promising instant alerts.
- Use lockfile-based installs in CI and web deployment.

This section is not a published release. The Chrome extension is packaged for Chrome Web Store review; Android distribution remains planned.
