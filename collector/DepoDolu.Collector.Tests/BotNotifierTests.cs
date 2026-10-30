using System.Net;
using System.Text.Json;
using DepoDolu.Collector;
using Xunit;

namespace DepoDolu.Collector.Tests;

public sealed class BotNotifierTests
{
    private static readonly PriceChange BursaMotorin = new("bursa", "Bursa", Fuel.Motorin, 97.80m, 99.10m);
    private static readonly PriceChange BursaBenzin = new("bursa", "Bursa", Fuel.Benzin, 77.40m, 77.10m);
    private static readonly PriceChange IzmirMotorin = new("izmir", "İzmir", Fuel.Motorin, 98.10m, 99.40m);

    private static BotNotifier.Subscriber Sub(long id, string city, string fuel) => new(id, city, fuel);

    [Fact]
    public void Herkes_sadece_kendi_il_ve_yakitini_alir()
    {
        var plan = BotNotifier.Plan([BursaMotorin, BursaBenzin, IzmirMotorin],
        [
            Sub(1, "bursa", "motorin"),
            Sub(2, "bursa", "lpg"),      // Bursa'da LPG değişmedi → mesaj yok
            Sub(3, "ankara", "motorin"), // Ankara değişmedi → mesaj yok
            Sub(4, "izmir", "motorin"),
            Sub(5, "bursa", "hepsi"),
        ]);

        Assert.Equal(new long[] { 1, 4, 5 }, plan.Select(p => p.ChatId));
        Assert.Contains("Bursa: Motorine zam", plan[0].Text);
        Assert.DoesNotContain("İzmir", plan[0].Text);
        Assert.DoesNotContain("Benzin", plan[0].Text);
        Assert.Contains("İzmir: Motorine zam", plan[1].Text);
        Assert.Contains("Bursa: Benzinde indirim", plan[2].Text);
        Assert.Contains("Bursa: Motorine zam", plan[2].Text);
    }

    [Fact]
    public void Mesaj_bicimi()
    {
        Assert.Equal(
            "⛽ <b>Bursa: Motorine zam</b>\nLitre 97,80 → <b>99,10 ₺</b> (+1,30 ₺)\n50 litrelik depo artık 4.955 ₺." +
            "\n\n<i>/fiyat tüm fiyatlar · /durdur bildirimleri kapat</i>",
            BotNotifier.BuildMessage([BursaMotorin]));

        Assert.StartsWith("🟢 <b>Bursa: Benzinde indirim</b>\nLitre 77,40 → <b>77,10 ₺</b> (−0,30 ₺)\nDepoyu doldurmanın tam zamanı.",
            BotNotifier.BuildMessage([BursaBenzin]));
    }

    [Fact]
    public async Task Gonderir_engelleyeni_siler_429da_bekleyip_tekrar_dener()
    {
        var calls = new List<string>();
        int toUser2 = 0;
        string? removedBody = null;
        using var http = new HttpClient(new Stub(async req =>
        {
            var path = req.RequestUri!.AbsolutePath;
            calls.Add(path);
            if (path == "/subscribers")
            {
                Assert.Equal("Bearer api", req.Headers.Authorization!.ToString());
                return Json(new { subscribers = new[] { new { chat_id = 1, city = "bursa", fuel = "motorin" },
                                                          new { chat_id = 2, city = "bursa", fuel = "hepsi" },
                                                          new { chat_id = 3, city = "bursa", fuel = "motorin" } } });
            }
            if (path == "/unsubscribe") { removedBody = await req.Content!.ReadAsStringAsync(); return Json(new { removed = 1 }); }

            var body = await req.Content!.ReadAsStringAsync();
            var chat = JsonDocument.Parse(body).RootElement.GetProperty("chat_id").GetInt64();
            if (chat == 2 && toUser2++ == 0)
                return new HttpResponseMessage((HttpStatusCode)429) { Content = new StringContent("{\"ok\":false,\"parameters\":{\"retry_after\":0}}") };
            if (chat == 3)
                return new HttpResponseMessage(HttpStatusCode.Forbidden) { Content = new StringContent("{\"ok\":false,\"description\":\"Forbidden: bot was blocked by the user\"}") };
            return Json(new { ok = true });
        }));

        var bot = new BotNotifier(http, "token", "https://bot.test/", "api") { Pace = TimeSpan.Zero };
        await bot.SendAsync([BursaMotorin]);

        Assert.Equal(2, toUser2);                                  // 429 sonrası tekrar denendi
        Assert.Equal("{\"chat_ids\":[3]}", removedBody);           // engelleyen silindi
        Assert.Equal(1, calls.Count(c => c == "/subscribers"));
    }

    [Fact]
    public async Task Abone_listesi_alinamazsa_hata_firlatir_ki_sonra_tekrar_denensin()
    {
        using var http = new HttpClient(new Stub(_ => Task.FromResult(new HttpResponseMessage(HttpStatusCode.BadGateway))));
        var bot = new BotNotifier(http, "token", "https://bot.test", "api") { Pace = TimeSpan.Zero };
        await Assert.ThrowsAsync<HttpRequestException>(() => bot.SendAsync([BursaMotorin]));
    }

    [Fact]
    public void Ayar_eksikse_dry_run()
    {
        Assert.True(new BotNotifier(new HttpClient(), "t", null, "s").IsDryRun);
        Assert.True(new BotNotifier(new HttpClient(), null, "u", "s").IsDryRun);
        Assert.False(new BotNotifier(new HttpClient(), "t", "u", "s").IsDryRun);
    }

    [Fact]
    public async Task Test_sadece_verilen_sohbete_gonderir()
    {
        var sentTo = new List<long>();
        using var http = new HttpClient(new Stub(async req =>
        {
            if (req.RequestUri!.AbsolutePath == "/subscribers")
                return Json(new { subscribers = new[] { new { chat_id = 1, city = "bursa", fuel = "motorin" }, new { chat_id = 2, city = "bursa", fuel = "motorin" } } });
            var body = await req.Content!.ReadAsStringAsync();
            sentTo.Add(JsonDocument.Parse(body).RootElement.GetProperty("chat_id").GetInt64());
            Assert.Contains("Deneme", body);
            return Json(new { ok = true });
        }));
        var bot = new BotNotifier(http, "token", "https://bot.test", "api") { Pace = TimeSpan.Zero };

        Assert.Equal(2, await bot.TestAsync([BursaMotorin], chatId: 99));
        Assert.Equal(new long[] { 99 }, sentTo);

        Assert.Equal(2, await bot.TestAsync([BursaMotorin], chatId: null));
        Assert.Single(sentTo);
    }

    private static HttpResponseMessage Json(object o) =>
        new(HttpStatusCode.OK) { Content = new StringContent(JsonSerializer.Serialize(o), System.Text.Encoding.UTF8, "application/json") };

    private sealed class Stub(Func<HttpRequestMessage, Task<HttpResponseMessage>> respond) : HttpMessageHandler
    {
        protected override Task<HttpResponseMessage> SendAsync(HttpRequestMessage req, CancellationToken ct) => respond(req);
    }
}
