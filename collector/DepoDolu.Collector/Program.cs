using DepoDolu.Collector;

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
    var outbox = new NotificationOutbox(sendFile);
    var notifier = CreateNotifier();
    var telegram = CreateTelegram();
    var bot = CreateBot();
    if (dryRun)
    {
        foreach (var batch in outbox.Load())
        {
            await notifier.SendAsync(batch.Changes);
            await telegram.SendAsync(batch.Changes);
            await bot.SendAsync(batch.Changes);
        }
        return 0; // Deneme, bekleyen bildirimleri tüketmez.
    }
    // Ayarlanmamış kanallar atlanır; daha sonra kurulduğunda eski uyarılar yağmaz.
    return await outbox.DispatchAsync(c => notifier.SendAsync([c]), c => telegram.SendAsync(c), c => bot.SendAsync(c)) ? 0 : 1;
}

if (args.Contains("--test"))
{
    var testCity = Arg("--city") ?? "bursa";
    var testFuel = Enum.GetValues<Fuel>().FirstOrDefault(f => f.Key() == (Arg("--fuel") ?? "motorin"));
    var latestNow = new PriceStore(dataDir).LoadLatest();
    if (latestNow is null || !latestNow.Prices.TryGetValue(testCity, out var testInfo))
    {
        Console.Error.WriteLine($"✗ '{testCity}' için fiyat bulunamadı. İl anahtarı doğru mu? (ör. bursa, istanbul-avrupa)");
        return 1;
    }
    var nowPrice = testInfo.Get(testFuel) ?? 50m;
    var sample = new PriceChange(testCity, testInfo.Name, testFuel, nowPrice - 1.00m, nowPrice);
    Console.WriteLine($"🧪 Test bildirimi: {testInfo.Name} {testFuel.DisplayName()} (konu: {sample.Topic})");
    await CreateNotifier().SendAsync([sample], test: true);
    await CreateTelegram().SendAsync([sample], test: true);
    // Bot: abone listesine erişimi dener; deneme mesajı SADECE --chat ile verilen sohbete gider, gerçek abonelere değil.
    long? testChat = long.TryParse(Arg("--chat"), out var parsedChat) ? parsedChat : null;
    await CreateBot().TestAsync([sample], testChat);
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
            new NotificationOutbox(pendingFile).Enqueue(changes);
            foreach (var c in changes)
                Console.WriteLine($"  {c.CityName} {c.Fuel.DisplayName()}: {c.OldPrice} → {c.NewPrice}");
            Console.WriteLine($"  Bildirimler {pendingFile} dosyasına yazıldı (commit sonrası gönderilecek).");
        }
        else
        {
            await CreateNotifier().SendAsync(changes);
            await CreateTelegram().SendAsync(changes);
            await CreateBot().SendAsync(changes);
        }
    }

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

BotNotifier CreateBot() => dryRun
    ? new BotNotifier(http, null, null, null)
    : new BotNotifier(http,
        Environment.GetEnvironmentVariable("TELEGRAM_BOT_TOKEN"),
        Environment.GetEnvironmentVariable("BOT_API_URL"),
        Environment.GetEnvironmentVariable("BOT_API_SECRET"));

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
