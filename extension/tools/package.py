"""Create a local unpacked-extension archive; does not publish or install anything."""
from pathlib import Path
import json
from zipfile import ZipFile, ZIP_DEFLATED

root = Path(__file__).resolve().parents[1]
version = json.loads((root / 'manifest.json').read_text(encoding='utf-8'))['version']
destination = root / 'dist' / f'depo-dolu-chrome-{version}.zip'
destination.parent.mkdir(parents=True, exist_ok=True)
allowed = ['manifest.json', 'popup.html', 'devtools.html', 'src', 'styles', 'icons', 'fonts', 'fixtures', 'README.md', 'PRIVACY.md']
with ZipFile(destination, 'w', ZIP_DEFLATED) as archive:
    for name in allowed:
        path = root / name
        for file in sorted(path.rglob('*')) if path.is_dir() else [path]:
            if file.is_file(): archive.write(file, file.relative_to(root).as_posix())
print(destination)
