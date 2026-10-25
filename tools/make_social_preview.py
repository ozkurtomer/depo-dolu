"""Render the repository's code-native social cover. Optional dependency: Pillow."""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

root = Path(__file__).resolve().parents[1]
font_dir = Path('C:/Windows/Fonts')
if not font_dir.exists():
    font_dir = Path('/usr/share/fonts/truetype/dejavu')

def font(size, bold=False):
    names = ['arialbd.ttf', 'DejaVuSans-Bold.ttf'] if bold else ['arial.ttf', 'DejaVuSans.ttf']
    for name in names:
        if (font_dir / name).exists():
            return ImageFont.truetype(str(font_dir / name), size)
    raise FileNotFoundError('Install Arial or DejaVu Sans to regenerate this optional asset.')

image = Image.new('RGB', (1280, 640), '#0e3b4a')
draw = ImageDraw.Draw(image)
draw.ellipse((840, -190, 1480, 450), fill='#164a59')
draw.ellipse((918, -112, 1402, 372), outline='#286070', width=2)
draw.text((74, 62), 'OPEN SOURCE  /  OPEN DATA', font=font(19, True), fill='#f2b705')
draw.text((68, 126), 'Depo Dolu', font=font(102, True), fill='white')
draw.text((76, 263), 'Fuel prices across Turkey', font=font(36), fill='#d4e4e8')
draw.text((76, 320), 'Check a price. Calculate a tank. Build with the API.', font=font(24), fill='#d4e4e8')
for x, width, text in [(76, 190, '81 provinces'), (282, 146, '3 fuels'), (444, 188, 'JSON API')]:
    draw.rounded_rectangle((x, 399, x + width, 451), radius=26, fill='#214d5a')
    draw.text((x + 22, 413), text, font=font(20, True), fill='white')
draw.rounded_rectangle((982, 175, 1100, 365), radius=16, outline='#f2b705', width=7)
draw.rounded_rectangle((1002, 197, 1080, 263), radius=5, outline='#f2b705', width=6)
draw.line([(972, 386), (1111, 386)], fill='#f2b705', width=7)
draw.line([(1101, 263), (1128, 263), (1146, 286), (1146, 354)], fill='#f2b705', width=7)
draw.arc((1143, 337, 1190, 379), 0, 180, fill='#f2b705', width=7)
draw.line([(1187, 357), (1187, 233), (1163, 207)], fill='#f2b705', width=7)
draw.line([(76, 516), (1204, 516)], fill='#286070', width=1)
draw.text((76, 551), 'github.com/ozkurtomer/depo-dolu', font=font(22), fill='#d4e4e8')
draw.text((976, 551), 'MIT LICENSE', font=font(19, True), fill='#f2b705')
image.save(root / 'docs/social-preview.png', optimize=True)
image.save(root / 'app/public/social-preview.png', optimize=True)
print('Generated docs/social-preview.png and app/public/social-preview.png (1280x640)')
