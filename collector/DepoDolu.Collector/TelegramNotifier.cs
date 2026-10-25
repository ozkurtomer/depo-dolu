using System.Net;
using System.Net.Http.Json;
using System.Text;

namespace DepoDolu.Collector;

/// <summary>
/// Fiyat değişikliklerini bir Telegram kanalına tek bir özet mesaj olarak gönderir.
/// Uygulaması olmayanlar da (web, iPhone) kanalı takip ederek zamdan haberdar olur.
///
/// Ulusal bir zamda 82 bölgenin hepsi aynı anda değişir; 82 ayrı mesaj yerine
/// yakıt ve yön başına tek satır özet + büyük illerin fiyatı gönderilir.
/// </summary>
public sealed class TelegramNotifier(HttpClient http, string? botToken, string? chatId)
{
    public bool IsDryRun => string.IsNullOrWhiteSpace(botToken) || string.IsNullOrWhiteSpace(chatId);

    private static readonly string[] Featured = ["istanbul-avrupa", "ankara", "izmir", "bursa", "antalya"];

    public async Task SendAsync(IReadOnlyList<PriceChange> changes, CancellationToken ct = default)
    {
        if (changes.Count == 0) return;
        var text = BuildMessage(changes);

        if (IsDryRun)
        {
            Console.WriteLine("  (Telegram ayarlı değil, mesaj sadece yazılıyor)");
            Console.WriteLine(Indent(text));
            return;
        }

        using var res = await http.PostAsJsonAsync($"https://api.telegram.org/bot{botToken}/sendMessage", new
        {
            chat_id = chatId,
            text,
            parse_mode = "HTML",
            disable_web_page_preview = true
        }, ct);

        if (res.IsSuccessStatusCode)
            Console.WriteLine("  ✓ Telegram kanalına gönderildi.");
        else
            Console.Error.WriteLine($"  ! Telegram hata {(int)res.StatusCode}: {await res.Content.ReadAsStringAsync(ct)}");
    }

    public static string BuildMessage(IReadOnlyList<PriceChange> changes)
    {
        var sb = new StringBuilder();

        var groups = changes
            .GroupBy(c => (c.Fuel, Up: c.IsIncrease))
            .OrderByDescending(g => g.Count());

        foreach (var g in groups)
        {
            var list = g.ToList();
            var avg = list.Average(c => Math.Abs(c.Delta));
            var head = g.Key.Up ? $"⛽ {g.Key.Fuel.Dative()} zam" : $"🟢 {g.Key.Fuel.Locative()} indirim";
            var scope = list.Count >= 70 ? "tüm Türkiye'de" : $"{list.Count} ilde";
            sb.Append($"<b>{head}</b>, {scope}");
            sb.AppendLine(list.Count > 1
                ? $", litre başına ortalama {(g.Key.Up ? "+" : "−")}{FcmNotifier.Money(avg)} ₺"
                : "");

            // Önce büyük iller, sonra kalanlardan birkaçı; en fazla 6 satır.
            var shown = list.OrderBy(c => Array.IndexOf(Featured, c.Slug) is var i && i >= 0 ? i : 99)
                            .ThenBy(c => c.CityName, StringComparer.Ordinal)
                            .Take(6)
                            .ToList();
            foreach (var c in shown)
                sb.AppendLine($"• {WebUtility.HtmlEncode(c.CityName)}: {FcmNotifier.Money(c.OldPrice)} → <b>{FcmNotifier.Money(c.NewPrice)} ₺</b>");
            if (list.Count > shown.Count)
                sb.AppendLine($"• ve {list.Count - shown.Count} il daha");
            sb.AppendLine();
        }

        sb.Append("Tüm iller: github.com/ozkurtomer/depo-dolu");
        return sb.ToString();
    }

    private static string Indent(string s) => "    " + s.Replace("\n", "\n    ");
}
