"""Build web exports from reviewed sources without altering the originals.

Requires Pillow. Run from any directory. EXIF/GPS metadata is not copied.
The curation file is deliberately explicit: new uploads need visual review.
"""
from pathlib import Path
import json
from PIL import Image, ImageOps

ROOT = Path(__file__).resolve().parents[1]
curation = json.loads((ROOT / "data/media-curation.json").read_text())
exports = []
for photo in curation["photos"]:
    source = ROOT / photo["source"]
    folder = ROOT / "images/library" / photo["group"]
    folder.mkdir(parents=True, exist_ok=True)
    with Image.open(source) as original:
        image = ImageOps.exif_transpose(original).convert("RGB")
        variants = []
        for requested in (480, 800, 1600):
            width = min(requested, image.width)
            if any(item["width"] == width for item in variants):
                continue
            height = round(image.height * width / image.width)
            filename = f'{photo["name"]}-{width}.webp'
            target = folder / filename
            image.resize((width, height), Image.Resampling.LANCZOS).save(target, "WEBP", quality=80, method=6)
            variants.append({"src": "/" + str(target.relative_to(ROOT)), "width": width, "height": height, "bytes": target.stat().st_size})
        exports.append({**photo, "variants": variants})
        print(photo["id"], flush=True)
(ROOT / "data/media-library.json").write_text(json.dumps({"photos": exports}, indent=2) + "\n")
print(f"Exported {len(exports)} reviewed photographs.")
