using System.Text;
using System.Text.RegularExpressions;

namespace DepoDolu.Collector;

/// <summary>
/// Petrol Ofisi'nin tablodaki il adlarını (ASCII, büyük harf) uygulamadaki
/// kalıcı anahtar (slug) ve düzgün Türkçe ada çevirir.
/// Slug bir kez yayınlandıktan sonra DEĞİŞMEMELİ: kullanıcıların bildirim aboneliği buna bağlı.
/// </summary>
public static partial class Cities
{
    private static readonly Dictionary<string, string> DisplayNames = new()
    {
        ["ISTANBUL (AVRUPA)"] = "İstanbul (Avrupa)",
        ["ISTANBUL (ANADOLU)"] = "İstanbul (Anadolu)",
        ["ANKARA"] = "Ankara", ["IZMIR"] = "İzmir", ["ADANA"] = "Adana", ["ADIYAMAN"] = "Adıyaman",
        ["AFYON"] = "Afyonkarahisar", ["AGRI"] = "Ağrı", ["AKSARAY"] = "Aksaray", ["AMASYA"] = "Amasya",
        ["ANTALYA"] = "Antalya", ["ARDAHAN"] = "Ardahan", ["ARTVIN"] = "Artvin", ["AYDIN"] = "Aydın",
        ["BALIKESIR"] = "Balıkesir", ["BARTIN"] = "Bartın", ["BATMAN"] = "Batman", ["BAYBURT"] = "Bayburt",
        ["BILECIK"] = "Bilecik", ["BINGOL"] = "Bingöl", ["BITLIS"] = "Bitlis", ["BOLU"] = "Bolu",
        ["BURDUR"] = "Burdur", ["BURSA"] = "Bursa", ["CANAKKALE"] = "Çanakkale", ["CANKIRI"] = "Çankırı",
        ["CORUM"] = "Çorum", ["DENIZLI"] = "Denizli", ["DIYARBAKIR"] = "Diyarbakır", ["DUZCE"] = "Düzce",
        ["EDIRNE"] = "Edirne", ["ELAZIG"] = "Elazığ", ["ERZINCAN"] = "Erzincan", ["ERZURUM"] = "Erzurum",
        ["ESKISEHIR"] = "Eskişehir", ["GAZIANTEP"] = "Gaziantep", ["GIRESUN"] = "Giresun",
        ["GUMUSHANE"] = "Gümüşhane", ["HAKKARI"] = "Hakkari", ["HATAY"] = "Hatay", ["IGDIR"] = "Iğdır",
        ["ISPARTA"] = "Isparta", ["KAHRAMANMARAS"] = "Kahramanmaraş", ["KARABUK"] = "Karabük",
        ["KARAMAN"] = "Karaman", ["KARS"] = "Kars", ["KASTAMONU"] = "Kastamonu", ["KAYSERI"] = "Kayseri",
        ["KILIS"] = "Kilis", ["KIRIKKALE"] = "Kırıkkale", ["KIRKLARELI"] = "Kırklareli",
        ["KIRSEHIR"] = "Kırşehir", ["KOCAELI"] = "Kocaeli", ["KONYA"] = "Konya", ["KUTAHYA"] = "Kütahya",
        ["MALATYA"] = "Malatya", ["MANISA"] = "Manisa", ["MARDIN"] = "Mardin", ["MERSIN"] = "Mersin",
        ["MUGLA"] = "Muğla", ["MUS"] = "Muş", ["NEVSEHIR"] = "Nevşehir", ["NIGDE"] = "Niğde",
        ["ORDU"] = "Ordu", ["OSMANIYE"] = "Osmaniye", ["RIZE"] = "Rize", ["SAKARYA"] = "Sakarya",
        ["SAMSUN"] = "Samsun", ["SANLIURFA"] = "Şanlıurfa", ["SIIRT"] = "Siirt", ["SINOP"] = "Sinop",
        ["SIRNAK"] = "Şırnak", ["SIVAS"] = "Sivas", ["TEKIRDAG"] = "Tekirdağ", ["TOKAT"] = "Tokat",
        ["TRABZON"] = "Trabzon", ["TUNCELI"] = "Tunceli", ["USAK"] = "Uşak", ["VAN"] = "Van",
        ["YALOVA"] = "Yalova", ["YOZGAT"] = "Yozgat", ["ZONGULDAK"] = "Zonguldak",
    };

    /// <summary>Tablodaki toplam satır sayısı (81 il, İstanbul iki yaka = 82).</summary>
    public static int ExpectedCount => DisplayNames.Count;

    /// <summary>"Bursa" / "BURSA" / "İstanbul (Avrupa)" → "BURSA" / "ISTANBUL (AVRUPA)".</summary>
    public static string NormalizeKey(string raw)
    {
        var sb = new StringBuilder(raw.Length);
        foreach (var ch in raw.Trim())
        {
            sb.Append(ch switch
            {
                'İ' or 'ı' or 'i' => 'I',
                'Ş' or 'ş' => 'S',
                'Ğ' or 'ğ' => 'G',
                'Ü' or 'ü' => 'U',
                'Ö' or 'ö' => 'O',
                'Ç' or 'ç' => 'C',
                _ => char.ToUpperInvariant(ch)
            });
        }
        return Whitespace().Replace(sb.ToString(), " ");
    }

    /// <summary>"ISTANBUL (AVRUPA)" → "istanbul-avrupa", "SANLIURFA" → "sanliurfa".</summary>
    public static string ToSlug(string normalizedKey)
    {
        var lower = normalizedKey.ToLowerInvariant();
        var slug = NonAlnum().Replace(lower, "-").Trim('-');
        return slug;
    }

    public static (string Slug, string Name) Resolve(string rawCityName)
    {
        var key = NormalizeKey(rawCityName);
        var name = DisplayNames.TryGetValue(key, out var display)
            ? display
            : TitleCase(key);
        return (ToSlug(key), name);
    }

    // Bilinmeyen (yeni eklenmiş) bir il adı için yedek: "YENI IL" → "Yeni Il".
    private static string TitleCase(string key) =>
        string.Join(' ', key.ToLowerInvariant().Split(' ', StringSplitOptions.RemoveEmptyEntries)
            .Select(w => char.ToUpperInvariant(w[0]) + w[1..]));

    public static bool IsKnown(string rawCityName) => DisplayNames.ContainsKey(NormalizeKey(rawCityName));

    [GeneratedRegex(@"\s+")]
    private static partial Regex Whitespace();

    [GeneratedRegex(@"[^a-z0-9]+")]
    private static partial Regex NonAlnum();
}
