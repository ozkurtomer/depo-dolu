# Collection and notifications

The collector is scheduled every 15 minutes. It is a best-effort service: source failures, hosting delays and delivery providers can delay an alert. It observes published prices; it does not predict future price changes.

## Data checks

The parser accepts known provinces only. Validation requires at least 75 distinct region rows, all three fuel prices in each row, reasonable absolute prices, and no detected jump above 20%. A missing province retains its previous entry. These checks reduce obvious bad data; they cannot prove that an upstream price is correct.

No-price-change runs leave price timestamps alone. The collector can also repair a previously stored missing value without calling it a price change. `updatedAt` is therefore the last stored data update, not a collection heartbeat.

## Durable delivery

1. Collection writes price data and appends the changes to `data/notifications.pending.json`.
2. The workflow commits and pushes the data and queue before sending anything.
3. The sender records successful FCM topics and Telegram batches separately.
4. A final workflow step commits delivery progress even if some deliveries failed.
5. The next scheduled run attempts unfinished deliveries, even if prices did not change.

The queue contains public price data and delivery markers, never tokens. Missing channel credentials disable that channel: messages are logged and considered skipped. Configuring a new channel does not replay old alerts. Failed configured channels leave unfinished entries and a failed workflow result.

This is **at-least-once** delivery, not exactly-once delivery. A process crash or failed push after a provider accepted a message can cause a duplicate. Successful deliveries already committed to the repository are not repeated. Monitor failed workflows and resolve permanent provider errors instead of leaving a growing queue.

`--send PATH --dry-run` previews queued messages without acknowledging them. Direct `--test` sends labelled real messages and does not modify price data. Do not use it against a public channel accidentally.

## Local offline check (from repository root)

```bash
dotnet run --project collector/DepoDolu.Collector -- --data .local-data --html collector/DepoDolu.Collector.Tests/Fixtures/po-2026-10-25.html --dry-run
dotnet test collector/DepoDolu.sln
```

## Native app status

Ionic/Capacitor client code is present, but an Android/iOS package, native notification icon, Firebase configuration and real-device verification are still needed. Web users receive no native push permission prompt; they can follow the Telegram channel. The separate Chrome extension is available as a local unpacked beta; see [its setup and test guide](../extension/README.md). It uses Chrome alarms and local notifications rather than Firebase. Store publication remains pending.

## Fork configuration

- Change the repository and public web URLs in `app/src/app/config.ts`, and the sharing metadata in `app/src/index.html`.
- Update the web deployment base path in `.github/workflows/pages.yml`.
- Add `FIREBASE_SERVICE_ACCOUNT` and/or `TELEGRAM_BOT_TOKEN` as Actions secrets; `TELEGRAM_CHAT_ID` is a repository variable.
- Create the Android project with `npx cap add android` before placing `google-services.json` inside `app/android/app/`.
- Configure GitHub Pages to use GitHub Actions. Review permissions and run the workflow manually once before relying on scheduled checks.

## Angular 19 build compatibility

`app/package.json` pins the transitive `schema-utils` 4.x range to 4.3.3 through a scoped npm override. Later schema-utils 4.8.1 requires webpack ^5.112.0, while Angular 19.2.27 pins webpack 5.105.0. npm 10 on Linux otherwise tries to replace the locked webpack and rejects `npm ci` as inconsistent.

Do not remove this override without checking the complete build-tool dependency tree. Revisit it with an Angular/build-tool upgrade. Keep `npm ci` in CI; do not bypass dependency validation with `--force` or an unlocked install.

For this fix, the original failure was reproduced on Linux with Node 22.23.3/npm 10.9.9. The corrected lock is generated and checked with the same versions, including `npm ls schema-utils webpack`, the app tests and the production build.
