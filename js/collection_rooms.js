/* Data and geometry for continuous, open collection galleries. */
(function () {
  'use strict';
  const normalize = (text) => String(text || '').normalize('NFKC').toLowerCase().trim();
  const slug = (text) => normalize(text).replace(/[^a-z0-9-]+/g, '-').replace(/^-+|-+$/g, '') || 'other';
  const tint = 'rgba(150, 140, 120, 0.18)';
  function route(theme, room = '', page = 1, query = '') {
    const path = theme + (room || page > 1 ? '/' + (room || 'lobby') : '') + (page > 1 ? '/' + page : '');
    return path + (query.trim() ? '?' + new URLSearchParams({ q: query.trim() }) : '');
  }
  function parseRoute(key) {
    const [path, search = ''] = key.split('?');
    const match = /^(games|music)(?:\/([a-z0-9-]+))?(?:\/([1-9]\d{0,8}))?$/.exec(path);
    if (!match) return null;
    return { theme: match[1], room: match[2] && match[2] !== 'lobby' ? match[2] : '',
      page: Number(match[3] || 1), query: new URLSearchParams(search).get('q') || '' };
  }
  function createCatalog(theme, items, config) {
    const definitions = config[theme]?.rooms || [];
    const rooms = new Map(definitions.map((d) => [slug(d.id), { ...d, id: slug(d.id), items: [] }]));
    if (!rooms.has('other')) rooms.set('other', { id: 'other', name: 'More', tint, items: [] });
    items.forEach((item, index) => {
      let id = slug(item.genre);
      if (id === 'lobby') id = 'other';
      if (!rooms.has(id)) rooms.set(id, { id, name: item.genreName || id.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase()), tint, items: [] });
      const room = rooms.get(id);
      room.items.push({ ...item, itemId: theme + '-' + index, roomId: id, roomName: room.name,
        searchText: normalize([item.title, item.artist, item.dev, item.sub, room.name].filter(Boolean).join(' ')) });
    });
    const rank = i => theme === 'music' ? 0 : ({ complete: 0, main: 1, playing: 2 }[i.status] ?? 3);
    const weight = i => theme === 'music' ? -(i.order || 0) : (i.hours || 0);
    const active = [...rooms.values()].filter(r => r.items.length);
    for (const room of active) {
      const groups = new Map();
      for (const item of room.items) {
        const key = item.artist || item.dev || item.itemId;
        if (!groups.has(key)) groups.set(key, []);
        groups.get(key).push(item);
      }
      const units = [...groups.values()];
      for (const unit of units) unit.sort((a, b) => rank(a) - rank(b) || weight(b) - weight(a));
      const total = unit => theme === 'music' ? unit.reduce((best, item) => Math.max(best, weight(item)), -Infinity) : unit.reduce((sum, item) => sum + weight(item), 0);
      units.sort((a, b) => rank(a[0]) - rank(b[0]) || total(b) - total(a));
      room.items = units.flat();
    }
    return { theme, rooms: active, items: active.flatMap(r => r.items),
      pageSize: Math.max(1, Math.min(12, Math.floor(config.displaySize || config.pageSize) || 12)) };
  }
  function search(catalog, query) {
    const words = normalize(query).split(/\s+/).filter(Boolean);
    return words.length ? catalog.items.filter(item => words.every(word => item.searchText.includes(word))) : [];
  }
  function layout(catalog) {
    const bottoms = [430, 430], blocks = [], positions = new Map();
    for (const room of catalog.rooms) {
      const count = Math.ceil(room.items.length / catalog.pageSize);
      for (let part = 0; part < count; part++) {
        const entries = room.items.slice(part * catalog.pageSize, (part + 1) * catalog.pageSize);
        const side = bottoms[0] <= bottoms[1] ? 0 : 1;
        const block = { id: room.id + '-' + part, room: room.id, name: room.name, tint: room.tint,
          part: part + 1, parts: count, total: room.items.length, entries,
          x: side ? 1700 : 180, y: bottoms[side], w: 1120, h: 310 + Math.ceil(entries.length / 4) * 200 };
        block.arrival = [side ? block.x + 60 : block.x + block.w - 60, block.y + 155];
        entries.forEach((item, i) => {
          const row = Math.floor(i / 4), columns = Math.min(4, entries.length - row * 4);
          positions.set(item.itemId, { item, block, x: block.x + block.w / 2 + (i % 4 - (columns - 1) / 2) * 250,
            y: block.y + 270 + row * 200 });
        });
        blocks.push(block);
        bottoms[side] = block.y + block.h + 130;
      }
    }
    return { blocks, positions, world: { w: 3000, h: Math.max(...bottoms, 1150) + 90 }, spawn: [1500, 640] };
  }
  // Old category/page links now point at a physical display in the same world.
  function destination(catalog, gallery, requested) {
    const matches = search(catalog, requested.query || '');
    if (matches.length) {
      const index = Math.min(matches.length, Math.max(1, requested.page || 1)) - 1;
      const found = gallery.positions.get(matches[index].itemId);
      return { point: [found.x, found.y + 44], block: found.block, item: found.item, index, matches };
    }
    const blocks = gallery.blocks.filter(b => b.room === requested.room);
    const block = blocks[Math.min(blocks.length, Math.max(1, requested.page || 1)) - 1];
    return { point: block ? block.arrival : gallery.spawn, block, matches };
  }
  globalThis.CollectionRooms = Object.freeze({ createCatalog, parseRoute, route, search, layout, destination });
})();
