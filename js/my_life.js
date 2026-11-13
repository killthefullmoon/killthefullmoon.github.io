/* My Life — a small hand-drawn, top-down walking game.
 *
 * Home is a hand-drawn cottage with three doors into the other worlds:
 *   The Arcade      -> Save Point       (every game from game.html)
 *   The Gramophone  -> Album Collection (every album from music.html)
 *   The portal      -> The World        (places from ../travel_notes/visited.json)
 * Content is read from those pages at runtime, so updating a page updates its world.
 * Each world also has a computer by its portal that opens the plain web page.
 */
(function () {
  'use strict';

  // ---------------------------------------------------------------- palette
  const C = {
    ink: '#2a2723',
    inkSoft: 'rgba(42, 39, 35, 0.55)',
    inkFaint: 'rgba(42, 39, 35, 0.18)',
    water: '#d6dbd4',
    waterLine: 'rgba(70, 86, 92, 0.22)',
    land: '#ebe3cf',
    landShade: '#ded4bb',
    shore: 'rgba(70, 86, 92, 0.16)',
    leaf: '#8d906c',
    leafDark: '#6c7154',
    pine: '#5f6a55',
    bark: '#5b4a3a',
    stone: '#bdb5a3',
    roof: '#8a4b3a',
    wall: '#f1eadb',
    accent: '#9b3d2b',
    fire: '#e2a14a',
    skin: '#f4ece0',
    hair: '#24211e',
    sweater: '#2a2723',
  };

  const GEO = window.HuiWorldGeography;
  let WORLD = { ...GEO.size };
  const NOTES = {
    zhejiang: '../travel_notes/CHN_zhejiang.html',
    ohio: '../travel_notes/USA_ohio.html',
  };

  // ---------------------------------------------------------------- rng
  function mulberry32(seed) {
    return function () {
      seed |= 0;
      seed = (seed + 0x6d2b79f5) | 0;
      let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  const rand = mulberry32(20261112);
  const rr = (a, b) => a + (b - a) * rand();

  // ---------------------------------------------------------------- islands
  // Each island is a noisy ellipse; the same edge function is used to draw it and to test walking.
  function makeIsland(o) {
    const waves = [];
    for (let k = 2; k <= 7; k++) waves.push({ k, a: rr(0.012, 0.035) * (k < 4 ? 1.6 : 1), p: rr(0, Math.PI * 2) });
    return Object.assign(o, { waves });
  }
  // The walking polygon follows the floor in the generated cutaway-room plate.
  const HOME_ROOM = { x: 100, y: 100, w: 1600, h: 1600 * 2 / 3 };
  const roomPoint = ([x, y]) => [HOME_ROOM.x + x * HOME_ROOM.w / 1536, HOME_ROOM.y + y * HOME_ROOM.h / 1024];
  const HOME_FLOOR = [{
    id: 'home', name: 'Home', cx: 900, cy: 850, rx: 760, ry: 300,
    rings: [[[174, 500], [1362, 500], [1438, 944], [91, 944], [174, 500]].map(roomPoint)],
  }];
  // The scene currently being walked (swapped by loadScene)
  let ISLANDS = HOME_FLOOR;

  function edge(isl, theta) {
    let f = 1;
    for (const w of isl.waves) f += w.a * Math.sin(w.k * theta + w.p);
    return f;
  }
  function islandNorm(isl, x, y) {
    if (isl.rings) return GEO.contains(isl, x, y) ? 0.5 : 1.2;
    const dx = (x - isl.cx) / isl.rx;
    const dy = (y - isl.cy) / isl.ry;
    return Math.hypot(dx, dy) / edge(isl, Math.atan2(dy, dx));
  }

  // Bridges: walkable planks between islands
  const BRIDGE_W = 40;
  let BRIDGES = [];

  function distToSeg(px, py, a, b) {
    const vx = b[0] - a[0];
    const vy = b[1] - a[1];
    const t = Math.max(0, Math.min(1, ((px - a[0]) * vx + (py - a[1]) * vy) / (vx * vx + vy * vy)));
    return Math.hypot(px - (a[0] + vx * t), py - (a[1] + vy * t));
  }
  function onLand(x, y, margin = 0.95) {
    for (const isl of ISLANDS) if (islandNorm(isl, x, y) < margin) return true;
    return false;
  }
  function onBridge(x, y) {
    for (const br of BRIDGES) if (distToSeg(x, y, br.a, br.b) < BRIDGE_W / 2 - 4) return true;
    return false;
  }

  // ---------------------------------------------------------------- life chapters
  // Facts come from the homepage; keyed by the start of the place name in visited.json.
  const CHAPTERS = {
    Hangzhou: { kind: 'house', kicker: 'Lived · Zhejiang, China', body: 'Home.', link: [NOTES.zhejiang, 'Notes from Zhejiang'] },
    Columbus: {
      kind: 'hall', kicker: 'Lived · Ohio, USA',
      body: 'The Ohio State University. B.S. in Computer & Information Science, Summa Cum Laude. Always a Buckeye.',
      link: [NOTES.ohio, 'Notes from Ohio'],
    },
    'Hong Kong': {
      kind: 'hall', kicker: 'Research · Hong Kong SAR',
      body: 'The University of Hong Kong. Research Assistant II, Jan – Aug 2025.',
    },
    'Ann Arbor': { kind: 'hall', kicker: 'Lived · Michigan, USA', body: 'University of Michigan. CS Ph.D. student.' },
  };
  const EXTRA_PLACES = [
    {
      name: 'San Jose, California, USA', coords: [37.3382, -121.8863], type: 'worked',
      chapter: { kind: 'office', kicker: 'Worked · California, USA', body: 'Zoom. Research Scientist Intern, May – Aug 2026.' },
    },
    {
      // A symbolic camp near the arrival point, not a company-location pin.
      name: 'Touchstone AI', type: 'founded', fixed: GEO.project(37, -98),
      chapter: {
        kind: 'camp', kicker: 'Founder & CEO, Aug 2026 –',
        body: 'Every mind, human or machine, is shaped by what it has seen.',
        link: ['https://touchstoneai.org', 'touchstoneai.org'],
      },
    },
  ];

  const WORLD_PORTAL = {
    name: 'Portal home', type: 'portal', fixed: GEO.project(43, -108),
    chapter: { kind: 'portal', kicker: 'Portal', body: '' }, title: 'Home', to: 'home',
  };

  // House furniture doubles as the three familiar world entrances.
  const HOME_PLACES = [
    { id: 'h-arcade', name: 'The Arcade', title: 'Save Point', kind: 'home-prop', sprite: 'arcade', x: 500, y: 700, r: 38, depth: 32, h: 136, to: 'games' },
    { id: 'h-gramophone', name: 'The Gramophone', title: 'Album Collection', kind: 'home-prop', sprite: 'records', x: 1290, y: 710, r: 52, depth: 30, h: 142, to: 'music' },
    { id: 'h-door', name: 'The front door', title: 'The World', kind: 'home-prop', sprite: 'door', type: 'portal', x: 900, y: 625, r: 54, depth: 18, h: 206, to: 'world' },
  ];
  const HOME_FURNITURE = [
    { sprite: 'sofa', x: 420, y: 1000, r: 76, depth: 42, h: 104 },
    { sprite: 'bookcase', x: 1450, y: 800, r: 49, depth: 24, h: 168 },
    { sprite: 'plant', x: 1420, y: 1025, r: 23, depth: 24, h: 114 },
  ];
  let TRAILS = [];
  function nearTrail(x, y, d) {
    for (const t of TRAILS) for (let i = 0; i < t.length - 1; i++) if (distToSeg(x, y, t[i], t[i + 1]) < d) return true;
    return false;
  }

  function buildPlaces(list) {
    const places = list.concat(EXTRA_PLACES, [WORLD_PORTAL]).map((p, i) => {
      const short = p.name.split(',')[0].trim();
      const key = Object.keys(CHAPTERS).find((k) => p.name.startsWith(k));
      const chapter = p.chapter || (key && CHAPTERS[key]) || null;
      const parts = p.name.split(',').map((s) => s.trim());
      const where = parts.slice(1).join(', ') || parts[0];
      let link = chapter && chapter.link;
      if (!link && /Zhejiang/.test(p.name)) link = [NOTES.zhejiang, 'Notes from Zhejiang'];
      if (!link && /Ohio/.test(p.name)) link = [NOTES.ohio, 'Notes from Ohio'];
      return {
        id: 'p' + i,
        name: p.name,
        title: p.title || short,
        to: p.to,
        r: (chapter && chapter.kind === 'hall' ? 40 : 26) * 0.78,
        h: { flag: 64, house: 80, hall: 80, office: 84, camp: 88, portal: 112 }[chapter ? chapter.kind : p.type === 'lived' ? 'house' : 'flag'] * 0.78,
        mapScale: 0.78,
        type: p.type,
        kind: chapter ? chapter.kind : p.type === 'lived' ? 'house' : 'flag',
        kicker: chapter ? chapter.kicker : (p.type === 'lived' ? 'Lived · ' : 'Visited · ') + where,
        body: chapter ? chapter.body : link ? '' : 'Notes from here are still being written.',
        link,
        coords: p.coords,
        fixed: p.fixed,
        x: 0,
        y: 0,
      };
    });

    // Pin every city to the same geographic projection as the coastline.
    // Symbols may move a little to avoid overlap; their true anchor never moves.
    for (const p of places) {
      [p.x, p.y] = p.fixed || GEO.project(...p.coords);
      if (p.coords) p.anchor = [p.x, p.y];
    }

    // Locally spread dense city groups, with a short line back to each real pin.
    const MIN = 150;
    for (let it = 0; it < 120; it++) {
      for (let i = 0; i < places.length; i++) {
        for (let j = i + 1; j < places.length; j++) {
          const a = places[i];
          const b = places[j];
          let dx = b.x - a.x;
          let dy = b.y - a.y;
          let d = Math.hypot(dx, dy);
          if (d >= MIN) continue;
          if (d < 0.01) {
            dx = 1;
            dy = 0;
            d = 1;
          }
          const push = (MIN - d) / 2;
          const nx = dx / d;
          const ny = dy / d;
          if (!a.fixed) {
            a.x -= nx * push;
            a.y -= ny * push;
          }
          if (!b.fixed) {
            b.x += nx * push;
            b.y += ny * push;
          }
        }
      }
      for (const p of places) {
        if (!p.anchor) continue;
        const dx = p.x - p.anchor[0], dy = p.y - p.anchor[1];
        const d = Math.hypot(dx, dy);
        const limit = 220;
        if (d > limit) {
          p.x = p.anchor[0] + dx * limit / d;
          p.y = p.anchor[1] + dy * limit / d;
        }
      }
    }
    return places;
  }

  // ---------------------------------------------------------------- decor
  // Spatial grid so drawing and collision only look at nearby decor
  const CELL = 160;
  function buildGrid(items) {
    const grid = new Map();
    for (const it of items) {
      const k = Math.floor(it.x / CELL) + ',' + Math.floor(it.y / CELL);
      if (!grid.has(k)) grid.set(k, []);
      grid.get(k).push(it);
    }
    return grid;
  }
  function decorIn(x0, y0, x1, y1, out, grid = decor.grid) {
    const gx0 = Math.floor(x0 / CELL);
    const gx1 = Math.floor(x1 / CELL);
    const gy0 = Math.floor(y0 / CELL);
    const gy1 = Math.floor(y1 / CELL);
    for (let gx = gx0; gx <= gx1; gx++) {
      for (let gy = gy0; gy <= gy1; gy++) {
        const cell = grid && grid.get(gx + ',' + gy);
        if (cell) for (const it of cell) out.push(it);
      }
    }
    return out;
  }

  function blobPoints(r, n, jit) {
    const pts = [];
    for (let i = 0; i < n; i++) {
      const t = (i / n) * Math.PI * 2;
      const rad = r * (1 + rr(-jit, jit));
      pts.push([Math.cos(t) * rad, Math.sin(t) * rad * 0.86]);
    }
    return pts;
  }

  function buildDecor(sc) {
    if (sc.room) return { items: [], waves: [], grid: new Map() };
    const { places, islands, bridges } = sc;
    // A larger map needs breathing room, not 100 times as many objects.
    const density = Math.pow(sc.extentScale || 1, 1.5);
    const trails = sc.trails || [];
    const items = [];
    const onTrail = (x, y) => trails.some((t) => t.some((pt, i) => i && distToSeg(x, y, t[i - 1], pt) < 34));
    const rugs = sc.rugs || [];
    const clear = (x, y, r) =>
      (!sc.extentScale || !sc.spawn || Math.hypot(x - sc.spawn[0], y - sc.spawn[1]) > r + 35) &&
      rugs.every((g) => x < g.x0 - 40 || x > g.x1 + 40 || y < g.y0 - 20 || y > g.y1 + 60) &&
      places.every((p) => Math.hypot(p.x - x, p.y - y) > r + (p.r || 26) - 26) &&
      bridges.every((br) => distToSeg(x, y, br.a, br.b) > 60) &&
      !onTrail(x, y);

    // gallery worlds (games, music) keep a clean floor: no trees, grass or stones
    for (const isl of sc.bare ? [] : islands) {
      const area = Math.PI * isl.rx * isl.ry / density;
      // sparse on purpose: a few trees and stones to frame the paths, not to block them
      // open worlds (the world map) keep their grass but have no trees or stones to walk around
      const trees = isl.polar || sc.open ? 0 : Math.round(area / ({ home: 42000, games: 90000, music: 60000 }[isl.id] || 34000));
      const tufts = isl.polar ? 0 : Math.round(area / 5200);
      const rocks = sc.open ? 0 : Math.round(area / 160000);
      const place = (count, make, minN, maxN, gap) => {
        let made = 0;
        let guard = 0;
        while (made < count && guard++ < count * 25) {
          const t = rr(0, Math.PI * 2);
          const r = Math.sqrt(rand());
          const x = isl.cx + Math.cos(t) * r * isl.rx;
          const y = isl.cy + Math.sin(t) * r * isl.ry;
          const n = islandNorm(isl, x, y);
          if (n < minN || n > maxN || !clear(x, y, gap)) continue;
          items.push(make(x, y));
          made++;
        }
      };
      place(trees, (x, y) => {
        const pine = rand() < 0.38;
        return {
          t: 'tree', x, y, pine, s: rr(0.8, 1.25),
          crown: [blobPoints(17, 11, 0.16), blobPoints(13, 9, 0.2), blobPoints(11, 8, 0.2)],
          off: [[0, 0], [rr(-9, -5), rr(5, 9)], [rr(5, 9), rr(4, 8)]],
          solid: true,
        };
      }, 0, 0.86, 110);
      place(tufts, (x, y) => ({ t: 'tuft', x, y, s: rr(0.7, 1.2), lean: rr(-0.3, 0.3) }), 0, 0.92, 60);
      place(rocks, (x, y) => ({ t: 'rock', x, y, s: rr(0.7, 1.3), pts: blobPoints(9, 8, 0.25) }), 0.2, 0.9, 90);
    }

    // Waves on the water
    const waves = [];
    const wd = sc.world;
    const nWaves = Math.min(2500, Math.round((wd.w * wd.h) / (22000 * density)));
    for (let i = 0; i < nWaves; i++) {
      const x = rr(0, wd.w);
      const y = rr(0, wd.h);
      if (!islands.some((isl) => islandNorm(isl, x, y) < 1.08)) waves.push({ x, y, w: rr(14, 30) });
    }
    return { items, waves, grid: buildGrid(items) };
  }

  // ---------------------------------------------------------------- canvas
  const canvas = document.getElementById('world');
  const ctx = canvas.getContext('2d');
  const mini = document.getElementById('minimap');
  const mctx = mini.getContext('2d');
  const homeArt = { room: new Image(), furniture: new Image(), sky: new Image(), clouds: new Image(), frames: null };
  homeArt.room.src = '../images/home/room.png';
  homeArt.furniture.src = '../images/home/furniture.png';
  homeArt.sky.src = '../images/home/cloud-sea.png';
  homeArt.clouds.src = '../images/home/cloud-cradle.png';
  for (const art of [homeArt.room, homeArt.sky, homeArt.clouds]) {
    art.decode().then(() => { miniFor = null; }).catch(() => {});
  }
  Promise.all([
    homeArt.furniture.decode(),
    fetch('../images/home/furniture.json').then((r) => {
      if (!r.ok) throw new Error('Home furniture unavailable');
      return r.json();
    }),
  ]).then(([, sheet]) => {
    homeArt.frames = Object.fromEntries(sheet.names.map((name, i) => [name, sheet.frames[i]]));
  }).catch(() => {});
  const huiSprite = { image: new Image(), frames: null };
  const quietMotion = matchMedia('(prefers-reduced-motion: reduce)');
  huiSprite.image.decoding = 'async';
  huiSprite.image.src = '../images/characters/hui-sprite.png';
  Promise.all([
    huiSprite.image.decode(),
    fetch('../images/characters/hui-sprite.json').then((r) => {
      if (!r.ok) throw new Error('Character frames unavailable');
      return r.json();
    }),
  ]).then(([, sheet]) => {
    if (sheet.width !== huiSprite.image.naturalWidth || sheet.height !== huiSprite.image.naturalHeight
      || sheet.frames.length !== 3 || sheet.frames.some((row) => row.length !== 4)) {
      throw new Error('Character atlas dimensions do not match');
    }
    huiSprite.frames = sheet.frames;
  }).catch(() => { /* The original canvas character remains usable if the art cannot load. */ });
  let W = 0;
  let H = 0;
  let DPR = 1;
  let zoom = 1;
  let zoomTarget = 1;
  const ZOOM_MIN = 0.4;
  const ZOOM_MAX = 1.5;
  function setZoom(z) {
    const min = sceneName === 'world'
      ? Math.min(ZOOM_MIN, (W - 40) / WORLD.w, (H - 180) / WORLD.h)
      : ZOOM_MIN;
    zoomTarget = Math.max(min, Math.min(ZOOM_MAX, z));
    if (sceneName === 'world') {
      const overview = zoomTarget < 0.16;
      const button = document.getElementById('zoomMap');
      button.textContent = overview ? 'Back' : 'Map';
      button.setAttribute('aria-label', overview ? 'Return to Hui' : 'Show the whole world');
    }
  }

  function resize() {
    DPR = Math.min(window.devicePixelRatio || 1, 2);
    W = window.innerWidth;
    H = window.innerHeight;
    canvas.width = Math.round(W * DPR);
    canvas.height = Math.round(H * DPR);
    if (!resize.done) {
      zoom = zoomTarget = W < 700 ? 0.78 : 1;
      resize.done = true;
    }
    updateHint();
  }


  // ---------------------------------------------------------------- state
  const player = { x: 900, y: 820, dir: 1, face: 'down', phase: 0, moving: false };
  const cam = { x: player.x, y: player.y };
  const keys = new Set();
  let target = null;
  let pendingOpen = null;
  let places = [];
  let decor = { items: [], waves: [], grid: new Map() };
  let sceneName = 'home';
  const SCENES = {};
  let worldPlaces = [];
  let fade = null; // { t, dur, to, swapped }
  const travelDialog = document.getElementById('travelDialog');
  const notes = [];
  const started = true;
  let openPlace = null;
  let near = null;
  const footprints = [];
  let lastPrint = { x: player.x, y: player.y, side: 1 };
  const smoke = [];
  const sparks = [];

  const STORE_KEY = 'mylife-visited';
  let visited = new Set();
  try {
    visited = new Set(JSON.parse(localStorage.getItem(STORE_KEY) || '[]'));
  } catch (e) {}
  function saveVisited() {
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify([...visited]));
    } catch (e) {}
  }

  // Animation clock (seconds); there is no day/night cycle
  let clock = 0;

  // ---------------------------------------------------------------- input
  const MOVE_KEYS = {
    ArrowUp: 'u', KeyW: 'u', ArrowDown: 'd', KeyS: 'd', ArrowLeft: 'l', KeyA: 'l', ArrowRight: 'r', KeyD: 'r',
  };
  window.addEventListener('keydown', (e) => {
    if (!started || travelDialog.open || fade || e.target.closest('input, textarea, [contenteditable]')) return;
    if (e.target.closest('button, a') && (e.code === 'Enter' || e.code === 'Space')) return;
    if (!screen.hidden) {
      if (e.code === 'Escape') closeScreen();
      return;
    }
    if (MOVE_KEYS[e.code]) {
      keys.add(MOVE_KEYS[e.code]);
      target = null;
      pendingOpen = null;
      e.preventDefault();
      fadeHint();
    } else if (e.code === 'KeyE' || e.code === 'Enter' || e.code === 'Space') {
      if (openPlace) closeCard();
      else if (near) interact(near);
      e.preventDefault();
    } else if (e.code === 'Escape') {
      closeCard();
      toggleJournal(false);
    } else if (e.code === 'KeyM') {
      e.preventDefault();
      openTravel();
    } else if (e.code === 'KeyJ') {
      toggleJournal();
    } else if (e.code === 'Minus' || e.code === 'NumpadSubtract') {
      setZoom(zoomTarget / 1.2);
    } else if (e.code === 'Equal' || e.code === 'NumpadAdd') {
      setZoom(zoomTarget * 1.2);
    }
  });
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Shift' && !travelDialog.open && !fade && screen.hidden) keys.add('run');
  });
  window.addEventListener('keyup', (e) => {
    if (e.key === 'Shift') keys.delete('run');
    if (MOVE_KEYS[e.code]) keys.delete(MOVE_KEYS[e.code]);
  });
  window.addEventListener('blur', () => keys.clear());

  const pointers = new Map();
  let pinchStart = null;
  canvas.addEventListener('wheel', (e) => {
    e.preventDefault();
    setZoom(zoomTarget * Math.exp(-e.deltaY * 0.0015));
  }, { passive: false });
  canvas.addEventListener('pointermove', (e) => {
    if (!pointers.has(e.pointerId)) return;
    pointers.set(e.pointerId, [e.clientX, e.clientY]);
    if (pointers.size === 2 && pinchStart) {
      const [a, b] = [...pointers.values()];
      setZoom(pinchStart.z * (Math.hypot(a[0] - b[0], a[1] - b[1]) / pinchStart.d));
    }
  });
  const dropPointer = (e) => {
    pointers.delete(e.pointerId);
    if (pointers.size < 2) pinchStart = null;
  };
  canvas.addEventListener('pointerup', dropPointer);
  canvas.addEventListener('pointercancel', dropPointer);

  canvas.addEventListener('pointerdown', (e) => {
    if (!started || fade || travelDialog.open) return;
    pointers.set(e.pointerId, [e.clientX, e.clientY]);
    if (pointers.size === 2) {
      const [a, b] = [...pointers.values()];
      pinchStart = { d: Math.hypot(a[0] - b[0], a[1] - b[1]) || 1, z: zoomTarget };
      target = null;
      pendingOpen = null;
      return;
    }
    const wx = (e.clientX - W / 2) / zoom + cam.x;
    const wy = (e.clientY - H / 2) / zoom + cam.y - (sceneName === 'home' ? homeLift() : 0);
    const hit = places.find((p) => Math.abs(p.x - wx) < (p.r || 26) + 12 && wy < p.y + 16 && wy > p.y - (p.h || 70));
    if (hit) {
      target = { x: hit.x, y: hit.y + 34 };
      pendingOpen = hit;
    } else {
      target = { x: wx, y: wy };
      pendingOpen = null;
    }
    fadeHint();
  });

  let hintFaded = false;
  function updateHint() {
    document.getElementById('hint').textContent = W < 700
      ? sceneName === 'world' ? 'Tap to walk or sail · pinch to zoom' : 'Tap to walk · tap a place to explore'
      : sceneName === 'world'
        ? 'Walk or sail · Shift to run · E to interact · M to travel · scroll to zoom'
        : 'WASD / arrows to walk · Shift to run · E to interact · M to travel · scroll to zoom';
  }
  function fadeHint() {
    if (hintFaded) return;
    hintFaded = true;
    setTimeout(() => document.getElementById('hint').classList.add('is-faded'), 2500);
  }

  // ---------------------------------------------------------------- update
  const SPEED = 170;
  const RUN = 3; // running is three times walking speed
  let runToggle = false; // the on-screen Run button (touch)
  const dust = [];
  function walkableIn(sc, x, y) {
    if (x < 20 || y < 20 || x > sc.world.w - 20 || y > sc.world.h - 20) return false;
    // In The World, Hui takes a little boat across water instead of using
    // imaginary bridges between continents. Other scenes keep their shores.
    if (sc !== SCENES.world && !sc.islands.some((isl) => islandNorm(isl, x, y) < 0.95)
      && !sc.bridges.some((br) => distToSeg(x, y, br.a, br.b) < BRIDGE_W / 2 - 4)) return false;
    for (const it of decorIn(x - 20, y - 20, x + 20, y + 20, [], sc.decor.grid)) {
      if (!it.solid) continue;
      const dx = it.x - x;
      if (dx > 14 || dx < -14) continue;
      if (Math.hypot(dx, (it.y - y) * 1.6) < 11 * it.s) return false;
    }
    for (const p of [...sc.places, ...(sc.furniture || [])]) {
      if (Math.abs(p.x - x) < (p.r || 26) && y < p.y + 6 && y > p.y - (p.depth || 26)) return false;
    }
    return true;
  }
  function walkable(x, y) {
    return walkableIn(SCENES[sceneName], x, y);
  }

  function update(dt) {
    clock += dt;
    zoom += (zoomTarget - zoom) * Math.min(1, dt * 10);
    if (fade) {
      fade.t += dt;
      if (!fade.swapped && fade.t >= fade.dur / 2) {
        fade.swapped = true;
        loadScene(fade.to, fade.from, fade.arrival);
      }
      if (fade.t >= fade.dur) {
        if (fade.flightLabel) {
          showFlight('Landed in ' + fade.flightLabel, 2400);
          canvas.focus({ preventScroll: true });
        }
        fade = null;
      }
    }
    if (travelDialog.open || fade) {
      keys.clear();
      target = null;
      pendingOpen = null;
    }

    let vx = 0;
    let vy = 0;
    if (keys.has('l')) vx -= 1;
    if (keys.has('r')) vx += 1;
    if (keys.has('u')) vy -= 1;
    if (keys.has('d')) vy += 1;
    if (!vx && !vy && target) {
      const dx = target.x - player.x;
      const dy = target.y - player.y;
      const d = Math.hypot(dx, dy);
      // close enough to a clicked place counts as arriving
      const atPlace = pendingOpen && Math.hypot(pendingOpen.x - player.x, pendingOpen.y + 30 - player.y) < 40;
      if (d < 6 || atPlace) {
        target = null;
        if (pendingOpen) {
          interact(pendingOpen);
          pendingOpen = null;
        }
      } else {
        vx = dx / d;
        vy = dy / d;
      }
    }
    const len = Math.hypot(vx, vy);
    player.moving = len > 0;
    player.running = player.moving && (keys.has('run') || runToggle);
    if (player.moving) {
      vx /= len;
      vy /= len;
      // move in small sub-steps so a sprint can't skip through a tree trunk
      const runSpeed = sceneName === 'world' ? 8 : RUN;
      const total = SPEED * (player.running ? runSpeed : 1) * dt;
      const steps = Math.max(1, Math.ceil(total / 7));
      let moved = false;
      for (let i = 0; i < steps; i++) {
        const st = total / steps;
        let any = false;
        if (walkable(player.x + vx * st, player.y)) {
          player.x += vx * st;
          any = true;
        }
        if (walkable(player.x, player.y + vy * st)) {
          player.y += vy * st;
          any = true;
        }
        if (!any) break;
        moved = true;
      }
      if (!moved && target) {
        // blocked: still open the place if we are standing right by it
        if (pendingOpen && Math.hypot(pendingOpen.x - player.x, pendingOpen.y + 20 - player.y) < 96) interact(pendingOpen);
        target = null;
        pendingOpen = null;
      }
      if (Math.abs(vx) > 0.3) player.dir = vx > 0 ? 1 : -1;
      player.face = Math.abs(vy) > Math.abs(vx) ? (vy < 0 ? 'up' : 'down') : 'side';
      player.phase += dt * (player.running ? 19 : 11);
      const sailing = sceneName === 'world' && !onLand(player.x, player.y);
      if (player.running && !sailing && sceneName !== 'home' && rand() < dt * 22) {
        dust.push({ x: player.x - vx * 8 + rr(-4, 4), y: player.y + rr(-1, 2), r: rr(2, 3.5), life: 0.5 });
      }

      if (!sailing && sceneName !== 'home' && Math.hypot(player.x - lastPrint.x, player.y - lastPrint.y) > (player.running ? 30 : 17)) {
        lastPrint = { x: player.x, y: player.y, side: -lastPrint.side };
        footprints.push({ x: player.x + lastPrint.side * 4, y: player.y + 1, life: 6, glyph: rand() < 0.5 ? 1 : 2 });
        if (footprints.length > 80) footprints.shift();
      }
    }
    for (const p of dust) {
      p.life -= dt;
      p.r += dt * 9;
    }
    while (dust.length && dust[0].life <= 0) dust.shift();
    for (const f of footprints) f.life -= dt;
    while (footprints.length && footprints[0].life <= 0) footprints.shift();

    // Nearest place
    near = null;
    let best = 96;
    for (const p of places) {
      const d = Math.hypot(p.x - player.x, p.y + 20 - player.y) - ((p.r || 26) - 26);
      if (d < best) {
        best = d;
        near = p;
      }
    }
    if (openPlace && !openPlace.embed && Math.hypot(openPlace.x - player.x, openPlace.y - player.y) > 220) closeCard();

    // Camera eases after the player
    cam.x += (player.x - cam.x) * Math.min(1, dt * 4);
    cam.y += (player.y - cam.y) * Math.min(1, dt * 4);
    const hw = W / 2 / zoom;
    const hh = H / 2 / zoom;
    clampCam(hw, hh);

    // Particles
    for (const p of places) {
      if ((p.kind === 'house' || p.kind === 'hall') && rand() < dt * 1.6) {
        smoke.push({ x: p.x + (p.kind === 'house' ? 10 : 18), y: p.y - (p.kind === 'house' ? 50 : 58), r: 3, life: 3.2 });
      }
      if (p.kind === 'gramophone' && rand() < dt * 1.3) {
        notes.push({ x: p.x + 30, y: p.y - 96, vx: rr(6, 18), life: 3.4, glyph: rand() < 0.5 ? 1 : 2, wob: rr(0, 6) });
      }
      if (p.kind === 'portal' && rand() < dt * 10) {
        const t = rr(0, Math.PI * 2);
        sparks.push({ x: p.x + Math.cos(t) * 22, y: p.y - 46 + Math.sin(t) * 28, vx: rr(-8, 8), vy: rr(-30, -12), life: rr(0.6, 1.3), cool: true });
      }
      if (p.kind === 'camp' && rand() < dt * 14) {
        sparks.push({ x: p.x + rr(-6, 6) + 26, y: p.y - 8, vx: rr(-10, 10), vy: rr(-46, -22), life: rr(0.6, 1.2) });
      }
    }
    for (const s of smoke) {
      s.life -= dt;
      s.y -= dt * 12;
      s.x += dt * 5;
      s.r += dt * 2.4;
    }
    for (const n of notes) {
      n.life -= dt;
      n.y -= dt * 16;
      n.x += n.vx * dt;
    }
    while (notes.length && notes[0].life <= 0) notes.shift();
    for (const s of sparks) {
      s.life -= dt;
      s.x += s.vx * dt;
      s.y += s.vy * dt;
    }
    while (smoke.length && smoke[0].life <= 0) smoke.shift();
    while (sparks.length && sparks[0].life <= 0) sparks.shift();
  }

  // ---------------------------------------------------------------- drawing helpers
  function wobblyPoly(c, pts, ox, oy, s) {
    c.beginPath();
    pts.forEach(([x, y], i) => (i ? c.lineTo(ox + x * s, oy + y * s) : c.moveTo(ox + x * s, oy + y * s)));
    c.closePath();
  }
  function inkLine(c, x1, y1, x2, y2, w) {
    c.lineWidth = w;
    c.beginPath();
    c.moveTo(x1, y1);
    c.quadraticCurveTo((x1 + x2) / 2 + 0.8, (y1 + y2) / 2 - 0.8, x2, y2);
    c.stroke();
  }

  function drawWater(c, view) {
    c.fillStyle = C.water;
    c.fillRect(view.x0, view.y0, view.x1 - view.x0, view.y1 - view.y0);
    c.strokeStyle = C.waterLine;
    c.lineWidth = 1.3;
    c.lineCap = 'round';
    const drift = Math.sin(clock * 0.8) * 3;
    for (const wv of decor.waves) {
      if (wv.x < view.x0 - 40 || wv.x > view.x1 + 40 || wv.y < view.y0 - 20 || wv.y > view.y1 + 20) continue;
      const x = wv.x + drift;
      c.beginPath();
      c.moveTo(x - wv.w / 2, wv.y);
      c.quadraticCurveTo(x - wv.w / 4, wv.y - 4, x, wv.y);
      c.quadraticCurveTo(x + wv.w / 4, wv.y + 4, x + wv.w / 2, wv.y);
      c.stroke();
    }
  }

  // Coastlines never change, so build each one once as a Path2D
  function coast(isl, scale, steps) {
    const key = scale + ':' + steps;
    isl.paths = isl.paths || {};
    if (!isl.paths[key]) {
      const path = new Path2D();
      if (isl.rings) {
        for (const ring of isl.rings) {
          ring.forEach(([x, y], i) => i ? path.lineTo(x, y) : path.moveTo(x, y));
          path.closePath();
        }
      } else {
        for (let i = 0; i <= steps; i++) {
          const t = (i / steps) * Math.PI * 2;
          const f = edge(isl, t) * scale;
          const x = isl.cx + Math.cos(t) * isl.rx * f;
          const y = isl.cy + Math.sin(t) * isl.ry * f;
          i ? path.lineTo(x, y) : path.moveTo(x, y);
        }
        path.closePath();
      }
      isl.paths[key] = path;
    }
    return isl.paths[key];
  }

  function drawIslands(c, view) {
    for (const isl of ISLANDS) {
      const m = 1.1;
      if (isl.cx + isl.rx * m < view.x0 || isl.cx - isl.rx * m > view.x1 || isl.cy + isl.ry * m < view.y0 || isl.cy - isl.ry * m > view.y1) continue;
      if (isl.rings) {
        const path = coast(isl, 1, 200);
        c.save();
        c.lineJoin = 'round';
        c.strokeStyle = C.shore;
        c.lineWidth = 18;
        c.stroke(path);
        c.fillStyle = isl.polar ? '#f1eee5' : C.land;
        c.fill(path, 'evenodd');
        c.save();
        c.clip(path, 'evenodd');
        c.strokeStyle = isl.polar ? '#e0ddd3' : C.landShade;
        c.lineWidth = 12;
        c.stroke(path);
        c.restore();
        c.strokeStyle = C.ink;
        c.lineWidth = Math.max(1.8, 0.8 / zoom);
        c.stroke(path);
        c.restore();
        continue;
      }
      // shallow-water wash
      c.fillStyle = C.shore;
      c.fill(coast(isl, 1.06, 200));
      c.fillStyle = C.land;
      c.fill(coast(isl, 1, 200));
      // inner shading ring
      c.strokeStyle = C.landShade;
      c.lineWidth = 16;
      c.stroke(coast(isl, 0.975, 200));
      // two passes of ink for a sketched coastline
      c.strokeStyle = C.ink;
      c.lineWidth = 2.2;
      c.stroke(coast(isl, 1, 200));
      c.lineWidth = 0.8;
      c.strokeStyle = C.inkSoft;
      c.stroke(coast(isl, 1.012, 140));
    }
  }

  function drawStateBorders(c, view) {
    if (sceneName !== 'world' || zoom < 0.12) return;
    c.save();
    c.strokeStyle = 'rgba(42,39,35,0.2)';
    c.lineWidth = 1.2;
    c.setLineDash([7, 6]);
    for (const region of SCENES.world.stateBorders) {
      if (region.cx + region.rx < view.x0 || region.cx - region.rx > view.x1 ||
          region.cy + region.ry < view.y0 || region.cy - region.ry > view.y1) continue;
      // national borders a little firmer than state / province lines
      c.strokeStyle = region.country ? 'rgba(42,39,35,0.32)' : 'rgba(42,39,35,0.2)';
      c.lineWidth = region.country ? 1.6 : 1.2;
      c.stroke(coast(region, 1, 200));
    }
    c.restore();
  }

  function drawTrails(c) {
    if (!TRAILS.length) return;
    c.save();
    c.lineCap = 'round';
    c.lineJoin = 'round';
    for (const t of TRAILS) {
      const path = () => {
        c.beginPath();
        c.moveTo(t[0][0], t[0][1]);
        c.quadraticCurveTo(t[1][0], t[1][1], t[2][0], t[2][1]);
      };
      c.strokeStyle = '#d9cba9';
      c.lineWidth = 30;
      path();
      c.stroke();
      c.strokeStyle = 'rgba(42, 39, 35, 0.16)';
      c.lineWidth = 1;
      c.setLineDash([6, 10]);
      path();
      c.stroke();
      c.setLineDash([]);
    }
    // a small clearing where the paths meet
    c.fillStyle = '#d9cba9';
    c.beginPath();
    c.ellipse(TRAILS[0][0][0], TRAILS[0][0][1] - 8, 46, 24, 0, 0, Math.PI * 2);
    c.fill();
    c.restore();
  }

  function roundRect(c, x0, y0, x1, y1, r) {
    c.beginPath();
    c.moveTo(x0 + r, y0);
    c.arcTo(x1, y0, x1, y1, r);
    c.arcTo(x1, y1, x0, y1, r);
    c.arcTo(x0, y1, x0, y0, r);
    c.arcTo(x0, y0, x1, y0, r);
    c.closePath();
  }
  function drawZones(c) {
    const sc = SCENES[sceneName];
    if (!sc || !sc.rugs) return;
    c.save();
    c.textAlign = 'center';
    // genre districts: a tinted patch with a dashed edge
    for (const g of sc.rugs) {
      c.fillStyle = g.tint;
      roundRect(c, g.x0, g.y0, g.x1, g.y1, 22);
      c.fill();
      c.strokeStyle = 'rgba(42, 39, 35, 0.28)';
      c.lineWidth = 1.2;
      c.setLineDash([8, 7]);
      c.stroke();
    }
    c.setLineDash([]);
    // same-studio frames: a double ink line with the studio's name
    for (const f of sc.frames || []) {
      c.strokeStyle = 'rgba(42, 39, 35, 0.7)';
      c.lineWidth = 1.6;
      roundRect(c, f.x0, f.y0, f.x1, f.y1, 14);
      c.stroke();
      c.lineWidth = 0.8;
      roundRect(c, f.x0 + 4, f.y0 + 4, f.x1 - 4, f.y1 - 4, 11);
      c.stroke();
      c.font = 'italic 400 15px "Cormorant Garamond", Georgia, serif';
      const w = c.measureText(f.dev).width + 12;
      c.fillStyle = '#efe7d3';
      c.fillRect(f.x0 + 16, f.y1 - 9, w, 18);
      c.fillStyle = C.ink;
      c.textAlign = 'left';
      c.fillText(f.dev, f.x0 + 22, f.y1 + 5);
      c.textAlign = 'center';
    }
    c.restore();
  }

  function drawBridges(c) {
    for (const br of BRIDGES) {
      const [ax, ay] = br.a;
      const [bx, by] = br.b;
      const ang = Math.atan2(by - ay, bx - ax);
      const len = Math.hypot(bx - ax, by - ay);
      c.save();
      c.translate(ax, ay);
      c.rotate(ang);
      c.fillStyle = '#cbb894';
      c.fillRect(0, -BRIDGE_W / 2, len, BRIDGE_W);
      c.strokeStyle = C.bark;
      c.lineWidth = 1;
      for (let x = 6; x < len; x += 11) inkLine(c, x, -BRIDGE_W / 2 + 2, x + 1, BRIDGE_W / 2 - 2, 1);
      c.strokeStyle = C.ink;
      inkLine(c, 0, -BRIDGE_W / 2, len, -BRIDGE_W / 2, 1.8);
      inkLine(c, 0, BRIDGE_W / 2, len, BRIDGE_W / 2, 1.8);
      for (let x = 0; x <= len; x += 46) {
        c.fillStyle = C.bark;
        c.fillRect(x - 2, -BRIDGE_W / 2 - 5, 4, 7);
        c.fillRect(x - 2, BRIDGE_W / 2 - 2, 4, 7);
      }
      c.restore();
    }
  }

  // The order of life chapters, drawn as a dotted journey line
  const JOURNEY = ['Hangzhou', 'Columbus', 'Hong Kong', 'Ann Arbor', 'San Jose', 'Touchstone AI'];
  function drawJourney(c) {
    if (sceneName !== 'world') return;
    const pts = JOURNEY.map((k) => places.find((p) => p.name.startsWith(k))).filter(Boolean)
      .map((p) => ({ x: p.anchor ? p.anchor[0] : p.x, y: p.anchor ? p.anchor[1] : p.y }));
    if (pts.length < 2) return;
    c.save();
    c.strokeStyle = 'rgba(155, 61, 43, 0.45)';
    c.lineWidth = 1.6;
    c.setLineDash([2, 9]);
    c.lineCap = 'round';
    c.beginPath();
    pts.forEach((p, i) => {
      if (!i) return c.moveTo(p.x, p.y - 10);
      const q = pts[i - 1];
      const mx = (p.x + q.x) / 2;
      const my = Math.min(p.y, q.y) - 140 - Math.abs(p.x - q.x) * 0.08;
      c.quadraticCurveTo(mx, my, p.x, p.y - 10);
    });
    c.stroke();
    c.restore();
  }

  function drawLabels(c) {
    c.save();
    c.textAlign = 'center';
    c.fillStyle = 'rgba(42, 39, 35, 0.42)';
    if (sceneName === 'world') {
      for (const label of SCENES.world.mapLabels) {
        const minZoom = label.state ? 0.35 : label.country ? 0.16 : 0;
        if ((label.state || label.country) && (zoom < minZoom || places.some((p) => Math.hypot(p.x - label.point[0], p.y - label.point[1]) < 85))) continue;
        c.fillStyle = label.ocean ? 'rgba(70,86,92,0.5)' : label.country ? 'rgba(42,39,35,0.55)' : 'rgba(42,39,35,0.48)';
        const size = label.state ? 26 : label.country ? 40 * Math.min(2.2, Math.max(1, 0.35 / zoom)) : (label.ocean ? 28 : 34) * Math.min(GEO.enlargement, 1 / zoom);
        c.font = `italic 300 ${size}px "Cormorant Garamond", Georgia, serif`;
        c.fillText(label.text, ...label.point);
        // a country's Chinese name, smaller, underneath
        if (label.zh) {
          c.font = `300 ${size * 0.62}px "Songti SC", "Noto Serif SC", "Noto Serif TC", serif`;
          c.fillText(label.zh, label.point[0], label.point[1] + size * 0.78);
        }
      }
      c.restore();
      return;
    }
    for (const isl of ISLANDS) {
      const size = isl.id === 'japan' || isl.id === 'frontier' ? 22 : 34;
      c.font = `italic 300 ${size}px "Cormorant Garamond", Georgia, serif`;
      // islands reached by a bridge from the north get their name underneath instead
      const below = isl.id === 'frontier';
      const y = below
        ? isl.cy + isl.ry * edge(isl, Math.PI / 2) + 40
        : isl.cy - isl.ry * edge(isl, -Math.PI / 2) - 26;
      c.fillText(isl.name, isl.cx, y);
    }
    c.restore();
  }

  // ---- entities
  function drawTree(c, it) {
    const s = it.s;
    const x = it.x;
    const y = it.y;
    c.fillStyle = C.inkFaint;
    c.beginPath();
    c.ellipse(x, y + 1, 15 * s, 5 * s, 0, 0, Math.PI * 2);
    c.fill();
    c.strokeStyle = C.ink;
    c.fillStyle = C.bark;
    c.lineWidth = 1.4;
    c.beginPath();
    c.moveTo(x - 3 * s, y);
    c.lineTo(x - 2 * s, y - 20 * s);
    c.lineTo(x + 2 * s, y - 20 * s);
    c.lineTo(x + 3.2 * s, y);
    c.closePath();
    c.fill();
    c.stroke();
    if (it.pine) {
      for (let i = 0; i < 3; i++) {
        const ty = y - 18 * s - i * 13 * s;
        const tw = (17 - i * 4) * s;
        c.fillStyle = i % 2 ? C.pine : C.leafDark;
        c.beginPath();
        c.moveTo(x - tw, ty);
        c.lineTo(x + 0.5, ty - 22 * s);
        c.lineTo(x + tw, ty + 1);
        c.closePath();
        c.fill();
        c.stroke();
      }
    } else {
      const cy = y - 34 * s;
      it.crown.forEach((pts, i) => {
        c.fillStyle = i === 0 ? C.leaf : C.leafDark;
        wobblyPoly(c, pts, x + it.off[i][0] * s, cy + it.off[i][1] * s, s);
        c.fill();
        c.stroke();
      });
      // hatch marks for texture
      c.strokeStyle = 'rgba(42, 39, 35, 0.35)';
      c.lineWidth = 1;
      for (let i = 0; i < 3; i++) inkLine(c, x - 8 * s + i * 6 * s, cy + 2 * s, x - 5 * s + i * 6 * s, cy - 4 * s, 1);
    }
  }

  function drawTuft(c, it) {
    c.strokeStyle = 'rgba(80, 86, 64, 0.75)';
    c.lineWidth = 1.2;
    c.lineCap = 'round';
    const s = it.s;
    for (let i = -1; i <= 1; i++) {
      c.beginPath();
      c.moveTo(it.x + i * 3 * s, it.y);
      c.quadraticCurveTo(it.x + i * 4 * s, it.y - 6 * s, it.x + (i * 5 + it.lean * 8) * s, it.y - 10 * s);
      c.stroke();
    }
  }

  function drawRock(c, it) {
    c.fillStyle = C.inkFaint;
    c.beginPath();
    c.ellipse(it.x, it.y + 2, 11 * it.s, 4 * it.s, 0, 0, Math.PI * 2);
    c.fill();
    c.fillStyle = C.stone;
    c.strokeStyle = C.ink;
    c.lineWidth = 1.3;
    wobblyPoly(c, it.pts, it.x, it.y - 5 * it.s, it.s);
    c.fill();
    c.stroke();
  }

  function drawFlag(c, p, seen) {
    const x = p.x;
    const y = p.y;
    c.fillStyle = C.inkFaint;
    c.beginPath();
    c.ellipse(x, y + 1, 14, 4, 0, 0, Math.PI * 2);
    c.fill();
    c.strokeStyle = C.ink;
    c.lineWidth = 2;
    inkLine(c, x, y, x + 1, y - 46, 2);
    const flutter = Math.sin(clock * 3 + p.x) * 2;
    c.fillStyle = seen ? C.accent : '#f6f2e8';
    c.lineWidth = 1.4;
    c.beginPath();
    c.moveTo(x + 1, y - 46);
    c.quadraticCurveTo(x + 14, y - 44 + flutter, x + 24, y - 39 + flutter);
    c.quadraticCurveTo(x + 13, y - 35, x + 1, y - 32);
    c.closePath();
    c.fill();
    c.stroke();
    // small stones at the base
    c.fillStyle = C.stone;
    c.beginPath();
    c.ellipse(x - 5, y, 4, 2.5, 0, 0, Math.PI * 2);
    c.ellipse(x + 5, y + 1, 3.5, 2.2, 0, 0, Math.PI * 2);
    c.fill();
    c.lineWidth = 1;
    c.stroke();
  }

  function drawHouse(c, p, seen) {
    const x = p.x;
    const y = p.y;
    c.fillStyle = C.inkFaint;
    c.beginPath();
    c.ellipse(x, y + 2, 32, 7, 0, 0, Math.PI * 2);
    c.fill();
    c.strokeStyle = C.ink;
    c.lineWidth = 1.6;
    c.fillStyle = C.wall;
    c.beginPath();
    c.rect(x - 22, y - 30, 44, 30);
    c.fill();
    c.stroke();
    c.fillStyle = seen ? C.accent : C.roof;
    c.beginPath();
    c.moveTo(x - 29, y - 28);
    c.lineTo(x, y - 52);
    c.lineTo(x + 29, y - 28);
    c.closePath();
    c.fill();
    c.stroke();
    // chimney
    c.fillStyle = C.wall;
    c.fillRect(x + 7, y - 52, 7, 12);
    c.strokeRect(x + 7, y - 52, 7, 12);
    // door + window, window glows at night
    c.fillStyle = C.bark;
    c.fillRect(x - 5, y - 16, 10, 16);
    c.strokeRect(x - 5, y - 16, 10, 16);
    c.fillStyle = nightAmount() > 0.15 ? C.fire : '#cfd6d0';
    c.fillRect(x + 9, y - 22, 8, 7);
    c.strokeRect(x + 9, y - 22, 8, 7);
    c.fillRect(x - 17, y - 22, 8, 7);
    c.strokeRect(x - 17, y - 22, 8, 7);
  }

  function drawHall(c, p, seen) {
    const x = p.x;
    const y = p.y;
    c.fillStyle = C.inkFaint;
    c.beginPath();
    c.ellipse(x, y + 2, 44, 8, 0, 0, Math.PI * 2);
    c.fill();
    c.strokeStyle = C.ink;
    c.lineWidth = 1.6;
    c.fillStyle = C.wall;
    c.fillRect(x - 36, y - 36, 72, 36);
    c.strokeRect(x - 36, y - 36, 72, 36);
    // pediment
    c.fillStyle = seen ? C.accent : '#d7ccb4';
    c.beginPath();
    c.moveTo(x - 41, y - 36);
    c.lineTo(x, y - 58);
    c.lineTo(x + 41, y - 36);
    c.closePath();
    c.fill();
    c.stroke();
    // columns
    c.lineWidth = 1.2;
    for (let i = -3; i <= 3; i++) {
      if (i === 0) continue;
      inkLine(c, x + i * 10, y - 34, x + i * 10, y - 2, 1.2);
    }
    c.fillStyle = C.bark;
    c.fillRect(x - 6, y - 18, 12, 18);
    c.strokeRect(x - 6, y - 18, 12, 18);
    // steps
    c.lineWidth = 1;
    inkLine(c, x - 40, y + 3, x + 40, y + 3, 1);
    // chimney for smoke
    c.fillStyle = C.wall;
    c.fillRect(x + 15, y - 62, 6, 12);
    c.strokeRect(x + 15, y - 62, 6, 12);
  }

  function drawOffice(c, p, seen) {
    const x = p.x;
    const y = p.y;
    c.fillStyle = C.inkFaint;
    c.beginPath();
    c.ellipse(x, y + 2, 30, 7, 0, 0, Math.PI * 2);
    c.fill();
    c.strokeStyle = C.ink;
    c.lineWidth = 1.6;
    c.fillStyle = '#e4e6e2';
    c.fillRect(x - 22, y - 62, 44, 62);
    c.strokeRect(x - 22, y - 62, 44, 62);
    c.lineWidth = 1;
    const lit = nightAmount() > 0.15;
    for (let r = 0; r < 5; r++) {
      for (let k = 0; k < 3; k++) {
        c.fillStyle = lit && (r + k) % 2 ? C.fire : '#c3cbcb';
        c.fillRect(x - 16 + k * 12, y - 56 + r * 11, 8, 6);
      }
    }
    c.fillStyle = seen ? C.accent : C.ink;
    c.fillRect(x - 22, y - 66, 44, 4);
  }

  function drawCamp(c, p) {
    const x = p.x;
    const y = p.y;
    // tent
    c.fillStyle = C.inkFaint;
    c.beginPath();
    c.ellipse(x - 14, y + 2, 34, 7, 0, 0, Math.PI * 2);
    c.fill();
    c.strokeStyle = C.ink;
    c.lineWidth = 1.6;
    c.fillStyle = '#d8c7a2';
    c.beginPath();
    c.moveTo(x - 46, y);
    c.lineTo(x - 14, y - 44);
    c.lineTo(x + 18, y);
    c.closePath();
    c.fill();
    c.stroke();
    c.fillStyle = C.ink;
    c.beginPath();
    c.moveTo(x - 20, y);
    c.lineTo(x - 14, y - 26);
    c.lineTo(x - 8, y);
    c.closePath();
    c.fill();
    // banner
    inkLine(c, x - 14, y - 44, x - 14, y - 66, 1.6);
    c.fillStyle = C.accent;
    c.beginPath();
    c.moveTo(x - 14, y - 66);
    c.lineTo(x + 6, y - 61 + Math.sin(clock * 3) * 1.5);
    c.lineTo(x - 14, y - 56);
    c.closePath();
    c.fill();
    c.stroke();
    // campfire
    const fx = x + 30;
    const fy = y - 2;
    c.fillStyle = C.stone;
    for (let i = 0; i < 7; i++) {
      const t = (i / 7) * Math.PI * 2;
      c.beginPath();
      c.ellipse(fx + Math.cos(t) * 11, fy + Math.sin(t) * 4.5, 3.4, 2.4, 0, 0, Math.PI * 2);
      c.fill();
      c.lineWidth = 0.8;
      c.stroke();
    }
    const fl = 1 + Math.sin(clock * 17) * 0.12 + Math.sin(clock * 9.3) * 0.1;
    c.fillStyle = C.fire;
    c.beginPath();
    c.moveTo(fx - 7, fy);
    c.quadraticCurveTo(fx - 6, fy - 12 * fl, fx, fy - 20 * fl);
    c.quadraticCurveTo(fx + 6, fy - 12 * fl, fx + 7, fy);
    c.closePath();
    c.fill();
    c.lineWidth = 1.2;
    c.stroke();
    c.fillStyle = '#f6e3a8';
    c.beginPath();
    c.moveTo(fx - 3, fy);
    c.quadraticCurveTo(fx - 2, fy - 7 * fl, fx, fy - 11 * fl);
    c.quadraticCurveTo(fx + 2, fy - 7 * fl, fx + 3, fy);
    c.fill();
  }

  // ---- Home buildings
  function shadow(c, x, y, rx, ry) {
    c.fillStyle = C.inkFaint;
    c.beginPath();
    c.ellipse(x, y + 2, rx, ry, 0, 0, Math.PI * 2);
    c.fill();
  }

  // A tall arcade cabinet with a flickering pixel screen and a string of pennants
  function drawArcade(c, p) {
    const x = p.x;
    const y = p.y;
    shadow(c, x, y, 40, 8);
    c.strokeStyle = C.ink;
    c.lineWidth = 1.6;
    // cabinet body
    c.fillStyle = '#4f5b52';
    c.beginPath();
    c.moveTo(x - 26, y);
    c.lineTo(x - 26, y - 70);
    c.lineTo(x - 20, y - 96);
    c.lineTo(x + 20, y - 96);
    c.lineTo(x + 26, y - 70);
    c.lineTo(x + 26, y);
    c.closePath();
    c.fill();
    c.stroke();
    // marquee
    c.fillStyle = '#f2e6c4';
    c.fillRect(x - 20, y - 94, 40, 12);
    c.strokeRect(x - 20, y - 94, 40, 12);
    c.fillStyle = C.ink;
    c.font = '600 8px Inter, sans-serif';
    c.textAlign = 'center';
    c.fillText('PLAY', x, y - 85);
    // screen: a little pixel landscape that scrolls
    c.fillStyle = '#20302c';
    c.fillRect(x - 18, y - 78, 36, 28);
    c.strokeRect(x - 18, y - 78, 36, 28);
    const lit = 0.75 + Math.sin(clock * 9) * 0.05;
    c.save();
    c.beginPath();
    c.rect(x - 17, y - 77, 34, 26);
    c.clip();
    const scroll = (clock * 10) % 6;
    for (let i = 0; i < 8; i++) {
      const hgt = 3 + ((i * 7) % 5);
      c.fillStyle = `rgba(160, 205, 150, ${lit})`;
      c.fillRect(x - 18 + i * 6 - scroll, y - 51 - hgt, 5, hgt);
    }
    const jump = Math.abs(Math.sin(clock * 3)) * 7;
    c.fillStyle = `rgba(226, 161, 74, ${lit + 0.1})`;
    c.fillRect(x - 8, y - 62 - jump, 4, 4);
    c.fillStyle = 'rgba(246, 227, 168, 0.9)';
    c.fillRect(x + 6 - ((clock * 14) % 30), y - 70, 2, 2);
    c.restore();
    // control panel
    c.fillStyle = '#3e4842';
    c.beginPath();
    c.moveTo(x - 26, y - 46);
    c.lineTo(x + 26, y - 46);
    c.lineTo(x + 30, y - 38);
    c.lineTo(x - 30, y - 38);
    c.closePath();
    c.fill();
    c.stroke();
    c.lineWidth = 1.4;
    inkLine(c, x - 14, y - 43, x - 14, y - 52, 1.6);
    c.fillStyle = C.accent;
    c.beginPath();
    c.arc(x - 14, y - 53, 3, 0, Math.PI * 2);
    c.fill();
    c.stroke();
    for (let i = 0; i < 3; i++) {
      c.fillStyle = i === 1 ? C.fire : '#f2e6c4';
      c.beginPath();
      c.arc(x + 4 + i * 7, y - 42, 2.4, 0, Math.PI * 2);
      c.fill();
      c.stroke();
    }
    // coin slot
    c.fillStyle = C.ink;
    c.fillRect(x - 3, y - 26, 6, 9);
    // pennant string from cabinet to a pole
    c.lineWidth = 1;
    c.strokeStyle = C.inkSoft;
    c.beginPath();
    c.moveTo(x + 20, y - 96);
    c.quadraticCurveTo(x + 46, y - 80, x + 64, y - 86);
    c.stroke();
    inkLine(c, x + 64, y, x + 64, y - 90, 1.6);
    for (let i = 0; i < 4; i++) {
      const t = (i + 0.5) / 4;
      const px = x + 20 + t * 44;
      const py = y - 96 + Math.sin(t * Math.PI) * 13 + t * 10;
      c.fillStyle = i % 2 ? C.accent : '#f2e6c4';
      c.beginPath();
      c.moveTo(px - 4, py);
      c.lineTo(px + 4, py);
      c.lineTo(px, py + 8 + Math.sin(clock * 4 + i) * 1);
      c.closePath();
      c.fill();
      c.lineWidth = 0.8;
      c.strokeStyle = C.ink;
      c.stroke();
    }
  }

  // A giant gramophone: a wooden box, a spinning record and a flower-shaped brass horn
  function drawGramophone(c, p) {
    const x = p.x;
    const y = p.y;
    shadow(c, x, y, 46, 9);
    c.strokeStyle = C.ink;
    c.lineWidth = 1.6;
    c.fillStyle = '#7a5a40';
    c.fillRect(x - 34, y - 34, 68, 34);
    c.strokeRect(x - 34, y - 34, 68, 34);
    c.lineWidth = 1;
    inkLine(c, x - 30, y - 12, x + 30, y - 12, 1);
    c.fillStyle = '#c9a35a';
    c.beginPath();
    c.arc(x + 22, y - 22, 3, 0, Math.PI * 2);
    c.fill();
    c.stroke();
    // record
    c.fillStyle = '#1f1d1a';
    c.beginPath();
    c.ellipse(x - 4, y - 36, 28, 8, 0, 0, Math.PI * 2);
    c.fill();
    c.lineWidth = 1.4;
    c.stroke();
    const spin = clock * 4;
    c.strokeStyle = 'rgba(246, 242, 232, 0.35)';
    c.lineWidth = 1;
    c.beginPath();
    c.ellipse(x - 4, y - 36, 18, 5, 0, spin, spin + 1.2);
    c.stroke();
    c.fillStyle = C.accent;
    c.beginPath();
    c.ellipse(x - 4, y - 36, 6, 2, 0, 0, Math.PI * 2);
    c.fill();
    // neck + horn
    c.strokeStyle = C.ink;
    c.lineWidth = 1.6;
    c.fillStyle = '#c9a35a';
    c.beginPath();
    c.moveTo(x + 14, y - 38);
    c.quadraticCurveTo(x + 18, y - 60, x + 6, y - 72);
    c.lineTo(x + 12, y - 76);
    c.quadraticCurveTo(x + 26, y - 62, x + 20, y - 38);
    c.closePath();
    c.fill();
    c.stroke();
    // bell, drawn as six petals
    const bx = x + 10;
    const by = y - 92;
    c.fillStyle = '#d8b46a';
    c.beginPath();
    for (let i = 0; i <= 12; i++) {
      const t = (i / 12) * Math.PI * 2;
      const r = i % 2 ? 26 : 31;
      const px = bx + Math.cos(t) * r * 0.95;
      const py = by + Math.sin(t) * r * 0.62;
      i ? c.lineTo(px, py) : c.moveTo(px, py);
    }
    c.closePath();
    c.fill();
    c.stroke();
    c.fillStyle = '#4a3a24';
    c.beginPath();
    c.ellipse(bx, by, 11, 7, 0, 0, Math.PI * 2);
    c.fill();
    c.stroke();
    c.strokeStyle = 'rgba(42, 39, 35, 0.45)';
    c.lineWidth = 1;
    for (let i = 0; i < 6; i++) {
      const t = (i / 6) * Math.PI * 2 + 0.3;
      inkLine(c, bx + Math.cos(t) * 12, by + Math.sin(t) * 7.5, bx + Math.cos(t) * 26, by + Math.sin(t) * 16, 1);
    }
  }

  // A standing-stone arch holding a slow ink whirlpool
  function drawPortal(c, p) {
    const x = p.x;
    const y = p.y;
    shadow(c, x, y, 44, 9);
    c.strokeStyle = C.ink;
    c.lineWidth = 1.6;
    // whirl
    c.save();
    c.beginPath();
    c.ellipse(x, y - 44, 22, 36, 0, 0, Math.PI * 2);
    c.fillStyle = '#3b5d5d';
    c.fill();
    c.clip();
    c.lineCap = 'round';
    for (let k = 0; k < 3; k++) {
      c.strokeStyle = `rgba(214, 232, 222, ${0.55 - k * 0.14})`;
      c.lineWidth = 1.6 - k * 0.3;
      c.beginPath();
      for (let i = 0; i < 60; i++) {
        const t = i / 60;
        const ang = t * Math.PI * 5 + clock * (1.4 + k * 0.4) + k * 2;
        const r = 2 + t * 24;
        const px = x + Math.cos(ang) * r * 0.85;
        const py = y - 44 + Math.sin(ang) * r * 1.4;
        i ? c.lineTo(px, py) : c.moveTo(px, py);
      }
      c.stroke();
    }
    c.restore();
    c.strokeStyle = C.ink;
    c.lineWidth = 1.6;
    c.beginPath();
    c.ellipse(x, y - 44, 22, 36, 0, 0, Math.PI * 2);
    c.stroke();
    // stones
    c.fillStyle = '#a59d8b';
    const stone = (sx, sy, w, h) => {
      c.beginPath();
      c.moveTo(sx - w / 2 + 2, sy);
      c.lineTo(sx - w / 2, sy - h + 4);
      c.lineTo(sx - w / 2 + 3, sy - h);
      c.lineTo(sx + w / 2 - 2, sy - h + 2);
      c.lineTo(sx + w / 2, sy - 3);
      c.closePath();
      c.fill();
      c.stroke();
    };
    stone(x - 30, y, 16, 86);
    stone(x + 30, y, 16, 84);
    c.beginPath();
    c.moveTo(x - 42, y - 84);
    c.lineTo(x - 38, y - 98);
    c.lineTo(x + 40, y - 96);
    c.lineTo(x + 43, y - 83);
    c.closePath();
    c.fill();
    c.stroke();
    // carved marks
    c.lineWidth = 1;
    c.strokeStyle = 'rgba(42, 39, 35, 0.5)';
    inkLine(c, x - 33, y - 60, x - 27, y - 54, 1);
    inkLine(c, x - 33, y - 40, x - 28, y - 44, 1);
    inkLine(c, x + 27, y - 66, x + 33, y - 62, 1);
    inkLine(c, x - 8, y - 92, x + 8, y - 92, 1);
  }

  // ---- shared image cache (covers load only when first seen)
  const IMGS = new Map();
  function image(src, fallback) {
    let im = IMGS.get(src);
    if (!im) {
      im = new Image();
      im.decoding = 'async';
      im.onerror = () => {
        if (fallback && im.src.indexOf(fallback) < 0) im.src = fallback;
      };
      im.src = src;
      IMGS.set(src, im);
    }
    return im;
  }
  function drawImageIn(c, im, x, y, w, h) {
    if (!im.complete || !im.naturalWidth) {
      c.fillStyle = '#d9d2c1';
      c.fillRect(x, y, w, h);
      return;
    }
    // cover-fit
    const r = Math.max(w / im.naturalWidth, h / im.naturalHeight);
    const sw = w / r;
    const sh = h / r;
    c.drawImage(im, (im.naturalWidth - sw) / 2, (im.naturalHeight - sh) / 2, sw, sh, x, y, w, h);
  }

  const STATUS_COLOR = { playing: C.fire, main: '#6c8a6a', complete: '#c9a35a' };

  // A game: its cover on a little wooden easel, with a ribbon for its status
  function drawEasel(c, p) {
    const x = p.x;
    const y = p.y;
    shadow(c, x, y, 26, 6);
    c.strokeStyle = C.ink;
    c.lineWidth = 1.6;
    c.lineCap = 'round';
    inkLine(c, x - 18, y, x - 8, y - 64, 2);
    inkLine(c, x + 18, y, x + 8, y - 64, 2);
    inkLine(c, x, y - 4, x, y - 50, 1.6);
    const fw = 70;
    const fh = 38;
    const fx = x - fw / 2;
    const fy = y - 70;
    c.fillStyle = '#8a6d4f';
    c.fillRect(fx - 4, fy - 4, fw + 8, fh + 8);
    c.strokeRect(fx - 4, fy - 4, fw + 8, fh + 8);
    drawImageIn(c, image(p.thumb, p.image), fx, fy, fw, fh);
    c.lineWidth = 1;
    c.strokeRect(fx, fy, fw, fh);
    c.lineWidth = 1.6;
    inkLine(c, fx - 8, fy + fh + 6, fx + fw + 8, fy + fh + 6, 2);
    if (p.status) {
      c.fillStyle = STATUS_COLOR[p.status] || C.accent;
      c.beginPath();
      c.moveTo(fx + fw - 6, fy - 6);
      c.lineTo(fx + fw + 4, fy - 6);
      c.lineTo(fx + fw + 4, fy + 14);
      c.lineTo(fx + fw - 1, fy + 9);
      c.lineTo(fx + fw - 6, fy + 14);
      c.closePath();
      c.fill();
      c.lineWidth = 1;
      c.stroke();
    }
  }

  // An album: a sleeve on a crate with the record sliding out
  const SLEEVES = ['#8a4b3a', '#5f6a55', '#3b5d5d', '#c9a35a', '#6d5a7a', '#2a2723', '#b0704a', '#7d8a9a'];
  function drawRecord(c, p) {
    const x = p.x;
    const y = p.y;
    shadow(c, x, y, 26, 6);
    c.strokeStyle = C.ink;
    c.lineWidth = 1.5;
    c.fillStyle = '#9a7b58';
    c.fillRect(x - 24, y - 16, 48, 16);
    c.strokeRect(x - 24, y - 16, 48, 16);
    c.lineWidth = 1;
    inkLine(c, x - 22, y - 8, x + 22, y - 8, 1);
    // record peeking out, slowly turning
    const spin = clock * 1.5 + p.seed;
    c.fillStyle = '#1f1d1a';
    c.beginPath();
    c.arc(x + 21, y - 38, 19, 0, Math.PI * 2);
    c.fill();
    c.lineWidth = 1.3;
    c.stroke();
    c.strokeStyle = 'rgba(246, 242, 232, 0.3)';
    c.lineWidth = 1;
    c.beginPath();
    c.arc(x + 21, y - 38, 12, spin, spin + 1.1);
    c.stroke();
    const cover = albumCover(p);
    // centre label: the cover, cropped round and turning with the record
    c.save();
    c.beginPath();
    c.arc(x + 21, y - 38, 7, 0, Math.PI * 2);
    c.clip();
    if (cover && cover.complete && cover.naturalWidth) {
      c.translate(x + 21, y - 38);
      c.rotate(spin);
      c.drawImage(cover, -7, -7, 14, 14);
    } else {
      c.fillStyle = SLEEVES[(p.seed * 7) % SLEEVES.length | 0];
      c.fillRect(x + 14, y - 45, 14, 14);
    }
    c.restore();
    // sleeve: the album cover when it has loaded, a plain coloured sleeve until then
    c.strokeStyle = C.ink;
    c.lineWidth = 1.5;
    if (cover && cover.complete && cover.naturalWidth) {
      c.drawImage(cover, x - 22, y - 58, 40, 40);
      c.strokeRect(x - 22, y - 58, 40, 40);
    } else {
      c.fillStyle = SLEEVES[p.seed % SLEEVES.length];
      c.fillRect(x - 22, y - 58, 40, 40);
      c.strokeRect(x - 22, y - 58, 40, 40);
      c.strokeStyle = 'rgba(246, 242, 232, 0.5)';
      c.lineWidth = 1;
      c.beginPath();
      c.arc(x - 2, y - 38, 9 + (p.seed % 3) * 2, 0, Math.PI * 2);
      c.stroke();
    }
  }

  // Album covers: a local copy first (images/thumbs/albums/<id>.jpg, made by
  // tools/fetch_album_covers.py). An album that has no local copy yet asks Spotify's
  // oEmbed endpoint (it allows cross-origin requests) and remembers the answer in localStorage.
  const COVER_KEY = 'mylife-covers';
  let coverCache = {};
  try {
    coverCache = JSON.parse(localStorage.getItem(COVER_KEY) || '{}');
  } catch (e) {}
  let coverInflight = 0;
  function remoteCover(p, id) {
    if (coverCache[id]) {
      p.coverImg = image(coverCache[id]);
      return;
    }
    if (p.coverAsked || coverInflight >= 6) return;
    p.coverAsked = true;
    coverInflight++;
    fetch('https://open.spotify.com/oembed?url=' + encodeURIComponent('https://open.spotify.com/album/' + id))
      .then((r) => r.json())
      .then((d) => {
        if (!d.thumbnail_url) return;
        coverCache[id] = d.thumbnail_url;
        try {
          localStorage.setItem(COVER_KEY, JSON.stringify(coverCache));
        } catch (e) {}
        p.coverImg = image(d.thumbnail_url);
      })
      .catch(() => {})
      .finally(() => {
        coverInflight--;
      });
  }
  function albumCover(p) {
    if (p.coverImg) return p.coverImg;
    const m = /\/album\/([A-Za-z0-9]+)/.exec(p.embed || '');
    if (!m) return null;
    const id = m[1];
    if (!p.localTried) {
      p.localTried = true;
      const local = new Image();
      local.decoding = 'async';
      local.onerror = () => {
        p.coverImg = null;
        remoteCover(p, id);
      };
      local.src = '../images/thumbs/albums/' + id + '.jpg';
      p.coverImg = local;
      return local;
    }
    remoteCover(p, id);
    return p.coverImg || null;
  }

  // An old desktop computer on a little desk; it opens the plain web page
  function drawComputer(c, p) {
    const x = p.x;
    const y = p.y;
    shadow(c, x, y, 34, 7);
    c.strokeStyle = C.ink;
    c.lineWidth = 1.6;
    // desk
    c.fillStyle = '#8a6d4f';
    c.fillRect(x - 32, y - 30, 64, 8);
    c.strokeRect(x - 32, y - 30, 64, 8);
    c.fillRect(x - 28, y - 22, 5, 22);
    c.strokeRect(x - 28, y - 22, 5, 22);
    c.fillRect(x + 23, y - 22, 5, 22);
    c.strokeRect(x + 23, y - 22, 5, 22);
    // monitor
    c.fillStyle = '#e6dfcf';
    c.fillRect(x - 22, y - 70, 40, 34);
    c.strokeRect(x - 22, y - 70, 40, 34);
    c.fillRect(x - 6, y - 36, 8, 6);
    c.strokeRect(x - 6, y - 36, 8, 6);
    // glowing screen with a blinking cursor
    c.fillStyle = '#2f4a44';
    c.fillRect(x - 18, y - 66, 32, 25);
    c.fillStyle = 'rgba(170, 220, 180, 0.85)';
    for (let i = 0; i < 3; i++) c.fillRect(x - 15, y - 62 + i * 6, 14 + ((i * 7) % 10), 2);
    if (Math.floor(clock * 2) % 2) c.fillRect(x - 15, y - 45, 4, 2);
    c.lineWidth = 1;
    c.strokeRect(x - 18, y - 66, 32, 25);
    // keyboard
    c.fillStyle = '#d6ceb9';
    c.beginPath();
    c.moveTo(x - 18, y - 30);
    c.lineTo(x + 14, y - 30);
    c.lineTo(x + 18, y - 26);
    c.lineTo(x - 22, y - 26);
    c.closePath();
    c.fill();
    c.stroke();
  }

  // A carved stone tablet for introductions
  function drawStele(c, p) {
    const x = p.x;
    const y = p.y;
    shadow(c, x, y, 30, 7);
    c.strokeStyle = C.ink;
    c.lineWidth = 1.6;
    c.fillStyle = '#b9b19e';
    c.beginPath();
    c.moveTo(x - 24, y);
    c.lineTo(x - 22, y - 52);
    c.quadraticCurveTo(x, y - 66, x + 22, y - 52);
    c.lineTo(x + 24, y);
    c.closePath();
    c.fill();
    c.stroke();
    c.lineWidth = 1;
    c.strokeStyle = 'rgba(42, 39, 35, 0.5)';
    for (let i = 0; i < 4; i++) inkLine(c, x - 14, y - 44 + i * 9, x + 14 - (i % 2) * 6, y - 44 + i * 9, 1);
  }

  // A wooden signpost that carries its own words
  function drawSign(c, p) {
    const x = p.x;
    const y = p.y;
    c.save();
    c.font = 'italic 400 19px "Cormorant Garamond", Georgia, serif';
    const w = c.measureText(p.title).width + 28;
    shadow(c, x, y, 18, 5);
    c.strokeStyle = C.ink;
    c.lineWidth = 1.6;
    c.fillStyle = C.bark;
    c.fillRect(x - 3, y - 46, 6, 46);
    c.strokeRect(x - 3, y - 46, 6, 46);
    c.fillStyle = '#c8ad84';
    c.beginPath();
    c.moveTo(x - w / 2, y - 66);
    c.lineTo(x + w / 2 - 8, y - 66);
    c.lineTo(x + w / 2, y - 56);
    c.lineTo(x + w / 2 - 8, y - 46);
    c.lineTo(x - w / 2, y - 46);
    c.closePath();
    c.fill();
    c.stroke();
    c.fillStyle = C.ink;
    c.textAlign = 'center';
    c.fillText(p.title, x - 3, y - 50);
    c.restore();
  }

  function drawCompass(c) {
    if (sceneName !== 'world') return;
    const [x, y] = SCENES.world.compass;
    c.save();
    c.strokeStyle = 'rgba(42, 39, 35, 0.45)';
    c.fillStyle = 'rgba(42, 39, 35, 0.45)';
    c.lineWidth = 1.2;
    c.beginPath();
    c.arc(x, y, 46, 0, Math.PI * 2);
    c.stroke();
    c.beginPath();
    c.arc(x, y, 40, 0, Math.PI * 2);
    c.stroke();
    for (let i = 0; i < 4; i++) {
      const a = (i * Math.PI) / 2 - Math.PI / 2;
      c.beginPath();
      c.moveTo(x + Math.cos(a) * 58, y + Math.sin(a) * 58);
      c.lineTo(x + Math.cos(a + 0.5) * 12, y + Math.sin(a + 0.5) * 12);
      c.lineTo(x + Math.cos(a - 0.5) * 12, y + Math.sin(a - 0.5) * 12);
      c.closePath();
      i === 0 ? c.fill() : c.stroke();
    }
    c.font = 'italic 400 20px "Cormorant Garamond", Georgia, serif';
    c.textAlign = 'center';
    c.fillText('N', x, y - 66);
    c.restore();
  }

  // Hui's homepage self-portrait, drawn as a three-direction character atlas.
  function drawHui(c) {
    c.save();
    c.translate(player.x, player.y);
    c.scale(1.2, 1.2);
    c.translate(-player.x, -player.y);
    drawHuiBody(c);
    if (sceneName === 'world' && !onLand(player.x, player.y)) {
      // The hull covers Hui's feet; the same controls work on land and water.
      const x = player.x, y = player.y + Math.sin(clock * 2) * 1.5;
      c.fillStyle = '#cbb894';
      c.strokeStyle = C.ink;
      c.lineWidth = 1.5;
      c.beginPath();
      c.moveTo(x - 25, y - 9);
      c.quadraticCurveTo(x, y - 3, x + 25, y - 9);
      c.quadraticCurveTo(x + 16, y + 11, x, y + 12);
      c.quadraticCurveTo(x - 18, y + 10, x - 25, y - 9);
      c.closePath();
      c.fill();
      c.stroke();
      c.strokeStyle = C.waterLine;
      inkLine(c, x - 31, y + 17, x + 31, y + 17, 1.2);
    }
    c.restore();
  }

  function drawHuiBody(c) {
    if (!huiSprite.frames) {
      drawHuiFallback(c);
      return;
    }
    const sailing = sceneName === 'world' && !onLand(player.x, player.y);
    const walking = player.moving && !sailing;
    const row = player.face === 'up' ? 2 : player.face === 'side' ? 1 : 0;
    const blink = !quietMotion.matches && clock % 4.2 < 0.14;
    const column = walking ? [0, 1, 0, 2][Math.floor(player.phase * 2 / Math.PI) % 4] : blink ? 3 : 0;
    const pose = huiSprite.frames[row][column];
    const scale = 64 / pose.bodyHeight;
    const bob = quietMotion.matches ? 0 : walking
      ? -Math.abs(Math.sin(player.phase)) * (player.running ? 2.5 : 1.2)
      : Math.sin(clock * 2) * 0.35;

    c.fillStyle = C.inkFaint;
    c.beginPath();
    c.ellipse(player.x, player.y + 1, 12, 4, 0, 0, Math.PI * 2);
    c.fill();
    c.save();
    c.translate(player.x, player.y + bob);
    if (row === 1 && player.dir < 0) c.scale(-1, 1);
    if (walking && player.running && row === 1 && !quietMotion.matches) c.rotate(0.06);
    c.imageSmoothingEnabled = true;
    c.imageSmoothingQuality = 'high';
    // Each frame is measured from its soles so changes of pose cannot shift
    // the character's collision point or make it slide across the map.
    c.drawImage(huiSprite.image, pose.x, pose.y, pose.width, pose.height,
      -pose.anchorX * scale, -pose.anchorY * scale, pose.width * scale, pose.height * scale);
    c.restore();
  }

  function drawHuiFallback(c) {
    const run = player.running;
    // leaning into the run
    const lean = run && player.face === 'side' ? player.dir * 2.5 : 0;
    const x = player.x + lean;
    const bob = player.moving ? -Math.abs(Math.sin(player.phase)) * (run ? 4 : 2.2) : Math.sin(clock * 2) * 0.5;
    const y = player.y + bob;
    const sw = player.moving ? Math.sin(player.phase) * (run ? 1.7 : 1) : 0;
    const side = player.face === 'side';
    const back = player.face === 'up';
    const d = player.dir;

    c.fillStyle = C.inkFaint;
    c.beginPath();
    c.ellipse(player.x, player.y + 1, 12, 4, 0, 0, Math.PI * 2);
    c.fill();

    c.strokeStyle = C.ink;
    c.lineCap = 'round';
    c.lineJoin = 'round';
    // legs
    c.lineWidth = 3;
    inkLine(c, x - 3, y - 11, x - 3 + sw * 4, y - 1, 3);
    inkLine(c, x + 3, y - 11, x + 3 - sw * 4, y - 1, 3);
    // body
    c.fillStyle = C.sweater;
    c.lineWidth = 1.4;
    c.beginPath();
    c.moveTo(x - 8, y - 27);
    c.lineTo(x + 8, y - 27);
    c.lineTo(x + 9, y - 10);
    c.lineTo(x - 9, y - 10);
    c.closePath();
    c.fill();
    c.stroke();
    // arms: loose when walking, bent and pumping when running
    c.lineWidth = 2.6;
    if (run) {
      inkLine(c, x - 8, y - 24, x - 12 - sw * 2.5, y - 19, 2.6);
      inkLine(c, x - 12 - sw * 2.5, y - 19, x - 9 - sw * 3.5, y - 13, 2.6);
      inkLine(c, x + 8, y - 24, x + 12 + sw * 2.5, y - 19, 2.6);
      inkLine(c, x + 12 + sw * 2.5, y - 19, x + 9 + sw * 3.5, y - 13, 2.6);
      // hair streaming back
      c.fillStyle = C.hair;
      const hb = player.face === 'side' ? -player.dir : 0;
      c.beginPath();
      c.moveTo(x + hb * 10, y - 46);
      c.quadraticCurveTo(x + hb * 22, y - 38 + sw, x + hb * 16, y - 28);
      c.lineTo(x + hb * 8, y - 32);
      c.closePath();
      if (hb) c.fill();
    } else {
      inkLine(c, x - 8, y - 24, x - 11 - sw * 2, y - 13, 2.6);
      inkLine(c, x + 8, y - 24, x + 11 + sw * 2, y - 13, 2.6);
    }

    const hx = x + (side ? d * 1.5 : 0);
    const hy = y - 40;
    // hair, back layer (falls to the shoulders)
    c.fillStyle = C.hair;
    c.beginPath();
    c.moveTo(hx - 15, hy - 2);
    c.quadraticCurveTo(hx - 17, hy - 18, hx, hy - 18);
    c.quadraticCurveTo(hx + 17, hy - 18, hx + 15, hy - 2);
    c.quadraticCurveTo(hx + 16, hy + 10, hx + 12, hy + 15);
    c.lineTo(hx - 12, hy + 15);
    c.quadraticCurveTo(hx - 16, hy + 10, hx - 15, hy - 2);
    c.closePath();
    c.fill();
    c.lineWidth = 1.4;
    c.stroke();
    if (back) {
      // a few strands
      c.strokeStyle = 'rgba(246, 242, 232, 0.35)';
      c.lineWidth = 1;
      inkLine(c, hx - 5, hy - 12, hx - 7, hy + 10, 1);
      inkLine(c, hx + 4, hy - 13, hx + 6, hy + 11, 1);
      return;
    }
    // face
    const fx = hx + (side ? d * 3 : 0);
    c.fillStyle = C.skin;
    c.strokeStyle = C.ink;
    c.beginPath();
    c.ellipse(fx, hy + 2, 10.5, 10, 0, 0, Math.PI * 2);
    c.fill();
    c.lineWidth = 1.3;
    c.stroke();
    // fringe: swept with a side part, like the doodle
    c.fillStyle = C.hair;
    c.beginPath();
    c.moveTo(fx - 11, hy + 2);
    c.quadraticCurveTo(fx - 11, hy - 11, fx + 1, hy - 11);
    c.quadraticCurveTo(fx + 11, hy - 11, fx + 11, hy - 1);
    c.quadraticCurveTo(fx + 4, hy - 6, fx - 2, hy - 4);
    c.quadraticCurveTo(fx - 7, hy - 2, fx - 11, hy + 2);
    c.closePath();
    c.fill();
    // glasses
    c.strokeStyle = C.ink;
    c.lineWidth = 1.3;
    const gx = side ? d * 1.5 : 0;
    c.beginPath();
    c.arc(fx - 4.5 + gx, hy + 2, 3.6, 0, Math.PI * 2);
    c.moveTo(fx + 8.1 + gx, hy + 2);
    c.arc(fx + 4.5 + gx, hy + 2, 3.6, 0, Math.PI * 2);
    c.stroke();
    inkLine(c, fx - 1 + gx, hy + 1.6, fx + 1 + gx, hy + 1.6, 1);
    // eyes (blink now and then)
    const blink = (clock % 4.2) < 0.12;
    c.fillStyle = C.ink;
    if (blink) {
      inkLine(c, fx - 6 + gx, hy + 2, fx - 3 + gx, hy + 2, 1);
      inkLine(c, fx + 3 + gx, hy + 2, fx + 6 + gx, hy + 2, 1);
    } else {
      c.beginPath();
      c.arc(fx - 4.2 + gx, hy + 2.4, 1.2, 0, Math.PI * 2);
      c.arc(fx + 4.8 + gx, hy + 2.4, 1.2, 0, Math.PI * 2);
      c.fill();
    }
    // the little ":3" mouth from the self-portrait
    c.lineWidth = 1;
    c.beginPath();
    c.moveTo(fx - 2.2 + gx, hy + 7);
    c.quadraticCurveTo(fx - 1.1 + gx, hy + 8.6, fx + gx, hy + 7);
    c.quadraticCurveTo(fx + 1.1 + gx, hy + 8.6, fx + 2.2 + gx, hy + 7);
    c.stroke();
  }

  const homeLift = () => quietMotion.matches ? 0 : Math.sin(clock * 0.55) * 2.8;

  function drawHomeSky(c, view, animate = true) {
    const width = view.x1 - view.x0;
    const height = view.y1 - view.y0;
    c.fillStyle = '#c3d8ed';
    c.fillRect(view.x0, view.y0, width, height);
    if (!homeArt.sky.complete || !homeArt.sky.naturalWidth) return;
    // Cover the viewport at every zoom; extra bleed leaves room for slow drift.
    const scale = Math.max(width / homeArt.sky.naturalWidth, height / homeArt.sky.naturalHeight) * 1.12;
    const w = homeArt.sky.naturalWidth * scale;
    const h = homeArt.sky.naturalHeight * scale;
    const moving = animate && !quietMotion.matches;
    const driftX = moving ? Math.sin(clock * 0.035) * w * 0.012 : 0;
    const driftY = moving ? Math.sin(clock * 0.025) * h * 0.008 : 0;
    const parallaxX = moving ? Math.max(-w * 0.01, Math.min(w * 0.01, (cam.x - WORLD.w / 2) * -0.03)) : 0;
    const parallaxY = moving ? Math.max(-h * 0.01, Math.min(h * 0.01, (cam.y - WORLD.h / 2) * -0.03)) : 0;
    c.drawImage(homeArt.sky, view.x0 + (width - w) / 2 + driftX + parallaxX,
      view.y0 + (height - h) / 2 + driftY + parallaxY, w, h);
  }

  function drawHomeRoom(c) {
    const room = SCENES.home.room;
    if (homeArt.clouds.complete && homeArt.clouds.naturalWidth) {
      // The cloud cushion is behind the floor, leaving its soft lower edge visible.
      c.drawImage(homeArt.clouds, room.x - room.w * 0.08, room.y + room.h * 0.48,
        room.w * 1.16, room.w * 1.16 * homeArt.clouds.naturalHeight / homeArt.clouds.naturalWidth);
    }
    if (homeArt.room.complete && homeArt.room.naturalWidth) {
      c.drawImage(homeArt.room, room.x, room.y, room.w, room.h);
    } else {
      // A simple floor during loading; geometry and entrances remain usable.
      c.fillStyle = '#ddbd8c';
      for (const floor of ISLANDS) c.fill(coast(floor, 1, 80));
    }
  }

  function drawHomeFurniture(c, p) {
    const frame = homeArt.frames && homeArt.frames[p.sprite];
    if (!frame) {
      if (p.sprite === 'arcade') drawArcade(c, p);
      else if (p.sprite === 'records') drawGramophone(c, p);
      else if (p.sprite === 'door') drawPortal(c, p);
      return;
    }
    const scale = p.h / frame.anchorY;
    c.save();
    c.imageSmoothingEnabled = true;
    c.imageSmoothingQuality = 'high';
    c.drawImage(homeArt.furniture, frame.x, frame.y, frame.width, frame.height,
      p.x - frame.anchorX * scale, p.y - frame.anchorY * scale, frame.width * scale, frame.height * scale);
    c.restore();
  }

  function drawPlace(c, p) {
    c.save();
    if (p.mapScale) {
      c.translate(p.x, p.y);
      c.scale(p.mapScale, p.mapScale);
      c.translate(-p.x, -p.y);
    }
    const seen = visited.has(p.name);
    if (p.kind === 'home-prop') drawHomeFurniture(c, p);
    else if (p.kind === 'house') drawHouse(c, p, seen);
    else if (p.kind === 'hall') drawHall(c, p, seen);
    else if (p.kind === 'office') drawOffice(c, p, seen);
    else if (p.kind === 'camp') drawCamp(c, p);
    else if (p.kind === 'arcade') drawArcade(c, p);
    else if (p.kind === 'gramophone') drawGramophone(c, p);
    else if (p.kind === 'portal') drawPortal(c, p);
    else if (p.kind === 'easel') drawEasel(c, p);
    else if (p.kind === 'record') drawRecord(c, p);
    else if (p.kind === 'computer') drawComputer(c, p);
    else if (p.kind === 'stele') drawStele(c, p);
    else if (p.kind === 'sign') drawSign(c, p);
    else drawFlag(c, p, seen);
    c.restore();
  }

  function drawPlaceLabel(c, p) {
    if (p.noLabel) return;
    if (sceneName === 'world' && zoom < 0.16) return;
    if (sceneName === 'world' && zoom < 0.45 && p.type === 'visited' && p !== near) return;
    c.save();
    c.textAlign = 'center';
    const small = !!p.small;
    c.font = small ? '400 14px "Cormorant Garamond", Georgia, serif' : '400 17px "Cormorant Garamond", Georgia, serif';
    let text = p.label || p.title;
    if (small && text.length > 17) text = text.slice(0, 16).trim() + '…';
    const w = c.measureText(text).width;
    c.fillStyle = 'rgba(243, 238, 226, 0.78)';
    c.fillRect(p.x - w / 2 - 5, p.y + 8, w + 10, small ? 17 : 20);
    c.fillStyle = C.ink;
    c.fillText(text, p.x, p.y + (small ? 21 : 24));
    c.restore();
  }

  function drawPrompt(c, p) {
    const lift = quietMotion.matches ? 0 : Math.sin(clock * 4) * 2;
    const y = p.y - (p.h || 80) + lift;
    c.save();
    c.font = '500 11px Inter, sans-serif';
    c.textAlign = 'center';
    const label = p.kind === 'portal' ? 'E · step through' : p.kind === 'computer' ? 'E · use' : p.to ? 'E · enter' : openPlace === p ? 'E · close' : p.embed ? 'E · listen' : 'E · read';
    const w = c.measureText(label).width + 18;
    c.fillStyle = '#f6f2e8';
    c.strokeStyle = C.ink;
    c.lineWidth = 1.2;
    c.beginPath();
    c.rect(p.x - w / 2, y - 14, w, 20);
    c.fill();
    c.stroke();
    c.beginPath();
    c.moveTo(p.x - 4, y + 6);
    c.lineTo(p.x, y + 11);
    c.lineTo(p.x + 4, y + 6);
    c.fill();
    c.stroke();
    c.fillStyle = C.ink;
    c.fillText(label, p.x, y);
    c.restore();
  }

  // ---------------------------------------------------------------- night
  // Always daytime (kept as a function so lit windows etc. stay simple)
  const nightAmount = () => 0;

  // ---------------------------------------------------------------- minimap
  const MM = { w: 200, h: 126 };
  const miniBase = document.createElement('canvas');
  miniBase.width = MM.w;
  miniBase.height = MM.h;
  let miniFor = null;
  function drawMinimap() {
    const k = Math.min(MM.w / WORLD.w, MM.h / WORLD.h);
    const ox = (MM.w - WORLD.w * k) / 2;
    const oy = (MM.h - WORLD.h * k) / 2;
    const sx = k;
    const sy = k;
    if (miniFor !== sceneName) {
      miniFor = sceneName;
      const b = miniBase.getContext('2d');
      b.setTransform(1, 0, 0, 1, 0, 0);
      b.fillStyle = sceneName === 'home' ? '#c3d8ed' : '#dde1da';
      b.fillRect(0, 0, MM.w, MM.h);
      b.setTransform(k, 0, 0, k, ox, oy);
      if (sceneName === 'home') {
        drawHomeSky(b, { x0: -ox / k, y0: -oy / k, x1: (MM.w - ox) / k, y1: (MM.h - oy) / k }, false);
        drawHomeRoom(b);
      } else for (const isl of ISLANDS) {
        b.fillStyle = isl.polar ? '#f1eee5' : C.land;
        b.fill(coast(isl, 1, 80));
        b.strokeStyle = C.ink;
        b.lineWidth = Math.max(14, 0.6 / k);
        b.stroke(coast(isl, 1, 80));
      }
      b.strokeStyle = '#a8936e';
      b.lineWidth = 26;
      for (const br of BRIDGES) {
        b.beginPath();
        b.moveTo(...br.a);
        b.lineTo(...br.b);
        b.stroke();
      }
    }
    mctx.setTransform(1, 0, 0, 1, 0, 0);
    mctx.drawImage(miniBase, 0, 0);
    mctx.setTransform(1, 0, 0, 1, ox, oy);
    for (const p of places) {
      mctx.fillStyle = p.kind === 'portal' ? '#3b5d5d' : visited.has(p.name) ? C.accent : 'rgba(42,39,35,0.45)';
      mctx.fillRect((p.anchor ? p.anchor[0] : p.x) * sx - 1.5, (p.anchor ? p.anchor[1] : p.y) * sy - 1.5, 3, 3);
    }
    // view rectangle + player
    const vw = (W / zoom) * sx;
    const vh = (H / zoom) * sy;
    mctx.strokeStyle = 'rgba(42,39,35,0.6)';
    mctx.lineWidth = 1;
    mctx.strokeRect(cam.x * sx - vw / 2, cam.y * sy - vh / 2, vw, vh);
    mctx.fillStyle = C.ink;
    mctx.beginPath();
    mctx.arc(player.x * sx, player.y * sy, 3, 0, Math.PI * 2);
    mctx.fill();
  }

  // ---------------------------------------------------------------- frame
  function render() {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalCompositeOperation = 'source-over';
    ctx.setTransform(DPR * zoom, 0, 0, DPR * zoom, DPR * (W / 2 - cam.x * zoom), DPR * (H / 2 - cam.y * zoom));
    const view = {
      x0: cam.x - W / 2 / zoom,
      y0: cam.y - H / 2 / zoom,
      x1: cam.x + W / 2 / zoom,
      y1: cam.y + H / 2 / zoom,
    };
    if (sceneName === 'home') {
      drawHomeSky(ctx, view);
      // Room, furniture, player and labels float together; collision stays in room coordinates.
      ctx.translate(0, homeLift());
      drawHomeRoom(ctx);
    }
    else {
      drawWater(ctx, view);
      drawIslands(ctx, view);
      drawStateBorders(ctx, view);
      drawTrails(ctx);
      drawZones(ctx);
      drawBridges(ctx);
      drawLabels(ctx);
    }

    // footprints
    const noteSteps = sceneName === 'music';
    for (const f of footprints) {
      const a = Math.min(1, f.life / 3);
      if (!noteSteps) {
        ctx.fillStyle = `rgba(42, 39, 35, ${0.2 * a})`;
        ctx.beginPath();
        ctx.ellipse(f.x, f.y, 2.2, 1.3, 0, 0, Math.PI * 2);
        ctx.fill();
        continue;
      }
      // in the music world Hui leaves a trail of little notes instead of footprints
      ctx.strokeStyle = ctx.fillStyle = `rgba(42, 39, 35, ${0.45 * a})`;
      ctx.lineWidth = 1.1;
      ctx.beginPath();
      ctx.ellipse(f.x, f.y, 2.6, 1.9, -0.4, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(f.x + 2.4, f.y - 0.6);
      ctx.lineTo(f.x + 2.4, f.y - 10);
      if (f.glyph === 2) {
        ctx.lineTo(f.x + 8.4, f.y - 11.5);
        ctx.lineTo(f.x + 8.4, f.y - 2.2);
        ctx.stroke();
        ctx.beginPath();
        ctx.ellipse(f.x + 6, f.y - 1.6, 2.6, 1.9, -0.4, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.quadraticCurveTo(f.x + 7.5, f.y - 7.5, f.x + 6, f.y - 4);
        ctx.stroke();
      }
    }

    for (const p of dust) {
      ctx.fillStyle = `rgba(150, 135, 105, ${0.5 * (p.life / 0.5)})`;
      ctx.beginPath();
      ctx.ellipse(p.x, p.y, p.r, p.r * 0.6, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    drawJourney(ctx);
    if (sceneName === 'world') {
      // Symbols can be offset in a dense region; the dot is the real city.
      ctx.save();
      ctx.strokeStyle = 'rgba(42,39,35,0.34)';
      ctx.fillStyle = C.accent;
      ctx.lineWidth = 1;
      for (const p of places) {
        if (!p.anchor) continue;
        if (Math.hypot(p.x - p.anchor[0], p.y - p.anchor[1]) > 10) {
          ctx.beginPath();
          ctx.moveTo(...p.anchor);
          ctx.lineTo(p.x, p.y);
          ctx.stroke();
        }
        ctx.beginPath();
        ctx.arc(...p.anchor, Math.max(3, 1.7 / zoom), 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }
    drawCompass(ctx);

    // depth-sorted entities
    const inView = (x, y, m) => x > view.x0 - m && x < view.x1 + m && y > view.y0 - m && y < view.y1 + m + 80;
    const list = [];
    if (sceneName !== 'world' || zoom >= 0.12) {
      decorIn(view.x0 - 60, view.y0 - 60, view.x1 + 60, view.y1 + 140, list);
    }
    for (const p of places) if (inView(p.x, p.y, 120)) list.push({ t: 'place', y: p.y, p });
    for (const p of SCENES[sceneName].furniture || []) if (inView(p.x, p.y, 190)) list.push({ t: 'furniture', y: p.y, p });
    list.push({ t: 'hui', y: player.y });
    list.sort((a, b) => a.y - b.y);
    for (const e of list) {
      if (e.t === 'tree') drawTree(ctx, e);
      else if (e.t === 'tuft') { if (sceneName !== 'world' || zoom >= 0.3) drawTuft(ctx, e); }
      else if (e.t === 'rock') drawRock(ctx, e);
      else if (e.t === 'furniture') drawHomeFurniture(ctx, e.p);
      else if (e.t === 'place') {
        drawPlace(ctx, e.p);
        drawPlaceLabel(ctx, e.p);
      }
      else drawHui(ctx);
    }

    // smoke + sparks
    for (const s of smoke) {
      ctx.strokeStyle = `rgba(42, 39, 35, ${0.22 * Math.min(1, s.life / 2)})`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.stroke();
    }
    for (const s of sparks) {
      ctx.fillStyle = s.cool ? `rgba(214, 232, 222, ${Math.min(1, s.life)})` : `rgba(226, 161, 74, ${Math.min(1, s.life)})`;
      ctx.fillRect(s.x, s.y, 2, 2);
    }
    for (const n of notes) {
      const a = Math.min(1, n.life / 1.5) * 0.75;
      ctx.strokeStyle = `rgba(42, 39, 35, ${a})`;
      ctx.fillStyle = `rgba(42, 39, 35, ${a})`;
      ctx.lineWidth = 1.3;
      const nx = n.x + Math.sin(clock * 2 + n.wob) * 3;
      ctx.beginPath();
      ctx.ellipse(nx, n.y, 3.2, 2.3, -0.4, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(nx + 3, n.y - 1);
      ctx.lineTo(nx + 3, n.y - 12);
      if (n.glyph === 2) {
        ctx.lineTo(nx + 10, n.y - 14);
        ctx.lineTo(nx + 10, n.y - 3);
      } else {
        ctx.quadraticCurveTo(nx + 9, n.y - 9, nx + 7, n.y - 5);
      }
      ctx.stroke();
      if (n.glyph === 2) {
        ctx.beginPath();
        ctx.ellipse(nx + 7, n.y - 2, 3.2, 2.3, -0.4, 0, Math.PI * 2);
        ctx.fill();
      }
    }


    // prompt above everything (screen-space transform again)
    if (near && started) {
      ctx.setTransform(DPR * zoom, 0, 0, DPR * zoom, DPR * (W / 2 - cam.x * zoom), DPR * (H / 2 - cam.y * zoom));
      if (sceneName === 'home') ctx.translate(0, homeLift());
      drawPrompt(ctx, near);
    }
    drawMinimap();
    if (fade) {
      const t = fade.t / fade.dur;
      const a = t < 0.5 ? t * 2 : (1 - t) * 2;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.fillStyle = `rgba(243, 241, 236, ${Math.min(1, a * 1.15)})`;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
  }

  let last = performance.now();
  function frame(now) {
    if (document.hidden) {
      last = now;
      requestAnimationFrame(frame);
      return;
    }
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    update(dt);
    render();
    requestAnimationFrame(frame);
  }

  // ---------------------------------------------------------------- UI
  function clampCam(hw, hh) {
    cam.x = hw * 2 >= WORLD.w ? WORLD.w / 2 : Math.max(hw, Math.min(WORLD.w - hw, cam.x));
    cam.y = hh * 2 >= WORLD.h ? WORLD.h / 2 : Math.max(hh, Math.min(WORLD.h - hh, cam.y));
  }

  const screen = document.getElementById('screen');
  const screenFrame = document.getElementById('screenFrame');
  function openScreen(p) {
    closeCard();
    document.getElementById('screenTitle').textContent = p.title;
    document.getElementById('screenOpen').href = p.url;
    screenFrame.src = p.url;
    screen.hidden = false;
    keys.clear();
    target = null;
  }
  function closeScreen() {
    if (screen.hidden) return;
    screen.hidden = true;
    screenFrame.src = 'about:blank';
  }
  document.getElementById('screenClose').addEventListener('click', closeScreen);

  function interact(p) {
    if (p.kind === 'computer') {
      openScreen(p);
      return;
    }
    if (p.to) {
      if (fade) return;
      closeCard();
      ensureScene(p.to).then(() => {
        if (!fade && !travelDialog.open) fade = { t: 0, dur: 1.1, to: p.to, from: sceneName, swapped: false };
      }).catch(() => {
        const hint = document.getElementById('hint');
        hint.textContent = 'This world could not load. Please refresh and try again.';
        hint.classList.remove('is-faded');
      });
      return;
    }
    openCard(p);
  }

  // Nearest walkable point to (x, y): doors near the coast would otherwise drop Hui in the sea
  function safeSpot(x, y, canStand = walkable) {
    if (canStand(x, y)) return [x, y];
    for (let r = 12; r <= 420; r += 12) {
      const n = Math.max(8, Math.round(r / 6));
      for (let i = 0; i < n; i++) {
        // start straight below (in front of the door) and sweep both ways
        const k = i % 2 ? -Math.ceil(i / 2) : Math.ceil(i / 2);
        const a = Math.PI / 2 + (k / n) * Math.PI * 2;
        const px = x + Math.cos(a) * r;
        const py = y + Math.sin(a) * r;
        if (canStand(px, py)) return [px, py];
      }
    }
    return [x, y];
  }

  const SCENE_TITLES = { home: 'Home', world: 'The World', games: 'Save Point', music: 'Album Collection' };

  function loadScene(name, from, arrival) {
    const sc = SCENES[name];
    sceneName = name;
    WORLD = sc.world;
    ISLANDS = sc.islands;
    BRIDGES = sc.bridges;
    TRAILS = sc.trails || [];
    places = sc.places;
    if (!sc.decor) sc.decor = buildDecor(sc);
    decor = sc.decor;
    // Arrive in front of the door you came through
    const door = places.find((p) => p.to === from) || places.find((p) => p.kind === 'portal');
    const want = arrival || (name === 'world' ? sc.spawn
      : from && door ? [door.x + 6, door.y + 70] : sc.spawn || [door.x + 6, door.y + 70]);
    const sp = safeSpot(want[0], want[1]);
    player.x = sp[0];
    player.y = sp[1];
    player.face = 'down';
    cam.x = player.x;
    cam.y = player.y;
    target = null;
    pendingOpen = null;
    footprints.length = 0;
    dust.length = 0;
    smoke.length = 0;
    sparks.length = 0;
    notes.length = 0;
    lastPrint = { x: player.x, y: player.y, side: 1 };
    closeCard();
    document.getElementById('sceneName').textContent = SCENE_TITLES[name] || '';
    document.body.dataset.lifeScene = name;
    document.getElementById('zoomMap').hidden = name !== 'world';
    updateHint();
    document.getElementById('journalBtn').hidden = name !== 'world';
    if (name !== 'world') toggleJournal(false);
    // arriving in the world: pull back a little so it reads as a map
    if (started) {
      const homeZoom = W < 700 ? Math.max(0.4, Math.min(0.6, (W - 40) / 640)) : 1;
      setZoom(name === 'world' ? (W < 700 ? 0.55 : 0.7) : name === 'home' ? homeZoom : (W < 700 ? 0.78 : 1));
    }
    updateTravelLocation();
  }

  // Fast travel uses the same projected geography as the map. A flight is
  // committed only after its scene and a clear landing spot are ready.
  const travelBtn = document.getElementById('travelBtn');
  const travelSearch = document.getElementById('travelSearch');
  const travelDestinations = document.getElementById('travelDestinations');
  const travelStatus = document.getElementById('travelStatus');
  const flightNotice = document.getElementById('flightNotice');
  let travelRequest = 0;
  let travelBusy = false;
  let travelMapFailed = false;
  let travelScope = 'country';
  let flightTimer;

  function updateTravelLocation() {
    for (const button of travelDialog.querySelectorAll('[data-travel-scene]')) {
      if (button.dataset.travelScene === sceneName) button.setAttribute('aria-current', 'location');
      else button.removeAttribute('aria-current');
    }
    document.getElementById('travelLocation').textContent = 'Currently: ' + SCENE_TITLES[sceneName];
  }

  function renderTravelDestinations() {
    const allDestinations = SCENES.world?.destinations;
    if (!allDestinations) {
      travelStatus.textContent = travelMapFailed ? 'The destinations could not load. Refresh to try again.' : 'Preparing the map…';
      return;
    }
    // "Been there" lists the countries / regions with a place in visited.json; their cities are searchable too
    const been = SCENES.world.visitedCountries;
    const destinations = travelScope === 'visited'
      ? allDestinations.filter((d) => been.has(d.id)).map((d) => ({ ...d, cities: been.get(d.id) }))
      : allDestinations.filter((d) => d.kind === 'country');
    const normalize = (s) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
    const query = normalize(travelSearch.value);
    const exactCode = destinations.find((d) => d.code.toLowerCase() === query);
    const matches = exactCode ? [exactCode] : destinations.filter((d) =>
      [d.name, d.zh, ...(d.aliases || []), ...(d.cities || [])].some((name) => name && normalize(name).includes(query)));
    const fragment = document.createDocumentFragment();
    for (const d of matches) {
      const button = document.createElement('button');
      button.type = 'button';
      button.dataset.travelDestination = d.id;
      button.disabled = travelBusy;
      button.setAttribute('aria-label', 'Fly to ' + d.name);
      const name = document.createElement('span');
      name.className = 'life-travel__destination-name';
      name.textContent = d.name;
      if (d.zh) {
        const zh = document.createElement('small');
        zh.textContent = d.zh;
        name.append(zh);
      }
      const code = document.createElement('small');
      // in "Been there", show the cities instead of the country code
      if (d.cities) {
        const own = d.cities.filter((c) => c !== d.name);
        code.textContent = own.length > 3 ? own.slice(0, 3).join(' · ') + ' +' + (own.length - 3) : own.join(' · ');
        code.title = own.join(' · ');
      } else code.textContent = d.code;
      button.append(name, code);
      fragment.append(button);
    }
    travelDestinations.replaceChildren(fragment);
    travelDestinations.scrollTop = 0;
    document.getElementById('travelCount').textContent = (query ? matches.length + ' / ' : '') + destinations.length + (travelScope === 'visited' ? ' visited' : ' places');
    if (!travelBusy) travelStatus.textContent = matches.length ? '' : 'No destination found. Try a name or code.';
  }

  function setTravelBusy(busy) {
    travelBusy = busy;
    travelDialog.setAttribute('aria-busy', String(busy));
    travelSearch.disabled = busy;
    for (const button of travelDialog.querySelectorAll('[data-travel-scene], [data-travel-destination], [data-travel-scope]')) button.disabled = busy;
  }

  function openTravel() {
    if (fade || travelDialog.open) return;
    closeCard();
    closeScreen();
    toggleJournal(false);
    keys.clear();
    target = pendingOpen = null;
    pointers.clear();
    pinchStart = null;
    clearTimeout(flightTimer);
    flightNotice.hidden = true;
    travelSearch.value = '';
    updateTravelLocation();
    renderTravelDestinations();
    travelDialog.showModal();
    travelDestinations.scrollTop = 0;
    travelBtn.setAttribute('aria-expanded', 'true');
  }

  function landingSpot(sc, destination) {
    if (!sc.decor) sc.decor = buildDecor(sc);
    const regions = destination && (destination.kind === 'country'
      ? sc.travelRegions.filter((r) => r.region === destination.id)
      : sc.stateBorders.filter((r) => r.usState && r.region === destination.code));
    const canLand = (x, y) => (!regions || regions.some((r) => GEO.contains(r, x, y)))
      && sc.islands.some((isl) => islandNorm(isl, x, y) < 0.95) && walkableIn(sc, x, y);
    const point = destination ? destination.point : sc.spawn;
    // Microstates can be smaller than Hui's sprite at this world scale. Keep
    // the feet inside the real boundary even when a 12px margin cannot fit.
    for (const radius of destination?.kind === 'country' ? [12, 4, 0] : [12]) {
      if (regions && !regions.some((r) => r.rx >= radius && r.ry >= radius)) continue;
      const clear = (x, y) => [[0, 0], [radius, 0], [-radius, 0], [0, radius], [0, -radius]]
        .every(([dx, dy]) => canLand(x + dx, y + dy));
      const spot = safeSpot(...point, clear);
      if (clear(...spot)) return spot;
    }
    throw new Error('No clear landing spot');
  }

  function showFlight(message, duration) {
    clearTimeout(flightTimer);
    document.getElementById('flightText').textContent = message;
    flightNotice.hidden = false;
    if (duration) flightTimer = setTimeout(() => { flightNotice.hidden = true; }, duration);
  }

  async function flyTo(name, destinationId) {
    if (travelBusy || fade || !travelDialog.open) return;
    const request = ++travelRequest;
    setTravelBusy(true);
    travelStatus.textContent = 'Preparing your flight…';
    try {
      await ensureScene(name);
      if (request !== travelRequest || !travelDialog.open) return;
      const sc = SCENES[name];
      const destination = destinationId && sc.destinations.find((d) => d.id === destinationId);
      if (destinationId && !destination) throw new Error('Unknown destination');
      const arrival = landingSpot(sc, destination);
      const label = destination ? destination.name : SCENE_TITLES[name];
      fade = {
        t: 0, dur: matchMedia('(prefers-reduced-motion: reduce)').matches ? 0.08 : 0.8,
        to: name, from: sceneName, arrival, flightLabel: label, swapped: false,
      };
      keys.clear();
      target = pendingOpen = null;
      showFlight('Flying to ' + label + '…');
      travelDialog.close();
    } catch (error) {
      if (request === travelRequest && travelDialog.open) {
        travelStatus.textContent = 'This stop could not load. Try again, or refresh the page.';
      }
    } finally {
      if (request === travelRequest) setTravelBusy(false);
    }
  }

  travelBtn.addEventListener('click', openTravel);
  document.getElementById('travelClose').addEventListener('click', () => travelDialog.close());
  travelDialog.addEventListener('close', () => {
    ++travelRequest; // Cancel a flight still waiting for its scene to load.
    setTravelBusy(false);
    keys.clear();
    travelBtn.setAttribute('aria-expanded', 'false');
  });
  travelDialog.addEventListener('click', (e) => {
    if (e.target !== travelDialog) return;
    const box = travelDialog.getBoundingClientRect();
    if (e.clientX < box.left || e.clientX > box.right || e.clientY < box.top || e.clientY > box.bottom) travelDialog.close();
  });
  travelDialog.querySelectorAll('[data-travel-scene]').forEach((button) => {
    button.addEventListener('click', () => flyTo(button.dataset.travelScene));
  });
  travelDestinations.addEventListener('click', (e) => {
    const button = e.target.closest('[data-travel-destination]');
    if (button) flyTo('world', button.dataset.travelDestination);
  });
  travelDialog.querySelectorAll('[data-travel-scope]').forEach((button) => {
    button.addEventListener('click', () => {
      if (travelBusy) return;
      travelScope = button.dataset.travelScope;
      for (const option of travelDialog.querySelectorAll('[data-travel-scope]')) {
        option.setAttribute('aria-pressed', String(option === button));
      }
      const been = travelScope === 'visited';
      travelSearch.value = '';
      travelSearch.placeholder = been ? 'Search countries or cities / 搜索去过的地方' : 'Search countries / 搜索国家';
      travelSearch.setAttribute('aria-label', been ? 'Find a country or city I have been to' : 'Find a country or region');
      travelDestinations.setAttribute('aria-label', been ? 'Choose a country I have been to' : 'Choose a country or region');
      renderTravelDestinations();
    });
  });
  travelSearch.addEventListener('input', renderTravelDestinations);

  const card = document.getElementById('card');
  function openCard(p) {
    openPlace = p;
    document.getElementById('cardKicker').textContent = p.kicker;
    document.getElementById('cardTitle').textContent = p.title;
    document.getElementById('cardBody').textContent = p.body || '';
    const im = document.getElementById('cardImg');
    if (p.image) {
      im.hidden = false;
      im.src = p.image;
      im.alt = p.title;
    } else {
      im.hidden = true;
      im.removeAttribute('src');
    }
    const embed = document.getElementById('cardEmbed');
    embed.textContent = '';
    embed.hidden = !p.embed;
    if (p.embed) {
      const f = document.createElement('iframe');
      f.src = p.embed;
      f.title = p.title;
      f.loading = 'lazy';
      f.allow = 'autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture';
      embed.append(f);
    }
    card.classList.toggle('life-card--wide', !!(p.image || p.embed));
    const link = document.getElementById('cardLink');
    if (p.link) {
      link.hidden = false;
      link.href = p.link[0];
      link.textContent = p.link[1] + ' →';
      if (/^https?:/.test(p.link[0])) {
        link.target = '_blank';
        link.rel = 'noopener';
      } else {
        link.removeAttribute('target');
      }
    } else {
      link.hidden = true;
    }
    card.hidden = false;
    // replay entrance animation
    card.style.animation = 'none';
    void card.offsetWidth;
    card.style.animation = '';
    if (sceneName === 'world' && !visited.has(p.name)) {
      visited.add(p.name);
      saveVisited();
      renderJournal();
    }
  }
  function closeCard() {
    openPlace = null;
    card.hidden = true;
    const embed = document.getElementById('cardEmbed');
    if (embed) embed.textContent = '';
  }
  document.getElementById('cardClose').addEventListener('click', closeCard);

  const journal = document.getElementById('journal');
  const journalBtn = document.getElementById('journalBtn');
  function toggleJournal(force) {
    const show = typeof force === 'boolean' ? force : journal.hidden;
    journal.hidden = !show;
    journalBtn.setAttribute('aria-expanded', String(show));
  }
  journalBtn.addEventListener('click', () => toggleJournal());
  const runBtn = document.getElementById('runBtn');
  runBtn.addEventListener('click', () => {
    runToggle = !runToggle;
    runBtn.setAttribute('aria-pressed', String(runToggle));
  });
  document.getElementById('zoomIn').addEventListener('click', () => setZoom(zoomTarget * 1.25));
  document.getElementById('zoomOut').addEventListener('click', () => setZoom(zoomTarget / 1.25));
  document.getElementById('zoomMap').addEventListener('click', () => {
    setZoom(zoomTarget < 0.16 ? (W < 700 ? 0.55 : 0.7) : 0);
  });
  document.getElementById('journalClose').addEventListener('click', () => toggleJournal(false));

  function renderJournal() {
    const ol = document.getElementById('journalList');
    ol.textContent = '';
    const order = { founded: 0, worked: 1, lived: 2, visited: 3 };
    const sorted = worldPlaces.filter((p) => p.type !== 'portal' && p.type !== 'device').sort((a, b) => (order[a.type] ?? 9) - (order[b.type] ?? 9));
    for (const p of sorted) {
      const li = document.createElement('li');
      const seen = visited.has(p.name);
      li.className = seen ? '' : 'is-unknown';
      const name = document.createElement('span');
      name.textContent = seen ? p.title : '? ? ?';
      const tag = document.createElement('span');
      tag.className = 'tag';
      tag.textContent = p.type;
      li.append(name, tag);
      ol.append(li);
    }
    const all = worldPlaces.filter((p) => p.type !== 'portal' && p.type !== 'device');
    document.getElementById('count').textContent = `${all.filter((p) => visited.has(p.name)).length} / ${all.length}`;
  }

  // ---------------------------------------------------------------- boot
  window.addEventListener('resize', resize);
  resize();

  // Shrink a scene's layout around the origin; buildings and Hui keep their size
  const SCENE_SCALE = { home: 0.72, world: 0.72, games: 0.8, music: 0.8 };
  function scaleScene(sc, k) {
    const sx = (v) => v * k;
    sc.world = { w: sc.world.w * k, h: sc.world.h * k };
    for (const isl of [...sc.islands, ...(sc.stateBorders || []), ...(sc.travelRegions || [])]) {
      isl.cx *= k;
      isl.cy *= k;
      isl.rx *= k;
      isl.ry *= k;
      if (isl.rings) isl.rings = isl.rings.map((ring) => ring.map((pt) => pt.map(sx)));
      isl.paths = null;
    }
    sc.bridges = sc.bridges.map((b) => ({ a: b.a.map(sx), b: b.b.map(sx) }));
    for (const p of [...sc.places, ...(sc.furniture || [])]) {
      p.x *= k;
      p.y *= k;
      if (p.anchor) p.anchor = p.anchor.map(sx);
    }
    if (sc.trails) sc.trails = sc.trails.map((t) => t.map((pt) => pt.map(sx)));
    if (sc.spawn) sc.spawn = sc.spawn.map(sx);
    if (sc.room) sc.room = Object.fromEntries(Object.entries(sc.room).map(([key, value]) => [key, value * k]));
    if (sc.compass) sc.compass = sc.compass.map(sx);
    if (sc.mapLabels) sc.mapLabels = sc.mapLabels.map((l) => ({ ...l, point: l.point.map(sx) }));
    if (sc.destinations) sc.destinations = sc.destinations.map((d) => ({ ...d, point: d.point.map(sx) }));
    for (const key of ['rugs', 'frames']) {
      for (const r of sc[key] || []) {
        r.x0 *= k;
        r.y0 *= k;
        r.x1 *= k;
        r.y1 *= k;
      }
    }

    return sc;
  }

  // ---------------------------------------------------------------- page-backed worlds
  const clean = (t) => (t || '').replace(/\s+/g, ' ').trim();
  function loadDoc(url) {
    return fetch(url)
      .then((r) => {
        if (!r.ok) throw new Error('Page unavailable');
        return r.text();
      })
      .then((t) => new DOMParser().parseFromString(t, 'text/html'));
  }
  // Pages live in misc/ like this one, so their relative srcs resolve against location.href
  const thumbFor = (src) => src.replace(/\/images\/games\/([^/]+)\.png$/, '/images/thumbs/games/$1.jpg');
  function computer(x, y, url, title) {
    return { id: 'pc-' + url, name: title, title, kind: 'computer', type: 'device', x, y, r: 30, h: 84, url, small: true };
  }
  function backPortal(x, y) {
    return { id: 'portal-home', name: 'Portal home', title: 'Home', kind: 'portal', type: 'portal', x, y, r: 34, h: 112, to: 'home' };
  }

  // Genre and studio for each game (game.html lists platform and status, not these).
  // A game that isn't listed lands in the "More" district.
  const G = (genre, dev) => ({ genre, dev });
  const GAME_META = {
    'Dota 2': G('competitive', 'Valve'),
    'Counter-Strike 2': G('competitive', 'Valve'),
    Warframe: G('action', 'Digital Extremes'),
    Valheim: G('survival', 'Iron Gate'),
    'Slay the Spire Ⅱ': G('rogue', 'Mega Crit'),
    'Animal Crossing': G('story', 'Nintendo'),
    'Bloodstained: Ritual of the Night': G('metroid', 'ArtPlay'),
    'Hollow Knight: Silksong': G('metroid', 'Team Cherry'),
    'Hollow Knight': G('metroid', 'Team Cherry'),
    'Blasphemous 2': G('metroid', 'The Game Kitchen'),
    Celeste: G('metroid', 'Maddy Makes Games'),
    'ASTLIBRA Revision': G('metroid', 'KEIZO'),
    'Slay the Spire': G('rogue', 'Mega Crit'),
    'Vampire Survivors': G('rogue', 'poncle'),
    'Cult of the Lamb': G('rogue', 'Massive Monster'),
    Hades: G('rogue', 'Supergiant Games'),
    'Hades 2': G('rogue', 'Supergiant Games'),
    'The Binding of Isaac: Rebirth': G('rogue', 'Nicalis'),
    'Risk of Rain 2': G('rogue', 'Hopoo Games'),
    'Darkest Dungeon': G('rogue', 'Red Hook Studios'),
    'Persona 5 Royal': G('rpg', 'Atlus'),
    'Clair Obscur: Expedition 33': G('rpg', 'Sandfall Interactive'),
    'The Witcher 3: Wild Hunt': G('rpg', 'CD Projekt Red'),
    'Cyberpunk 2077': G('rpg', 'CD Projekt Red'),
    'Elden Ring': G('rpg', 'FromSoftware'),
    "Baldur's Gate 3": G('rpg', 'Larian Studios'),
    'Tale of Immortal': G('rpg', 'GuiGu Studio'),
    'Subnautica 2': G('survival', 'Unknown Worlds'),
    Starbound: G('survival', 'Chucklefish'),
    "Don't Starve": G('survival', 'Klei Entertainment'),
    Palworld: G('survival', 'Pocketpair'),
    'Dave the Diver': G('story', 'MINTROCKET'),
    'Stardew Valley': G('story', 'ConcernedApe'),
    'Volcano Princess': G('story', ''),
    "Sultan's Game": G('story', ''),
    'Magical Girl Witch Trials': G('story', ''),
    'Cultist Simulator': G('story', 'Weather Factory'),
    Helltaker: G('story', 'vanripper'),
    'Pokémon Scarlet': G('rpg', 'Game Freak'),
    'Pokémon Sword': G('rpg', 'Game Freak'),
    'Fire Emblem: Three Houses': G('rpg', 'Intelligent Systems'),
    'The Legend of Zelda: Breath of the Wild': G('action', 'Nintendo'),
  };
  // Genre districts in a ring around the centre (where Hui arrives).
  // anchor = the slot nearest the centre; dir = which way rows grow (away from the centre)
  const DISTRICTS = [
    { id: 'rpg', name: 'RPG', anchor: [1500, 880], dir: [0, -1], cols: 4, tint: 'rgba(196, 170, 122, 0.24)' },
    { id: 'rogue', name: 'Roguelike', anchor: [880, 930], dir: [0, -1], cols: 4, tint: 'rgba(170, 120, 100, 0.2)' },
    { id: 'metroid', name: 'Metroidvania & Platformer', anchor: [2110, 930], dir: [0, -1], cols: 3, tint: 'rgba(120, 140, 160, 0.2)' },
    { id: 'survival', name: 'Survival & Sandbox', anchor: [690, 1300], dir: [-1, 0], cols: 3, tint: 'rgba(130, 150, 100, 0.22)' },
    { id: 'story', name: 'Sim & Story', anchor: [2300, 1240], dir: [1, 0], cols: 3, tint: 'rgba(200, 160, 90, 0.2)' },
    { id: 'action', name: 'Action & Adventure', anchor: [1150, 1640], dir: [0, 1], cols: 2, tint: 'rgba(110, 130, 120, 0.2)' },
    { id: 'competitive', name: 'Online Competitive', anchor: [1850, 1640], dir: [0, 1], cols: 2, tint: 'rgba(155, 61, 43, 0.14)' },
    { id: 'other', name: 'More', anchor: [1500, 1760], dir: [0, 1], cols: 4, tint: 'rgba(150, 140, 120, 0.18)' },
  ];

  // Lay out genre districts around a centre. Items that share a group (studio, artist) stand
  // side by side in an ink frame and never split across rows; better-ranked items sit nearest the centre.
  function layoutDistricts(districts, places, o) {
    const rugs = [];
    const frames = [];
    const total = o.unitWeight || ((u) => u.reduce((t, g) => t + o.weight(g), 0));
    for (const d of districts) {
      if (!d.items.length) continue;
      const units = [];
      const seen = new Map();
      for (const g of d.items) {
        const key = o.group(g);
        if (key && seen.has(key)) seen.get(key).push(g);
        else {
          const u = [g];
          units.push(u);
          if (key) seen.set(key, u);
        }
      }
      for (const u of units) u.sort((a, b) => o.rank(a) - o.rank(b) || o.weight(b) - o.weight(a));
      units.sort((a, b) => o.rank(a[0]) - o.rank(b[0]) || total(b) - total(a));

      const slots = [];
      let row = 0;
      let col = 0;
      for (const u of units) {
        if (col > 0 && col + u.length > d.cols && u.length <= d.cols) {
          row++;
          col = 0;
        }
        const start = slots.length;
        for (const g of u) {
          slots.push({ g, row, col });
          col++;
          if (col >= d.cols) {
            row++;
            col = 0;
          }
        }
        if (u.length > 1 && o.group(u[0])) frames.push({ dev: o.group(u[0]), members: slots.slice(start) });
      }
      const [ax, ay] = d.anchor;
      const [dx, dy] = d.dir;
      // rows step away from the centre; slots within a row run across that direction
      const xy = (r, c) => {
        const off = c - (d.cols - 1) / 2;
        return dx ? [ax + dx * r * o.col * 1.12, ay + off * o.row] : [ax + off * o.col, ay + dy * r * o.row];
      };
      let x0 = Infinity;
      let y0 = Infinity;
      let x1 = -Infinity;
      let y1 = -Infinity;
      for (const sl of slots) {
        const [x, y] = xy(sl.row, sl.col);
        sl.x = x;
        sl.y = y;
        x0 = Math.min(x0, x - o.half);
        x1 = Math.max(x1, x + o.half);
        y0 = Math.min(y0, y - o.top);
        y1 = Math.max(y1, y + 34);
        places.push(o.place(sl.g, d, x, y, `${d.id}-${sl.row}-${sl.col}`));
      }
      rugs.push({ x0: x0 - 14, y0: y0 - 14, x1: x1 + 14, y1: y1 + 14, tint: d.tint });
      // signpost on the side facing the centre (beside the patch for side districts)
      const sx = dx ? (dx < 0 ? x1 + 110 : x0 - 110) : (x0 + x1) / 2;
      const sy = dx ? ay + 50 : dy < 0 ? y1 + 84 : y0 - 18;
      places.push(Object.assign({ id: 'sign-' + d.id, name: d.name, title: d.name, kind: 'sign', noLabel: true, x: sx, y: sy, r: 8, h: 84 }, o.sign(d)));
    }
    for (const f of frames) {
      const xs = f.members.map((m) => m.x);
      const ys = f.members.map((m) => m.y);
      f.x0 = Math.min(...xs) - o.half + 2;
      f.x1 = Math.max(...xs) + o.half - 2;
      f.y0 = Math.min(...ys) - o.top + 4;
      f.y1 = Math.max(...ys) + 40;
      delete f.members;
    }
    return { rugs, frames };
  }

  function buildGames(doc) {
    const sections = [...doc.querySelectorAll('.game-section')].map((sec) => ({
      id: sec.id,
      name: clean(sec.querySelector('h2') && sec.querySelector('h2').textContent),
      games: [...sec.querySelectorAll('.game-card')].map((card) => {
        const img = card.querySelector('img');
        const src = img ? new URL(img.getAttribute('src'), location.href).href : '';
        const tags = [...card.querySelectorAll('.tag')].map((t) => clean(t.textContent));
        const status = card.classList.contains('status-complete') ? 'complete'
          : card.classList.contains('status-main') ? 'main'
          : card.querySelector('.tag-status-playing') ? 'playing' : '';
        return {
          title: clean(card.querySelector('.game-title') && card.querySelector('.game-title').textContent),
          sub: clean(card.querySelector('.game-subtitle') && card.querySelector('.game-subtitle').textContent),
          src,
          tags,
          status,
          hours: parseFloat(((card.querySelector('.tag-playtime') || {}).textContent || '').replace(/[^0-9.]/g, '')) || 0,
        };
      }),
    }));
    const all = sections.flatMap((s) => s.games);
    const fmt = (n) => Number(n).toLocaleString();
    const hours = Math.round(all.reduce((a, g) => a + g.hours, 0));
    const lead = clean((doc.querySelector('.page-intro .lead') || {}).textContent);
    const heading = clean((doc.querySelector('.page-intro h1') || {}).textContent) || 'Game Save Point';
    const count = (st) => all.filter((g) => g.status === st).length;
    const statLine = [
      `${fmt(all.length)} titles`,
      ...sections.map((s) => `${s.name}: ${fmt(s.games.length)}`),
      `Main story clear: ${fmt(count('main'))}`,
      `All achievements: ${fmt(count('complete'))}`,
      `${fmt(hours)} hrs played`,
    ].join(' · ');

    // Save Point is laid out as genre districts around the centre (where Hui arrives).
    // Inside a district, games by the same studio stand side by side inside an ink frame,
    // and all-achievement (gold) games stand closest to the centre.
    const CX = 1500;
    const CY = 1200;
    const districts = DISTRICTS.map((d) => Object.assign({ items: [] }, d));
    const byId = Object.fromEntries(districts.map((d) => [d.id, d]));
    for (const sec of sections) {
      for (const g of sec.games) {
        const meta = GAME_META[g.title] || {};
        const d = byId[meta.genre] || byId.other;
        d.items.push(Object.assign({ section: sec.name, dev: meta.dev || '' }, g));
      }
    }

    const places = [
      backPortal(CX, CY - 60),
      computer(CX - 150, CY - 20, 'game.html', 'Game log (web)'),
      { id: 'g-stele', name: heading, title: heading, kind: 'stele', x: CX + 150, y: CY - 20, r: 26, h: 80, kicker: 'Game Log', body: `${lead} ${statLine}` },
    ];
    const { rugs, frames } = layoutDistricts(districts, places, {
      col: 128,
      row: 158,
      top: 104,
      half: 52,
      group: (g) => g.dev,
      rank: (g) => (g.status === 'complete' ? 0 : g.status === 'main' ? 1 : 2),
      weight: (g) => g.hours,
      sign: (d) => ({ kicker: 'Genre', body: `${d.items.length} titles` }),
      place: (g, d, x, y, id) => ({
        id, name: g.title, title: g.title, small: true, kind: 'easel', x, y, r: 24, h: 96,
        kicker: [d.name, g.dev].filter(Boolean).join(' · '),
        body: [g.sub, g.tags.join(' · ')].filter(Boolean).join(' · '),
        image: thumbFor(g.src), thumb: thumbFor(g.src), status: g.status,
      }),
    });
    return {
      world: { w: 3000, h: 2400 },
      islands: [makeIsland({ id: 'games', name: 'Save Point', cx: CX, cy: CY, rx: 1300, ry: 1000 })],
      bridges: [],
      places,
      rugs,
      frames,
      bare: true,
      spawn: [CX, CY + 20],
    };
  }

  // Genre for each artist (music.html lists album, artist and date, not genre).
  // Grouped by sound, not by language.
  const ARTIST_GENRE = {
    'Daniel Caesar': 'neosoul', Giveon: 'neosoul', 'Khalil Fong': 'neosoul',
    'Frank Ocean': 'altrnb', SZA: 'altrnb', keshi: 'altrnb', DEN: 'altrnb',
    'The Weeknd': 'rnb', 'Michael Jackson': 'rnb', 'David Tao': 'rnb', 'Matt Lv': 'rnb',
    'Tyler, The Creator': 'hiphop', 'Kendrick Lamar': 'hiphop',
    'Jay Chou': 'pop', 'Jerry Li': 'pop', 'AK Akemi Kakihara': 'pop',
    'Crowd Lu': 'folk', 'Cheer Chen': 'folk', 'Deserts Chang': 'folk',
    Radiohead: 'rock', RADWIMPS: 'rock', '露波合唱團': 'rock', 'Schoolgirl Byebye': 'rock', '唐貓SUGARCAT': 'rock', 'Zhang Zhen Yue': 'rock',
    HYBS: 'indiepop', 'The Crane': 'indiepop', Gordon: 'indiepop', '花伦': 'indiepop',
  };
  const MUSIC_DISTRICTS = [
    { id: 'neosoul', name: 'Neo-Soul', anchor: [1150, 620], dir: [0, -1], cols: 3, tint: 'rgba(155, 61, 43, 0.13)' },
    { id: 'altrnb', name: 'Alternative R&B', anchor: [700, 660], dir: [0, -1], cols: 2, tint: 'rgba(110, 100, 130, 0.16)' },
    { id: 'rnb', name: 'R&B', anchor: [1600, 660], dir: [0, -1], cols: 3, tint: 'rgba(200, 160, 90, 0.2)' },
    { id: 'folk', name: 'Folk & Singer-Songwriter', anchor: [560, 960], dir: [-1, 0], cols: 3, tint: 'rgba(130, 150, 100, 0.22)' },
    { id: 'rock', name: 'Indie Rock', anchor: [1740, 960], dir: [1, 0], cols: 3, tint: 'rgba(120, 140, 160, 0.2)' },
    { id: 'pop', name: 'Pop', anchor: [760, 1280], dir: [0, 1], cols: 2, tint: 'rgba(196, 170, 122, 0.24)' },
    { id: 'hiphop', name: 'Hip-Hop', anchor: [1150, 1320], dir: [0, 1], cols: 3, tint: 'rgba(60, 60, 60, 0.12)' },
    { id: 'indiepop', name: 'Indie & Dream Pop', anchor: [1560, 1280], dir: [0, 1], cols: 2, tint: 'rgba(110, 130, 120, 0.2)' },
    { id: 'other', name: 'More', anchor: [1150, 1580], dir: [0, 1], cols: 4, tint: 'rgba(150, 140, 120, 0.18)' },
  ];

  function buildMusic(doc) {
    const name = doc.querySelector('p.name');
    let intro = '';
    for (let el = name && name.nextElementSibling; el; el = el.nextElementSibling) {
      if (el.tagName === 'P') {
        intro = clean(el.textContent);
        break;
      }
    }
    const spotify = doc.querySelector('a[href*="open.spotify.com/user"]');
    const albums = [...doc.querySelectorAll('.album_card')].map((card, i) => {
      const p = card.querySelector('p');
      const artistEl = p && p.querySelector('.artist_name');
      const artist = clean(artistEl && artistEl.textContent);
      const text = clean(p && p.textContent);
      const cut = artist ? text.lastIndexOf(' - ' + artist) : -1;
      const title = cut > 0 ? text.slice(0, cut) : text;
      const date = cut > 0 ? clean(text.slice(cut + 3 + artist.length).replace(/^,/, '')) : '';
      const frame = card.querySelector('iframe');
      return { title, artist, date, embed: frame ? frame.getAttribute('src') : '', seed: i };
    });
    // The gramophone stands at the centre, where Hui arrives
    const CX = 1150;
    const CY = 900;
    const places = [
      {
        id: 'm-gramophone', name: 'Album Collection', title: 'Album Collection', kind: 'gramophone', x: CX + 170, y: CY + 60, r: 40, h: 118,
        kicker: 'Music', body: intro, link: spotify ? [spotify.getAttribute('href'), 'Find me on Spotify'] : null,
      },
      backPortal(CX - 40, CY + 20),
      computer(CX - 200, CY + 70, 'music.html', 'Album collection (web)'),
    ];
    const districts = MUSIC_DISTRICTS.map((d) => Object.assign({ items: [] }, d));
    const byId = Object.fromEntries(districts.map((d) => [d.id, d]));
    albums.forEach((a, i) => {
      a.order = i; // page order: newest first
      (byId[ARTIST_GENRE[a.artist]] || byId.other).items.push(a);
    });
    const { rugs, frames } = layoutDistricts(districts, places, {
      col: 108,
      row: 120,
      top: 74,
      half: 44,
      group: (a) => a.artist,
      rank: () => 0,
      weight: (a) => -a.order, // newer albums nearer the centre
      unitWeight: (u) => Math.max(...u.map((a) => -a.order)), // an artist sits by their newest album
      sign: (d) => ({ kicker: 'Genre', body: `${d.items.length} albums` }),
      place: (a, d, x, y, id) => ({
        id: 'm-' + id, name: a.title, title: a.title, small: true, kind: 'record', x, y, r: 26, h: 76, seed: a.seed,
        kicker: [a.artist, a.date, d.name].filter(Boolean).join(' · '), body: '', embed: a.embed,
      }),
    });
    return {
      world: { w: 2300, h: 1800 },
      islands: [makeIsland({ id: 'music', name: 'Album Collection', cx: CX, cy: CY, rx: 1150, ry: 860 })],
      bridges: [],
      places,
      rugs,
      frames,
      bare: true,
      spawn: [CX, CY + 100],
    };
  }

  const LOADERS = {
    games: () => loadDoc('game.html').then(buildGames),
    music: () => loadDoc('music.html').then(buildMusic),
  };
  const pendingScenes = {};
  function ensureScene(name) {
    if (SCENES[name]) return Promise.resolve();
    if (!LOADERS[name]) return worldReady;
    if (!pendingScenes[name]) {
      pendingScenes[name] = LOADERS[name]().then((sc) => {
        SCENES[name] = scaleScene(sc, SCENE_SCALE[name]);
      }).catch((error) => {
        delete pendingScenes[name];
        throw error;
      });
    }
    return pendingScenes[name];
  }

  // Home geometry is ready immediately; the generated artwork loads alongside it.
  SCENES.home = scaleScene(
    { world: { w: 1800, h: 1380 }, islands: HOME_FLOOR, bridges: [], places: HOME_PLACES,
      furniture: HOME_FURNITURE, room: { ...HOME_ROOM }, bare: true, spawn: [900, 850] },
    SCENE_SCALE.home,
  );
  loadScene('home');
  requestAnimationFrame(frame);

  // The world is fetched and prepared in the background, before anyone reaches the portal
  const idle = window.requestIdleCallback || ((fn) => setTimeout(fn, 200));
  const worldReady = Promise.all([
    fetch('../travel_notes/visited.json').then((r) => {
      if (!r.ok) throw new Error('Places unavailable');
      return r.json();
    }),
    fetch('../data/world-land.json').then((r) => {
      if (!r.ok) throw new Error('Coastlines unavailable');
      return r.json();
    }),
    fetch('../data/us-states.json').then((r) => {
      if (!r.ok) throw new Error('State outlines unavailable');
      return r.json();
    }),
    // countries and Chinese provinces are optional: the map still works without them
    fetch('../data/countries.json').then((r) => (r.ok ? r.json() : { features: [] })).catch(() => ({ features: [] })),
    fetch('../data/china-provinces.json').then((r) => (r.ok ? r.json() : { features: [] })).catch(() => ({ features: [] })),
    fetch('../data/travel-countries.json').then((r) => {
      if (!r.ok) throw new Error('Country destinations unavailable');
      return r.json();
    }),
  ]).then(([list, land, states, countries, provinces, travelCountries]) => {
      // Which countries / regions Hui has been to, read from the place names in visited.json
      // ("Tokyo, Japan", "Hong Kong SAR, China"); the map outline is only a fallback.
      function visitedCountries(placesList, travel) {
        const norm = (t) => (t || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/\./g, '').trim();
        const regions = travel.features.map((f) => {
          const p = f.properties;
          return {
            id: p.travel_id,
            names: new Set([p.name, p.name_zh, p.name_zht, p.code, ...(p.aliases || [])].map(norm).filter(Boolean)),
            lands: null,
            f,
          };
        });
        const byName = (t) => regions.find((r) => r.names.has(norm(t)));
        const out = new Map();
        for (const pl of placesList) {
          const parts = pl.name.split(',').map((t) => t.trim());
          // a Special Administrative Region is its own stop ("Hong Kong SAR, China" -> Hong Kong)
          const sar = parts.find((t) => /\bSAR\b/.test(t));
          let hit = sar && byName(sar.replace(/\s*SAR\b/, ''));
          for (let i = parts.length - 1; !hit && i > 0; i--) hit = byName(parts[i]);
          if (!hit && pl.coords) {
            const [x, y] = GEO.project(...pl.coords);
            hit = regions.find((r) => (r.lands = r.lands || GEO.landforms({ features: [r.f] })).some((l) => GEO.contains(l, x, y)));
          }
          if (!hit) continue;
          if (!out.has(hit.id)) out.set(hit.id, []);
          out.get(hit.id).push(parts[0].replace(/\s*SAR\b/, ''));
        }
        return out;
      }

      worldPlaces = buildPlaces(list);
      worldPlaces.push(computer(...GEO.project(33, -112), 'travel_map.html', 'Travel map (web)'));
      SCENES.world = scaleScene(
        {
          world: { ...GEO.size }, islands: [...GEO.landforms(land), ...GEO.landforms(travelCountries.landingLand)], bridges: [], places: worldPlaces,
          spawn: [...GEO.start], compass: GEO.project(-38, -120), extentScale: GEO.enlargement, open: true,
          destinations: [
            ...travelCountries.features.map(({ properties: p }) => ({
              id: p.travel_id, kind: 'country', code: p.code, name: p.name, zh: p.name_zh,
              aliases: [p.name_zht, ...p.aliases], point: GEO.project(...p.coords),
            })),
          ].sort((a, b) => a.name.localeCompare(b.name)),
          visitedCountries: visitedCountries(list, travelCountries),
          travelRegions: GEO.landforms(travelCountries),
          stateBorders: [
            ...GEO.landforms(countries).map((r) => Object.assign(r, { country: true })),
            ...GEO.landforms(states).map((r) => Object.assign(r, { usState: true })),
            ...GEO.landforms(provinces),
          ],
          mapLabels: GEO.labels.concat(
            countries.features.map(({ properties: p }) => ({ text: p.name, zh: p.name_zh, point: GEO.project(...p.coords), country: true })),
            travelCountries.features.filter(({ properties: p }) => !countries.features.some((f) => f.properties.name === p.name))
              .map(({ properties: p }) => ({ text: p.name, zh: p.name_zh, point: GEO.project(...p.coords), country: true })),
            [...states.features, ...provinces.features].map(({ properties: p }) => ({
              text: p.name, point: GEO.project(...p.coords), state: true,
            })),
          ),
        },
        SCENE_SCALE.world,
      );
      // A flag sprite is larger than some entire islands. Leave space beside
      // country landing points; the dot and leader still mark its true location.
      for (const d of SCENES.world.destinations.filter((p) => p.kind === 'country')) {
        for (const p of worldPlaces) {
          if (p.kind === 'flag' && Math.abs(p.x - d.point[0]) < (p.r || 26) + 12
            && d.point[1] < p.y + 18 && d.point[1] > p.y - 38) {
            p.x = d.point[0] + (p.r || 26) + 20;
            p.y = d.point[1] - 18;
          }
        }
      }
      renderJournal();
      renderTravelDestinations();
      idle(() => {
        if (!SCENES.world.decor) SCENES.world.decor = buildDecor(SCENES.world);
      });
      // A direct link for sharing/previewing The World; normal entry stays on Home.
      if (location.hash === '#world') loadScene('world', 'home');
    });
  worldReady.catch(() => {
    travelMapFailed = true;
    travelStatus.textContent = 'The destinations could not load. Refresh to try again.';
    if (location.hash === '#world') {
      document.getElementById('hint').textContent = 'The world map could not load. Please refresh to try again.';
    }
  });
  // Warm up the three page-backed worlds while Hui is still at home
  idle(() => ['games', 'music'].forEach((n) => ensureScene(n).catch(() => {})));
})();
