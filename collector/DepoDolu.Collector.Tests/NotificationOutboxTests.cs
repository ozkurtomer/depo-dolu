using DepoDolu.Collector;
using Xunit;

namespace DepoDolu.Collector.Tests;

public sealed class NotificationOutboxTests : IDisposable
{
    private readonly string _dir = Path.Combine(Path.GetTempPath(), "depodolu-outbox-" + Guid.NewGuid().ToString("N"));
    private NotificationOutbox Store => new(Path.Combine(_dir, "pending.json"));
    private static readonly PriceChange Bursa = new("bursa", "Bursa", Fuel.Motorin, 97.80m, 99.10m);
    private static readonly PriceChange Izmir = new("izmir", "İzmir", Fuel.Benzin, 77.50m, 78.50m);

    [Fact]
    public async Task Basarisiz_konu_kalir_basarili_kanallar_tekrarlanmaz()
    {
        Store.Enqueue([Bursa, Izmir]);
        var delivered = new List<string>();
        int telegram = 0;
        Assert.False(await Store.DispatchAsync(c =>
        {
            if (c.Slug == "izmir") throw new HttpRequestException("HTTP 500");
            delivered.Add(c.Topic);
            return Task.CompletedTask;
        }, _ => { telegram++; return Task.CompletedTask; }));

        var batch = Assert.Single(Store.Load());
        Assert.True(batch.TelegramDelivered);
        Assert.Contains(Bursa.Topic, batch.FcmDelivered);
        Assert.DoesNotContain(Izmir.Topic, batch.FcmDelivered);

        Assert.True(await Store.DispatchAsync(c => { delivered.Add(c.Topic); return Task.CompletedTask; },
            _ => { telegram++; return Task.CompletedTask; }));
        Assert.Equal(new[] { Bursa.Topic, Izmir.Topic }, delivered);
        Assert.Equal(1, telegram);
        Assert.Empty(Store.Load());
    }

    [Fact]
    public async Task Telegram_hatasi_fcm_teslimini_geri_almaz()
    {
        Store.Enqueue([Bursa]);
        int fcm = 0;
        Assert.False(await Store.DispatchAsync(_ => { fcm++; return Task.CompletedTask; },
            _ => throw new HttpRequestException("HTTP 429")));
        Assert.True(await Store.DispatchAsync(_ => { fcm++; return Task.CompletedTask; },
            _ => Task.CompletedTask));
        Assert.Equal(1, fcm);
        Assert.Empty(Store.Load());
    }

    [Fact]
    public void Yeni_degisim_bekleyen_eski_mesaji_silmez()
    {
        Store.Enqueue([Bursa]);
        Store.Enqueue([Izmir]);
        Assert.Equal(2, Store.Load().Count);
    }

    [Fact]
    public async Task Bot_hatasi_diger_kanallari_tekrarlatmaz_bot_sonra_tamamlanir()
    {
        Store.Enqueue([Bursa]);
        int fcm = 0, telegram = 0, bot = 0;
        Assert.False(await Store.DispatchAsync(_ => { fcm++; return Task.CompletedTask; },
            _ => { telegram++; return Task.CompletedTask; },
            _ => throw new HttpRequestException("abone listesi alınamadı")));
        var batch = Assert.Single(Store.Load());
        Assert.False(batch.BotDelivered);

        Assert.True(await Store.DispatchAsync(_ => { fcm++; return Task.CompletedTask; },
            _ => { telegram++; return Task.CompletedTask; },
            _ => { bot++; return Task.CompletedTask; }));
        Assert.Equal((1, 1, 1), (fcm, telegram, bot));
        Assert.Empty(Store.Load());
    }

    public void Dispose()
    {
        if (Directory.Exists(_dir)) Directory.Delete(_dir, recursive: true);
    }
}
