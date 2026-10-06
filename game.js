'use strict';

(() => {
  // =====================================================================
  //  Константы
  // =====================================================================
  const TILE = 40, COLS = 24, ROWS = 16, W = COLS * TILE, H = ROWS * TILE;
  const DAY_LEN = 180;            // длительность смены, секунд
  const PR = 12;                  // радиус официанта для коллизий
  const RANGE = TILE * 0.9;       // дистанция взаимодействия
  const ACCESS = TILE * 0.75;     // клетки, с которых можно взаимодействовать
  const EF = '"Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif';
  const UF = 'Rubik, system-ui, -apple-system, "Segoe UI", sans-serif';

  const DISHES = [
    { id: 'salad', name: 'Салат', e: '🥗', price: 8, cook: 4, day: 1 },
    { id: 'burger', name: 'Бургер', e: '🍔', price: 12, cook: 6, day: 1 },
    { id: 'pizza', name: 'Пицца', e: '🍕', price: 15, cook: 8, day: 1 },
    { id: 'cake', name: 'Торт', e: '🍰', price: 9, cook: 3, day: 2 },
    { id: 'pasta', name: 'Паста', e: '🍝', price: 14, cook: 7, day: 2 },
    { id: 'soup', name: 'Суп', e: '🍲', price: 11, cook: 5, day: 3 },
    { id: 'sushi', name: 'Суши', e: '🍣', price: 20, cook: 9, day: 4 },
    { id: 'ribs', name: 'Рёбрышки', e: '🍖', price: 24, cook: 11, day: 5 },
  ];

  const UPGRADES = [
    { id: 'shoes', e: '👟', name: 'Удобные кроссовки', desc: '+15% к скорости официанта', max: 3, cost: [60, 130, 240] },
    { id: 'chef', e: '👨‍🍳', name: 'Опытный повар', desc: 'Готовит на 20% быстрее', max: 3, cost: [80, 170, 300] },
    { id: 'music', e: '🎷', name: 'Живая музыка', desc: 'Гости на 15% терпеливее', max: 3, cost: [70, 150, 270] },
    { id: 'menu', e: '📜', name: 'Красивое меню', desc: 'Быстрее выбирают, чаевые +20%', max: 2, cost: [90, 200] },
    { id: 'tray', e: '🍽️', name: 'Большой поднос', desc: '+1 место в руках', max: 1, cost: [220] },
    { id: 'tables', e: '🪑', name: 'Новый стол', desc: '+1 стол в зале', max: 2, cost: [160, 320] },
  ];

  const T = { FLOOR: 0, WALL: 1, KITCHEN: 2, COUNTER: 3, PASS: 4, SINK: 5, TABLE: 6, CHAIR: 7, PLANT: 8, DOOR: 9, BAR: 10, QUEUE: 11 };
  const TABLE_POS = [{ x: 5, y: 6 }, { x: 11, y: 6 }, { x: 5, y: 11 }, { x: 11, y: 11 }, { x: 17, y: 6 }, { x: 17, y: 11 }];
  const STOVES = [2, 4, 6, 8, 10];
  const PLANTS = [[1, 4], [22, 4], [22, 14], [9, 14], [15, 14]];
  const QUEUE_SPOTS = [13, 12, 11, 10, 9, 8];
  const DOOR_TILES = [[1, 15], [2, 15]];
  const PASS_RECT = { x: 4, y: 3, w: 6, h: 1 }, PASS_CLICK = { x: 1, y: 1, w: 12, h: 3 };
  const SINK_RECT = { x: 14, y: 3, w: 4, h: 1 }, SINK_CLICK = { x: 14, y: 1, w: 4, h: 3 };
  const QOFF = { 1: [0], 2: [-14, 14], 3: [-26, 0, 26], 4: [-39, -13, 13, 39] };
  const SEAT_ORDER = { 1: [0], 2: [0, 2], 3: [0, 2, 1], 4: [0, 2, 1, 3] };
  const DECAY = { queue: 2.0, arriving: 2.0, following: 0.6, ordering: 2.4, waitingFood: 1.4, dirty: 2.4, bill: 2.8 };

  const SHIRTS = ['#e76f51', '#2a9d8f', '#e9c46a', '#8ab17d', '#6d597a', '#457b9d', '#f4a261', '#b5838d', '#3d405b', '#ef476f', '#06d6a0', '#118ab2'];
  const SKINS = ['#f1c27d', '#e0ac69', '#c68642', '#8d5524', '#ffdbac', '#f6d2b5'];
  const HAIRS = ['#2b1d14', '#5a3825', '#a0522d', '#d4a017', '#151515', '#7b7b7b', '#b5651d', '#e3c16f', '#8e3b46'];

  // =====================================================================
  //  Утилиты
  // =====================================================================
  const rand = (a, b) => a + Math.random() * (b - a);
  const pick = arr => arr[Math.floor(Math.random() * arr.length)];
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const tileKey = (x, y) => y * COLS + x;
  const $ = id => document.getElementById(id);

  function distToRect(px, py, r) {
    const x0 = r.x * TILE, y0 = r.y * TILE, x1 = (r.x + r.w) * TILE, y1 = (r.y + r.h) * TILE;
    const dx = Math.max(x0 - px, 0, px - x1), dy = Math.max(y0 - py, 0, py - y1);
    return Math.hypot(dx, dy);
  }
  const inRect = (px, py, r) => px >= r.x * TILE && px <= (r.x + r.w) * TILE && py >= r.y * TILE && py <= (r.y + r.h) * TILE;

  // =====================================================================
  //  Сохранение
  // =====================================================================
  const SAVE_KEY = 'waiter-save-v1';
  const defaultSave = () => ({ day: 1, wallet: 0, best: 0, up: {} });
  function loadSave() {
    try {
      const s = JSON.parse(localStorage.getItem(SAVE_KEY));
      if (s && s.day) return Object.assign(defaultSave(), s);
    } catch (e) { /* приватный режим и т.п. */ }
    return defaultSave();
  }
  function writeSave() { try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); } catch (e) { /* ignore */ } }
  let save = loadSave();

  const lvl = id => save.up[id] || 0;
  const playerSpeed = () => 150 * (1 + 0.15 * lvl('shoes'));
  const cookMul = () => 1 - 0.2 * lvl('chef');
  const patienceMul = () => 1 - 0.15 * lvl('music');
  const maxHands = () => 2 + lvl('tray');
  const dayGoal = d => 110 + 65 * (d - 1);

  // =====================================================================
  //  Звук (WebAudio, без файлов)
  // =====================================================================
  const SFX = {
    pick: [[520, 0, .08, 'triangle'], [780, .05, .08, 'triangle']],
    order: [[660, 0, .07, 'square', .035], [880, .07, .09, 'square', .035]],
    bell: [[1320, 0, .5, 'sine', .07], [1760, 0, .35, 'sine', .035]],
    coin: [[988, 0, .08, 'square', .045], [1319, .08, .28, 'square', .045]],
    serve: [[440, 0, .08, 'triangle'], [660, .07, .14, 'triangle']],
    clink: [[1500, 0, .05, 'triangle', .05], [1900, .04, .06, 'triangle', .04]],
    splash: [[300, 0, .15, 'sine', .07], [200, .06, .2, 'sine', .05]],
    door: [[587, 0, .12, 'sine', .05], [440, .12, .18, 'sine', .05]],
    angry: [[220, 0, .18, 'sawtooth', .04], [160, .15, .25, 'sawtooth', .04]],
    nope: [[180, 0, .1, 'square', .025]],
    ding: [[880, 0, .12, 'sine', .04]],
    win: [[523, 0, .15, 'triangle'], [659, .12, .15, 'triangle'], [784, .24, .35, 'triangle']],
    lose: [[392, 0, .2, 'triangle'], [330, .18, .2, 'triangle'], [262, .36, .4, 'triangle']],
  };
  const Sound = {
    on: true, ac: null,
    unlock() {
      try {
        if (!this.ac) this.ac = new (window.AudioContext || window.webkitAudioContext)();
        if (this.ac.state === 'suspended') this.ac.resume();
      } catch (e) { /* no audio */ }
    },
    tone(f, delay, dur, type = 'sine', vol = 0.07) {
      const ac = this.ac, t0 = ac.currentTime + delay;
      const o = ac.createOscillator(), g = ac.createGain();
      o.type = type;
      o.frequency.setValueAtTime(f, t0);
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.exponentialRampToValueAtTime(vol, t0 + 0.012);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
      o.connect(g); g.connect(ac.destination);
      o.start(t0); o.stop(t0 + dur + 0.03);
    },
    play(name) {
      if (!this.on || !this.ac || !SFX[name]) return;
      try { SFX[name].forEach(a => this.tone(...a)); } catch (e) { /* ignore */ }
    },
  };

  // =====================================================================
  //  Карта
  // =====================================================================
  let tiles = [];

  function buildMap(nTables) {
    tiles = [];
    for (let y = 0; y < ROWS; y++) {
      const row = [];
      for (let x = 0; x < COLS; x++) row.push(y === 0 || y === ROWS - 1 || x === 0 || x === COLS - 1 ? T.WALL : T.FLOOR);
      tiles.push(row);
    }
    const set = (x, y, t) => { tiles[y][x] = t; };
    for (let y = 1; y <= 2; y++) for (let x = 1; x <= 12; x++) set(x, y, T.KITCHEN);
    for (let x = 1; x <= 12; x++) set(x, 3, x >= 4 && x <= 9 ? T.PASS : T.COUNTER);
    for (let y = 1; y <= 3; y++) { set(13, y, T.WALL); set(18, y, T.WALL); }
    for (let y = 1; y <= 2; y++) for (let x = 14; x <= 17; x++) set(x, y, T.KITCHEN);
    for (let x = 14; x <= 17; x++) set(x, 3, T.SINK);
    for (let y = 1; y <= 3; y++) for (let x = 19; x <= 22; x++) set(x, y, T.BAR);
    for (let y = 8; y <= 14; y++) for (let x = 1; x <= 3; x++) set(x, y, T.QUEUE);
    DOOR_TILES.forEach(([x, y]) => set(x, y, T.DOOR));
    PLANTS.forEach(([x, y]) => set(x, y, T.PLANT));
    TABLE_POS.slice(0, nTables).forEach(p => {
      set(p.x, p.y, T.TABLE); set(p.x + 1, p.y, T.TABLE);
      [p.y - 1, p.y + 1].forEach(cy => { set(p.x, cy, T.CHAIR); set(p.x + 1, cy, T.CHAIR); });
    });
  }

  const tileAt = (x, y) => (tiles[y] ? tiles[y][x] : undefined);
  const walkP = (x, y) => { const t = tileAt(x, y); return t === T.FLOOR || t === T.QUEUE; };
  const walkC = (x, y) => { const t = tileAt(x, y); return t === T.FLOOR || t === T.QUEUE || t === T.DOOR; };

  function collides(px, py, r) {
    const pts = [[-r, -r], [r, -r], [-r, r], [r, r]];
    for (const [ox, oy] of pts) {
      if (!walkP(Math.floor((px + ox) / TILE), Math.floor((py + oy) / TILE))) return true;
    }
    return false;
  }

  // Поиск пути (BFS по клеткам) — возвращает центры клеток без стартовой
  const DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1]];
  function bfs(sx, sy, goals, passable) {
    const start = tileKey(sx, sy);
    if (goals.has(start)) return [];
    const prev = new Int32Array(COLS * ROWS).fill(-1);
    prev[start] = start;
    const q = [start];
    let head = 0;
    while (head < q.length) {
      const k = q[head++];
      const x = k % COLS, y = (k / COLS) | 0;
      for (const [dx, dy] of DIRS) {
        const nx = x + dx, ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= COLS || ny >= ROWS) continue;
        const nk = tileKey(nx, ny);
        if (prev[nk] !== -1) continue;
        const isGoal = goals.has(nk);
        if (!isGoal && !passable(nx, ny)) continue;
        prev[nk] = k;
        if (isGoal) {
          const path = [];
          let c = nk;
          while (c !== start) { path.push({ x: (c % COLS + 0.5) * TILE, y: (((c / COLS) | 0) + 0.5) * TILE }); c = prev[c]; }
          return path.reverse();
        }
        q.push(nk);
      }
    }
    return null;
  }

  function lineClear(a, b, passable, r) {
    const d = Math.hypot(b.x - a.x, b.y - a.y);
    const n = Math.max(1, Math.ceil(d / 5));
    for (let i = 0; i <= n; i++) {
      const x = a.x + (b.x - a.x) * i / n, y = a.y + (b.y - a.y) * i / n;
      for (const [ox, oy] of [[-r, -r], [r, -r], [-r, r], [r, r]]) {
        if (!passable(Math.floor((x + ox) / TILE), Math.floor((y + oy) / TILE))) return false;
      }
    }
    return true;
  }

  function smoothPath(start, pts, passable, r) {
    const out = [];
    let cur = start, i = 0;
    while (i < pts.length) {
      let j = pts.length - 1;
      while (j > i && !lineClear(cur, pts[j], passable, r)) j--;
      out.push(pts[j]);
      cur = pts[j];
      i = j + 1;
    }
    return out;
  }

  // =====================================================================
  //  Состояние
  // =====================================================================
  const canvas = $('game'), ctx = canvas.getContext('2d');
  const stage = $('stage'), overlay = $('overlay');
  let G = null, player = null, cook = null, tables = [], bg = null;
  let paused = false, running = false;
  let marker = null, lastResult = null;
  const keys = {};
  const mouse = { x: 0, y: 0, inside: false };
  let lastInput = 'mouse';

  function startDay() {
    const n = 4 + lvl('tables');
    buildMap(n);
    tables = TABLE_POS.slice(0, n).map((p, i) => ({
      num: i + 1, x: p.x, y: p.y, group: null, dirty: false, dirtySeats: [],
      seats: [
        { x: p.x, y: p.y - 1, side: -1 }, { x: p.x + 1, y: p.y - 1, side: -1 },
        { x: p.x, y: p.y + 1, side: 1 }, { x: p.x + 1, y: p.y + 1, side: 1 },
      ],
    }));
    bg = renderBackground();
    G = {
      day: save.day, time: 0, closing: false, spawnTimer: 2,
      groups: [], orders: [], floats: [], parts: [],
      earned: 0, tips: 0, served: 0, walkouts: 0, goalHit: false, over: false, uid: 1,
    };
    player = {
      x: 10.5 * TILE, y: 9.5 * TILE, dir: { x: 0, y: 1 }, path: [], target: null,
      hands: [], tickets: [], leading: null, trail: [], walkT: 0, moving: false, retries: 0,
    };
    cook = { x: 7 * TILE, y: 2.4 * TILE, walkT: 0, moving: false, dir: { x: 0, y: 1 } };
    marker = null;
    paused = false;
    running = true;
    hideOverlay();
    toast(`☀️ День ${G.day}. Цель — заработать $${dayGoal(G.day)}`);
  }

  // =====================================================================
  //  Гости
  // =====================================================================
  function spawnGroup() {
    const inQueue = G.groups.filter(g => g.state === 'arriving' || g.state === 'queue').length;
    if (inQueue >= QUEUE_SPOTS.length) return;
    const maxSize = G.day >= 4 ? 4 : G.day >= 2 ? 3 : 2;
    const weights = [3, 4, 2, 1.5].slice(0, maxSize);
    let r = Math.random() * weights.reduce((a, b) => a + b, 0), size = 1;
    for (let i = 0; i < weights.length; i++) { r -= weights[i]; if (r <= 0) { size = i + 1; break; } }
    const members = [];
    for (let k = 0; k < size; k++) {
      members.push({
        x: 2 * TILE + rand(-12, 12), y: 15.8 * TILE + k * 8, path: [], tx: null, ty: null,
        look: { shirt: pick(SHIRTS), skin: pick(SKINS), hair: pick(HAIRS), long: Math.random() < 0.4 },
        dir: { x: 0, y: -1 }, walkT: rand(0, 5), moving: false, seat: null,
      });
    }
    G.groups.push({ id: G.uid++, size, members, state: 'arriving', mood: 100, timer: 0, timerMax: 1, table: null, order: null, angry: false, qi: 0 });
    Sound.play('door');
  }

  const atRest = m => !m.path.length && (m.tx == null || Math.hypot(m.tx - m.x, m.ty - m.y) < 1);

  function moveMember(m, dt, speed) {
    let step = speed * dt, moved = false;
    while (step > 0) {
      const tgt = m.path.length ? m.path[0] : (m.tx != null ? { x: m.tx, y: m.ty } : null);
      if (!tgt) break;
      const dx = tgt.x - m.x, dy = tgt.y - m.y, d = Math.hypot(dx, dy);
      if (d > 0.5) m.dir = { x: dx / d, y: dy / d };
      if (d <= step) {
        m.x = tgt.x; m.y = tgt.y; step -= d;
        if (d > 0.01) moved = true;
        if (m.path.length) m.path.shift(); else break;
      } else {
        m.x += dx / d * step; m.y += dy / d * step; step = 0; moved = true;
      }
    }
    m.moving = moved;
    if (moved) m.walkT += dt;
  }

  function pathForMember(m, goals, passable) {
    const sx = clamp(Math.floor(m.x / TILE), 0, COLS - 1), sy = clamp(Math.floor(m.y / TILE), 0, ROWS - 1);
    const path = bfs(sx, sy, goals, passable);
    return path ? smoothPath({ x: m.x, y: m.y }, path, passable, 9) : null;
  }

  function updateGroups(dt) {
    const queued = G.groups.filter(g => g.state === 'arriving' || g.state === 'queue');
    queued.forEach((g, i) => {
      g.qi = i;
      const sy = (QUEUE_SPOTS[i] + 0.5) * TILE;
      g.members.forEach((m, k) => { m.tx = 2.5 * TILE + QOFF[g.size][k]; m.ty = sy + (k % 2 ? 3 : -3); });
    });

    const mul = patienceMul() * (1 + 0.06 * (G.day - 1));
    const followSpeed = playerSpeed() * 1.1;

    for (const g of G.groups) {
      if (g.state === 'following') {
        const tr = player.trail;
        g.members.forEach((m, k) => {
          const p = tr[Math.max(0, tr.length - 1 - 7 * (k + 1))];
          m.tx = p.x; m.ty = p.y;
        });
      }
      const speed = g.state === 'following' ? followSpeed : 95;
      g.members.forEach(m => moveMember(m, dt, speed));

      const rate = DECAY[g.state];
      if (rate) {
        g.mood -= rate * mul * dt;
        if (g.mood <= 0) { g.mood = 0; walkout(g); continue; }
      }

      switch (g.state) {
        case 'arriving':
          if (g.members.every(atRest)) g.state = 'queue';
          break;
        case 'seating':
          if (g.members.every(m => !m.path.length)) {
            g.state = 'reading';
            g.timer = g.timerMax = rand(3, 6) * (1 - 0.25 * lvl('menu'));
            g.members.forEach(m => { m.dir = { x: 0, y: -m.seat.side }; });
          }
          break;
        case 'reading':
          g.timer -= dt;
          if (g.timer <= 0) { g.state = 'ordering'; Sound.play('ding'); }
          break;
        case 'eating':
          g.timer -= dt;
          g.mood = Math.min(100, g.mood + dt * 1.5);
          if (g.timer <= 0) {
            g.state = 'dirty';
            g.table.dirty = true;
            g.table.dirtySeats = g.members.map(m => m.seat);
          }
          break;
        case 'leaving':
          if (g.members.every(m => !m.path.length)) g.gone = true;
          break;
      }
    }
    G.groups = G.groups.filter(g => !g.gone);
  }

  function walkout(g) {
    G.walkouts++;
    Sound.play('angry');
    const m = g.members[0];
    addFloat(m.x, m.y - 34, 'Ушли недовольными!', '#ff8a7a', 14);
    sendHome(g, true);
  }

  function sendHome(g, angry) {
    if (player.leading === g) player.leading = null;
    if (g.table) { g.table.group = null; g.table = null; }
    const o = g.order;
    if (o && o.status !== 'served') {
      o.orphan = true;
      player.tickets = player.tickets.filter(x => x !== o);
      G.orders = G.orders.filter(x => x !== o);
    }
    g.state = 'leaving';
    g.angry = angry;
    const goals = new Set(DOOR_TILES.map(([x, y]) => tileKey(x, y)));
    g.members.forEach(m => {
      m.seat = null; m.tx = null;
      const pts = pathForMember(m, goals, walkC) || [];
      const last = pts.length ? pts[pts.length - 1] : { x: m.x, y: m.y };
      pts.push({ x: last.x, y: 16.8 * TILE });
      m.path = pts;
    });
  }

  // =====================================================================
  //  Действия официанта
  // =====================================================================
  const freeHands = () => maxHands() - player.hands.length;
  const tableCenter = t => ({ x: (t.x + 1) * TILE, y: (t.y + 0.5) * TILE });

  function startLeading(g) {
    player.leading = g;
    player.trail = [{ x: player.x, y: player.y }];
    g.state = 'following';
    g.members.forEach(m => { m.path = []; });
    Sound.play('pick');
    addFloat(g.members[0].x, g.members[0].y - 30, '😊', null, 20);
  }

  function seatGroup(g, t) {
    player.leading = null;
    t.group = g; g.table = t;
    g.state = 'seating';
    g.mood = Math.min(100, g.mood + 10);
    const order = SEAT_ORDER[g.size];
    g.members.forEach((m, k) => {
      const seat = t.seats[order[k]];
      m.seat = seat; m.tx = null;
      const pass = (x, y) => walkC(x, y) || (x === seat.x && y === seat.y);
      const path = pathForMember(m, new Set([tileKey(seat.x, seat.y)]), pass);
      m.path = path && path.length ? path : [{ x: (seat.x + 0.5) * TILE, y: (seat.y + 0.5) * TILE }];
    });
    Sound.play('pick');
  }

  function takeOrder(g) {
    const menu = DISHES.filter(d => d.day <= G.day);
    const dishes = g.members.map(() => pick(menu));
    const cookTime = (Math.max(...dishes.map(d => d.cook)) + 1.5 * (dishes.length - 1)) * cookMul();
    const o = {
      id: G.uid++, group: g, table: g.table, dishes, total: dishes.reduce((s, d) => s + d.price, 0),
      status: 'ticket', cookTime, timer: cookTime, orphan: false, readyAt: 0,
    };
    g.order = o;
    g.state = 'waitingFood';
    g.mood = Math.min(100, g.mood + 5);
    player.tickets.push(o);
    Sound.play('order');
    const c = tableCenter(g.table);
    addFloat(c.x, c.y - 50, '📝 ' + dishes.map(d => d.e).join(''), '#fff', 15);
  }

  function passInteract(pref) {
    if (player.tickets.length) {
      const n = player.tickets.length;
      player.tickets.forEach(o => { o.status = 'cooking'; o.timer = o.cookTime; G.orders.push(o); });
      player.tickets = [];
      addFloat(7 * TILE, 2.6 * TILE, `👨‍🍳 Повар принял заказ${n > 1 ? ' ×' + n : ''}`, '#fff', 14);
      Sound.play('order');
    }
    const ready = G.orders.filter(o => o.status === 'ready').sort((a, b) => a.readyAt - b.readyAt);
    if (pref && ready.includes(pref)) { ready.splice(ready.indexOf(pref), 1); ready.unshift(pref); }
    let picked = 0;
    for (const o of ready) {
      if (freeHands() <= 0) break;
      o.status = 'carried';
      G.orders = G.orders.filter(x => x !== o);
      player.hands.push({ type: 'tray', order: o });
      picked++;
    }
    if (picked) Sound.play('pick');
    else if (ready.length && freeHands() <= 0) toast('Руки заняты — сначала отнеси то, что держишь');
  }

  function serve(g, idx) {
    const h = player.hands.splice(idx, 1)[0];
    h.order.status = 'served';
    g.state = 'eating';
    g.timer = g.timerMax = rand(7, 11);
    g.mood = Math.min(100, g.mood + 15);
    Sound.play('serve');
    const c = tableCenter(g.table);
    addFloat(c.x, c.y - 50, '😋 Спасибо!', '#fff', 14);
  }

  function clearTable(t) {
    player.hands.push({ type: 'dirty', num: t.num });
    t.dirty = false;
    t.dirtySeats = [];
    if (t.group && t.group.state === 'dirty') {
      t.group.state = 'bill';
      t.group.mood = Math.min(100, t.group.mood + 5);
    }
    Sound.play('clink');
  }

  function takePayment(g) {
    const base = g.order.total;
    const tip = Math.round(base * 0.35 * (g.mood / 100) * (1 + 0.2 * lvl('menu')));
    const sum = base + tip;
    G.earned += sum; G.tips += tip; G.served += g.size;
    const c = tableCenter(g.table);
    addFloat(c.x, c.y - 44, `+$${sum}`, '#ffd166', 22);
    if (tip > 0) addFloat(c.x, c.y - 22, `чаевые $${tip}`, '#b7f0c1', 13);
    if (g.mood > 65) for (let i = 0; i < 5; i++) addPart(c.x + rand(-20, 20), c.y - 10, rand(-15, 15), rand(-60, -30), 1.2, 'heart');
    Sound.play('coin');
    sendHome(g, false);
    if (!G.goalHit && G.earned >= dayGoal(G.day)) { G.goalHit = true; toast('🎯 Цель дня выполнена! Всё сверху — бонус'); Sound.play('win'); }
  }

  function dropAtSink() {
    const before = player.hands.length;
    player.hands = player.hands.filter(h => !(h.type === 'dirty' || (h.type === 'tray' && h.order.orphan)));
    const n = before - player.hands.length;
    Sound.play('splash');
    for (let i = 0; i < 10 * n; i++) addPart(rand(14.3, 17.7) * TILE, 3.4 * TILE, rand(-20, 20), rand(-50, -15), rand(0.6, 1.2), 'bubble');
  }

  // =====================================================================
  //  Интерактивные объекты
  // =====================================================================
  function getInteractables() {
    const list = [
      { kind: 'pass', rect: PASS_RECT, click: PASS_CLICK },
      { kind: 'sink', rect: SINK_RECT, click: SINK_CLICK },
    ];
    for (const t of tables) {
      list.push({ kind: 'table', table: t, rect: { x: t.x, y: t.y - 1, w: 2, h: 3 }, click: { x: t.x - 0.15, y: t.y - 1.1, w: 2.3, h: 3.2 } });
    }
    for (const g of G.groups) {
      if (g.state === 'queue' || g.state === 'arriving') {
        const r = { x: 1, y: QUEUE_SPOTS[g.qi] - 0.15, w: 3, h: 1.1 };
        list.push({ kind: 'group', group: g, rect: r, click: r });
      }
    }
    return list;
  }

  function rectOf(it) {
    if (it.kind === 'group') return { x: 1, y: QUEUE_SPOTS[it.group.qi] - 0.15, w: 3, h: 1.1 };
    return it.rect;
  }

  const inRange = it => distToRect(player.x, player.y, rectOf(it)) <= RANGE;

  function actionFor(it) {
    const p = player;
    if (it.kind === 'group') {
      const g = it.group;
      if (g.state !== 'queue' && g.state !== 'arriving') return { msg: 'Эти гости уже не ждут' };
      if (p.leading) return { msg: 'Сначала посади гостей, которых ведёшь' };
      if (!tables.some(t => !t.group && !t.dirty)) return { msg: 'Нет свободных чистых столов' };
      return { fn: () => startLeading(g), label: 'Проводить за стол' };
    }
    if (it.kind === 'table') {
      const t = it.table, g = t.group;
      if (g) {
        switch (g.state) {
          case 'seating': case 'reading': return { msg: 'Гости изучают меню…' };
          case 'ordering': return { fn: () => takeOrder(g), label: 'Принять заказ' };
          case 'waitingFood': {
            const idx = p.hands.findIndex(h => h.type === 'tray' && h.order.group === g && !h.order.orphan);
            if (idx >= 0) return { fn: () => serve(g, idx), label: 'Подать блюдо' };
            if (p.tickets.includes(g.order)) return { msg: 'Сначала отнеси заказ на кухню' };
            if (g.order.status === 'ready') return { msg: 'Заказ готов — забери его на раздаче' };
            return { msg: 'Заказ готовится…' };
          }
          case 'eating': return { msg: 'Гости едят. Не мешай 🙂' };
          case 'dirty':
            if (freeHands() <= 0) return { msg: 'Руки заняты — некуда взять посуду' };
            return { fn: () => clearTable(t), label: 'Убрать посуду' };
          case 'bill': return { fn: () => takePayment(g), label: 'Принять оплату' };
          default: return { msg: '' };
        }
      }
      if (t.dirty) {
        if (freeHands() <= 0) return { msg: 'Руки заняты — некуда взять посуду' };
        return { fn: () => clearTable(t), label: 'Убрать стол' };
      }
      if (p.leading) return { fn: () => seatGroup(p.leading, t), label: `Посадить за стол №${t.num}` };
      return { msg: `Стол №${t.num} свободен` };
    }
    if (it.kind === 'pass') {
      const ready = G.orders.filter(o => o.status === 'ready').length;
      if (p.tickets.length) return { fn: () => passInteract(it.pref), label: 'Передать заказ повару' };
      if (!ready) return { msg: G.orders.length ? 'Блюда ещё готовятся…' : 'Нет заказов для кухни' };
      if (freeHands() <= 0) return { msg: 'Руки заняты' };
      return { fn: () => passInteract(it.pref), label: 'Забрать блюдо' };
    }
    if (it.kind === 'sink') {
      const n = p.hands.filter(h => h.type === 'dirty' || (h.type === 'tray' && h.order.orphan)).length;
      if (!n) return { msg: 'Сюда относят грязную посуду' };
      return { fn: dropAtSink, label: 'Сдать посуду в мойку' };
    }
    return { msg: '' };
  }

  function doInteract(it) {
    const a = actionFor(it);
    if (a.fn) a.fn();
    else if (a.msg) { toast(a.msg); Sound.play('nope'); }
  }

  function interactableAt(x, y) {
    const list = getInteractables();
    const order = ['group', 'table', 'pass', 'sink'];
    list.sort((a, b) => order.indexOf(a.kind) - order.indexOf(b.kind));
    for (const it of list) {
      if (inRect(x, y, it.click)) {
        if (it.kind === 'pass' && inRect(x, y, PASS_RECT)) {
          const ready = G.orders.filter(o => o.status === 'ready');
          it.pref = ready[Math.floor(x / TILE) - 4] || null;
        }
        return it;
      }
    }
    return null;
  }

  function nearestInteractable() {
    let best = null, bestScore = Infinity;
    for (const it of getInteractables()) {
      const d = distToRect(player.x, player.y, it.rect);
      if (d > RANGE) continue;
      const score = d + (actionFor(it).fn ? 0 : 1000);
      if (score < bestScore) { best = it; bestScore = score; }
    }
    return best;
  }

  const playerTile = () => ({ x: clamp(Math.floor(player.x / TILE), 0, COLS - 1), y: clamp(Math.floor(player.y / TILE), 0, ROWS - 1) });

  function goTo(goals, target) {
    const s = playerTile();
    const path = bfs(s.x, s.y, goals, walkP);
    if (!path) { toast('Туда не пройти'); return false; }
    const pts = path.length ? smoothPath({ x: player.x, y: player.y }, path, walkP, PR) : [{ x: (s.x + 0.5) * TILE, y: (s.y + 0.5) * TILE }];
    player.path = pts;
    player.target = target;
    const last = pts[pts.length - 1];
    marker = { x: last.x, y: last.y, t: 0 };
    return true;
  }

  function goToInteractable(it) {
    const r = rectOf(it), goals = new Set();
    for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) {
      if (walkP(x, y) && distToRect((x + 0.5) * TILE, (y + 0.5) * TILE, r) <= ACCESS) goals.add(tileKey(x, y));
    }
    return goTo(goals, it);
  }

  // =====================================================================
  //  Обновление
  // =====================================================================
  function update(dt) {
    if (!G || paused || G.over || !running) return;
    G.time += dt;
    updateSpawning(dt);
    updatePlayer(dt);
    updateGroups(dt);
    updateKitchen(dt);
    updateFx(dt);
    if (G.closing && G.groups.length === 0) endDay();
  }

  function updateSpawning(dt) {
    if (G.time >= DAY_LEN && !G.closing) {
      G.closing = true;
      toast('🔔 Ресторан закрывается! Обслужи оставшихся гостей');
      Sound.play('bell');
      G.groups.filter(g => g.state === 'queue' || g.state === 'arriving').forEach(g => sendHome(g, false));
    }
    if (G.closing) return;
    G.spawnTimer -= dt;
    if (G.spawnTimer <= 0) {
      spawnGroup();
      const f = Math.pow(0.9, G.day - 1);
      G.spawnTimer = rand(Math.max(4, 11 * f), Math.max(6.5, 16 * f));
    }
  }

  function updatePlayer(dt) {
    const p = player, sp = playerSpeed();
    let kx = (keys.right ? 1 : 0) - (keys.left ? 1 : 0);
    let ky = (keys.down ? 1 : 0) - (keys.up ? 1 : 0);
    const ox = p.x, oy = p.y;
    if (kx || ky) {
      p.path = []; p.target = null; marker = null;
      const l = Math.hypot(kx, ky); kx /= l; ky /= l;
      const nx = p.x + kx * sp * dt;
      if (!collides(nx, p.y, PR)) p.x = nx;
      const ny = p.y + ky * sp * dt;
      if (!collides(p.x, ny, PR)) p.y = ny;
      p.dir = { x: kx, y: ky };
    } else if (p.path.length) {
      let step = sp * dt;
      while (step > 0 && p.path.length) {
        const n = p.path[0], dx = n.x - p.x, dy = n.y - p.y, d = Math.hypot(dx, dy);
        if (d > 0.5) p.dir = { x: dx / d, y: dy / d };
        if (d <= step) { p.x = n.x; p.y = n.y; p.path.shift(); step -= d; }
        else { p.x += dx / d * step; p.y += dy / d * step; step = 0; }
      }
      if (!p.path.length && p.target) {
        const t = p.target;
        p.target = null;
        if (inRange(t)) { p.retries = 0; doInteract(t); }
        else if (t.kind === 'group' && p.retries < 3) { p.retries++; goToInteractable(t); }
        else p.retries = 0;
      }
    }
    p.moving = Math.hypot(p.x - ox, p.y - oy) > 0.01;
    if (p.moving) {
      p.walkT += dt;
      const last = p.trail[p.trail.length - 1];
      if (!last || Math.hypot(last.x - p.x, last.y - p.y) >= 4) {
        p.trail.push({ x: p.x, y: p.y });
        if (p.trail.length > 120) p.trail.shift();
      }
    }
  }

  function updateKitchen(dt) {
    for (const o of G.orders) {
      if (o.status !== 'cooking') continue;
      o.timer -= dt;
      if (o.timer <= 0) {
        o.status = 'ready';
        o.readyAt = G.time;
        Sound.play('bell');
        addFloat(7 * TILE, 2.7 * TILE, `🛎️ Стол №${o.table.num} — готово!`, '#ffd166', 14);
      }
    }
    // повар ходит между плитами
    const cooking = G.orders.filter(o => o.status === 'cooking');
    let tx = 7 * TILE;
    if (cooking.length) tx = (STOVES[Math.floor(G.time / 2.2) % Math.min(5, cooking.length)] + 0.5) * TILE;
    else if (G.orders.some(o => o.status === 'ready')) tx = 6.5 * TILE;
    const d = tx - cook.x;
    if (Math.abs(d) > 1) {
      cook.x += Math.sign(d) * Math.min(90 * dt, Math.abs(d));
      cook.moving = true; cook.walkT += dt; cook.dir = { x: Math.sign(d), y: 0 };
    } else {
      cook.moving = false;
      cook.dir = { x: 0, y: cooking.length ? -1 : 1 };
    }
    // пар над сковородками
    cooking.slice(0, 5).forEach((o, i) => {
      if (Math.random() < dt * 5) addPart((STOVES[i] + 0.5) * TILE + rand(-6, 6), 1.4 * TILE, rand(-5, 5), rand(-30, -18), rand(0.8, 1.3), 'steam');
    });
  }

  function updateFx(dt) {
    for (const f of G.floats) { f.t += dt; f.y -= 24 * dt; }
    G.floats = G.floats.filter(f => f.t < 1.7);
    for (const p of G.parts) { p.t += dt; p.x += p.vx * dt; p.y += p.vy * dt; }
    G.parts = G.parts.filter(p => p.t < p.life);
    if (marker) { marker.t += dt; if (marker.t > 0.8) marker = null; }
  }

  function addFloat(x, y, text, color, size = 16) { G.floats.push({ x, y, text, color: color || '#fff', size, t: 0 }); }
  function addPart(x, y, vx, vy, life, kind) { G.parts.push({ x, y, vx, vy, life, kind, t: 0 }); }

  // =====================================================================
  //  Отрисовка: помощники
  // =====================================================================
  function rr(c, x, y, w, h, r) {
    c.beginPath();
    c.moveTo(x + r, y);
    c.arcTo(x + w, y, x + w, y + h, r);
    c.arcTo(x + w, y + h, x, y + h, r);
    c.arcTo(x, y + h, x, y, r);
    c.arcTo(x, y, x + w, y, r);
    c.closePath();
  }
  function circ(c, x, y, r) { c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); }
  function ell(c, x, y, rx, ry) { c.beginPath(); c.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); }
  function emoji(c, e, x, y, size) {
    c.font = `${size}px ${EF}`;
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.fillStyle = '#000';
    c.fillText(e, x, y + size * 0.05);
  }
  function label(c, s, x, y, size, color, weight = 700) {
    c.font = `${weight} ${size}px ${UF}`;
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.fillStyle = color;
    c.fillText(s, x, y);
  }

  // =====================================================================
  //  Статический фон (рендерится один раз за день)
  // =====================================================================
  function renderBackground() {
    const cv = document.createElement('canvas');
    cv.width = W * 2; cv.height = H * 2;
    const g = cv.getContext('2d');
    g.scale(2, 2);

    // деревянный пол
    const WOOD = ['#c48a55', '#bb8150', '#c99460', '#b57a49'];
    for (let r = 0; r < ROWS * 2; r++) {
      const y = r * 20;
      let x = -((r * 37) % 80), i = r;
      while (x < W) {
        g.fillStyle = WOOD[(i * 7 + r * 3) % WOOD.length];
        g.fillRect(x, y, 80, 20);
        g.fillStyle = 'rgba(70,35,10,.2)';
        g.fillRect(x, y, 1, 20);
        x += 80; i++;
      }
      g.fillStyle = 'rgba(70,35,10,.25)';
      g.fillRect(0, y + 19, W, 1);
    }

    // плитка кухни и пол бара
    for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) {
      const t = tiles[y][x], px = x * TILE, py = y * TILE;
      if (t === T.KITCHEN || t === T.COUNTER || t === T.PASS || t === T.SINK) {
        for (let j = 0; j < 2; j++) for (let i = 0; i < 2; i++) {
          g.fillStyle = (i + j) % 2 ? '#dde2e8' : '#f1f3f5';
          g.fillRect(px + i * 20, py + j * 20, 20, 20);
        }
      } else if (t === T.BAR) {
        g.fillStyle = '#3a2619';
        g.fillRect(px, py, TILE, TILE);
      }
    }

    // ковровая дорожка у входа
    g.fillStyle = '#8f1d2c';
    g.fillRect(TILE + 4, 8 * TILE + 4, 3 * TILE - 8, 7 * TILE + 4);
    g.strokeStyle = '#e9b949'; g.lineWidth = 2;
    g.strokeRect(TILE + 9, 8 * TILE + 9, 3 * TILE - 18, 7 * TILE - 6);
    g.strokeStyle = 'rgba(233,185,73,.35)'; g.lineWidth = 1;
    g.strokeRect(TILE + 13, 8 * TILE + 13, 3 * TILE - 26, 7 * TILE - 14);
    label(g, 'ОЖИДАНИЕ', 2.5 * TILE, 8 * TILE - 10, 10, 'rgba(90,50,25,.75)', 800);

    // стены
    for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) {
      if (tiles[y][x] !== T.WALL) continue;
      g.fillStyle = '#4b3427';
      g.fillRect(x * TILE, y * TILE, TILE, TILE);
      g.fillStyle = 'rgba(255,255,255,.04)';
      g.fillRect(x * TILE, y * TILE, TILE, 2);
    }
    g.strokeStyle = 'rgba(0,0,0,.35)'; g.lineWidth = 3;
    g.strokeRect(TILE - 1.5, TILE - 1.5, W - 2 * TILE + 3, H - 2 * TILE + 3);

    // окна
    const win = (x, y, w, h) => {
      g.fillStyle = '#2f2119'; g.fillRect(x - 2, y - 2, w + 4, h + 4);
      const gr = g.createLinearGradient(x, y, x + w, y + h);
      gr.addColorStop(0, '#bfe6f5'); gr.addColorStop(1, '#7cc0dd');
      g.fillStyle = gr; g.fillRect(x, y, w, h);
      g.fillStyle = 'rgba(255,255,255,.45)'; g.fillRect(x + 4, y + 2, w * 0.3, 3);
    };
    [[6, 7], [11, 12], [16, 17], [20, 21]].forEach(([a]) => win(a * TILE + 6, 15 * TILE + 14, 2 * TILE - 12, 12));
    [[6], [11]].forEach(([a]) => win(23 * TILE + 14, a * TILE + 6, 12, 2 * TILE - 12));

    // вход
    g.fillStyle = '#8f1d2c';
    g.fillRect(TILE, 15 * TILE, 2 * TILE, TILE);
    g.fillStyle = '#e9b949';
    g.fillRect(TILE, 15 * TILE + 1, 2 * TILE, 3);
    g.fillStyle = '#6b4226';
    g.fillRect(TILE - 4, 15 * TILE, 5, 30);
    g.fillRect(3 * TILE - 1, 15 * TILE, 5, 30);
    label(g, 'ВХОД', 2 * TILE, 15 * TILE + 22, 11, '#ffe3a3', 800);

    // кухня: задняя столешница
    g.fillStyle = '#b8c0c8';
    g.fillRect(TILE, TILE, 12 * TILE, TILE - 6);
    g.fillStyle = '#ced4da';
    g.fillRect(TILE, TILE, 12 * TILE, 4);
    // холодильник
    g.fillStyle = '#f8f9fa'; rr(g, TILE + 3, TILE + 2, TILE - 6, TILE - 6, 4); g.fill();
    g.strokeStyle = '#9aa4ae'; g.lineWidth = 1.5; g.stroke();
    g.fillStyle = '#9aa4ae'; g.fillRect(2 * TILE - 10, TILE + 9, 2, 16);
    // плиты
    STOVES.forEach(sx => {
      const x = sx * TILE, y = TILE;
      g.fillStyle = '#2f3437'; rr(g, x + 2, y + 2, TILE - 4, TILE - 8, 4); g.fill();
      g.strokeStyle = '#5c666d'; g.lineWidth = 2;
      [[12, 11], [28, 11], [12, 25], [28, 25]].forEach(([dx, dy]) => { circ(g, x + dx, y + dy, 5); g.stroke(); });
    });
    // разделочная доска
    g.fillStyle = '#d4a373'; rr(g, 12 * TILE + 6, TILE + 6, TILE - 12, TILE - 18, 3); g.fill();
    g.fillStyle = '#6c757d'; g.fillRect(12 * TILE + 12, TILE + 13, 16, 3);
    label(g, '🛎️ РАЗДАЧА', 7 * TILE, 2.62 * TILE, 10, 'rgba(60,70,80,.55)', 800);

    // стойка раздачи
    for (let x = 1; x <= 12; x++) {
      const px = x * TILE, py = 3 * TILE, isPass = x >= 4 && x <= 9;
      g.fillStyle = isPass ? '#e3e7eb' : '#a5aeb7';
      g.fillRect(px, py + 2, TILE, TILE - 4);
      g.fillStyle = isPass ? '#f6f7f8' : '#c3cad1';
      g.fillRect(px, py + 2, TILE, 4);
      g.fillStyle = 'rgba(0,0,0,.15)';
      g.fillRect(px, py + TILE - 4, TILE, 2);
    }
    for (let i = 0; i < 3; i++) {
      const cx = (5 + i * 2) * TILE, cy = 3.5 * TILE;
      const gr = g.createRadialGradient(cx, cy, 2, cx, cy, 40);
      gr.addColorStop(0, 'rgba(255,170,60,.28)'); gr.addColorStop(1, 'rgba(255,170,60,0)');
      g.fillStyle = gr; g.fillRect(cx - 40, cy - 20, 80, 40);
    }

    // мойка
    g.fillStyle = '#ced4da';
    g.fillRect(14 * TILE, TILE, 4 * TILE, TILE - 8);
    for (let i = 0; i < 4; i++) {
      for (let k = 0; k < 3; k++) {
        g.fillStyle = k % 2 ? '#e9ecef' : '#ffffff';
        circ(g, (14.5 + i) * TILE, TILE + 18 - k * 3, 11); g.fill();
        g.strokeStyle = '#adb5bd'; g.lineWidth = 1; g.stroke();
      }
    }
    label(g, '🧽 МОЙКА', 16 * TILE, 2.55 * TILE, 10, 'rgba(60,70,80,.55)', 800);
    for (let x = 14; x <= 17; x++) {
      g.fillStyle = '#a5aeb7'; g.fillRect(x * TILE, 3 * TILE + 2, TILE, TILE - 4);
      g.fillStyle = '#c3cad1'; g.fillRect(x * TILE, 3 * TILE + 2, TILE, 4);
    }
    [[14.15, 15.85], [16.15, 17.85]].forEach(([a, b]) => {
      g.fillStyle = '#6c8fa6'; rr(g, a * TILE, 3 * TILE + 8, (b - a) * TILE, TILE - 16, 6); g.fill();
      g.fillStyle = '#a9d6ef'; rr(g, a * TILE + 3, 3 * TILE + 11, (b - a) * TILE - 6, TILE - 22, 4); g.fill();
    });
    g.fillStyle = '#868e96'; circ(g, 16 * TILE, 3 * TILE + 8, 4); g.fill();

    // бар
    g.fillStyle = '#4a2f1f';
    g.fillRect(19 * TILE, TILE, 4 * TILE, TILE + 10);
    const BOTTLES = ['#2d6a4f', '#9d0208', '#e9c46a', '#264653', '#bc6c25', '#6a4c93'];
    for (let i = 0; i < 16; i++) {
      const bx = 19 * TILE + 8 + i * 9.5, by = TILE + 6 + (i % 2) * 22;
      g.fillStyle = BOTTLES[i % BOTTLES.length];
      rr(g, bx - 3, by, 7, 14, 2); g.fill();
      g.fillStyle = 'rgba(255,255,255,.35)'; g.fillRect(bx - 2, by + 2, 1.5, 8);
    }
    g.fillStyle = '#7a4a2e'; rr(g, 19 * TILE, 3 * TILE + 4, 4 * TILE - 2, TILE - 8, 6); g.fill();
    g.fillStyle = 'rgba(255,255,255,.12)'; g.fillRect(19 * TILE + 4, 3 * TILE + 7, 4 * TILE - 10, 3);
    for (let i = 0; i < 5; i++) {
      g.fillStyle = 'rgba(220,240,255,.7)'; circ(g, 19 * TILE + 18 + i * 32, 3 * TILE + 22, 5); g.fill();
    }
    label(g, 'БАР', 21 * TILE, 2.55 * TILE, 13, '#f4b942', 800);

    // растения
    PLANTS.forEach(([x, y]) => {
      const cx = (x + 0.5) * TILE, cy = (y + 0.5) * TILE;
      g.fillStyle = 'rgba(0,0,0,.2)'; ell(g, cx, cy + 13, 13, 5); g.fill();
      g.fillStyle = '#9c5a2b'; circ(g, cx, cy + 4, 12); g.fill();
      g.fillStyle = '#2d6a4f';
      [[-7, -3], [7, -4], [0, -10], [-8, 5], [8, 4], [0, 1]].forEach(([dx, dy]) => { circ(g, cx + dx, cy + dy, 8); g.fill(); });
      g.fillStyle = '#52b788';
      [[-4, -7], [5, -1], [-2, 3]].forEach(([dx, dy]) => { circ(g, cx + dx, cy + dy, 5); g.fill(); });
    });

    // столы и стулья
    for (const t of tables) {
      t.seats.forEach(s => {
        const px = s.x * TILE, py = s.y * TILE;
        g.fillStyle = 'rgba(0,0,0,.15)'; rr(g, px + 7, py + 9, TILE - 14, TILE - 14, 6); g.fill();
        g.fillStyle = '#6b4226'; rr(g, px + 7, py + 7, TILE - 14, TILE - 14, 6); g.fill();
        g.fillStyle = '#9c6644'; rr(g, px + 10, py + 10, TILE - 20, TILE - 20, 4); g.fill();
        g.fillStyle = '#4e2f1a';
        if (s.side < 0) g.fillRect(px + 8, py + 5, TILE - 16, 5);
        else g.fillRect(px + 8, py + TILE - 10, TILE - 16, 5);
      });
      const x = t.x * TILE, y = t.y * TILE;
      g.fillStyle = 'rgba(0,0,0,.2)'; rr(g, x + 3, y + 6, 2 * TILE - 6, TILE - 4, 7); g.fill();
      g.fillStyle = '#7a4b2a'; rr(g, x + 2, y + 2, 2 * TILE - 4, TILE - 4, 7); g.fill();
      g.fillStyle = '#fffaf0'; rr(g, x + 5, y + 5, 2 * TILE - 10, TILE - 10, 4); g.fill();
      g.fillStyle = 'rgba(193,18,31,.13)'; g.fillRect(x + 5, y + TILE / 2 - 4, 2 * TILE - 10, 8);
      g.fillStyle = '#3d2b1f'; circ(g, x + TILE, y + TILE / 2, 8); g.fill();
      label(g, String(t.num), x + TILE, y + TILE / 2 + 0.5, 10, '#fff', 800);
    }
    return cv;
  }

  // =====================================================================
  //  Отрисовка: персонажи
  // =====================================================================
  function drawPerson(x, y, look, o) {
    const bob = o.moving ? Math.abs(Math.sin(o.walkT * 12)) * 2 : 0;
    const up = o.dir.y < -0.5;
    ctx.fillStyle = 'rgba(0,0,0,.22)'; ell(ctx, x, y + 11, 11, 4.5); ctx.fill();
    // тело
    ctx.fillStyle = look.shirt; ell(ctx, x, y + 3 - bob * 0.3, 11, 9); ctx.fill();
    if (o.waiter) {
      ctx.fillStyle = '#fff';
      ell(ctx, x, y + 3 - bob * 0.3, 4, 8.5); ctx.fill();
      if (!up) {
        ctx.fillStyle = '#d62828';
        ctx.beginPath(); ctx.moveTo(x, y - 1); ctx.lineTo(x - 5, y - 3.5); ctx.lineTo(x - 5, y + 1.5); ctx.closePath(); ctx.fill();
        ctx.beginPath(); ctx.moveTo(x, y - 1); ctx.lineTo(x + 5, y - 3.5); ctx.lineTo(x + 5, y + 1.5); ctx.closePath(); ctx.fill();
      }
    }
    // голова
    const hy = y - 7 - bob, hx = x + o.dir.x * 1.5;
    if (look.long && !o.chef) { ctx.fillStyle = look.hair; ell(ctx, hx, hy + 3, 9, 8); ctx.fill(); }
    ctx.fillStyle = look.skin; circ(ctx, hx, hy, 8); ctx.fill();
    ctx.fillStyle = look.hair;
    if (up) { circ(ctx, hx, hy, 8.4); ctx.fill(); }
    else {
      ctx.beginPath(); ctx.arc(hx, hy - 0.5, 8.6, Math.PI * 1.02, Math.PI * 1.98); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#2b2b2b';
      circ(ctx, hx - 3 + o.dir.x * 2, hy + 1.5, 1.3); ctx.fill();
      circ(ctx, hx + 3 + o.dir.x * 2, hy + 1.5, 1.3); ctx.fill();
      if (o.angry) {
        ctx.strokeStyle = '#2b2b2b'; ctx.lineWidth = 1.2;
        ctx.beginPath(); ctx.moveTo(hx - 5, hy - 2.5); ctx.lineTo(hx - 1.5, hy - 1); ctx.moveTo(hx + 5, hy - 2.5); ctx.lineTo(hx + 1.5, hy - 1); ctx.stroke();
      }
    }
    if (o.chef) {
      ctx.fillStyle = '#fff'; ctx.strokeStyle = '#ced4da'; ctx.lineWidth = 1;
      rr(ctx, hx - 7, hy - 10, 14, 6, 2); ctx.fill(); ctx.stroke();
      circ(ctx, hx - 4, hy - 13, 5); ctx.fill(); circ(ctx, hx + 4, hy - 13, 5); ctx.fill(); circ(ctx, hx, hy - 15, 5.5); ctx.fill();
    }
  }

  const WAITER_LOOK = { shirt: '#22223b', skin: '#f1c27d', hair: '#3d2b1f' };
  const COOK_LOOK = { shirt: '#f8f9fa', skin: '#e0ac69', hair: '#222' };

  function drawPlate(x, y, r) {
    ctx.fillStyle = 'rgba(0,0,0,.15)'; circ(ctx, x, y + 1.5, r); ctx.fill();
    ctx.fillStyle = '#fff'; circ(ctx, x, y, r); ctx.fill();
    ctx.strokeStyle = '#dee2e6'; ctx.lineWidth = 1; circ(ctx, x, y, r * 0.7); ctx.stroke();
  }

  function drawDirtyPlate(x, y, r) {
    drawPlate(x, y, r);
    ctx.fillStyle = 'rgba(140,90,40,.6)';
    circ(ctx, x - r * 0.3, y - r * 0.2, r * 0.22); ctx.fill();
    circ(ctx, x + r * 0.25, y + r * 0.25, r * 0.16); ctx.fill();
    circ(ctx, x + r * 0.3, y - r * 0.35, r * 0.1); ctx.fill();
  }

  function drawHandItem(h, x, y) {
    if (h.type === 'tray') {
      ctx.globalAlpha = h.order.orphan ? 0.5 : 1;
      drawPlate(x, y, 9);
      emoji(ctx, h.order.dishes[0].e, x, y, 12);
      if (h.order.dishes.length > 1) label(ctx, '+' + (h.order.dishes.length - 1), x + 9, y + 8, 9, '#2b1d14', 800);
      ctx.globalAlpha = 1;
    } else {
      drawDirtyPlate(x, y, 9);
    }
  }

  function drawPlayer() {
    const p = player;
    drawPerson(p.x, p.y, WAITER_LOOK, { moving: p.moving, walkT: p.walkT, dir: p.dir, waiter: true });
    const spots = [[15, 0], [-15, 0], [0, -24]];
    p.hands.forEach((h, i) => { const s = spots[i] || spots[2]; drawHandItem(h, p.x + s[0], p.y + s[1]); });
    if (p.tickets.length) {
      const tx = p.x, ty = p.y - (p.hands.length > 2 ? 40 : 26);
      ctx.fillStyle = '#fff3c4'; rr(ctx, tx - 13, ty - 9, 26, 18, 5); ctx.fill();
      ctx.strokeStyle = '#d6b94a'; ctx.lineWidth = 1; ctx.stroke();
      label(ctx, '📝' + (p.tickets.length > 1 ? p.tickets.length : ''), tx, ty + 0.5, 11, '#2b1d14', 800);
    }
  }

  // =====================================================================
  //  Отрисовка: интерфейс в мире
  // =====================================================================
  function moodColor(m) { return `hsl(${Math.round(m * 1.2)}, 72%, 46%)`; }

  function bar(x, y, w, v, color) {
    ctx.fillStyle = 'rgba(0,0,0,.25)'; rr(ctx, x, y, w, 5, 2.5); ctx.fill();
    ctx.fillStyle = color; rr(ctx, x, y, Math.max(2, w * clamp(v, 0, 1)), 5, 2.5); ctx.fill();
  }

  function bubble(cx, tipY, w, now, pulse, draw) {
    const h = 36;
    const lift = pulse ? Math.abs(Math.sin(now * 4)) * 3 : 0;
    const x = cx - w / 2, y = tipY - h - 7 - lift;
    ctx.fillStyle = 'rgba(0,0,0,.18)'; rr(ctx, x + 1, y + 2, w, h, 9); ctx.fill();
    ctx.fillStyle = '#fff'; rr(ctx, x, y, w, h, 9); ctx.fill();
    ctx.beginPath(); ctx.moveTo(cx - 6, y + h - 1); ctx.lineTo(cx + 6, y + h - 1); ctx.lineTo(cx, tipY - lift); ctx.closePath(); ctx.fill();
    if (pulse) { ctx.strokeStyle = `rgba(244,162,97,${0.5 + 0.5 * Math.sin(now * 6)})`; ctx.lineWidth = 2; rr(ctx, x, y, w, h, 9); ctx.stroke(); }
    draw(x, y, w, h);
  }

  function drawGroupUI(g, now) {
    if (g.state === 'queue' || g.state === 'arriving') {
      const y = (QUEUE_SPOTS[g.qi] + 0.5) * TILE + 16;
      bar(2.5 * TILE - 30, y, 52, g.mood / 100, moodColor(g.mood));
      if (g.state === 'queue') emoji(ctx, '👋', 2.5 * TILE + 34, y + 2, 13);
      return;
    }
    if (g.state === 'leaving') {
      if (g.angry) { const m = g.members[0]; emoji(ctx, '😡', m.x, m.y - 28, 16); }
      return;
    }
    if (!g.table) return;
    const t = g.table, cx = (t.x + 1) * TILE, tipY = (t.y - 1) * TILE + 2;
    const simple = (e, pulse, val, color) => bubble(cx, tipY, 40, now, pulse, (x, y, w) => {
      emoji(ctx, e, x + w / 2, y + 15, 18);
      bar(x + 5, y + 28, w - 10, val, color);
    });
    switch (g.state) {
      case 'reading': simple('📖', false, 1 - g.timer / g.timerMax, '#4dabf7'); break;
      case 'ordering': simple('✋', true, g.mood / 100, moodColor(g.mood)); break;
      case 'eating': simple('😋', false, 1 - g.timer / g.timerMax, '#69db7c'); break;
      case 'dirty': simple('🍽️', true, g.mood / 100, moodColor(g.mood)); break;
      case 'bill': simple('💳', true, g.mood / 100, moodColor(g.mood)); break;
      case 'waitingFood': {
        const ds = g.order.dishes, w = 14 + ds.length * 17;
        bubble(cx, tipY, w, now, false, (x, y) => {
          if (g.order.status === 'ticket') ctx.globalAlpha = 0.45;
          ds.forEach((d, i) => emoji(ctx, d.e, x + 15 + i * 17, y + 15, 14));
          ctx.globalAlpha = 1;
          bar(x + 5, y + 28, w - 10, g.mood / 100, moodColor(g.mood));
        });
        break;
      }
    }
  }

  function drawTablesDynamic(now) {
    for (const t of tables) {
      const g = t.group;
      if (g && (g.state === 'reading' || g.state === 'ordering')) {
        g.members.forEach(m => {
          if (!m.seat) return;
          const x = (m.seat.x + 0.5) * TILE, y = (m.seat.y + 0.5) * TILE - m.seat.side * 0.78 * TILE;
          ctx.fillStyle = '#7f1d1d'; rr(ctx, x - 6, y - 7, 12, 14, 2); ctx.fill();
          ctx.fillStyle = '#f4b942'; ctx.fillRect(x - 3, y - 3, 6, 1.5);
        });
      }
      if (g && g.state === 'eating') {
        const k = g.timer / g.timerMax;
        g.members.forEach((m, i) => {
          const x = (m.seat.x + 0.5) * TILE, y = (m.seat.y + 0.5) * TILE - m.seat.side * 0.78 * TILE;
          drawPlate(x, y, 8);
          emoji(ctx, g.order.dishes[i].e, x, y, 8 + 6 * k);
        });
      }
      if (t.dirty) {
        t.dirtySeats.forEach(s => drawDirtyPlate((s.x + 0.5) * TILE, (s.y + 0.5) * TILE - s.side * 0.78 * TILE, 8));
      }
    }
    // подсветка свободных столов, когда ведём гостей
    if (player.leading) {
      const a = 0.45 + 0.35 * Math.sin(now * 5);
      for (const t of tables) {
        if (t.group || t.dirty) continue;
        ctx.strokeStyle = `rgba(82,183,136,${a})`; ctx.lineWidth = 3;
        rr(ctx, t.x * TILE - 2, (t.y - 1) * TILE + 2, 2 * TILE + 4, 3 * TILE - 4, 10); ctx.stroke();
      }
    }
  }

  function drawKitchen(now) {
    const cooking = G.orders.filter(o => o.status === 'cooking');
    cooking.slice(0, 5).forEach((o, i) => {
      const x = (STOVES[i] + 0.5) * TILE, y = 1.45 * TILE;
      ctx.fillStyle = '#495057'; ctx.fillRect(x + 9, y - 2, 10, 4);
      ctx.fillStyle = '#212529'; circ(ctx, x, y, 11); ctx.fill();
      emoji(ctx, o.dishes[0].e, x, y, 13);
      ctx.strokeStyle = '#ff922b'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(x, y, 15, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * (1 - o.timer / o.cookTime)); ctx.stroke();
    });
    if (cooking.length > 5) label(ctx, `+${cooking.length - 5} в очереди`, 11.5 * TILE, 2.3 * TILE, 10, '#495057');

    drawPerson(cook.x, cook.y, COOK_LOOK, { moving: cook.moving, walkT: cook.walkT, dir: cook.dir, chef: true });

    const ready = G.orders.filter(o => o.status === 'ready');
    ready.slice(0, 6).forEach((o, i) => {
      const x = (4 + i + 0.5) * TILE, y = 3.45 * TILE + Math.sin(now * 3 + i) * 0.8;
      drawPlate(x, y, 14);
      emoji(ctx, o.dishes[0].e, x, y, 15);
      if (o.dishes.length > 1) label(ctx, '+' + (o.dishes.length - 1), x - 11, y + 10, 9, '#2b1d14', 800);
      ctx.fillStyle = '#e76f51'; circ(ctx, x + 12, y - 11, 7.5); ctx.fill();
      label(ctx, String(o.table.num), x + 12, y - 10.5, 9.5, '#fff', 800);
    });
  }

  function drawParticles() {
    for (const p of G.parts) {
      const k = 1 - p.t / p.life;
      if (p.kind === 'steam') {
        ctx.fillStyle = `rgba(255,255,255,${0.5 * k})`; circ(ctx, p.x, p.y, 4 + (1 - k) * 5); ctx.fill();
      } else if (p.kind === 'bubble') {
        ctx.strokeStyle = `rgba(120,190,230,${k})`; ctx.lineWidth = 1.5; circ(ctx, p.x, p.y, 3 + (1 - k) * 3); ctx.stroke();
      } else if (p.kind === 'heart') {
        ctx.globalAlpha = k; emoji(ctx, '❤️', p.x, p.y, 12); ctx.globalAlpha = 1;
      }
    }
  }

  function drawFloats() {
    for (const f of G.floats) {
      const a = 1 - Math.max(0, (f.t - 1.0) / 0.7);
      ctx.globalAlpha = a;
      ctx.font = `800 ${f.size}px ${UF}, ${EF}`;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.lineWidth = 4; ctx.strokeStyle = 'rgba(30,18,10,.85)'; ctx.lineJoin = 'round';
      ctx.strokeText(f.text, f.x, f.y);
      ctx.fillStyle = f.color; ctx.fillText(f.text, f.x, f.y);
      ctx.globalAlpha = 1;
    }
  }

  function drawHighlight(now) {
    let it = null;
    if (lastInput === 'mouse' && mouse.inside) it = interactableAt(mouse.x, mouse.y);
    if (!it) it = nearestInteractable();
    if (!it) return;
    const a = actionFor(it), r = rectOf(it);
    const x = r.x * TILE - 3, y = r.y * TILE - 3, w = r.w * TILE + 6, h = r.h * TILE + 6;
    ctx.strokeStyle = a.fn ? `rgba(255,209,102,${0.65 + 0.35 * Math.sin(now * 6)})` : 'rgba(255,255,255,.35)';
    ctx.lineWidth = 2.5;
    rr(ctx, x, y, w, h, 8); ctx.stroke();
    const txt = a.fn ? ((lastInput === 'touch' ? '' : (inRange(it) ? 'E · ' : '👆 ')) + a.label) : a.msg;
    if (!txt) return;
    ctx.font = `700 12px ${UF}, ${EF}`;
    const tw = ctx.measureText(txt).width + 16;
    let lx = clamp(x + w / 2, tw / 2 + 4, W - tw / 2 - 4), ly = y - 14;
    if (ly < 14) ly = y + h + 14;
    ctx.fillStyle = a.fn ? 'rgba(43,29,20,.92)' : 'rgba(43,29,20,.7)';
    rr(ctx, lx - tw / 2, ly - 11, tw, 22, 8); ctx.fill();
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillStyle = a.fn ? '#ffd166' : '#e9dccb';
    ctx.fillText(txt, lx, ly + 0.5);
  }

  function draw() {
    const now = performance.now() / 1000;
    ctx.setTransform(canvas.width / W, 0, 0, canvas.height / H, 0, 0);
    if (!bg) { ctx.fillStyle = '#2a1f18'; ctx.fillRect(0, 0, W, H); return; }
    ctx.drawImage(bg, 0, 0, W, H);
    if (!G) return;

    drawKitchen(now);
    drawTablesDynamic(now);

    if (marker) {
      const k = marker.t / 0.8;
      ctx.strokeStyle = `rgba(255,209,102,${1 - k})`; ctx.lineWidth = 2;
      ell(ctx, marker.x, marker.y + 8, 6 + k * 10, 3 + k * 5); ctx.stroke();
    }

    const ents = [];
    for (const g of G.groups) for (const m of g.members) ents.push({ y: m.y, f: () => drawPerson(m.x, m.y, m.look, { moving: m.moving, walkT: m.walkT, dir: m.dir, angry: g.angry || g.mood < 25 }) });
    ents.push({ y: player.y, f: drawPlayer });
    ents.sort((a, b) => a.y - b.y).forEach(e => e.f());

    drawParticles();
    for (const g of G.groups) drawGroupUI(g, now);
    if (running && !paused) drawHighlight(now);
    drawFloats();

    if (G.closing) {
      ctx.fillStyle = 'rgba(30,18,10,.8)'; rr(ctx, W / 2 - 90, H - 34, 180, 24, 10); ctx.fill();
      label(ctx, '🔒 Закрыто — обслужи гостей', W / 2, H - 21.5, 12, '#ffd166');
    }
  }

  // =====================================================================
  //  HUD и подсказки
  // =====================================================================
  const hud = {
    day: $('hudDay'), clock: $('hudClock'), money: $('hudMoney'), goal: $('hudGoal'),
    goalBar: $('hudGoalBar'), angry: $('hudAngry'), hands: $('hudHands'), hint: $('hint'),
  };
  let hudTimer = 0, lastHands = '';

  function clockText() {
    if (G.closing) return 'Закрыто';
    const mins = 12 * 60 + Math.floor((Math.min(G.time, DAY_LEN) / DAY_LEN) * 600 / 10) * 10;
    return `${Math.floor(mins / 60)}:${String(mins % 60).padStart(2, '0')}`;
  }

  function updateHUD(dt) {
    hudTimer -= dt;
    if (hudTimer > 0 || !G) return;
    hudTimer = 0.12;
    const goal = dayGoal(G.day);
    hud.day.textContent = G.day;
    hud.clock.textContent = clockText();
    hud.money.textContent = '$' + G.earned;
    hud.goal.textContent = `цель $${goal}`;
    hud.goalBar.style.width = Math.min(100, (G.earned / goal) * 100) + '%';
    hud.goalBar.classList.toggle('done', G.earned >= goal);
    hud.angry.textContent = G.walkouts;

    let html = '';
    for (let i = 0; i < maxHands(); i++) {
      const h = player.hands[i];
      if (!h) html += '<div class="slot"></div>';
      else if (h.type === 'tray') html += `<div class="slot full ${h.order.orphan ? 'junk' : ''}">${h.order.orphan ? '🗑️' : h.order.dishes[0].e}<small>${h.order.table.num}</small></div>`;
      else html += '<div class="slot full">🍽️</div>';
    }
    if (player.tickets.length) html += `<div class="ticket">📝 ×${player.tickets.length}</div>`;
    if (html !== lastHands) { hud.hands.innerHTML = html; lastHands = html; }
    hud.hint.textContent = computeHint();
  }

  function computeHint() {
    const p = player;
    if (p.leading) return '🪑 Веди гостей к свободному столу (подсвечен зелёным) и нажми на него';
    if (p.tickets.length) return '📝 Отнеси заказ на кухню — к стойке «Раздача»';
    if (p.hands.some(h => h.type === 'tray' && h.order.orphan)) return '🗑️ Гости ушли — отнеси их блюдо в мойку';
    const tray = p.hands.find(h => h.type === 'tray');
    if (tray) return `🍽️ Отнеси блюдо к столу №${tray.order.table.num}`;
    const hasDirty = p.hands.some(h => h.type === 'dirty');
    if (hasDirty && freeHands() <= 0) return '🧽 Руки заняты — отнеси грязную посуду в мойку';
    const ready = G.orders.find(o => o.status === 'ready');
    if (ready && freeHands() > 0) return `🛎️ Заказ для стола №${ready.table.num} готов — забери на раздаче`;
    const urgent = G.groups.filter(g => ['ordering', 'dirty', 'bill'].includes(g.state)).sort((a, b) => a.mood - b.mood)[0];
    if (urgent) {
      const n = urgent.table.num;
      if (urgent.state === 'ordering') return `✋ Стол №${n} готов сделать заказ`;
      if (urgent.state === 'dirty') return `🍽️ Стол №${n} поел — убери грязную посуду`;
      return `💳 Стол №${n} ждёт счёт — прими оплату`;
    }
    if (hasDirty) return '🧽 Отнеси грязную посуду в мойку';
    const dirtyT = tables.find(t => t.dirty && !t.group);
    if (dirtyT) return `🧹 Убери стол №${dirtyT.num}`;
    if (G.groups.some(g => g.state === 'queue')) return '👋 Гости ждут у входа — подойди и проводи их за стол';
    if (G.orders.some(o => o.status === 'cooking')) return '👨‍🍳 Повар готовит… А пока — проверь зал';
    if (G.closing) return '🔒 Ресторан закрыт — обслужи оставшихся гостей';
    return '😌 Всё спокойно. Ждём новых гостей';
  }

  let toastTimer = null;
  function toast(msg) {
    const el = $('toast');
    el.textContent = msg;
    el.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove('show'), 2200);
  }

  // =====================================================================
  //  Экраны
  // =====================================================================
  function showOverlay(html) { overlay.innerHTML = html; overlay.classList.remove('hidden'); }
  function hideOverlay() { overlay.classList.add('hidden'); overlay.innerHTML = ''; }

  const HOWTO = `
    <ol class="steps">
      <li><span>👋</span>Встреть гостей у входа и проводи их за свободный стол</li>
      <li><span>✋</span>Когда гости выберут блюда — прими заказ</li>
      <li><span>🛎️</span>Отнеси заказ на раздачу, повар начнёт готовить</li>
      <li><span>🍔</span>Забери готовое блюдо и принеси его гостям</li>
      <li><span>🍽️</span>Убери грязную посуду и отнеси её в мойку</li>
      <li><span>💳</span>Получи оплату — чем довольнее гости, тем больше чаевые</li>
    </ol>
    <div class="controls">
      <div><kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> или стрелки — ходить</div>
      <div><kbd>E</kbd> / <kbd>Пробел</kbd> — действие рядом</div>
      <div>👆 Клик / тап по объекту — официант сам подойдёт и всё сделает</div>
      <div><kbd>Esc</kbd> — пауза</div>
    </div>`;

  function showStart() {
    running = false;
    const cont = save.day > 1 || save.wallet > 0;
    showOverlay(`
      <div class="panel">
        <div class="logo">🍽️</div>
        <h1>Официант</h1>
        <p class="sub">Симулятор ресторана: принимай заказы, носи блюда и собирай чаевые</p>
        ${HOWTO}
        <div class="row"><button class="btn primary" id="bPlay">▶ ${cont ? 'Продолжить — день ' + save.day : 'Начать смену'}</button></div>
        <div class="meta">${cont ? `💰 Кошелёк: $${save.wallet} · <a id="bReset">Начать заново</a>` : 'Прогресс сохраняется в браузере'}</div>
      </div>`);
    $('bPlay').onclick = () => { Sound.unlock(); startDay(); };
    const reset = $('bReset');
    if (reset) {
      reset.onclick = () => {
        if (reset.dataset.armed) { save = defaultSave(); writeSave(); showStart(); }
        else { reset.dataset.armed = '1'; reset.textContent = 'Точно? Нажми ещё раз'; }
      };
    }
  }

  function setPaused(v) {
    if (!running || !G || G.over) return;
    paused = v;
    if (v) {
      showOverlay(`
        <div class="panel">
          <h2>⏸ Пауза</h2>
          ${HOWTO}
          <div class="row">
            <button class="btn primary" id="bResume">▶ Продолжить</button>
            <button class="btn" id="bQuit">Выйти в меню</button>
          </div>
        </div>`);
      $('bResume').onclick = () => setPaused(false);
      $('bQuit').onclick = () => { paused = false; G = null; showStart(); };
    } else hideOverlay();
  }

  function endDay() {
    G.over = true;
    running = false;
    const goal = dayGoal(G.day), ok = G.earned >= goal, ratio = G.earned / goal;
    const stars = ratio >= 1.7 ? 3 : ratio >= 1.35 ? 2 : ok ? 1 : 0;
    save.wallet += G.earned;
    if (ok) save.day = G.day + 1;
    save.best = Math.max(save.best || 0, G.earned);
    writeSave();
    Sound.play(ok ? 'win' : 'lose');
    lastResult = { day: G.day, ok, stars, earned: G.earned, goal, tips: G.tips, served: G.served, walkouts: G.walkouts };
    showSummary();
  }

  function showSummary() {
    const r = lastResult;
    const starsHtml = [0, 1, 2].map(i => `<span class="${i < r.stars ? '' : 'off'}">★</span>`).join('');
    const nextDish = DISHES.find(d => d.day === save.day && r.ok);
    const shop = UPGRADES.map(u => {
      const l = lvl(u.id), maxed = l >= u.max, cost = maxed ? 0 : u.cost[l], can = !maxed && save.wallet >= cost;
      return `<div class="card ${maxed ? 'maxed' : ''}">
        <div class="ic">${u.e}</div>
        <div class="info"><b>${u.name}</b><small>${u.desc}</small><div class="pips">${'●'.repeat(l)}${'○'.repeat(u.max - l)}</div></div>
        <button data-buy="${u.id}" ${can ? '' : 'disabled'}>${maxed ? 'Макс.' : '$' + cost}</button>
      </div>`;
    }).join('');
    showOverlay(`
      <div class="panel wide">
        <h2>День ${r.day} завершён</h2>
        <div class="stars">${starsHtml}</div>
        <div class="result ${r.ok ? 'ok' : 'fail'}">${r.ok ? '🎉 Цель выполнена!' : '😕 Цель не выполнена — попробуй ещё раз'}</div>
        <div class="stats">
          <div><b>$${r.earned}</b><small>выручка (цель $${r.goal})</small></div>
          <div><b>$${r.tips}</b><small>чаевые</small></div>
          <div><b>${r.served}</b><small>гостей обслужено</small></div>
          <div><b>${r.walkouts}</b><small>ушли недовольными</small></div>
        </div>
        ${nextDish ? `<p class="sub" style="margin:14px 0 0">Новое блюдо в меню: ${nextDish.e} <b>${nextDish.name}</b> — $${nextDish.price}</p>` : ''}
        <h3>Улучшения <span class="wallet">💰 $${save.wallet}</span></h3>
        <div class="shop">${shop}</div>
        <div class="row">
          <button class="btn primary" id="bNext">${r.ok ? '▶ День ' + save.day : '↻ Повторить день ' + save.day}</button>
          <button class="btn" id="bMenu">Меню</button>
        </div>
      </div>`);
    overlay.querySelectorAll('[data-buy]').forEach(b => {
      b.onclick = () => {
        const u = UPGRADES.find(x => x.id === b.dataset.buy), l = lvl(u.id);
        if (l >= u.max || save.wallet < u.cost[l]) return;
        save.wallet -= u.cost[l];
        save.up[u.id] = l + 1;
        writeSave();
        Sound.play('coin');
        showSummary();
      };
    });
    $('bNext').onclick = () => startDay();
    $('bMenu').onclick = () => { G = null; showStart(); };
  }

  // =====================================================================
  //  Ввод
  // =====================================================================
  const KEYMAP = {
    ArrowUp: 'up', KeyW: 'up', ArrowDown: 'down', KeyS: 'down',
    ArrowLeft: 'left', KeyA: 'left', ArrowRight: 'right', KeyD: 'right',
  };

  window.addEventListener('keydown', e => {
    if (KEYMAP[e.code]) {
      keys[KEYMAP[e.code]] = true;
      lastInput = 'keyboard';
      e.preventDefault();
      return;
    }
    if (e.code === 'Escape' || e.code === 'KeyP') {
      if (running && G && !G.over) setPaused(!paused);
      return;
    }
    if ((e.code === 'KeyE' || e.code === 'Space' || e.code === 'Enter') && running && !paused && G && !G.over) {
      e.preventDefault();
      if (e.repeat) return;
      lastInput = 'keyboard';
      Sound.unlock();
      const it = nearestInteractable();
      if (it) doInteract(it);
      else toast('Рядом ничего нет — подойди ближе');
    }
  });
  window.addEventListener('keyup', e => { if (KEYMAP[e.code]) keys[KEYMAP[e.code]] = false; });
  window.addEventListener('blur', () => { Object.keys(keys).forEach(k => { keys[k] = false; }); if (running) setPaused(true); });

  function toWorld(e) {
    const r = canvas.getBoundingClientRect();
    return { x: (e.clientX - r.left) / r.width * W, y: (e.clientY - r.top) / r.height * H };
  }

  canvas.addEventListener('pointerdown', e => {
    e.preventDefault();
    Sound.unlock();
    lastInput = e.pointerType === 'touch' ? 'touch' : 'mouse';
    if (!running || paused || !G || G.over) return;
    const { x, y } = toWorld(e);
    const it = interactableAt(x, y);
    if (it) {
      if (inRange(it)) { player.path = []; player.target = null; doInteract(it); }
      else goToInteractable(it);
      return;
    }
    const tx = Math.floor(x / TILE), ty = Math.floor(y / TILE);
    if (walkP(tx, ty)) goTo(new Set([tileKey(tx, ty)]), null);
  });
  canvas.addEventListener('pointermove', e => {
    if (e.pointerType !== 'mouse') return;
    lastInput = 'mouse';
    const p = toWorld(e);
    mouse.x = p.x; mouse.y = p.y; mouse.inside = true;
  });
  canvas.addEventListener('pointerleave', () => { mouse.inside = false; });
  canvas.addEventListener('contextmenu', e => e.preventDefault());

  $('btnPause').onclick = () => { if (running) setPaused(!paused); };
  const btnSound = $('btnSound');
  function syncSoundBtn() { btnSound.textContent = Sound.on ? '🔊' : '🔇'; }
  btnSound.onclick = () => {
    Sound.on = !Sound.on;
    try { localStorage.setItem('waiter-sound', Sound.on ? '1' : '0'); } catch (e) { /* ignore */ }
    Sound.unlock();
    syncSoundBtn();
  };
  try { Sound.on = localStorage.getItem('waiter-sound') !== '0'; } catch (e) { /* ignore */ }
  syncSoundBtn();

  document.addEventListener('visibilitychange', () => { if (document.hidden && running) setPaused(true); });

  // =====================================================================
  //  Размер холста и главный цикл
  // =====================================================================
  function fitCanvas() {
    const r = stage.getBoundingClientRect();
    const s = Math.max(0.1, Math.min((r.width - 12) / W, (r.height - 12) / H));
    canvas.style.width = Math.floor(W * s) + 'px';
    canvas.style.height = Math.floor(H * s) + 'px';
    const k = Math.min(3, s * (window.devicePixelRatio || 1));
    canvas.width = Math.round(W * k);
    canvas.height = Math.round(H * k);
  }
  window.addEventListener('resize', fitCanvas);
  if (window.ResizeObserver) new ResizeObserver(fitCanvas).observe(stage);
  fitCanvas();

  // ?speed=N — ускорение времени (для отладки)
  const SPEED = clamp(Number(new URLSearchParams(location.search).get('speed')) || 1, 1, 20);
  let last = performance.now();
  function frame(t) {
    const dt = Math.min(0.05, (t - last) / 1000);
    last = t;
    for (let i = 0; i < SPEED; i++) update(dt);
    draw();
    if (G && running) updateHUD(dt);
    requestAnimationFrame(frame);
  }

  // фоновая картинка ресторана за стартовым экраном
  buildMap(4 + lvl('tables'));
  tables = TABLE_POS.slice(0, 4 + lvl('tables')).map((p, i) => ({
    num: i + 1, x: p.x, y: p.y,
    seats: [{ x: p.x, y: p.y - 1, side: -1 }, { x: p.x + 1, y: p.y - 1, side: -1 }, { x: p.x, y: p.y + 1, side: 1 }, { x: p.x + 1, y: p.y + 1, side: 1 }],
  }));
  bg = renderBackground();
  $('hint').textContent = 'Нажми «Начать смену», чтобы открыть ресторан';
  showStart();
  requestAnimationFrame(frame);

  // для отладки из консоли
  window.__waiter = { get G() { return G; }, get player() { return player; }, get tables() { return tables; }, startDay, endDay: () => G && endDay() };
})();
