using System.Globalization;
using System.Text;
using System.Text.Encodings.Web;
using System.Text.Json;

namespace DepoDolu.Collector;

public static class ReadmeUpdater
{
    public const string Start = "<!-- FIYATLAR:BASLA -->";
    public const string End = "<!-- FIYATLAR:BITIR -->";

    public static readonly string[] FeaturedCities =
    [
        "istanbul-avrupa", "istanbul-anadolu", "ankara", "izmir", "bursa",
        "antalya", "adana", "konya", "gaziantep", "kocaeli"
    ];

    private static readonly TimeSpan TurkeyOffset = TimeSpan.FromHours(3);
    private static readonly string[] Months =
        ["Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran", "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"];

    public static bool Update(string readmePath, string dataDir, DateTimeOffset now)
    {
        if (!File.Exists(readmePath)) return false;
        var readme = File.ReadAllText(readmePath);

        int s = readme.IndexOf(Start, StringComparison.Ordinal);
        int e = readme.IndexOf(End, StringComparison.Ordinal);
        if (s < 0 || e < s) return false;

        var latest = Read<LatestFile>(Path.Combine(dataDir, "latest.json"));
        if (latest is null) return false;
        var changes = Read<List<ChangeEntry>>(Path.Combine(dataDir, "changes.json")) ?? [];

        var block = Render(latest, changes, now);
        var updated = readme[..(s + Start.Length)] + "\n" + block + readme[e..];
        if (updated == readme) return false;

        File.WriteAllText(readmePath, updated);
        return true;
    }

    internal static string Render(LatestFile latest, List<ChangeEntry> changes, DateTimeOffset now)
    {
        var sb = new StringBuilder();
        var recent = changes.Where(c => now - c.At < TimeSpan.FromHours(36)).ToList();

        sb.AppendLine("| İl | Benzin | Motorin | LPG |");
        sb.AppendLine("|:---|---:|---:|---:|");
        foreach (var slug in FeaturedCities)
        {
            if (!latest.Prices.TryGetValue(slug, out var c)) continue;
            sb.Append($"| **{c.Name}** ");
            foreach (var fuel in Enum.GetValues<Fuel>())
                sb.Append($"| {Cell(c.Get(fuel), recent.FirstOrDefault(r => r.City == slug && r.Fuel == fuel.Key()))} ");
            sb.AppendLine("|");
        }

        sb.AppendLine();
        sb.AppendLine($"<sub>Litre fiyatı, KDV dahil, ₺. 🔺 zam / 🔻 indirim: son 36 saat. " +
                      $"Son güncelleme: {Date(latest.UpdatedAt)}. [81 ilin tamamı](data/latest.json)</sub>");

        var last = changes.Take(5).ToList();
        if (last.Count > 0)
        {
            sb.AppendLine();
            sb.AppendLine("**Son fiyat değişiklikleri**");
            sb.AppendLine();
            foreach (var c in last)
            {
                var up = c.New > c.Old;
                var fuelName = Enum.GetValues<Fuel>().First(f => f.Key() == c.Fuel).DisplayName();
                sb.AppendLine($"- {(up ? "🔺" : "🔻")} {Date(c.At)}: **{c.Name}** {fuelName.ToLowerInvariant().Replace("lpg", "LPG")} " +
                              $"{Money(c.Old)} → {Money(c.New)} ₺ ({(up ? "+" : "−")}{Money(Math.Abs(c.New - c.Old))})");
            }
        }

        return sb.ToString();
    }

    private static string Cell(decimal? price, ChangeEntry? recent)
    {
        if (price is null) return "—";
        var text = Money(price.Value);
        if (recent is null) return text;
        return recent.New > recent.Old ? $"🔺 {text}" : $"🔻 {text}";
    }

    private static string Money(decimal v) => FcmNotifier.Money(v);

    internal static string Date(DateTimeOffset at)
    {
        var t = at.ToOffset(TurkeyOffset);
        return $"{t.Day} {Months[t.Month - 1]} {t.Year}, {t.ToString("HH:mm", CultureInfo.InvariantCulture)}";
    }

    private static readonly JsonSerializerOptions Json = new() { Encoder = JavaScriptEncoder.UnsafeRelaxedJsonEscaping };

    private static T? Read<T>(string path) =>
        File.Exists(path) ? JsonSerializer.Deserialize<T>(File.ReadAllText(path), Json) : default;
}
