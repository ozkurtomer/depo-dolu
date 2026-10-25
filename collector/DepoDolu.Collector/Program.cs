using DepoDolu.Collector;

// Kullanım:
//   dotnet run -- [--data data] [--html dosya.html] [--pending degisiklikler.json] [--dry-run]
//   dotnet run -- --send degisiklikler.json
//
//   --data     Fiyat dosyalarının yazılacağı klasör (varsayılan: ./data)
//   --html     Siteyi çekmek yerine yerel bir HTML dosyası kullan (test için)
//   --pending  Bildirimleri hemen gönderme, bu dosyaya yaz (GitHub Actions: önce commit, sonra bildirim)
//   --send     Daha önce --pending ile yazılmış bildirimleri gönder
//   --readme   Veri değişince bu README'deki canlı fiyat tablosunu güncelle
//   --force-readme  Veri değişmese de README tablosunu yeniden yaz
//   --dry-run  Bildirim gönderme, sadece ne gönderileceğini yaz
//
// Ortam değişkeni:
//   FIREBASE_SERVICE_ACCOUNT  Firebase servis hesabı JSON içeriği (yoksa otomatik dry-run)
//   TELEGRAM_BOT_TOKEN        Telegram bot anahtarı (BotFather'dan)
//   TELEGRAM_CHAT_ID          Kanal adı, ör. @depodolu (bot kanala yönetici olarak eklenmeli)

string dataDir = Arg("--data") ?? "data";
string? htmlFile = Arg("--html");
string? pendingFile = Arg("--pending");
string? sendFile = Arg("--send");
string? readmePath = Arg("--readme");
bool dryRun = args.Contains("--dry-run");

using var http = new HttpClient { Timeout = TimeSpan.FromSeconds(30) };
http.DefaultRequestHeaders.UserAgent.ParseAdd("Mozilla/5.0 (compatible; DepoDolu/1.0; akaryakit fiyat bildirimi)");
http.DefaultRequestHeaders.AcceptLanguage.ParseAdd("tr-TR,tr;q=0.9");

if (sendFile is not null)
{
    var pending = System.Text.Json.JsonSerializer.Deserialize<List<PriceChange>>(await File.ReadAllTextAsync(sendFile)) ?? [];
    Console.WriteLine($"{pending.Count} bildirim gönderiliyor:");
    await CreateNotifier().SendAsync(pending);
    await CreateTelegram().SendAsync(pending);
    return 0;
}

try
{
    var html = htmlFile is not null
        ? await File.ReadAllTextAsync(htmlFile)
        : await FetchWithRetryAsync(http, PoParser.SourceUrl);

    var current = PoParser.Parse(html);
    Console.WriteLine($"✓ {current.Count} il okundu.");

    var store = new PriceStore(dataDir);
    var previous = store.LoadLatest();
    var changes = PriceStore.Diff(previous, current);

    PriceStore.Validate(current, changes);

    var now = DateTimeOffset.FromUnixTimeSeconds(DateTimeOffset.UtcNow.ToUnixTimeSeconds()); // saniyeye yuvarla
    bool wrote = store.Save(previous, current, changes, now);

    // Veri değiştiyse README'deki canlı tabloyu da güncelle.
    if (readmePath is not null && (wrote || args.Contains("--force-readme")))
    {
        int updated = ReadmeUpdater.UpdateAll(readmePath, dataDir, now);
        if (updated > 0)
        {
            Console.WriteLine($"✓ README tablosu güncellendi ({updated} dosya).");
            wrote = true;
        }
    }

    if (previous is null)
        Console.WriteLine("İlk çalıştırma: başlangıç verisi yazıldı, bildirim gönderilmedi.");
    else if (changes.Count == 0)
        Console.WriteLine("Fiyat değişikliği yok.");
    else
    {
        Console.WriteLine($"✓ {changes.Count} değişiklik bulundu.");
        if (pendingFile is not null)
        {
            await File.WriteAllTextAsync(pendingFile, System.Text.Json.JsonSerializer.Serialize(changes));
            foreach (var c in changes)
                Console.WriteLine($"  {c.CityName} {c.Fuel.DisplayName()}: {c.OldPrice} → {c.NewPrice}");
            Console.WriteLine($"  Bildirimler {pendingFile} dosyasına yazıldı (commit sonrası gönderilecek).");
        }
        else
        {
            await CreateNotifier().SendAsync(changes);
            await CreateTelegram().SendAsync(changes);
        }
    }

    // GitHub Actions bu çıktıya bakarak commit atıp atmayacağına karar verir.
    if (Environment.GetEnvironmentVariable("GITHUB_OUTPUT") is { } output)
        await File.AppendAllTextAsync(output, $"changed={(wrote ? "true" : "false")}\nchange_count={changes.Count}\n");

    return 0;
}
catch (Exception ex) when (ex is ParseException or ValidationException)
{
    Console.Error.WriteLine($"✗ Veri güvenilir değil, hiçbir şey yazılmadı: {ex.Message}");
    return 2;
}
catch (HttpRequestException ex)
{
    Console.Error.WriteLine($"✗ Siteye ulaşılamadı: {ex.Message}");
    return 3;
}

FcmNotifier CreateNotifier()
{
    var serviceAccount = dryRun ? null : Environment.GetEnvironmentVariable("FIREBASE_SERVICE_ACCOUNT");
    var notifier = new FcmNotifier(http, serviceAccount);
    if (notifier.IsDryRun) Console.WriteLine("  (dry-run: bildirim gönderilmiyor, sadece yazılıyor)");
    return notifier;
}

TelegramNotifier CreateTelegram() => dryRun
    ? new TelegramNotifier(http, null, null)
    : new TelegramNotifier(http,
        Environment.GetEnvironmentVariable("TELEGRAM_BOT_TOKEN"),
        Environment.GetEnvironmentVariable("TELEGRAM_CHAT_ID"));

string? Arg(string name)
{
    int i = Array.IndexOf(args, name);
    return i >= 0 && i + 1 < args.Length ? args[i + 1] : null;
}

static async Task<string> FetchWithRetryAsync(HttpClient http, string url)
{
    for (int attempt = 1; ; attempt++)
    {
        try
        {
            return await http.GetStringAsync(url);
        }
        catch (Exception ex) when (attempt < 3 && ex is HttpRequestException or TaskCanceledException)
        {
            Console.WriteLine($"  deneme {attempt} başarısız ({ex.Message}), tekrar deneniyor…");
            await Task.Delay(TimeSpan.FromSeconds(5 * attempt));
        }
    }
}
