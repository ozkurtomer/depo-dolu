using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;

namespace DepoDolu.Collector;

/// <summary>
/// Telegram botuna abone olan herkese, sadece kendi seçtiği il ve yakıttaki değişikliği gönderir.
///
/// Abone listesi Cloudflare'deki bot sunucusundan (bot/ klasörü) çekilir; repoya hiç yazılmaz.
/// Mesajları burada (GitHub Actions'ta) göndermemizin sebebi: Worker'ın istek başına alt istek
/// sınırı var, burada yok. Botu engelleyen kullanıcılar listeden silinir.
/// </summary>
public sealed class BotNotifier(HttpClient http, string? botToken, string? apiUrl, string? apiSecret)
{
    /// <summary>Telegram'ın kişiye mesaj sınırı saniyede ~30; altında kalıyoruz.</summary>
    public TimeSpan Pace { get; init; } = TimeSpan.FromMilliseconds(40);

    public bool IsDryRun =>
        string.IsNullOrWhiteSpace(botToken) || string.IsNullOrWhiteSpace(apiUrl) || string.IsNullOrWhiteSpace(apiSecret);

    public sealed record Subscriber(
        [property: JsonPropertyName("chat_id")] long ChatId,
        [property: JsonPropertyName("city")] string City,
        [property: JsonPropertyName("fuel")] string Fuel);

    private sealed record SubscriberList([property: JsonPropertyName("subscribers")] List<Subscriber> Subscribers);

    public async Task SendAsync(IReadOnlyList<PriceChange> changes, CancellationToken ct = default)
    {
        if (changes.Count == 0) return;
        if (IsDryRun)
        {
            Console.WriteLine("  (Telegram botu ayarlı değil, kişisel bildirim atlanıyor)");
            return;
        }

        // Liste alınamazsa hata fırlat: teslim edilmemiş sayılır, bir sonraki çalıştırmada tekrar denenir.
        var subscribers = await FetchSubscribersAsync(ct);
        var plan = Plan(changes, subscribers);
        Console.WriteLine($"  Telegram botu: {subscribers.Count} abone, {plan.Count} kişiye mesaj.");

        int sent = 0, failed = 0;
        var blocked = new List<long>();
        foreach (var (chatId, text) in plan)
        {
            switch (await SendOneAsync(chatId, text, ct))
            {
                case Result.Sent: sent++; break;
                case Result.Blocked: blocked.Add(chatId); break;
                default: failed++; break;
            }
            if (Pace > TimeSpan.Zero) await Task.Delay(Pace, ct);
        }

        if (blocked.Count > 0) await RemoveAsync(blocked, ct);
        Console.WriteLine($"  ✓ Telegram botu: {sent} gönderildi, {blocked.Count} engellemiş (silindi), {failed} başarısız.");
    }

    /// <summary>
    /// Deneme: abone listesine erişimi doğrular. chatId verilirse SADECE o sohbete deneme mesajı gönderir;
    /// gerçek abonelere asla test mesajı gitmez.
    /// </summary>
    public async Task<int> TestAsync(IReadOnlyList<PriceChange> sample, long? chatId, CancellationToken ct = default)
    {
        if (IsDryRun)
        {
            Console.WriteLine("  ✗ Telegram botu ayarlı değil: TELEGRAM_BOT_TOKEN, BOT_API_URL ya da BOT_API_SECRET eksik.");
            return -1;
        }

        var subscribers = await FetchSubscribersAsync(ct);
        var matching = Plan(sample, subscribers).Count;
        Console.WriteLine($"  ✓ Bot abone listesine erişildi: toplam {subscribers.Count} abone, bu il ve yakıtta {matching} kişi.");

        if (chatId is { } id)
        {
            var text = "🧪 <i>Deneme: GitHub Actions'tan gönderildi. Gerçek bir zamda böyle bir mesaj alacaksın.</i>\n\n" + BuildMessage(sample);
            var result = await SendOneAsync(id, text, ct);
            if (result != Result.Sent)
                throw new HttpRequestException($"Test mesajı {id} sohbetine gönderilemedi ({result}). Sohbet kimliği doğru mu, botu engellemedin mi?");
            Console.WriteLine($"  ✓ Test mesajı {id} sohbetine gönderildi.");
        }
        else
        {
            Console.WriteLine("  (chat_id verilmedi: sadece bağlantı denendi, mesaj gönderilmedi)");
        }
        return subscribers.Count;
    }

    /// <summary>Her aboneye, sadece kendi il ve yakıtındaki değişikliklerden oluşan tek mesaj.</summary>
    public static List<(long ChatId, string Text)> Plan(IReadOnlyList<PriceChange> changes, IEnumerable<Subscriber> subscribers)
    {
        var byCity = changes.GroupBy(c => c.Slug).ToDictionary(g => g.Key, g => g.ToList());
        var plan = new List<(long, string)>();
        foreach (var s in subscribers)
        {
            if (!byCity.TryGetValue(s.City, out var cityChanges)) continue;
            var mine = s.Fuel == "hepsi" ? cityChanges : cityChanges.Where(c => c.Fuel.Key() == s.Fuel).ToList();
            if (mine.Count > 0) plan.Add((s.ChatId, BuildMessage(mine)));
        }
        return plan;
    }

    /// <summary>bot/src/index.js içindeki changeMessage ile aynı biçim (/test birebir aynı görünsün).</summary>
    public static string BuildMessage(IReadOnlyList<PriceChange> mine)
    {
        var sb = new StringBuilder();
        foreach (var c in mine.OrderBy(c => c.Fuel))
        {
            if (sb.Length > 0) sb.Append("\n\n");
            var city = WebUtility.HtmlEncode(c.CityName);
            var delta = FcmNotifier.Money(Math.Abs(c.Delta));
            if (c.IsIncrease)
            {
                sb.Append($"⛽ <b>{city}: {c.Fuel.Dative()} zam</b>\n");
                sb.Append($"Litre {FcmNotifier.Money(c.OldPrice)} → <b>{FcmNotifier.Money(c.NewPrice)} ₺</b> (+{delta} ₺)\n");
                sb.Append($"50 litrelik depo artık {FcmNotifier.Money(c.NewPrice * 50m, 0)} ₺.");
            }
            else
            {
                sb.Append($"🟢 <b>{city}: {c.Fuel.Locative()} indirim</b>\n");
                sb.Append($"Litre {FcmNotifier.Money(c.OldPrice)} → <b>{FcmNotifier.Money(c.NewPrice)} ₺</b> (−{delta} ₺)\n");
                sb.Append("Depoyu doldurmanın tam zamanı.");
            }
        }
        sb.Append("\n\n<i>/fiyat tüm fiyatlar · /durdur bildirimleri kapat</i>");
        return sb.ToString();
    }

    private async Task<List<Subscriber>> FetchSubscribersAsync(CancellationToken ct)
    {
        using var req = new HttpRequestMessage(HttpMethod.Get, $"{apiUrl!.TrimEnd('/')}/subscribers");
        req.Headers.Authorization = new AuthenticationHeaderValue("Bearer", apiSecret);
        using var res = await http.SendAsync(req, ct);
        if (!res.IsSuccessStatusCode)
            throw new HttpRequestException($"Abone listesi alınamadı (HTTP {(int)res.StatusCode}).");
        var list = await res.Content.ReadFromJsonAsync<SubscriberList>(cancellationToken: ct);
        return list?.Subscribers ?? [];
    }

    private enum Result { Sent, Blocked, Failed }

    private async Task<Result> SendOneAsync(long chatId, string text, CancellationToken ct)
    {
        for (int attempt = 1; attempt <= 3; attempt++)
        {
            try
            {
                using var res = await http.PostAsJsonAsync($"https://api.telegram.org/bot{botToken}/sendMessage", new
                {
                    chat_id = chatId,
                    text,
                    parse_mode = "HTML",
                    disable_web_page_preview = true
                }, ct);

                if (res.IsSuccessStatusCode) return Result.Sent;

                var body = await res.Content.ReadAsStringAsync(ct);
                if (res.StatusCode == HttpStatusCode.Forbidden ||
                    (res.StatusCode == HttpStatusCode.BadRequest && body.Contains("chat not found", StringComparison.OrdinalIgnoreCase)))
                    return Result.Blocked;

                if ((int)res.StatusCode == 429)
                {
                    await Task.Delay(TimeSpan.FromSeconds(RetryAfter(body) + 1), ct);
                    continue;
                }
                Console.Error.WriteLine($"    ! {(int)res.StatusCode} {body}");
                return Result.Failed;
            }
            catch (Exception ex) when (ex is HttpRequestException or TaskCanceledException && !ct.IsCancellationRequested)
            {
                if (attempt == 3) { Console.Error.WriteLine($"    ! {ex.Message}"); return Result.Failed; }
                await Task.Delay(TimeSpan.FromSeconds(attempt), ct);
            }
        }
        return Result.Failed;
    }

    private static int RetryAfter(string body)
    {
        try
        {
            using var doc = JsonDocument.Parse(body);
            if (doc.RootElement.TryGetProperty("parameters", out var p) && p.TryGetProperty("retry_after", out var r))
                return Math.Clamp(r.GetInt32(), 1, 60);
        }
        catch (JsonException) { }
        return 3;
    }

    private async Task RemoveAsync(List<long> chatIds, CancellationToken ct)
    {
        try
        {
            using var req = new HttpRequestMessage(HttpMethod.Post, $"{apiUrl!.TrimEnd('/')}/unsubscribe")
            {
                Content = JsonContent.Create(new { chat_ids = chatIds })
            };
            req.Headers.Authorization = new AuthenticationHeaderValue("Bearer", apiSecret);
            using var res = await http.SendAsync(req, ct);
        }
        catch (HttpRequestException ex)
        {
            Console.Error.WriteLine($"    ! Engelleyenler silinemedi: {ex.Message}");
        }
    }
}
