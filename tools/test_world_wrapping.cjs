const assert = require('node:assert/strict');
const geo = require('../js/world_geography.js');
const scale = .72, size = { w: geo.size.w * scale, h: geo.size.h * scale };
for (const length of [size.w, size.h]) {
  assert.equal(geo.wrap(-3, length), length - 3);
  assert.equal(geo.wrap(length + 5, length), 5);
  assert.equal(geo.wrap(length, length), 0);
  assert.equal(geo.delta(2, length - 2, length), -4);
  assert.equal(geo.delta(length - 2, 2, length), 4);
  for (let i = -17; i <= 17; i++) assert.equal(geo.wrap(length * i + 23, length), 23);
}
const corner = geo.tiles({ x0: -100, y0: size.h - 100, x1: 100, y1: size.h + 100 }, size);
assert.deepEqual(corner, [[-size.w, 0], [-size.w, size.h], [0, 0], [0, size.h]]);
console.log('Passed: opposite edges, corners and shortest wrapped targeting.');
