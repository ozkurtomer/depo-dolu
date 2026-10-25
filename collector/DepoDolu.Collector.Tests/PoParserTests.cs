using DepoDolu.Collector;
using Xunit;

namespace DepoDolu.Collector.Tests;

public class PoParserTests
{
    private static string Fixture(string name) =>
        File.ReadAllText(Path.Combine(AppContext.BaseDirectory, "Fixtures", name));

    [Fact]
    public void Tum_iller_okunur()
    {
        var prices = PoParser.Parse(Fixture("po-2026-10-25.html"));

        Assert.Equal(82, prices.Count);
        Assert.All(prices, p => Assert.NotNull(p.Benzin));
        Assert.All(prices, p => Assert.NotNull(p.Motorin));
        Assert.All(prices, p => Assert.NotNull(p.Lpg));
        Assert.Equal(prices.Count, prices.Select(p => p.Slug).Distinct().Count());
    }

    [Fact]
    public void Kdv_dahil_fiyat_alinir()
    {
        var bursa = PoParser.Parse(Fixture("po-2026-10-25.html")).Single(p => p.Slug == "bursa");

        Assert.Equal("Bursa", bursa.Name);
        Assert.Equal(77.40m, bursa.Benzin);
        Assert.Equal(97.80m, bursa.Motorin);
        Assert.Equal(40.60m, bursa.Lpg);
    }

    [Fact]
    public void Istanbul_iki_yaka_ve_turkce_adlar()
    {
        var prices = PoParser.Parse(Fixture("po-2026-10-25.html")).ToDictionary(p => p.Slug);

        Assert.Equal("İstanbul (Avrupa)", prices["istanbul-avrupa"].Name);
        Assert.Equal("İstanbul (Anadolu)", prices["istanbul-anadolu"].Name);
        Assert.Equal("Şanlıurfa", prices["sanliurfa"].Name);
        Assert.Equal("Afyonkarahisar", prices["afyon"].Name);
    }

    [Fact]
    public void Sutun_sirasi_ve_virgullu_sayi_degisse_de_calisir()
    {
        const string html = """
            <table><tr><td>menü</td></tr></table>
            <table>
              <tr><th>İl</th><th>Otogaz</th><th>Motorin</th><th>Kurşunsuz 95</th></tr>
              <tr><td>BURSA</td><td>40,60 TL</td><td>97,80 TL</td><td>77,40 TL</td></tr>
              <tr><td>İZMİR</td><td>41,20</td><td>98,10</td><td>77,50</td></tr>
            </table>
            """;

        var prices = PoParser.Parse(html);

        Assert.Equal(2, prices.Count);
        Assert.Equal(new CityPrices("bursa", "Bursa", 77.40m, 97.80m, 40.60m), prices[0]);
        Assert.Equal("izmir", prices[1].Slug);
        Assert.Equal("İzmir", prices[1].Name);
    }

    [Fact]
    public void Tablo_yoksa_hata_verir()
    {
        Assert.Throws<ParseException>(() => PoParser.Parse("<html><body>Bakım çalışması</body></html>"));
    }

    [Fact]
    public void Taninmayan_satir_il_sayilmaz()
    {
        Assert.Throws<ParseException>(() => PoParser.Parse("""
            <table><tr><th>İl</th><th>Kurşunsuz</th><th>Motorin</th><th>LPG</th></tr>
            <tr><td>TOPLAM</td><td>77.40</td><td>97.80</td><td>40.60</td></tr></table>
            """));
    }

    [Fact]
    public void Html_varliklari_ve_etiketler_temizlenir()
    {
        Assert.Equal("Kurşunsuz 95 TL/LT", PoParser.Text("<b>Kur&#351;unsuz</b>&nbsp;95 <i>TL/LT</i>"));
    }
}
