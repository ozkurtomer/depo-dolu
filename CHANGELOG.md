# Changelog

## Unreleased

### Added
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
- Describe scheduled checks accurately instead of promising instant alerts.
- Use lockfile-based installs in CI and web deployment.

This section is not a published release. Android distribution and Chrome Web Store publication remain planned; the extension is available as a local unpacked beta.
