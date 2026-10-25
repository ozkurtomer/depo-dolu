using System.Globalization;
using System.Net;
using System.Text.RegularExpressions;

namespace DepoDolu.Collector;

/// <summary>
/// Petrol Ofisi "Akaryakıt Fiyatları" sayfasındaki 81 il tablosunu okur.
///
/// Sayfa yapısına sıkı sıkıya bağlı kalmamak için bilerek esnek yazıldı:
///  - Başlığında "Kurşunsuz" geçen tabloyu bulur (class adına bakmaz).
///  - Sütunları başlık metnine göre eşler (sıra değişse de çalışır).
///  - Hücrede "76.30 63.59 TL/LT +KDV" gibi iki fiyat olur: ilki KDV dahil fiyattır, onu alır.
/// </summary>
public static partial class PoParser
{
    public const string SourceUrl = "https://www.petrolofisi.com.tr/akaryakit-fiyatlari";

    public static IReadOnlyList<CityPrices> Parse(string html)
    {
        var tableHtml = TableRegex().Matches(html)
            .Select(m => m.Value)
            .FirstOrDefault(t => Fold(Text(t)).Contains("KURSUNSUZ"))
            ?? throw new ParseException("Fiyat tablosu bulunamadı (başlığında 'Kurşunsuz' geçen tablo yok). Sayfa yapısı değişmiş olabilir.");

        var rows = RowRegex().Matches(tableHtml)
            .Select(r => CellRegex().Matches(r.Groups["body"].Value)
                .Select(c => (IsHeader: c.Groups["tag"].Value.Equals("th", StringComparison.OrdinalIgnoreCase),
                              Text: Text(c.Groups["body"].Value)))
                .ToList())
            .Where(cells => cells.Count > 0)
            .ToList();

        if (rows.Count == 0) throw new ParseException("Tabloda satır yok.");

        var headerRow = rows.FirstOrDefault(r => r.Any(c => c.IsHeader)) ?? rows[0];
        var headers = headerRow.Select(c => Fold(c.Text)).ToList();

        int benzinCol = FindColumn(headers, "KURSUNSUZ", "BENZIN");
        int motorinCol = FindColumn(headers, "DIESEL", "MOTORIN", "DIZEL");
        int lpgCol = FindColumn(headers, "OTOGAZ", "LPG");

        if (benzinCol < 0 || motorinCol < 0)
            throw new ParseException($"Benzin/motorin sütunları bulunamadı. Başlıklar: {string.Join(" | ", headers)}");

        var result = new List<CityPrices>();
        foreach (var cells in rows)
        {
            if (ReferenceEquals(cells, headerRow)) continue;
            if (cells.Count <= Math.Max(benzinCol, motorinCol)) continue;

            var rawName = cells[0].Text;
            if (string.IsNullOrWhiteSpace(rawName)) continue;

            var (slug, name) = Cities.Resolve(rawName);
            result.Add(new CityPrices(
                slug,
                name,
                FirstPrice(cells, benzinCol),
                FirstPrice(cells, motorinCol),
                lpgCol >= 0 ? FirstPrice(cells, lpgCol) : null));
        }

        return result;
    }

    private static int FindColumn(List<string> headers, params string[] needles) =>
        headers.FindIndex(h => needles.Any(h.Contains));

    private static decimal? FirstPrice(List<(bool IsHeader, string Text)> cells, int col)
    {
        if (col < 0 || col >= cells.Count) return null;
        var match = PriceRegex().Match(cells[col].Text);
        if (!match.Success) return null;
        return decimal.Parse(match.Value.Replace(',', '.'), NumberStyles.AllowDecimalPoint, CultureInfo.InvariantCulture);
    }

    /// <summary>Etiketleri atar, HTML varlıklarını çözer, boşlukları sadeleştirir.</summary>
    internal static string Text(string html)
    {
        var noScripts = ScriptRegex().Replace(html, " ");
        var noTags = TagRegex().Replace(noScripts, " ");
        return SpaceRegex().Replace(WebUtility.HtmlDecode(noTags), " ").Trim();
    }

    /// <summary>Türkçe karakterleri sadeleştirip büyük harfe çevirir (başlık eşleştirme için).</summary>
    private static string Fold(string s) => Cities.NormalizeKey(s);

    [GeneratedRegex(@"<table\b[^>]*>.*?</table>", RegexOptions.Singleline | RegexOptions.IgnoreCase)]
    private static partial Regex TableRegex();

    [GeneratedRegex(@"<tr\b[^>]*>(?<body>.*?)</tr>", RegexOptions.Singleline | RegexOptions.IgnoreCase)]
    private static partial Regex RowRegex();

    [GeneratedRegex(@"<(?<tag>t[hd])\b[^>]*>(?<body>.*?)</\k<tag>>", RegexOptions.Singleline | RegexOptions.IgnoreCase)]
    private static partial Regex CellRegex();

    [GeneratedRegex(@"<(script|style)\b.*?</\1>", RegexOptions.Singleline | RegexOptions.IgnoreCase)]
    private static partial Regex ScriptRegex();

    [GeneratedRegex(@"<[^>]+>")]
    private static partial Regex TagRegex();

    [GeneratedRegex(@"\s+")]
    private static partial Regex SpaceRegex();

    // "76.30" veya "76,30" — en fazla 4 basamak tam kısım, 2 basamak ondalık.
    [GeneratedRegex(@"\d{1,4}[.,]\d{2}")]
    private static partial Regex PriceRegex();
}

public sealed class ParseException(string message) : Exception(message);
