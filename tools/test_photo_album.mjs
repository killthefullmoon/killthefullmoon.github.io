// Validate publishable photo data, including casing on case-insensitive Macs.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const manifestURL = new URL('../data/photo-album.json', import.meta.url);
const manifest = JSON.parse(fs.readFileSync(manifestURL, 'utf8'));
assert.ok(Array.isArray(manifest.photos), 'photos must be an array');
const ids = new Set();
const originals = new Set();
const categories = new Set(['people', 'scenery', 'food', 'concerts']);
let thumbnailBytes = 0;
for (const photo of manifest.photos) {
  for (const key of ['id', 'category', 'place', 'alt', 'src']) assert.ok(typeof photo[key] === 'string' && photo[key].trim(), `${photo.id}: missing ${key}`);
  assert.ok(categories.has(photo.category), `${photo.id}: category must be people, scenery, food, or concerts`);
  assert.ok(photo.year === null || (Number.isInteger(photo.year) && photo.year >= 1000 && photo.year <= 9999), `${photo.id}: year must be four digits or null when unconfirmed`);
  assert.ok(!ids.has(photo.id), `Duplicate photo ID: ${photo.id}`);
  assert.ok(!originals.has(photo.src), `Duplicate original: ${photo.src}`);
  ids.add(photo.id); originals.add(photo.src);
  for (const key of ['src', 'thumbnail']) {
    if (!photo[key]) continue;
    const absolute = fileURLToPath(new URL(photo[key], manifestURL));
    const relative = path.relative(root, absolute);
    assert.ok(!relative.startsWith('..'), `Asset outside website: ${photo[key]}`);
    let directory = root;
    for (const segment of relative.split(path.sep)) {
      assert.ok(fs.readdirSync(directory).includes(segment), `Missing asset or wrong case: ${photo[key]}`);
      directory = path.join(directory, segment);
    }
    const stat = fs.statSync(absolute);
    assert.ok(stat.isFile() && stat.size > 0, `Empty asset: ${photo[key]}`);
    if (key === 'thumbnail') thumbnailBytes += stat.size;
  }
}
console.log(`Passed: ${ids.size} unique photos, valid categories, place tags, exact asset paths, accessible descriptions; ${(thumbnailBytes / 1024 / 1024).toFixed(2)} MiB of thumbnails.`);
