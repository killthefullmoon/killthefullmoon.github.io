#!/usr/bin/env python3
"""Build the country and Chinese province outlines + label points for My Life's world map.

Writes, in the same shape as data/us-states.json (FeatureCollection; properties
name + coords [lat, lng] for the label):
  data/countries.json        Natural Earth 1:110m admin-0 countries
  data/china-provinces.json  Natural Earth 1:10m admin-1, China only, simplified

Natural Earth is public domain. Downloads are cached in --cache (default /tmp/natural-earth).

    python3 tools/build_world_regions.py
"""
import argparse
import json
import pathlib
import urllib.request

ROOT = pathlib.Path(__file__).resolve().parent.parent
BASE = 'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/v5.1.2/geojson/'
SOURCES = {
    'countries': 'ne_110m_admin_0_countries.geojson',
    'provinces': 'ne_10m_admin_1_states_provinces.geojson',
}
# Natural Earth's spellings -> the names we show
RENAME = {
    'Inner Mongol': 'Inner Mongolia',
    "People's Republic of China": 'China',
    'United States of America': 'United States',
    'Turkish Republic of Northern Cyprus': 'Northern Cyprus',
}
# Natural Earth's Chinese names are often the full formal name; use the everyday short form
RENAME_ZH = {
    '中华人民共和国': '中国',
    '中华民国': '台湾',
    '大韩民国': '韩国',
    '朝鲜民主主义人民共和国': '朝鲜',
    '北塞浦路斯土耳其共和国': '北塞浦路斯',
    '刚果民主共和国': '刚果（金）',
    '刚果共和国': '刚果（布）',
}
SKIP_PROVINCES = {'Paracel Islands'}


def load(cache, key):
    path = cache / SOURCES[key]
    if not path.exists():
        cache.mkdir(parents=True, exist_ok=True)
        print('downloading', SOURCES[key])
        urllib.request.urlretrieve(BASE + SOURCES[key], path)
    return json.loads(path.read_text(encoding='utf-8'))


def simplify(points, tol):
    """Douglas-Peucker on [lng, lat] points. A closed ring is split at its farthest
    point first, since its two ends coincide and give DP no baseline."""
    if len(points) < 4:
        return points
    if points[0] == points[-1]:
        x0, y0 = points[0]
        far = max(range(len(points)), key=lambda i: (points[i][0] - x0) ** 2 + (points[i][1] - y0) ** 2)
        if 0 < far < len(points) - 1:
            return _dp(points[:far + 1], tol)[:-1] + _dp(points[far:], tol)
    return _dp(points, tol)


def _dp(points, tol):
    if len(points) < 3:
        return points
    keep = [False] * len(points)
    keep[0] = keep[-1] = True
    stack = [(0, len(points) - 1)]
    while stack:
        a, b = stack.pop()
        (ax, ay), (bx, by) = points[a], points[b]
        dx, dy = bx - ax, by - ay
        norm = (dx * dx + dy * dy) ** 0.5 or 1e-12
        best, idx = -1.0, -1
        for i in range(a + 1, b):
            px, py = points[i]
            d = abs(dy * px - dx * py + bx * ay - by * ax) / norm
            if d > best:
                best, idx = d, i
        if best > tol:
            keep[idx] = True
            stack += [(a, idx), (idx, b)]
    return [p for p, k in zip(points, keep) if k]


def geometry(geom, tol):
    polys = geom['coordinates'] if geom['type'] == 'MultiPolygon' else [geom['coordinates']]
    out = []
    for poly in polys:
        rings = [[[round(x, 3), round(y, 3)] for x, y in simplify(ring, tol)] for ring in poly]
        rings = [r for r in rings if len(r) >= 4]
        if rings:
            out.append(rings)
    if not out:
        return None
    return {'type': 'MultiPolygon', 'coordinates': out} if len(out) > 1 else {'type': 'Polygon', 'coordinates': out[0]}


def write(name, features, source):
    path = ROOT / 'data' / name
    path.write_text(json.dumps({'type': 'FeatureCollection', 'source': source, 'features': features},
                               ensure_ascii=False, separators=(',', ':')), encoding='utf-8')
    print(f'{path.relative_to(ROOT)}: {len(features)} features, {path.stat().st_size // 1024} KB')


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--cache', default='/tmp/natural-earth', type=pathlib.Path)
    args = ap.parse_args()

    countries = []
    for f in load(args.cache, 'countries')['features']:
        p = f['properties']
        g = geometry(f['geometry'], 0.0)
        if not g:
            continue
        countries.append({'type': 'Feature', 'properties': {
            'name': RENAME.get(p['NAME_EN'], p['NAME_EN'] or p['NAME']),
            'name_zh': RENAME_ZH.get(p['NAME_ZH'], p['NAME_ZH']), 'coords': [round(p['LABEL_Y'], 3), round(p['LABEL_X'], 3)],
        }, 'geometry': g})
    write('countries.json', countries,
          'Natural Earth 1:110m admin-0 countries, natural-earth-vector v5.1.2; public domain.')

    provinces = []
    for f in load(args.cache, 'provinces')['features']:
        p = f['properties']
        if p.get('adm0_a3') != 'CHN' or p['name'] in SKIP_PROVINCES:
            continue
        g = geometry(f['geometry'], 0.04)
        if not g:
            continue
        provinces.append({'type': 'Feature', 'properties': {
            'name': RENAME.get(p['name'], p['name']), 'name_zh': p.get('name_zh'),
            'coords': [round(p['latitude'], 3), round(p['longitude'], 3)],
        }, 'geometry': g})
    write('china-provinces.json', provinces,
          'Natural Earth 1:10m admin-1 states/provinces (China), natural-earth-vector v5.1.2, simplified; public domain.')


if __name__ == '__main__':
    main()
