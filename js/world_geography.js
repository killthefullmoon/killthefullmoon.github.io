/* Shared geography for The World. Equirectangular projection; north is up.
 * Coastlines: Natural Earth 1:110m land (public domain), data/world-land.json.
 * Kept separate so the map and place coordinates use exactly the same projection.
 */
(function (root) {
  'use strict';

  // Scale the geography, not its flags or the character. Ten times the old
  // extent leaves room for one flag per US state, including New England.
  const enlargement = 10;
  const size = { w: 5200 * enlargement, h: 2800 * enlargement };
  const frame = { x: 200 * enlargement, y: 200 * enlargement, w: 4800 * enlargement, h: 2400 * enlargement };
  function project(lat, lng) {
    return [frame.x + (lng + 180) / 360 * frame.w, frame.y + (90 - lat) / 180 * frame.h];
  }

  function landforms(data) {
    const polygons = data.features.flatMap((f) =>
      f.geometry.type === 'MultiPolygon' ? f.geometry.coordinates : [f.geometry.coordinates]);
    return polygons.map((polygon, i) => {
      const rings = polygon.map((ring) => ring.map(([lng, lat]) => project(lat, lng)));
      const xs = rings[0].map((p) => p[0]);
      const ys = rings[0].map((p) => p[1]);
      const x0 = Math.min(...xs), x1 = Math.max(...xs);
      const y0 = Math.min(...ys), y1 = Math.max(...ys);
      const polar = polygon[0].every(([, lat]) => lat > 60 || lat < -60);
      return { id: 'land-' + i, rings, polar, cx: (x0 + x1) / 2, cy: (y0 + y1) / 2, rx: (x1 - x0) / 2, ry: (y1 - y0) / 2 };
    });
  }

  function contains(land, x, y) {
    if (Math.abs(x - land.cx) > land.rx || Math.abs(y - land.cy) > land.ry) return false;
    let inside = false;
    for (const ring of land.rings) {
      for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
        const [ax, ay] = ring[i], [bx, by] = ring[j];
        if ((ay > y) !== (by > y) && x < (bx - ax) * (y - ay) / (by - ay) + ax) inside = !inside;
      }
    }
    return inside;
  }

  const labels = [
    ['North America', 57, -112], ['South America', -17, -62],
    ['Europe', 57, 22], ['Africa', 4, 20], ['Asia', 52, 88],
    ['Australia', -25, 134], ['Antarctica', -79, 10],
    ['Pacific Ocean', 7, -140, true], ['Atlantic Ocean', 12, -36, true],
    ['Indian Ocean', -24, 77, true],
  ].map(([text, lat, lng, ocean]) => ({ text, point: project(lat, lng), ocean: !!ocean }));

  const api = { size, frame, enlargement, project, landforms, contains, labels, start: project(39, -103) };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.HuiWorldGeography = api;
})(typeof window === 'undefined' ? globalThis : window);
