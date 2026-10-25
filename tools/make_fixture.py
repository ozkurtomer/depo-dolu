"""
Petrol Ofisi sayfasını taklit eden bir test HTML'i üretir.

    python3 tools/make_fixture.py tools/po-snapshot-2026-10-25.tsv > collector/DepoDolu.Collector.Tests/Fixtures/po-2026-10-25.html

Girdi: sekmeyle ayrılmış "İL  BENZİN  MOTORİN  LPG" satırları (KDV dahil).
Çıktı: başlıkları ve hücre biçimi gerçek sayfadakiyle aynı olan bir tablo
("76.30 63.59 TL/LT +KDV" → ilk sayı KDV dahil, ikincisi KDV hariç).

İpucu: Gerçek sayfanın HTML'ini kaydedip (tarayıcı → Farklı Kaydet) Fixtures klasörüne
koyarsanız testler gerçek yapıya karşı da çalışır.
"""
import sys

def cell(price: float, unit: str = "TL/LT") -> str:
    without_tax = price / 1.2
    return (f'<td><span class="with-tax">{price:.2f}</span> '
            f'<span class="without-tax" style="display:none">{without_tax:.2f}</span> '
            f'{unit} <small>+KDV</small></td>')

rows = []
for line in open(sys.argv[1], encoding="utf-8"):
    line = line.strip()
    if not line:
        continue
    name, benzin, motorin, lpg = line.split("\t")
    b, m, l = float(benzin), float(motorin), float(lpg)
    rows.append(
        f"<tr><td>{name}</td>{cell(b)}{cell(m)}{cell(m + 5.5)}"
        f"{cell(b - 5, 'TL/KG')}{cell(b - 21, 'TL/KG')}{cell(l)}</tr>")

print(f"""<!DOCTYPE html>
<html lang="tr"><head><meta charset="utf-8"><title>Akaryakıt Fiyatları | Petrol Ofisi</title></head>
<body>
<table class="footer-links"><tr><td>Kurumsal</td><td>İstasyonlar</td></tr></table>
<div class="fuel-prices">
<table class="table table-prices">
<thead><tr>
<th>Şehir</th><th>V/Max Kurşunsuz 95</th><th>V/Max Diesel</th><th>Gazyağı</th>
<th>Kalorifer Yakıtı</th><th>Fuel Oil</th><th>PO/gaz Otogaz</th>
</tr></thead>
<tbody>
{chr(10).join(rows)}
</tbody>
</table>
</div>
</body></html>""")
