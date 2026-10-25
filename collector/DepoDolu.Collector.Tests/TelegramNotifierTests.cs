using DepoDolu.Collector;
using Xunit;

namespace DepoDolu.Collector.Tests;

public class TelegramNotifierTests
{
    [Fact]
    public void Tek_il_zam_mesaji()
    {
        var msg = TelegramNotifier.BuildMessage([new PriceChange("bursa", "Bursa", Fuel.Motorin, 97.80m, 99.10m)]);

        Assert.StartsWith("<b>⛽ Motorine zam</b>, 1 ilde\n", msg);
        Assert.Contains("• Bursa: 97,80 → <b>99,10 ₺</b>", msg);
        Assert.Contains("github.com/ozkurtomer/depo-dolu", msg);
    }

    [Fact]
    public void Ulusal_zam_tek_ozet_buyuk_iller_once()
    {
        var changes = new List<PriceChange>
        {
            new("adana", "Adana", Fuel.Benzin, 78.10m, 79.40m),
            new("ankara", "Ankara", Fuel.Benzin, 77.30m, 78.60m),
        };
        for (int i = 0; i < 80; i++)
            changes.Add(new($"il-{i}", $"İl {i:00}", Fuel.Benzin, 78m, 79.30m));

        var msg = TelegramNotifier.BuildMessage(changes);

        Assert.StartsWith("<b>⛽ Benzine zam</b>, tüm Türkiye'de, litre başına ortalama +1,30 ₺\n• Ankara:", msg);
        Assert.Contains("• ve 76 il daha", msg);
    }

    [Fact]
    public void Zam_ve_indirim_ayri_satirlarda()
    {
        var msg = TelegramNotifier.BuildMessage(
        [
            new PriceChange("van", "Van", Fuel.Lpg, 42.31m, 41.81m),
            new PriceChange("bursa", "Bursa", Fuel.Motorin, 97.80m, 99.10m),
        ]);

        Assert.Contains("<b>🟢 LPG'de indirim</b>, 1 ilde", msg);
        Assert.Contains("<b>⛽ Motorine zam</b>, 1 ilde", msg);
    }

    [Fact]
    public void Ayar_yoksa_dry_run()
    {
        Assert.True(new TelegramNotifier(new HttpClient(), null, "@kanal").IsDryRun);
        Assert.True(new TelegramNotifier(new HttpClient(), "token", "").IsDryRun);
        Assert.False(new TelegramNotifier(new HttpClient(), "token", "@kanal").IsDryRun);
    }
}
