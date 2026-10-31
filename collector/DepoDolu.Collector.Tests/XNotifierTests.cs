using DepoDolu.Collector;
using Xunit;

namespace DepoDolu.Collector.Tests;

public class XNotifierTests
{
    [Fact]
    public void OAuth_imzasi_X_belgesindeki_ornekle_ayni()
    {
        // developer.x.com "Creating a signature" örneği.
        var header = XNotifier.AuthorizationHeader("POST", "https://api.twitter.com/1.1/statuses/update.json",
            [new("include_entities", "true"), new("status", "Hello Ladies + Gentlemen, a signed OAuth request!")],
            consumerKey: "xvz1evFS4wEEPTGEFPHBog",
            consumerSecret: "kAcSOqF21Fu85e7zjz7ZN2U4ZRhfV3WpwPAoE3Z7kBw",
            token: "370773112-GmHxMAgYyLbNEtIKZeRNFsMKPR9EyMZeS9weJAEb",
            tokenSecret: "LswwdoUaIvS8ltyTt5jkRh4J50vUPVVHtR2YPi5kE",
            nonce: "kYjzVBB8Y0ZFabxSWbWovY3uYSQ2pTgmZeNu2VS4cg",
            timestamp: 1318622958);

        Assert.Contains("oauth_signature=\"hCtSmYh%2BiHYCEqBWrE7C7hYmtUk%3D\"", header);
        Assert.StartsWith("OAuth oauth_consumer_key=\"xvz1evFS4wEEPTGEFPHBog\"", header);
    }

    [Fact]
    public void Yuzde_kodlamasi_RFC3986()
    {
        Assert.Equal("Ladies%20%2B%20Gentlemen", XNotifier.Encode("Ladies + Gentlemen"));
        Assert.Equal("a-b._~", XNotifier.Encode("a-b._~"));
        Assert.Equal("%C4%B0zmir", XNotifier.Encode("İzmir"));
    }

    [Fact]
    public void Ulusal_zam_tek_satir_ve_baglanti()
    {
        var changes = new List<PriceChange> { new("istanbul-avrupa", "İstanbul (Avrupa)", Fuel.Motorin, 96.90m, 98.10m) };
        for (int i = 0; i < 80; i++)
            changes.Add(new($"il-{i}", $"İl {i}", Fuel.Motorin, 98m, 99.20m));

        var msg = XNotifier.BuildMessage(changes);

        Assert.StartsWith("⛽ Motorine zam, tüm Türkiye'de: +1,20 ₺/L\nİstanbul (Avrupa) motorin: 98,10 ₺", msg);
        Assert.EndsWith("İlini seç: https://ozkurtomer.github.io/depo-dolu/", msg);
        Assert.True(msg.Length <= XNotifier.MaxLength);
    }

    [Fact]
    public void Tek_il_degisikligi_il_adini_yazar()
    {
        var msg = XNotifier.BuildMessage([new PriceChange("van", "Van", Fuel.Lpg, 42.31m, 41.81m)]);
        Assert.StartsWith("🟢 LPG'de indirim, Van: −0,50 ₺/L\n", msg);
    }

    [Fact]
    public void Cok_grup_olsa_da_280_karakteri_asmaz()
    {
        var changes = new List<PriceChange>();
        foreach (var fuel in Enum.GetValues<Fuel>())
            for (int i = 0; i < 10; i++)
            {
                changes.Add(new($"a{i}", $"Uzun İl Adı {i}", fuel, 50m, 51m));
                changes.Add(new($"b{i}", $"Uzun İl Adı {i}", fuel, 50m, 49m));
            }
        var msg = XNotifier.BuildMessage(changes, test: true);
        Assert.True(msg.Length <= XNotifier.MaxLength, $"{msg.Length} karakter");
        Assert.StartsWith("🧪 Test", msg);
    }

    [Fact]
    public void Ayar_eksikse_dry_run()
    {
        Assert.True(new XNotifier(new HttpClient(), "k", "s", "t", null).IsDryRun);
        Assert.False(new XNotifier(new HttpClient(), "k", "s", "t", "ts").IsDryRun);
    }
}
