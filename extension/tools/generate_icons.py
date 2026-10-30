"""Optional icon regeneration: Python + Pillow. Existing Depo Dolu brand, no remote assets."""
from pathlib import Path
from PIL import Image, ImageDraw

root = Path(__file__).resolve().parents[1]
scale = 4
image = Image.new('RGBA', (128 * scale, 128 * scale))
draw = ImageDraw.Draw(image)
def box(coords): return tuple(int(n * scale) for n in coords)
draw.rounded_rectangle(box((0, 0, 128, 128)), radius=28 * scale, fill='#0e3b4a')
draw.rounded_rectangle(box((29, 24, 77, 95)), radius=7 * scale, outline='#f2b705', width=5 * scale)
draw.rounded_rectangle(box((39, 35, 67, 57)), radius=2 * scale, outline='#f2b705', width=4 * scale)
draw.line([box((22, 103)), box((84, 103))], fill='#f2b705', width=5 * scale)
draw.line([box((77, 60)), box((86, 60)), box((94, 70)), box((94, 87))], fill='#f2b705', width=5 * scale)
draw.arc(box((92, 80, 110, 98)), 0, 180, fill='#f2b705', width=5 * scale)
draw.line([box((108, 89)), box((108, 44)), box((98, 34))], fill='#f2b705', width=5 * scale)
for size in [16, 32, 48, 128]:
    image.resize((size, size), Image.Resampling.LANCZOS).save(root / f'icons/icon-{size}.png', optimize=True)
print('Generated local 16/32/48/128px PNG icons')
