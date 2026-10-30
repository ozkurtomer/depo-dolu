"""Android/iOS simge, açılış ekranı ve bildirim simgesi kaynaklarını üretir (Python + Pillow).

Çıktılar:
  app/assets/*.png            -> `npx @capacitor/assets generate --android` bu dosyalardan
                                 tüm mipmap ve splash boyutlarını üretir.
  android/.../drawable-*/ic_stat_fuel.png -> bildirim çubuğundaki beyaz pompa simgesi
                                 (toplayıcı FCM mesajında icon = "ic_stat_fuel").

Çizim, Chrome eklentisindeki simgeyle aynı (extension/tools/generate_icons.py).
"""
from pathlib import Path
from PIL import Image, ImageDraw

APP = Path(__file__).resolve().parents[1]
BRAND, ACCENT = '#0e3b4a', '#f2b705'


def pump(draw, ox, oy, s, color):
    """128 birimlik tuvaldeki pompa çizimi; (ox, oy) ofset, s ölçek."""
    def p(x, y): return (ox + x * s, oy + y * s)
    def b(x1, y1, x2, y2): return (*p(x1, y1), *p(x2, y2))
    w = lambda n: max(1, round(n * s))
    draw.rounded_rectangle(b(29, 24, 77, 95), radius=7 * s, outline=color, width=w(5))
    draw.rounded_rectangle(b(39, 35, 67, 57), radius=2 * s, outline=color, width=w(4))
    draw.line([p(22, 103), p(84, 103)], fill=color, width=w(5))
    draw.line([p(77, 60), p(86, 60), p(94, 70), p(94, 87)], fill=color, width=w(5), joint='curve')
    draw.arc(b(92, 80, 110, 98), 0, 180, fill=color, width=w(5))
    draw.line([p(108, 89), p(108, 44), p(98, 34)], fill=color, width=w(5), joint='curve')


def art(size, scale_of_canvas, color, background=None):
    """Pompayı tuvalin ortasına, kenarın scale_of_canvas oranında yerleştirir (4x çizip küçültür)."""
    big = size * 4
    image = Image.new('RGBA', (big, big), background or (0, 0, 0, 0))
    span = big * scale_of_canvas
    s = span / 96                      # çizimin kendisi ~22..110 aralığında: ~88 birim + kalınlık
    ox = big / 2 - 66 * s              # çizimin görsel merkezi (66, 63.5)
    oy = big / 2 - 63.5 * s
    pump(ImageDraw.Draw(image), ox, oy, s, color)
    return image.resize((size, size), Image.Resampling.LANCZOS)


def main():
    assets = APP / 'assets'
    assets.mkdir(exist_ok=True)
    art(1024, 0.62, ACCENT, BRAND).save(assets / 'icon-only.png')
    art(1024, 0.56, ACCENT).save(assets / 'icon-foreground.png')     # uyarlanabilir simge: Android ayrıca %16,7 içeri çeker
    Image.new('RGBA', (1024, 1024), BRAND).save(assets / 'icon-background.png')
    for name in ['splash.png', 'splash-dark.png']:
        splash = Image.new('RGBA', (2732, 2732), BRAND)
        splash.alpha_composite(art(700, 0.62, ACCENT), (1016, 1016))
        splash.save(assets / name)

    res = APP / 'android/app/src/main/res'
    if res.exists():
        for folder, px in {'mdpi': 24, 'hdpi': 36, 'xhdpi': 48, 'xxhdpi': 72, 'xxxhdpi': 96}.items():
            out = res / f'drawable-{folder}'
            out.mkdir(exist_ok=True)
            art(px, 0.86, 'white').save(out / 'ic_stat_fuel.png', optimize=True)
    print('Simge, açılış ekranı ve bildirim simgesi üretildi.')


if __name__ == '__main__':
    main()
