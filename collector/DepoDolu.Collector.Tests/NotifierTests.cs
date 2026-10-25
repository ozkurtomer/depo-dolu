using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using DepoDolu.Collector;
using Xunit;

namespace DepoDolu.Collector.Tests;

public class NotifierTests
{
    [Fact]
    public void Zam_mesaji()
    {
        var (title, body) = FcmNotifier.BuildMessage(new PriceChange("bursa", "Bursa", Fuel.Motorin, 97.80m, 99.10m));

        Assert.Equal("⛽ Bursa: Motorine zam", title);
        Assert.Equal("Litre 97,80 → 99,10 ₺ (+1,30 ₺). 50 litrelik depo artık 4.955 ₺.", body);
    }

    [Fact]
    public void Indirim_mesaji()
    {
        var (title, body) = FcmNotifier.BuildMessage(new PriceChange("van", "Van", Fuel.Lpg, 42.31m, 41.81m));

        Assert.Equal("🟢 Van: LPG'de indirim", title);
        Assert.StartsWith("Litre 42,31 → 41,81 ₺ (−0,50 ₺).", body);
    }

    [Theory]
    [InlineData("97.8", 2, "97,80")]
    [InlineData("4955", 0, "4.955")]
    [InlineData("1234.567", 2, "1.234,57")]
    public void Turkce_para_bicimi(string value, int decimals, string expected)
    {
        Assert.Equal(expected, FcmNotifier.Money(decimal.Parse(value, System.Globalization.CultureInfo.InvariantCulture), decimals));
    }

    [Fact]
    public void Servis_hesabi_yoksa_dry_run()
    {
        Assert.True(new FcmNotifier(new HttpClient(), null).IsDryRun);
        Assert.True(new FcmNotifier(new HttpClient(), "  ").IsDryRun);
    }

    [Fact]
    public void Jwt_dogru_imzalanir()
    {
        using var rsa = RSA.Create(2048);
        var serviceAccount = JsonSerializer.Serialize(new
        {
            project_id = "depo-dolu",
            client_email = "collector@depo-dolu.iam.gserviceaccount.com",
            private_key = rsa.ExportPkcs8PrivateKeyPem(),
            token_uri = "https://oauth2.googleapis.com/token"
        });

        var token = new GoogleAccessToken(new HttpClient(), serviceAccount, "https://www.googleapis.com/auth/firebase.messaging");
        var jwt = token.CreateJwt(new DateTimeOffset(2026, 10, 25, 12, 0, 0, TimeSpan.Zero));
        var parts = jwt.Split('.');

        Assert.Equal("depo-dolu", token.ProjectId);
        Assert.Equal(3, parts.Length);

        var claims = JsonDocument.Parse(FromB64(parts[1])).RootElement;
        Assert.Equal("collector@depo-dolu.iam.gserviceaccount.com", claims.GetProperty("iss").GetString());
        Assert.Equal(3600, claims.GetProperty("exp").GetInt64() - claims.GetProperty("iat").GetInt64());

        bool valid = rsa.VerifyData(Encoding.ASCII.GetBytes($"{parts[0]}.{parts[1]}"), FromB64(parts[2]),
            HashAlgorithmName.SHA256, RSASignaturePadding.Pkcs1);
        Assert.True(valid);
    }

    private static byte[] FromB64(string s)
    {
        s = s.Replace('-', '+').Replace('_', '/');
        return Convert.FromBase64String(s.PadRight(s.Length + (4 - s.Length % 4) % 4, '='));
    }
}
