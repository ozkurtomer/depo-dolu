using System.Text.Json;
using DepoDolu.Collector;
using Xunit;

namespace DepoDolu.Collector.Tests;

public class PriceStoreTests : IDisposable
{
    private readonly string _dir = Path.Combine(Path.GetTempPath(), "depodolu-test-" + Guid.NewGuid().ToString("N"));
    private static readonly DateTimeOffset T0 = new(2026, 10, 25, 9, 0, 0, TimeSpan.Zero);
    private static readonly DateTimeOffset T1 = T0.AddHours(15);

    public void Dispose()
    {
        if (Directory.Exists(_dir)) Directory.Delete(_dir, recursive: true);
    }

    private static List<CityPrices> Country(Func<string, CityPrices, CityPrices>? tweak = null)
    {
        var list = new List<CityPrices> { new("bursa", "Bursa", 77.40m, 97.80m, 40.60m) };
        for (int i = 1; i < Cities.ExpectedCount; i++)
            list.Add(new($"il-{i}", $"İl {i}", 78m, 98m, 41m));
        return tweak is null ? list : list.Select(c => tweak(c.Slug, c)).ToList();
    }

    [Fact]
    public void Ilk_calistirmada_degisiklik_yoktur_ama_dosyalar_yazilir()
    {
        var store = new PriceStore(_dir);
        var current = Country();

        var changes = PriceStore.Diff(null, current);
        bool wrote = store.Save(null, current, changes, T0);

        Assert.Empty(changes);
        Assert.True(wrote);
        Assert.True(File.Exists(Path.Combine(_dir, "latest.json")));
        Assert.True(File.Exists(Path.Combine(_dir, "history", "bursa.json")));
        Assert.Equal("[]", File.ReadAllText(Path.Combine(_dir, "changes.json")).Trim());
    }

    [Fact]
    public void Fiyat_degismediyse_hicbir_dosyaya_dokunulmaz()
    {
        var store = new PriceStore(_dir);
        store.Save(null, Country(), [], T0);
        var before = File.ReadAllText(Path.Combine(_dir, "latest.json"));

        var previous = store.LoadLatest();
        var changes = PriceStore.Diff(previous, Country());
        bool wrote = store.Save(previous, Country(), changes, T1);

        Assert.Empty(changes);
        Assert.False(wrote);
        Assert.Equal(before, File.ReadAllText(Path.Combine(_dir, "latest.json")));
    }

    [Fact]
    public void Zam_ve_indirim_tespit_edilir_kurus_alti_yok_sayilir()
    {
        var store = new PriceStore(_dir);
        store.Save(null, Country(), [], T0);
        var previous = store.LoadLatest();

        var current = Country((slug, c) => slug switch
        {
            "bursa" => c with { Motorin = 99.10m, Benzin = 77.404m },
            "il-1" => c with { Lpg = 40.50m },
            _ => c
        });

        var changes = PriceStore.Diff(previous, current);

        Assert.Equal(2, changes.Count);
        var zam = changes.Single(c => c.Slug == "bursa");
        Assert.Equal(Fuel.Motorin, zam.Fuel);
        Assert.True(zam.IsIncrease);
        Assert.Equal(1.30m, zam.Delta);
        Assert.Equal("bursa_motorin", zam.Topic);

        var indirim = changes.Single(c => c.Slug == "il-1");
        Assert.False(indirim.IsIncrease);
        Assert.Equal("il-1_lpg", indirim.Topic);
    }

    [Fact]
    public void Degisiklik_kaydedilir_ve_degismeyen_ilin_tarihi_korunur()
    {
        var store = new PriceStore(_dir);
        store.Save(null, Country(), [], T0);
        var previous = store.LoadLatest();
        var current = Country((slug, c) => slug == "bursa" ? c with { Motorin = 99.10m } : c);
        var changes = PriceStore.Diff(previous, current);

        Assert.True(store.Save(previous, current, changes, T1));

        var latest = store.LoadLatest()!;
        Assert.Equal(99.10m, latest.Prices["bursa"].Motorin);
        Assert.Equal(T1, latest.Prices["bursa"].ChangedAt);
        Assert.Equal(T0, latest.Prices["il-5"].ChangedAt);

        var history = JsonSerializer.Deserialize<List<HistoryEntry>>(
            File.ReadAllText(Path.Combine(_dir, "history", "bursa.json")))!;
        Assert.Equal(new[] { 97.80m, 99.10m }, history.Select(h => h.Motorin!.Value));

        var feed = JsonSerializer.Deserialize<List<ChangeEntry>>(File.ReadAllText(Path.Combine(_dir, "changes.json")))!;
        var entry = Assert.Single(feed);
        Assert.Equal("motorin", entry.Fuel);
        Assert.Equal("Bursa", entry.Name);
    }

    [Fact]
    public void Mantiksiz_sicrama_reddedilir()
    {
        var change = new PriceChange("bursa", "Bursa", Fuel.Benzin, 77.40m, 120m);
        Assert.Throws<ValidationException>(() => PriceStore.Validate(Country(), [change]));
    }

    [Fact]
    public void Cok_az_il_okunduysa_reddedilir()
    {
        Assert.Throws<ValidationException>(() => PriceStore.Validate(Country().Take(10).ToList(), []));
    }

    [Fact]
    public void Normal_degisiklik_dogrulamadan_gecer()
    {
        var change = new PriceChange("bursa", "Bursa", Fuel.Motorin, 97.80m, 99.10m);
        PriceStore.Validate(Country(), [change]); // hata fırlatmamalı
    }

    [Theory]
    [InlineData(Fuel.Benzin)]
    [InlineData(Fuel.Motorin)]
    [InlineData(Fuel.Lpg)]
    public void Eksik_yakit_fiyati_reddedilir(Fuel fuel)
    {
        var current = Country((_, c) => fuel switch
        {
            Fuel.Benzin => c with { Benzin = null },
            Fuel.Motorin => c with { Motorin = null },
            _ => c with { Lpg = null }
        });
        Assert.Throws<ValidationException>(() => PriceStore.Validate(current, []));
    }

    [Fact]
    public void Ayni_ili_tekrarlamak_il_sayisi_kontrolunu_gecemez()
    {
        var duplicates = Enumerable.Repeat(Country()[0], Cities.ExpectedCount).ToList();
        Assert.Throws<ValidationException>(() => PriceStore.Validate(duplicates, []));
    }

    [Fact]
    public void Eskiden_bos_kaydedilen_fiyat_bildirim_uretilmeden_onarilir()
    {
        storeWithNull();
        var store = new PriceStore(_dir);
        var previous = store.LoadLatest();
        var current = Country();
        var changes = PriceStore.Diff(previous, current);
        Assert.Empty(changes);
        Assert.True(store.Save(previous, current, changes, T1));
        Assert.Equal(40.60m, store.LoadLatest()!.Prices["bursa"].Lpg);

        void storeWithNull() => new PriceStore(_dir).Save(null,
            Country((slug, c) => slug == "bursa" ? c with { Lpg = null } : c), [], T0);
    }
}
