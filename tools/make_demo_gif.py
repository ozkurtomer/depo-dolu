#!/usr/bin/env python3
"""docs/demo.gif dosyasını canlı web uygulamasından yeniden üretir.

Gerekenler: Google Chrome (ya da Chromium) ve Pillow (`pip install pillow`).

    python3 tools/make_demo_gif.py
    python3 tools/make_demo_gif.py --url http://localhost:4300/ --lang en-US --out /tmp/demo-en.gif

Önce dört farklı il/yakıt kartını gösterir, sonra sayfayı aşağı kaydırır.
Fiyatlar çekildiği günün fiyatlarıdır; zamdan sonra yeniden üretmek gerekir.
"""
import argparse
import os
import shutil
import subprocess
import sys
import tempfile

try:
    from PIL import Image
except ImportError:
    sys.exit("Pillow gerekli: pip install pillow")

CHROME_CANDIDATES = [
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "google-chrome", "google-chrome-stable", "chromium", "chromium-browser", "chrome",
]
SELECTIONS = ["bursa&yakit=motorin", "istanbul-avrupa&yakit=benzin", "izmir&yakit=lpg", "ankara&yakit=benzin"]
WIDTH, HEIGHT = 360, 648   # çıktı boyutu
SCROLL_STEPS = 26


def find_chrome(explicit):
    for candidate in ([explicit] if explicit else CHROME_CANDIDATES):
        if candidate and (os.path.exists(candidate) or shutil.which(candidate)):
            return candidate
    sys.exit("Chrome bulunamadı; --chrome ile yolunu ver.")


def shot(chrome, url, out, window_height, lang):
    # Başsız Chrome en az ~500 px genişlik açar; mobil düzen bu genişlikte de çalışır.
    subprocess.run(
        [chrome, "--headless=new", "--disable-gpu", "--hide-scrollbars", f"--lang={lang}",
         f"--window-size=500,{window_height}", "--force-device-scale-factor=2",
         "--virtual-time-budget=12000", f"--screenshot={out}", url],
        check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL,
    )


def fit(image):
    return image.convert("RGB").resize((WIDTH, HEIGHT), Image.LANCZOS)


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--url", default="https://ozkurtomer.github.io/depo-dolu/")
    parser.add_argument("--out", default=os.path.join(os.path.dirname(__file__), "..", "docs", "demo.gif"))
    parser.add_argument("--chrome")
    parser.add_argument("--lang", default="tr-TR", help="Tarayıcı dili (tr-TR ya da en-US)")
    args = parser.parse_args()

    chrome = find_chrome(args.chrome)
    base = args.url.rstrip("/") + "/"
    view_height = int(HEIGHT / WIDTH * 1000)  # kaynak piksel (2x)
    frames, durations = [], []

    with tempfile.TemporaryDirectory() as tmp:
        for i, selection in enumerate(SELECTIONS):
            path = os.path.join(tmp, f"f{i}.png")
            shot(chrome, f"{base}?il={selection}", path, 900, args.lang)
            frames.append(fit(Image.open(path).crop((0, 0, 1000, view_height))))
            durations.append(1300)

        tall_path = os.path.join(tmp, "tall.png")
        shot(chrome, f"{base}?il={SELECTIONS[0]}", tall_path, 2400, args.lang)
        tall = Image.open(tall_path)
        max_y = tall.size[1] - view_height
        for i in range(SCROLL_STEPS + 1):
            y = int(max_y * i / SCROLL_STEPS)
            frames.append(fit(tall.crop((0, y, 1000, y + view_height))))
            durations.append(1200 if i == 0 else 1600 if i == SCROLL_STEPS else 140)

    palette = [f.quantize(colors=96, method=Image.MEDIANCUT, dither=Image.NONE) for f in frames]
    out = os.path.abspath(args.out)
    palette[0].save(out, save_all=True, append_images=palette[1:], duration=durations, loop=0, optimize=True, disposal=1)
    print(f"{out}: {os.path.getsize(out) // 1024} KB, {len(frames)} kare")


if __name__ == "__main__":
    main()
