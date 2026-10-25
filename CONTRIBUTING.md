# Contributing / Katkı rehberi

English and Turkish issues and pull requests are welcome. Start with a small reproducible bug, an API example, documentation or an accessibility improvement. See [first contribution ideas](docs/ROADMAP.md#good-first-contributions). These are ideas, not pre-existing issues; open an issue to coordinate larger work.

## Development

Use .NET 8 SDK and Node.js 22.18+. Run commands from the indicated directory:

```bash
# Repository root: collector tests on Windows or Linux
dotnet test collector/DepoDolu.sln

# Repository root: no network request or real notification
dotnet run --project collector/DepoDolu.Collector -- --data .local-data --html collector/DepoDolu.Collector.Tests/Fixtures/po-2026-10-25.html --dry-run
```

```bash
# From app/
npm ci
npm test
npm run build
npm start
```

Development reads local price data at `http://localhost:4200/data/latest.json`. A Firebase account is not required for web work.

## Expectations / Kurallar

- Describe a concrete user problem and keep changes focused. Include screenshots for UI changes.
- Preserve public province slugs and API fields. Discuss a versioned schema before adding another distributor.
- Keep runtime collector dependencies in the .NET standard library unless there is a clear reason to change that policy.
- Validate new source data before saving it. Add regression tests for parsing, notification and data-loss bugs.
- Do not manually change prices or add credentials. Use `.local-data/` for local collector output.
- Do not silently ignore notification failures. Delivery progress and failed subscriptions must be recoverable.
- UI text is Turkish. Code, commits, issues and PRs may be Turkish or English.
- Follow normal respectful collaboration: explain a disagreement with evidence and avoid personal attacks.

## Hata bildirimi

Hangi il, hangi yakıt, hangi cihaz/tarayıcı? Ne bekliyordun, ne oldu? Tekrarlama adımlarını ve mümkünse ekran görüntüsünü ekle. Anahtar, token ve kişisel bilgileri çıkar. Güvenlik açığı için [SECURITY.md](SECURITY.md) dosyasına bak.

## Yeni dağıtıcı, mobil uygulama veya Chrome eklentisi

Önce [yol haritasını](docs/ROADMAP.md) ve [API sözleşmesini](docs/API.md) oku. Yeni dağıtıcı için örnek kaynak sayfa ve ayrıştırıcı testleri gerekir. Mobil ve Chrome istemcileri aynı kalıcı il/yakıt anahtarlarını kullanmalı; tarayıcı geçmişi gibi gereksiz izinler istememeli. Kapsamlı işe başlamadan önce bir issue aç.

## Examples and community

[Python/Node clients](examples/README.md) show the public API without dependencies. Follow [community guidelines](CODE_OF_CONDUCT.md) and use [SUPPORT.md](SUPPORT.md) for usage questions. Maintainers can use the prepared first-contribution issue drafts in `.github/first-contributions/`.
