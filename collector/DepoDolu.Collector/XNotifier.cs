using System.Net.Http.Json;
using System.Security.Cryptography;
using System.Text;

namespace DepoDolu.Collector;

/// <summary>
/// X (Twitter) hesabına Türkiye özeti gönderir. OAuth 1.0a kullanıcı bağlamı, NuGet'siz.
/// Dört değişkenin hepsi yoksa dry-run: mesaj sadece yazılır.
/// </summary>
public sealed class XNotifier(HttpClient http, string? apiKey, string? apiSecret, string? accessToken, string? accessSecret)
{
    public const string Endpoint = "https://api.x.com/2/tweets";
    public const int MaxLength = 280;
    private const string WebUrl = "https://ozkurtomer.github.io/depo-dolu/";

    public bool IsDryRun => new[] { apiKey, apiSecret, accessToken, accessSecret }.Any(string.IsNullOrWhiteSpace);

    public async Task SendAsync(IReadOnlyList<PriceChange> changes, bool test = false, CancellationToken ct = default)
    {
        if (changes.Count == 0) return;
        var text = BuildMessage(changes, test);

        if (IsDryRun)
        {
            Console.WriteLine("  (X ayarlı değil, gönderi sadece yazılıyor)");
            Console.WriteLine("    " + text.Replace("\n", "\n    "));
            return;
        }

        using var request = new HttpRequestMessage(HttpMethod.Post, Endpoint)
        {
            Content = JsonContent.Create(new { text })
        };
        // JSON gövdesi imzaya girmez; sadece oauth_* alanları imzalanır.
        request.Headers.TryAddWithoutValidation("Authorization", AuthorizationHeader("POST", Endpoint, [],
            apiKey!, apiSecret!, accessToken!, accessSecret!,
            Convert.ToHexString(RandomNumberGenerator.GetBytes(16)), DateTimeOffset.UtcNow.ToUnixTimeSeconds()));

        using var res = await http.SendAsync(request, ct);
        if (res.IsSuccessStatusCode)
            Console.WriteLine("  ✓ X'e gönderildi.");
        else
            throw new HttpRequestException($"X gönderisi başarısız (HTTP {(int)res.StatusCode}).");
    }

    /// <summary>280 karaktere sığan özet: en kalabalık grup ve büyük iller, sonunda bağlantı.</summary>
    public static string BuildMessage(IReadOnlyList<PriceChange> changes, bool test = false)
    {
        var lines = new List<string>();
        if (test) lines.Add("🧪 Test gönderisi, gerçek fiyat değişikliği değil.");

        foreach (var g in changes.GroupBy(c => (c.Fuel, Up: c.IsIncrease)).OrderByDescending(g => g.Count()))
        {
            var list = g.ToList();
            var avg = list.Average(c => Math.Abs(c.Delta));
            var head = g.Key.Up ? $"⛽ {g.Key.Fuel.Dative()} zam" : $"🟢 {g.Key.Fuel.Locative()} indirim";
            var scope = list.Count >= 70 ? "tüm Türkiye'de" : list.Count == 1 ? list[0].CityName : $"{list.Count} ilde";
            lines.Add($"{head}, {scope}: {(g.Key.Up ? "+" : "−")}{FcmNotifier.Money(avg)} ₺/L");
        }

        var featured = changes.FirstOrDefault(c => c.Slug == "istanbul-avrupa") ?? changes.FirstOrDefault(c => c.Slug == "ankara");
        if (featured is not null && changes.Count > 1)
            lines.Add($"{featured.CityName} {featured.Fuel.DisplayName().ToLowerInvariant()}: {FcmNotifier.Money(featured.NewPrice)} ₺");

        var link = $"\nİlini seç: {WebUrl}";
        var body = new StringBuilder();
        foreach (var line in lines)
        {
            // Bağlantı t.co ile 23 karakter sayılır; güvenli tarafta kalıp gerçek uzunluğu kullanıyoruz.
            if (body.Length + line.Length + 1 + link.Length > MaxLength) break;
            if (body.Length > 0) body.Append('\n');
            body.Append(line);
        }
        return body + link;
    }

    /// <summary>OAuth 1.0a HMAC-SHA1 Authorization başlığı (RFC 5849).</summary>
    internal static string AuthorizationHeader(string method, string url, IEnumerable<KeyValuePair<string, string>> requestParams,
        string consumerKey, string consumerSecret, string token, string tokenSecret, string nonce, long timestamp)
    {
        var oauth = new SortedDictionary<string, string>(StringComparer.Ordinal)
        {
            ["oauth_consumer_key"] = consumerKey,
            ["oauth_nonce"] = nonce,
            ["oauth_signature_method"] = "HMAC-SHA1",
            ["oauth_timestamp"] = timestamp.ToString(System.Globalization.CultureInfo.InvariantCulture),
            ["oauth_token"] = token,
            ["oauth_version"] = "1.0",
        };

        var all = oauth.Concat(requestParams)
            .Select(p => (Key: Encode(p.Key), Value: Encode(p.Value)))
            .OrderBy(p => p.Key, StringComparer.Ordinal).ThenBy(p => p.Value, StringComparer.Ordinal)
            .Select(p => $"{p.Key}={p.Value}");
        var baseString = $"{method.ToUpperInvariant()}&{Encode(url)}&{Encode(string.Join('&', all))}";
        var key = $"{Encode(consumerSecret)}&{Encode(tokenSecret)}";
        var signature = Convert.ToBase64String(HMACSHA1.HashData(Encoding.ASCII.GetBytes(key), Encoding.ASCII.GetBytes(baseString)));

        oauth["oauth_signature"] = signature;
        return "OAuth " + string.Join(", ", oauth.Select(p => $"{Encode(p.Key)}=\"{Encode(p.Value)}\""));
    }

    /// <summary>RFC 3986 yüzde kodlaması: sadece A-Z a-z 0-9 - . _ ~ olduğu gibi kalır.</summary>
    internal static string Encode(string value)
    {
        var sb = new StringBuilder();
        foreach (var b in Encoding.UTF8.GetBytes(value))
        {
            char c = (char)b;
            if (c is >= 'A' and <= 'Z' or >= 'a' and <= 'z' or >= '0' and <= '9' or '-' or '.' or '_' or '~')
                sb.Append(c);
            else
                sb.Append('%').Append(b.ToString("X2"));
        }
        return sb.ToString();
    }
}
