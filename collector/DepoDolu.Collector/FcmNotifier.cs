using System.Globalization;
using System.Net.Http.Headers;
using System.Net.Http.Json;

namespace DepoDolu.Collector;

public sealed class FcmNotifier
{
    private readonly HttpClient _http;
    public bool IsDryRun => _token is null;
    private readonly GoogleAccessToken? _token;
    private static readonly CultureInfo Tr = CultureInfo.InvariantCulture;
    private const string Scope = "https://www.googleapis.com/auth/firebase.messaging";

    public FcmNotifier(HttpClient http, string? serviceAccountJson)
    {
        _http = http;
        if (!string.IsNullOrWhiteSpace(serviceAccountJson))
            _token = new GoogleAccessToken(http, serviceAccountJson, Scope);
    }

    public async Task SendAsync(IEnumerable<PriceChange> changes, CancellationToken ct = default)
    {
        foreach (var change in changes)
        {
            var (title, body) = BuildMessage(change);
            Console.WriteLine($"  → [{change.Topic}] {title} — {body}");
            if (IsDryRun) continue;

            var token = await _token!.GetAsync(ct);
            using var req = new HttpRequestMessage(HttpMethod.Post,
                $"https://fcm.googleapis.com/v1/projects/{_token.ProjectId}/messages:send")
            {
                Content = JsonContent.Create(BuildPayload(change, title, body))
            };
            req.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);

            using var res = await _http.SendAsync(req, ct);
            if (!res.IsSuccessStatusCode)
            {
                var err = await res.Content.ReadAsStringAsync(ct);
                Console.Error.WriteLine($"    ! FCM hata {(int)res.StatusCode}: {err}");
            }
        }
    }

    public static (string Title, string Body) BuildMessage(PriceChange c)
    {
        string oldP = Money(c.OldPrice), newP = Money(c.NewPrice), delta = Money(Math.Abs(c.Delta));

        if (c.IsIncrease)
        {
            var tank = Money(c.NewPrice * 50m, decimals: 0);
            return ($"⛽ {c.CityName}: {c.Fuel.Dative()} zam",
                    $"Litre {oldP} → {newP} ₺ (+{delta} ₺). 50 litrelik depo artık {tank} ₺.");
        }

        return ($"🟢 {c.CityName}: {c.Fuel.Locative()} indirim",
                $"Litre {oldP} → {newP} ₺ (−{delta} ₺). Depoyu doldurmanın tam zamanı.");
    }

    private static object BuildPayload(PriceChange c, string title, string body) => new
    {
        message = new
        {
            topic = c.Topic,
            notification = new { title, body },
            data = new Dictionary<string, string>
            {
                ["city"] = c.Slug,
                ["fuel"] = c.Fuel.Key(),
                ["old"] = c.OldPrice.ToString(Tr),
                ["new"] = c.NewPrice.ToString(Tr)
            },
            android = new
            {
                priority = "high",
                notification = new { channel_id = "fiyat", icon = "ic_stat_fuel" }
            },
            apns = new { payload = new { aps = new { sound = "default" } } }
        }
    };

    public static string Money(decimal value, int decimals = 2)
    {
        var s = Math.Round(value, decimals, MidpointRounding.AwayFromZero)
            .ToString(decimals == 0 ? "#,0" : "#,0.00", Tr);
        return s.Replace(",", "\u0001").Replace(".", ",").Replace("\u0001", ".");
    }
}
