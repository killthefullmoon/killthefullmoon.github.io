import assert from 'node:assert/strict';
await import('../js/collection_rooms.js');
const rooms = globalThis.CollectionRooms;
const config = { displaySize: 12, music: { rooms: [{ id: 'neosoul', name: 'Neo-Soul' }] }, games: { rooms: [] } };
const albums = Array.from({ length: 10000 }, (_, i) => ({ title: `Album ${i}`, artist: `Artist ${Math.floor(i / 7)}`, genre: 'neosoul', order: i }));
function verify(catalog) {
  const gallery = rooms.layout(catalog), seen = new Set();
  for (const block of gallery.blocks) {
    assert.ok(block.entries.length <= 12);
    assert.ok(block.x >= 80 && block.y >= 80 && block.x + block.w < gallery.world.w - 80 && block.y + block.h < gallery.world.h - 80);
    assert.ok(block.x + block.w <= 1300 || block.x >= 1700, 'The 400px main walkway always stays clear');
    for (const item of block.entries) {
      assert.ok(!seen.has(item.itemId)); seen.add(item.itemId);
      const { x, y } = gallery.positions.get(item.itemId);
      assert.ok(x - 80 > block.x && x + 80 < block.x + block.w);
      assert.ok(y - 126 > block.y + 100 && y + 50 < block.y + block.h);
    }
  }
  for (const x of [180, 1700]) {
    const lane = gallery.blocks.filter(b => b.x === x);
    for (let i = 1; i < lane.length; i++) assert.ok(lane[i].y >= lane[i - 1].y + lane[i - 1].h + 130);
  }
  assert.equal(seen.size, catalog.items.length, 'Every item is present exactly once on the continuous floor');
  return gallery;
}
const catalog = rooms.createCatalog('music', albums, config);
const gallery = verify(catalog);
assert.equal(gallery.blocks.length, 834);
assert.equal(rooms.destination(catalog, gallery, rooms.parseRoute('music/neosoul/999999')).block.part, 834);
const expanded = rooms.createCatalog('music', Array.from({ length: 99 }, (_, i) => ({ title: `Title ${i}`, genre: `genre-${i}`, genreName: `Custom genre ${i}` })), config);
assert.equal(verify(expanded).blocks.length, 99, 'New categories automatically extend the floor');
const mixed = rooms.createCatalog('games', [
  { title: 'Slay the Spire Ⅱ', genre: 'rogue', dev: 'Mega Crit' },
  { title: '測試遊戲', genre: 'new-genre', genreName: 'New Genre' },
  { title: 'No category yet' },
], config);
const mixedLayout = verify(mixed);
assert.equal(rooms.search(mixed, 'spire II').length, 1);
assert.equal(rooms.search(mixed, '測試')[0].title, '測試遊戲');
assert.equal(rooms.search(mixed, 'Mega Crit').length, 1);
assert.equal(rooms.search(mixed, 'missing').length, 0);
assert.deepEqual(rooms.destination(mixed, mixedLayout, rooms.parseRoute('games/not-a-room')).point, mixedLayout.spawn);
assert.ok(mixed.rooms.some(r => r.id === 'other' && r.items.length === 1));
const found = rooms.destination(mixed, mixedLayout, rooms.parseRoute('games?q=Mega+Crit'));
assert.equal(found.item.title, 'Slay the Spire Ⅱ');
assert.deepEqual(found.point, [mixedLayout.positions.get(found.item.itemId).x, mixedLayout.positions.get(found.item.itemId).y + 44]);
assert.equal(rooms.parseRoute('games/rogue/-1'), null);
const route = rooms.route('music', 'neosoul', 2, 'a & b / c');
assert.deepEqual(rooms.parseRoute(route), { theme: 'music', room: 'neosoul', page: 2, query: 'a & b / c' });
verify(rooms.createCatalog('music', [], config));
console.log('Passed: 10,000 items, 99 genres, complete coverage, clear connected aisles, non-overlapping displays, search locations, old links and empty collections.');
