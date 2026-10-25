using DepoDolu.Collector;
using Xunit;

namespace DepoDolu.Collector.Tests;

public class ReadmeUpdaterTests
{
    private static readonly DateTimeOffset Now = new(2026, 10, 25, 18, 30, 0, TimeSpan.Zero);

    private static LatestFile Latest() => new()
    {
        UpdatedAt = Now,
        Prices = new()
        {
            ["bursa"] = new LatestCity { Name = "Bursa", Benzin = 77.40m, Motorin = 99.10m, Lpg = 40.60m, ChangedAt = Now },
            ["ankara"] = new LatestCity { Name = "Ankara", Benzin = 77.30m, Motorin = 97.90m, Lpg = 41.29m, ChangedAt = Now },
        }
    };

    [Fact]
    public void Tablo_ve_son_zam_isareti()
    {
        var changes = new List<ChangeEntry>
        {
            new() { At = Now.AddHours(-2), City = "bursa", Name = "Bursa", Fuel = "motorin", Old = 97.80m, New = 99.10m }
        };

        var md = ReadmeUpdater.Render(Latest(), changes, Now);

        Assert.Contains("| **Bursa** | 77,40 | 🔺 99,10 | 40,60 |", md);
        Assert.Contains("| **Ankara** | 77,30 | 97,90 | 41,29 |", md);
        Assert.Contains("25 Ekim 2026, 21:30", md);
        Assert.Contains("🔺 25 Ekim 2026, 19:30: **Bursa** motorin 97,80 → 99,10 ₺ (+1,30)", md);
    }

    [Fact]
    public void Ingilizce_tablo()
    {
        var changes = new List<ChangeEntry>
        {
            new() { At = Now.AddHours(-2), City = "bursa", Name = "Bursa", Fuel = "motorin", Old = 97.80m, New = 99.10m }
        };

        var md = ReadmeUpdater.Render(Latest(), changes, Now, english: true);

        Assert.Contains("| Province | Gasoline | Diesel | LPG |", md);
        Assert.Contains("| **Bursa** | 77.40 | 🔺 99.10 | 40.60 |", md);
        Assert.Contains("Oct 25, 2026, 21:30 (Turkey time)", md);
        Assert.Contains("🔺 Oct 25, 2026, 19:30: **Bursa** diesel 97.80 → 99.10 ₺ (+1.30)", md);
    }

    [Fact]
    public void Ingilizce_ve_turkce_readme_birlikte_guncellenir()
    {
        var dir = Path.Combine(Path.GetTempPath(), "dd-readme2-" + Guid.NewGuid().ToString("N"));
        Directory.CreateDirectory(dir);
        try
        {
            new PriceStore(dir).Save(null, [new CityPrices("bursa", "Bursa", 77.40m, 97.80m, 40.60m)], [], Now);
            var en = Path.Combine(dir, "README.md");
            var tr = Path.Combine(dir, "README.tr.md");
            File.WriteAllText(en, $"{ReadmeUpdater.Start}\n{ReadmeUpdater.End}\n");
            File.WriteAllText(tr, $"{ReadmeUpdater.Start}\n{ReadmeUpdater.End}\n");

            Assert.Equal(2, ReadmeUpdater.UpdateAll(en, dir, Now));
            Assert.Contains("| **Bursa** | 77.40 | 97.80 | 40.60 |", File.ReadAllText(en));
            Assert.Contains("| **Bursa** | 77,40 | 97,80 | 40,60 |", File.ReadAllText(tr));
        }
        finally
        {
            Directory.Delete(dir, true);
        }
    }

    [Fact]
    public void Eski_degisiklik_tabloda_isaretlenmez()
    {
        var changes = new List<ChangeEntry>
        {
            new() { At = Now.AddDays(-3), City = "bursa", Name = "Bursa", Fuel = "motorin", Old = 97.80m, New = 99.10m }
        };

        var md = ReadmeUpdater.Render(Latest(), changes, Now);

        Assert.Contains("| **Bursa** | 77,40 | 99,10 | 40,60 |", md);
    }

    [Fact]
    public void Sadece_isaretler_arasi_degisir()
    {
        var dir = Path.Combine(Path.GetTempPath(), "dd-readme-" + Guid.NewGuid().ToString("N"));
        Directory.CreateDirectory(dir);
        try
        {
            var store = new PriceStore(dir);
            store.Save(null, [new CityPrices("bursa", "Bursa", 77.40m, 97.80m, 40.60m)], [], Now);
            var readme = Path.Combine(dir, "README.md");
            File.WriteAllText(readme, $"# Başlık\n{ReadmeUpdater.Start}\neski\n{ReadmeUpdater.End}\nAlt kısım\n");

            Assert.True(ReadmeUpdater.Update(readme, dir, Now));
            var text = File.ReadAllText(readme);

            Assert.StartsWith("# Başlık\n", text);
            Assert.EndsWith($"{ReadmeUpdater.End}\nAlt kısım\n", text);
            Assert.DoesNotContain("eski", text);
            Assert.Contains("| **Bursa** | 77.40 | 97.80 | 40.60 |", text);

            Assert.False(ReadmeUpdater.Update(readme, dir, Now)); // aynı içerik → yazma yok
        }
        finally
        {
            Directory.Delete(dir, true);
        }
    }
}
