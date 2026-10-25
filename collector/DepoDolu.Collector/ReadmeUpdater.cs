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
    private static readonly string[] MonthsTr =
        ["Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran", "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"];
    private static readonly string[] MonthsEn =
        ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

    public static int UpdateAll(string readmePath, string dataDir, DateTimeOffset now)
    {
        var paths = new List<string> { readmePath };
        var tr = Path.Combine(Path.GetDirectoryName(Path.GetFullPath(readmePath))!, "README.tr.md");
        if (!paths.Any(p => Path.GetFullPath(p) == tr) && File.Exists(tr)) paths.Add(tr);
        return paths.Count(p => Update(p, dataDir, now));
    }

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

        bool english = !Path.GetFileName(readmePath).Contains(".tr.", StringComparison.OrdinalIgnoreCase);
        var block = Render(latest, changes, now, english);
        var updated = readme[..(s + Start.Length)] + "\n" + block + readme[e..];
        if (updated == readme) return false;

        File.WriteAllText(readmePath, updated);
        return true;
    }

    internal static string Render(LatestFile latest, List<ChangeEntry> changes, DateTimeOffset now, bool english = false)
    {
        var sb = new StringBuilder();
        var recent = changes.Where(c => now - c.At < TimeSpan.FromHours(36)).ToList();

        sb.AppendLine(english ? "| Province | Gasoline | Diesel | LPG |" : "| İl | Benzin | Motorin | LPG |");
        sb.AppendLine("|:---|---:|---:|---:|");
        foreach (var slug in FeaturedCities)
        {
            if (!latest.Prices.TryGetValue(slug, out var c)) continue;
            sb.Append($"| **{c.Name}** ");
            foreach (var fuel in Enum.GetValues<Fuel>())
                sb.Append($"| {Cell(c.Get(fuel), recent.FirstOrDefault(r => r.City == slug && r.Fuel == fuel.Key()), english)} ");
            sb.AppendLine("|");
        }

        sb.AppendLine();
        sb.AppendLine(english
            ? $"<sub>Price per liter in Turkish lira (₺), VAT included. 🔺 increase / 🔻 decrease in the last 36 hours. " +
              $"Last update: {Date(latest.UpdatedAt, true)} (Turkey time). [All 81 provinces](data/latest.json)</sub>"
            : $"<sub>Litre fiyatı, KDV dahil, ₺. 🔺 zam / 🔻 indirim: son 36 saat. " +
              $"Son güncelleme: {Date(latest.UpdatedAt, false)}. [81 ilin tamamı](data/latest.json)</sub>");

        var last = changes.Take(5).ToList();
        if (last.Count > 0)
        {
            sb.AppendLine();
            sb.AppendLine(english ? "**Latest price changes**" : "**Son fiyat değişiklikleri**");
            sb.AppendLine();
            foreach (var c in last)
            {
                var up = c.New > c.Old;
                var fuel = FuelName(c.Fuel, english);
                var sign = up ? "+" : "−";
                sb.AppendLine($"- {(up ? "🔺" : "🔻")} {Date(c.At, english)}: **{c.Name}** {fuel} " +
                              $"{Money(c.Old, english)} → {Money(c.New, english)} ₺ ({sign}{Money(Math.Abs(c.New - c.Old), english)})");
            }
        }

        return sb.ToString();
    }

    private static string FuelName(string key, bool english) => (key, english) switch
    {
        ("benzin", true) => "gasoline",
        ("motorin", true) => "diesel",
        ("benzin", false) => "benzin",
        ("motorin", false) => "motorin",
        _ => "LPG"
    };

    private static string Cell(decimal? price, ChangeEntry? recent, bool english)
    {
        if (price is null) return "—";
        var text = Money(price.Value, english);
        if (recent is null) return text;
        return recent.New > recent.Old ? $"🔺 {text}" : $"🔻 {text}";
    }

    private static string Money(decimal v, bool english) =>
        english ? v.ToString("#,0.00", CultureInfo.InvariantCulture) : FcmNotifier.Money(v);

    internal static string Date(DateTimeOffset at, bool english = false)
    {
        var t = at.ToOffset(TurkeyOffset);
        var time = t.ToString("HH:mm", CultureInfo.InvariantCulture);
        return english
            ? $"{MonthsEn[t.Month - 1]} {t.Day}, {t.Year}, {time}"
            : $"{t.Day} {MonthsTr[t.Month - 1]} {t.Year}, {time}";
    }

    private static readonly JsonSerializerOptions Json = new() { Encoder = JavaScriptEncoder.UnsafeRelaxedJsonEscaping };

    private static T? Read<T>(string path) =>
        File.Exists(path) ? JsonSerializer.Deserialize<T>(File.ReadAllText(path), Json) : default;
}
