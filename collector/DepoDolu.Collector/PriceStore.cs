using System.Text.Encodings.Web;
using System.Text.Json;

namespace DepoDolu.Collector;

public sealed class PriceStore(string dataDir)
{
    public const int MaxHistoryPerCity = 400;
    public const int MaxChanges = 300;

    private static readonly JsonSerializerOptions Json = new()
    {
        WriteIndented = true,
        Encoder = JavaScriptEncoder.UnsafeRelaxedJsonEscaping
    };

    private string LatestPath => Path.Combine(dataDir, "latest.json");
    private string ChangesPath => Path.Combine(dataDir, "changes.json");
    private string HistoryPath(string slug) => Path.Combine(dataDir, "history", $"{slug}.json");

    public LatestFile? LoadLatest() => Read<LatestFile>(LatestPath);

    public static List<PriceChange> Diff(LatestFile? previous, IEnumerable<CityPrices> current)
    {
        var changes = new List<PriceChange>();
        if (previous is null) return changes;

        foreach (var city in current)
        {
            if (!previous.Prices.TryGetValue(city.Slug, out var old)) continue;
            foreach (var fuel in Enum.GetValues<Fuel>())
            {
                var before = old.Get(fuel);
                var after = city.Get(fuel);
                if (before is null || after is null) continue;
                if (Math.Abs(after.Value - before.Value) >= 0.01m)
                    changes.Add(new PriceChange(city.Slug, city.Name, fuel, before.Value, after.Value));
            }
        }
        return changes;
    }

    public static void Validate(IReadOnlyList<CityPrices> current, IReadOnlyList<PriceChange> changes)
    {
        int minCities = Cities.ExpectedCount - 7;
        if (current.Count < minCities)
            throw new ValidationException($"Sadece {current.Count} il okundu (beklenen ≥ {minCities}).");

        if (current.Select(c => c.Slug).Distinct(StringComparer.Ordinal).Count() != current.Count)
            throw new ValidationException("Tekrarlanan il satırları bulundu.");

        foreach (var c in current)
        {
            if (c.Benzin is null || c.Motorin is null || c.Lpg is null)
                throw new ValidationException($"{c.Name} için eksik yakıt fiyatı var. Önceki veri korunuyor.");
            if (c.Benzin is < 5 or > 1000 || c.Motorin is < 5 or > 1000 || c.Lpg is < 2 or > 1000)
                throw new ValidationException($"{c.Name} için mantıksız fiyat: {c}");
        }

        var absurd = changes.FirstOrDefault(ch => Math.Abs(ch.Percent) > 20m);
        if (absurd is not null)
            throw new ValidationException(
                $"{absurd.CityName} {absurd.Fuel.DisplayName()}: {absurd.OldPrice} → {absurd.NewPrice} (%{absurd.Percent:F1}). Elle kontrol edin.");
    }

    public bool Save(LatestFile? previous, IReadOnlyList<CityPrices> current, IReadOnlyList<PriceChange> changes, DateTimeOffset now)
    {
        bool firstRun = previous is null;
        var changedSlugs = changes.Select(c => c.Slug).ToHashSet();
        var newSlugs = current.Where(c => previous?.Prices.ContainsKey(c.Slug) != true).Select(c => c.Slug).ToHashSet();
        // Eski sürümlerde kaydedilmiş eksik fiyatlar da yeni bir değerle onarılabilsin.
        var repairedSlugs = current.Where(c => previous?.Prices.TryGetValue(c.Slug, out var old) == true &&
            Enum.GetValues<Fuel>().Any(f => old.Get(f) is null && c.Get(f) is not null))
            .Select(c => c.Slug).ToHashSet();

        bool missingFeed = !File.Exists(ChangesPath);
        if (missingFeed) Write(ChangesPath, new List<ChangeEntry>());

        if (!firstRun && changedSlugs.Count == 0 && newSlugs.Count == 0 && repairedSlugs.Count == 0)
            return missingFeed;

        Directory.CreateDirectory(Path.Combine(dataDir, "history"));

        var latest = new LatestFile
        {
            SourceUrl = PoParser.SourceUrl,
            UpdatedAt = now,
        };

        foreach (var city in current)
        {
            bool touched = firstRun || changedSlugs.Contains(city.Slug) || newSlugs.Contains(city.Slug) || repairedSlugs.Contains(city.Slug);
            var changedAt = !touched && previous!.Prices.TryGetValue(city.Slug, out var old) ? old.ChangedAt : now;

            latest.Prices[city.Slug] = new LatestCity
            {
                Name = city.Name,
                Benzin = city.Benzin,
                Motorin = city.Motorin,
                Lpg = city.Lpg,
                ChangedAt = changedAt
            };

            if (touched) AppendHistory(city, now);
        }

        if (previous is not null)
            foreach (var (slug, old) in previous.Prices)
                latest.Prices.TryAdd(slug, old);

        Write(LatestPath, latest);

        if (changes.Count > 0)
        {
            var feed = Read<List<ChangeEntry>>(ChangesPath) ?? [];
            feed.InsertRange(0, changes.Select(c => new ChangeEntry
            {
                At = now,
                City = c.Slug,
                Name = c.CityName,
                Fuel = c.Fuel.Key(),
                Old = c.OldPrice,
                New = c.NewPrice
            }));
            Write(ChangesPath, feed.Take(MaxChanges).ToList());
        }

        return true;
    }

    private void AppendHistory(CityPrices city, DateTimeOffset now)
    {
        var path = HistoryPath(city.Slug);
        var list = Read<List<HistoryEntry>>(path) ?? [];
        list.Add(new HistoryEntry { At = now, Benzin = city.Benzin, Motorin = city.Motorin, Lpg = city.Lpg });
        if (list.Count > MaxHistoryPerCity) list = list.Skip(list.Count - MaxHistoryPerCity).ToList();
        Write(path, list);
    }

    private static T? Read<T>(string path) =>
        File.Exists(path) ? JsonSerializer.Deserialize<T>(File.ReadAllText(path), Json) : default;

    private static void Write<T>(string path, T value)
    {
        Directory.CreateDirectory(Path.GetDirectoryName(path)!);
        File.WriteAllText(path, JsonSerializer.Serialize(value, Json) + "\n");
    }
}

public sealed class ValidationException(string message) : Exception(message);
