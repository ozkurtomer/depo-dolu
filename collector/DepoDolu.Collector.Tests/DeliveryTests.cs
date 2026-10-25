using System.Net;
using System.Security.Cryptography;
using System.Text.Json;
using DepoDolu.Collector;
using Xunit;

namespace DepoDolu.Collector.Tests;

public sealed class DeliveryTests
{
    private static readonly PriceChange Change = new("bursa", "Bursa", Fuel.Motorin, 97.80m, 99.10m);

    [Fact]
    public async Task Telegram_http_hatasi_basari_sayilmaz()
    {
        using var http = new HttpClient(new StubHandler(_ => new(HttpStatusCode.InternalServerError)));
        await Assert.ThrowsAsync<HttpRequestException>(() => new TelegramNotifier(http, "test", "test").SendAsync([Change]));
    }

    [Fact]
    public async Task Fcm_http_hatasi_basari_sayilmaz()
    {
        using var rsa = RSA.Create(2048);
        var account = JsonSerializer.Serialize(new
        {
            project_id = "test", client_email = "test@example.invalid",
            private_key = rsa.ExportPkcs8PrivateKeyPem()
        });
        using var http = new HttpClient(new StubHandler(req => req.RequestUri!.Host == "oauth2.googleapis.com"
            ? new(HttpStatusCode.OK) { Content = new StringContent("{\"access_token\":\"test\",\"expires_in\":3600}") }
            : new(HttpStatusCode.ServiceUnavailable)));
        await Assert.ThrowsAsync<HttpRequestException>(() => new FcmNotifier(http, account).SendAsync([Change]));
    }

    private sealed class StubHandler(Func<HttpRequestMessage, HttpResponseMessage> respond) : HttpMessageHandler
    {
        protected override Task<HttpResponseMessage> SendAsync(HttpRequestMessage req, CancellationToken ct) => Task.FromResult(respond(req));
    }
}
