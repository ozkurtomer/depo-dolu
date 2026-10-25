## Why

Developers should be able to reuse the price data without reading the collector implementation.

## Suggested scope

Add a small .NET 8 console example under `examples/` using `HttpClient` and `System.Text.Json`, with no additional NuGet packages. Follow `docs/API.md` and the existing Python/Node examples.

## Acceptance

- Show a chosen province/fuel and the last stored update timestamp.
- Handle unknown slugs, null prices and unsuccessful HTTP responses clearly.
- Offer an offline/local JSON input.
- Include exact run instructions and sample output marked as illustrative.
- Preserve the public data schema and keep credentials out of the example.

A good first contribution for a C# developer. Please comment before starting so work is not duplicated.
