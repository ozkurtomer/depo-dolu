using System.Text.Json.Serialization;

namespace DepoDolu.Collector;

/// <summary>Uygulamanın takip ettiği yakıt tipleri.</summary>
public enum Fuel
{
    Benzin,
    Motorin,
    Lpg
}

public static class FuelExtensions
{
    /// <summary>JSON anahtarı ve bildirim konusu (topic) için kullanılan kısa ad.</summary>
    public static string Key(this Fuel fuel) => fuel switch
    {
        Fuel.Benzin => "benzin",
        Fuel.Motorin => "motorin",
        Fuel.Lpg => "lpg",
        _ => throw new ArgumentOutOfRangeException(nameof(fuel))
    };

    public static string DisplayName(this Fuel fuel) => fuel switch
    {
        Fuel.Benzin => "Benzin",
        Fuel.Motorin => "Motorin",
        Fuel.Lpg => "LPG",
        _ => throw new ArgumentOutOfRangeException(nameof(fuel))
    };

    /// <summary>Yönelme hâli: "benzine zam", "motorine zam", "LPG'ye zam".</summary>
    public static string Dative(this Fuel fuel) => fuel switch
    {
        Fuel.Benzin => "Benzine",
        Fuel.Motorin => "Motorine",
        Fuel.Lpg => "LPG'ye",
        _ => throw new ArgumentOutOfRangeException(nameof(fuel))
    };

    /// <summary>Bulunma hâli: "benzinde indirim", "motorinde indirim", "LPG'de indirim".</summary>
    public static string Locative(this Fuel fuel) => fuel switch
    {
        Fuel.Benzin => "Benzinde",
        Fuel.Motorin => "Motorinde",
        Fuel.Lpg => "LPG'de",
        _ => throw new ArgumentOutOfRangeException(nameof(fuel))
    };
}

/// <summary>Bir ilin KDV dahil litre fiyatları (TL).</summary>
public sealed record CityPrices(string Slug, string Name, decimal? Benzin, decimal? Motorin, decimal? Lpg)
{
    public decimal? Get(Fuel fuel) => fuel switch
    {
        Fuel.Benzin => Benzin,
        Fuel.Motorin => Motorin,
        Fuel.Lpg => Lpg,
        _ => null
    };
}

/// <summary>Tek bir il + yakıt için tespit edilen fiyat değişikliği.</summary>
public sealed record PriceChange(string Slug, string CityName, Fuel Fuel, decimal OldPrice, decimal NewPrice)
{
    public decimal Delta => NewPrice - OldPrice;
    public bool IsIncrease => Delta > 0;
    public decimal Percent => OldPrice == 0 ? 0 : Delta / OldPrice * 100m;

    /// <summary>FCM konu adı, ör. "bursa_motorin".</summary>
    public string Topic => $"{Slug}_{Fuel.Key()}";
}

// ---- data/ klasöründeki JSON dosyalarının şekli (mobil uygulama da bunları okur) ----

public sealed class LatestFile
{
    [JsonPropertyName("source")] public string Source { get; set; } = "Petrol Ofisi";
    [JsonPropertyName("sourceUrl")] public string SourceUrl { get; set; } = "";
    [JsonPropertyName("updatedAt")] public DateTimeOffset UpdatedAt { get; set; }
    [JsonPropertyName("prices")] public SortedDictionary<string, LatestCity> Prices { get; set; } = new();
}

public sealed class LatestCity
{
    [JsonPropertyName("name")] public string Name { get; set; } = "";
    [JsonPropertyName("benzin")] public decimal? Benzin { get; set; }
    [JsonPropertyName("motorin")] public decimal? Motorin { get; set; }
    [JsonPropertyName("lpg")] public decimal? Lpg { get; set; }
    [JsonPropertyName("changedAt")] public DateTimeOffset ChangedAt { get; set; }

    public decimal? Get(Fuel fuel) => fuel switch
    {
        Fuel.Benzin => Benzin,
        Fuel.Motorin => Motorin,
        Fuel.Lpg => Lpg,
        _ => null
    };
}

/// <summary>data/history/{il}.json içindeki tek kayıt. Sadece fiyat değiştiğinde eklenir.</summary>
public sealed class HistoryEntry
{
    [JsonPropertyName("at")] public DateTimeOffset At { get; set; }
    [JsonPropertyName("benzin")] public decimal? Benzin { get; set; }
    [JsonPropertyName("motorin")] public decimal? Motorin { get; set; }
    [JsonPropertyName("lpg")] public decimal? Lpg { get; set; }
}

/// <summary>data/changes.json içindeki tek kayıt: Türkiye geneli son değişiklikler akışı.</summary>
public sealed class ChangeEntry
{
    [JsonPropertyName("at")] public DateTimeOffset At { get; set; }
    [JsonPropertyName("city")] public string City { get; set; } = "";
    [JsonPropertyName("name")] public string Name { get; set; } = "";
    [JsonPropertyName("fuel")] public string Fuel { get; set; } = "";
    [JsonPropertyName("old")] public decimal Old { get; set; }
    [JsonPropertyName("new")] public decimal New { get; set; }
}
