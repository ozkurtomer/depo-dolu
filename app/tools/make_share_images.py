"""Her il ve yakıt için paylaşım görseli (1200x630 PNG) üretir.

WhatsApp, Telegram ve X il sayfasını paylaşınca bu görseli gösterir:
"Bursa · Motorin · 44,12 ₺/L · ▲ 0,85 ₺". prerender.mjs görsel varsa sayfaya bağlar.

    python tools/make_share_images.py --data ../data --out dist/browser/og

Tek bağımlılık Pillow. Yazı tipi uygulamanın kendi Barlow dosyalarıdır (node_modules/@fontsource).
"""
import argparse
import json
from datetime import datetime, timedelta, timezone
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

FUELS = [('benzin', 'Benzin'), ('motorin', 'Motorin'), ('lpg', 'LPG')]
W, H = 1200, 630
BRAND, BRAND_SOFT, LINE = '#0e3b4a', '#164a59', '#286070'
INK_SOFT, ACCENT, UP, DOWN = '#d4e4e8', '#f2b705', '#ffb4a2', '#9fe2bf'

APP = Path(__file__).resolve().parents[1]
FONT_DIRS = [APP / 'node_modules/@fontsource/barlow/files', APP / 'node_modules/@fontsource/barlow-condensed/files']
FALLBACKS = [Path('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf'), Path('C:/Windows/Fonts/arialbd.ttf')]


class Font:
    """Fontsource yazı tipini alt kümelere böler (latin, latin-ext). Pillow tek dosya okur;
    bu sınıf her karakteri onu içeren dosyayla çizer. Barlow yoksa sistem yazı tipine düşer."""

    def __init__(self, family, weight, size):
        names = [f'{family}-{subset}-{weight}-normal.woff' for subset in ('latin', 'latin-ext')]
        paths = [folder / n for folder in FONT_DIRS for n in names if (folder / n).exists()]
        paths += [p for p in FALLBACKS if p.exists()]
        if not paths:
            raise FileNotFoundError('Barlow (npm ci) ya da DejaVu Sans gerekli.')
        self.faces = [ImageFont.truetype(str(p), size) for p in paths]
        self.missing = [bytes(f.getmask('')) for f in self.faces]

    def face(self, char):
        if char.isspace():
            return self.faces[0]
        for face, missing in zip(self.faces, self.missing):
            if bytes(face.getmask(char)) != missing:
                return face
        return None

    def has(self, char):
        return self.face(char) is not None

    def runs(self, text):
        out = []
        for char in text:
            face = self.face(char) or self.faces[0]
            if out and out[-1][0] is face:
                out[-1][1] += char
            else:
                out.append([face, char])
        return out

    def length(self, draw, text):
        return sum(draw.textlength(t, font=f) for f, t in self.runs(text))

    def draw(self, draw, xy, text, fill):
        x, y = xy
        for face, chunk in self.runs(text):
            draw.text((x, y), chunk, font=face, fill=fill)
            x += draw.textlength(chunk, font=face)


def money(value):
    whole, frac = f'{value:,.2f}'.split('.')
    return f"{whole.replace(',', '.')},{frac}"


def last_move(history, fuel):
    """Bu yakıtın son fiyat değişimi: (fark, tarih) ya da None."""
    prices = []
    for row in history:
        price = row.get(fuel)
        if isinstance(price, (int, float)) and (not prices or prices[-1][0] != price):
            prices.append((price, row['at']))
    if len(prices) < 2:
        return None
    return prices[-1][0] - prices[-2][0], prices[-1][1]


def tr_date(iso):
    months = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık']
    d = datetime.fromisoformat(iso.replace('Z', '+00:00')).astimezone(timezone(timedelta(hours=3)))
    return f'{d.day} {months[d.month - 1]} {d.year}'


def render(city, fuel_label, price, move, rank, total, fonts, currency):
    image = Image.new('RGB', (W, H), BRAND)
    draw = ImageDraw.Draw(image)
    draw.ellipse((820, -220, 1460, 420), fill=BRAND_SOFT)

    fonts['label'].draw(draw, (72, 64), 'DEPO DOLU', ACCENT)
    fonts['city'].draw(draw, (72, 104), city, 'white')
    fonts['sub'].draw(draw, (76, 222), f'{fuel_label} litre fiyatı', INK_SOFT)

    value = money(price)
    fonts['price'].draw(draw, (68, 262), value, 'white')
    width = fonts['price'].length(draw, value)
    fonts['unit'].draw(draw, (68 + width + 18, 356), f'{currency}/L', INK_SOFT)

    if move:
        delta, at = move
        up = delta > 0
        arrow = ('▲' if up else '▼') if fonts['move'].has('▲') else ('+' if up else '−')
        fonts['move'].draw(draw, (76, 472), f'{arrow} {money(abs(delta))} {currency}  ·  {tr_date(at)}', UP if up else DOWN)

    draw.line([(72, 540), (W - 72, 540)], fill=LINE, width=2)
    fonts['foot'].draw(draw, (76, 562), 'Petrol Ofisi il liste fiyatı · KDV dahil', INK_SOFT)
    rank_text = f'Ucuzluk sırası: {rank} / {total}'
    fonts['foot'].draw(draw, (W - 76 - fonts['foot'].length(draw, rank_text), 562), rank_text, ACCENT)
    return image


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--data', default='../data')
    parser.add_argument('--out', default='dist/browser/og')
    args = parser.parse_args()

    data = Path(args.data)
    out = Path(args.out)
    out.mkdir(parents=True, exist_ok=True)
    latest = json.loads((data / 'latest.json').read_text(encoding='utf-8'))

    fonts = {
        'label': Font('barlow', 700, 28),
        'city': Font('barlow-condensed', 700, 96),
        'sub': Font('barlow', 600, 36),
        'price': Font('barlow-condensed', 700, 190),
        'unit': Font('barlow', 600, 56),
        'move': Font('barlow', 700, 36),
        'foot': Font('barlow', 600, 26),
    }
    # Barlow'da ₺ yoksa "TL" yaz; boş kutu paylaşımda kötü görünür.
    currency = '₺' if all(fonts[k].has('₺') for k in ('unit', 'move', 'foot')) else 'TL'

    count = 0
    for slug, city in latest['prices'].items():
        history_path = data / 'history' / f'{slug}.json'
        history = json.loads(history_path.read_text(encoding='utf-8')) if history_path.exists() else []
        for key, label in FUELS:
            price = city.get(key)
            if not isinstance(price, (int, float)):
                continue
            all_prices = [c[key] for c in latest['prices'].values() if isinstance(c.get(key), (int, float))]
            rank = sum(1 for p in all_prices if p < price) + 1
            image = render(city['name'], label, price, last_move(history, key), rank, len(all_prices), fonts, currency)
            image.save(out / f'{slug}-{key}.png', optimize=True)
            count += 1
    print(f'{count} paylaşım görseli yazıldı ({out}), para birimi: {currency}')


if __name__ == '__main__':
    main()
