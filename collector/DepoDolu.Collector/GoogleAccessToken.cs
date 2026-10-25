using System.Security.Cryptography;
using System.Text;
using System.Text.Json;

namespace DepoDolu.Collector;

/// <summary>
/// Google servis hesabı JSON'undan OAuth2 erişim belirteci (access token) üretir.
/// Google.Apis.Auth paketinin yaptığını ~50 satırda yapar: RS256 imzalı bir JWT oluşturup
/// token adresine gönderir. Belirteç 1 saat geçerli; süresi dolmadan önbellekten verilir.
/// </summary>
public sealed class GoogleAccessToken
{
    private readonly HttpClient _http;
    private readonly string _clientEmail;
    private readonly string _privateKeyPem;
    private readonly string _tokenUri;
    private readonly string _scope;

    private string? _token;
    private DateTimeOffset _expiresAt;

    public string ProjectId { get; }

    public GoogleAccessToken(HttpClient http, string serviceAccountJson, string scope)
    {
        _http = http;
        _scope = scope;
        using var doc = JsonDocument.Parse(serviceAccountJson);
        var root = doc.RootElement;
        ProjectId = root.GetProperty("project_id").GetString()!;
        _clientEmail = root.GetProperty("client_email").GetString()!;
        _privateKeyPem = root.GetProperty("private_key").GetString()!;
        _tokenUri = root.TryGetProperty("token_uri", out var uri) ? uri.GetString()! : "https://oauth2.googleapis.com/token";
    }

    public async Task<string> GetAsync(CancellationToken ct = default)
    {
        if (_token is not null && DateTimeOffset.UtcNow < _expiresAt.AddMinutes(-2))
            return _token;

        var assertion = CreateJwt(DateTimeOffset.UtcNow);
        using var res = await _http.PostAsync(_tokenUri, new FormUrlEncodedContent(new Dictionary<string, string>
        {
            ["grant_type"] = "urn:ietf:params:oauth:grant-type:jwt-bearer",
            ["assertion"] = assertion
        }), ct);

        var body = await res.Content.ReadAsStringAsync(ct);
        if (!res.IsSuccessStatusCode)
            throw new HttpRequestException($"Google token alınamadı ({(int)res.StatusCode}): {body}");

        using var json = JsonDocument.Parse(body);
        _token = json.RootElement.GetProperty("access_token").GetString()!;
        _expiresAt = DateTimeOffset.UtcNow.AddSeconds(json.RootElement.GetProperty("expires_in").GetInt32());
        return _token;
    }

    internal string CreateJwt(DateTimeOffset now)
    {
        var header = new { alg = "RS256", typ = "JWT" };
        var claims = new
        {
            iss = _clientEmail,
            scope = _scope,
            aud = _tokenUri,
            iat = now.ToUnixTimeSeconds(),
            exp = now.AddHours(1).ToUnixTimeSeconds()
        };

        var unsigned = $"{B64(JsonSerializer.SerializeToUtf8Bytes(header))}.{B64(JsonSerializer.SerializeToUtf8Bytes(claims))}";

        using var rsa = RSA.Create();
        rsa.ImportFromPem(_privateKeyPem);
        var signature = rsa.SignData(Encoding.ASCII.GetBytes(unsigned), HashAlgorithmName.SHA256, RSASignaturePadding.Pkcs1);
        return $"{unsigned}.{B64(signature)}";
    }

    private static string B64(byte[] bytes) =>
        Convert.ToBase64String(bytes).TrimEnd('=').Replace('+', '-').Replace('/', '_');
}
