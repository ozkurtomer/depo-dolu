using System.Text.Json;

namespace DepoDolu.Collector;

/// <summary>Yalnızca herkese açık fiyat değişikliklerini ve teslim durumlarını saklar.</summary>
public sealed class NotificationBatch
{
    public string Id { get; set; } = Guid.NewGuid().ToString("N");
    public List<PriceChange> Changes { get; set; } = [];
    public HashSet<string> FcmDelivered { get; set; } = [];
    public bool TelegramDelivered { get; set; }
}

public sealed class NotificationOutbox(string path)
{
    private static readonly JsonSerializerOptions Json = new() { WriteIndented = true };

    public List<NotificationBatch> Load() => File.Exists(path)
        ? JsonSerializer.Deserialize<List<NotificationBatch>>(File.ReadAllText(path), Json) ?? []
        : [];

    public void Enqueue(IReadOnlyList<PriceChange> changes)
    {
        if (changes.Count == 0) return;
        var batches = Load();
        batches.Add(new NotificationBatch { Changes = changes.ToList() });
        Save(batches);
    }

    public void Save(List<NotificationBatch> batches)
    {
        var fullPath = Path.GetFullPath(path);
        Directory.CreateDirectory(Path.GetDirectoryName(fullPath)!);
        var temporary = fullPath + ".tmp";
        File.WriteAllText(temporary, JsonSerializer.Serialize(batches, Json) + "\n");
        File.Move(temporary, fullPath, overwrite: true);
    }

    /// <summary>Başarısız teslimler kalır. Kanallar ve FCM konuları bağımsız ilerler.</summary>
    public async Task<bool> DispatchAsync(
        Func<PriceChange, Task> sendFcm,
        Func<IReadOnlyList<PriceChange>, Task> sendTelegram)
    {
        var batches = Load();
        bool succeeded = true;
        foreach (var batch in batches)
        {
            foreach (var change in batch.Changes.Where(c => !batch.FcmDelivered.Contains(c.Topic)))
            {
                try
                {
                    await sendFcm(change);
                    batch.FcmDelivered.Add(change.Topic);
                    Save(batches);
                }
                catch (Exception ex) when (ex is HttpRequestException or TaskCanceledException)
                {
                    Console.Error.WriteLine($"  ! {change.Topic}: {ex.Message}");
                    succeeded = false;
                }
            }

            if (!batch.TelegramDelivered)
            {
                try
                {
                    await sendTelegram(batch.Changes);
                    batch.TelegramDelivered = true;
                    Save(batches);
                }
                catch (Exception ex) when (ex is HttpRequestException or TaskCanceledException)
                {
                    Console.Error.WriteLine($"  ! Telegram: {ex.Message}");
                    succeeded = false;
                }
            }
        }

        batches.RemoveAll(b => b.TelegramDelivered && b.Changes.All(c => b.FcmDelivered.Contains(c.Topic)));
        Save(batches);
        return succeeded;
    }
}
