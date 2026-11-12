#!/usr/bin/env python3
"""Build all country/region flight stops, including microstates and small islands.

Requires Shapely (pip install shapely). Downloads the pinned public-domain
Natural Earth source once into --cache. The output contains one landing region
per destination, not an exhaustive political boundary layer. Existing map
outlines stay unchanged; missing landing islands are included as real polygons.

    python3 tools/build_travel_countries.py --cache /tmp/natural-earth
"""
import argparse
import json
import pathlib
import urllib.request
from shapely.geometry import Point, shape, mapping
from shapely.ops import unary_union, polylabel
from shapely import make_valid
from build_world_regions import RENAME, RENAME_ZH

ROOT = pathlib.Path(__file__).resolve().parent.parent
SOURCE = 'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/v5.1.2/geojson/ne_10m_admin_0_countries.geojson'


def polygons(geom):
    if geom.is_empty:
        return []
    if geom.geom_type == 'Polygon':
        return [geom]
    return [p for g in geom.geoms for p in polygons(g)] if hasattr(geom, 'geoms') else []


def interior(poly):
    return polylabel(poly, tolerance=max(0.000001, min(0.025, poly.area ** 0.5 / 50)))


def rounded(value):
    if isinstance(value, (tuple, list)):
        return [rounded(v) for v in value]
    return round(value, 6) if isinstance(value, float) else value


def geometry(poly):
    g = mapping(poly)
    return {'type': g['type'], 'coordinates': rounded(g['coordinates'])}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--cache', type=pathlib.Path, default=pathlib.Path('/tmp/natural-earth'))
    args = parser.parse_args()
    args.cache.mkdir(parents=True, exist_ok=True)
    path = args.cache / 'ne_10m_admin_0_countries.geojson'
    if not path.exists():
        urllib.request.urlretrieve(SOURCE, path)
    source = json.loads(path.read_text())
    land = json.loads((ROOT / 'data/world-land.json').read_text())
    base = unary_union([shape(f['geometry']) for f in land['features']])
    features, supplements = [], []
    for f in source['features']:
        p = f['properties']
        label = Point(p['LABEL_X'], p['LABEL_Y'])
        # Use the mainland/island nearest Natural Earth's country label; this
        # keeps France in Europe and avoids sending visitors to an overseas area.
        original = shape(f['geometry'])
        if not original.is_valid:
            original = make_valid(original)
        poly = min(polygons(original), key=lambda g: g.distance(label))
        poly = poly.simplify(min(0.035, poly.area ** 0.5 / 25), preserve_topology=True)
        poly = shape(geometry(poly))
        if not poly.is_valid:
            poly = max(polygons(make_valid(poly)), key=lambda g: g.area)
        overlap = polygons(poly.intersection(base))
        landing = max(overlap, key=lambda g: g.area) if overlap else poly
        point = label if landing.contains(label) and landing.boundary.distance(label) > 0.2 else interior(landing)
        # Test the exact rounded point used by the website.
        point = Point(round(point.x, 6), round(point.y, 6))
        assert poly.contains(point), p['ADMIN']
        identifier = 'country:' + p['ADM0_A3']
        code = p['ISO_A2_EH'] if p['ISO_A2_EH'] != '-99' else p['ADM0_A3']
        name = RENAME.get(p['NAME_EN'], p['NAME_EN'] or p['ADMIN'])
        zh = RENAME_ZH.get(p['NAME_ZH'], p['NAME_ZH'])
        features.append({'type': 'Feature', 'properties': {
            'travel_id': identifier, 'code': code, 'name': name,
            'name_zh': zh, 'name_zht': p['NAME_ZHT'],
            'aliases': list(dict.fromkeys(v for v in [p['ADM0_A3'], p['NAME'], p['ADMIN'], p['NAME_LONG'], p['FORMAL_EN'], p['NAME_ALT'],
                {'GB': 'UK', 'CN': '中國', 'TW': '台灣', 'KR': '韓國'}.get(code)] if v and v != name)),
            'coords': [point.y, point.x],
        }, 'geometry': geometry(poly)})
        if not base.contains(point):
            supplements.append({'type': 'Feature', 'properties': {'name': name}, 'geometry': geometry(poly)})
    features.sort(key=lambda f: f['properties']['name'])
    assert len(features) == 258 and len({f['properties']['travel_id'] for f in features}) == 258
    result = {'type': 'FeatureCollection', 'source': SOURCE,
              'description': 'Natural Earth 1:10m admin-0 countries v5.1.2, public domain. Simplified landing polygons; includes countries and territories.',
              'features': features, 'landingLand': {'type': 'FeatureCollection', 'features': supplements}}
    output = ROOT / 'data/travel-countries.json'
    output.write_text(json.dumps(result, ensure_ascii=False, separators=(',', ':')) + '\n')
    print(f'{len(features)} destinations, {len(supplements)} missing islands, {output.stat().st_size // 1024} KB')
    print('Added islands:', ', '.join(f['properties']['name'] for f in supplements))


if __name__ == '__main__':
    main()
