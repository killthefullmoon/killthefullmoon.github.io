#!/usr/bin/env python3
"""Download a small cover for every album embedded in misc/music.html.

Covers are saved as images/thumbs/albums/<spotify-album-id>.jpg, which the
My Life game (js/my_life.js) loads first. Albums that already have a cover
are skipped, so re-run this after adding albums to music.html.

    python3 tools/fetch_album_covers.py
"""
import io
import json
import pathlib
import re
import urllib.parse
import urllib.request

from PIL import Image

ROOT = pathlib.Path(__file__).resolve().parent.parent
OUT = ROOT / 'images' / 'thumbs' / 'albums'
SIZE = 160  # px; the sleeve is drawn at ~40 css px, so this stays sharp when zoomed in on retina


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    html = (ROOT / 'misc' / 'music.html').read_text(encoding='utf-8')
    ids = list(dict.fromkeys(re.findall(r'open\.spotify\.com/embed/album/([A-Za-z0-9]+)', html)))
    fetched = 0
    for album_id in ids:
        dst = OUT / f'{album_id}.jpg'
        if dst.exists():
            continue
        url = 'https://open.spotify.com/oembed?url=' + urllib.parse.quote(f'https://open.spotify.com/album/{album_id}')
        with urllib.request.urlopen(url, timeout=20) as r:
            thumb = json.load(r)['thumbnail_url']
        with urllib.request.urlopen(thumb, timeout=20) as r:
            img = Image.open(io.BytesIO(r.read())).convert('RGB')
        img.thumbnail((SIZE, SIZE), Image.LANCZOS)
        img.save(dst, 'JPEG', quality=82, optimize=True, progressive=True)
        fetched += 1
        print('saved', dst.relative_to(ROOT))
    print(f'{len(ids)} albums, {fetched} new covers')


if __name__ == '__main__':
    main()
