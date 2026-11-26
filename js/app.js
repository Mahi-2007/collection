/* Main site script: builds the page, runs the scroll animation loop and the treasure game. No dependencies. */
(function () {
  'use strict';
  const Data = window.CoinData;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const pad = (n) => String(n).padStart(2, '0');

  const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const FINE = matchMedia('(hover: hover) and (pointer: fine)').matches;

  $('#preF').innerHTML = window.Maps.coinFace('bd', 'pa'); $('#preB').innerHTML = window.Maps.coinFace('in', 'pb');
  let VW = 0, VH = 0, running = false, burst = 0, dustW = 0, dustH = 0;
  const state = { coins: [], qcoins: [], demo: false, note: '', sel: -1, open: false, fl: null, flipped: false };
  const M = { x: .5, y: .5, px: -999, py: -999 };
  const L = { secs: [], story: { top: 0, h: 1 }, col: { top: 0, h: 1 }, run: { top: 0, h: 1 } };
  const sm = {};
  const smooth = (k, t, f = .1) => (sm[k] = sm[k] === undefined ? t : sm[k] + (t - sm[k]) * f);
  let SECTIONS = [['hero', 'navStart'], ['story', 'navStory'], ['collection', 'navCollection'], ['quest', 'navQuest'], ['about', 'navAbout'], ['thanks', 'navHello']];

  /* ================= STATIC PARTS ================= */
  let C = window.CONTENT.merge(null);                       // all editable text (defaults until Firestore answers)
  const hl = (t) => esc(t).replace(/\[\[(.+?)\]\]/g, '<em>$1</em>');
  function wordSplit(el) {
    el.innerHTML = el.textContent.trim().split(/\s+/).map((w, i) => '<span class="sw"><span style="transition-delay:' + (i * 80) + 'ms">' + esc(w) + '</span></span>').join(' ');
  }

  function buildStatic() {
    $$('[data-t]').forEach((n) => { n.textContent = C[n.dataset.t]; });
    $$('[data-th]').forEach((n) => { n.innerHTML = hl(C[n.dataset.th]); });
    document.title = C.pageTitle;
    $('#brandName').textContent = C.brand;
    $('#footName').textContent = '© ' + C.name;
    $('#year').textContent = new Date().getFullYear();
    $('#aboutName').textContent = C.name;
    $('#aboutText').textContent = C.about;
    const ph = $('#portrait'), pi = $('#portraitImg'), url = String(C.photoUrl || '').trim();
    if (url) {
      pi.onerror = () => { ph.hidden = true; $('.about-grid').classList.remove('has-photo'); };
      pi.src = Data.imgUrl(url, 1200); pi.alt = C.name; ph.hidden = false; $('.about-grid').classList.add('has-photo');
    }
    const ints = C.interests || [];
    $('#interests').hidden = !ints.length;
    $('#interestsTitle').textContent = C.interestsTitle;
    $('#interestList').innerHTML = ints.map((t) => '<li>' + esc(t) + '</li>').join('');
    const hh = $('#histHash'); if (C.histHash) hh.textContent = C.histHash; else hh.remove();

    $('#heroMeta').innerHTML = '<span>' + esc(C.coinsCount) + ' ' + esc(C.chipCoins) + '</span><span>' + esc(C.districtsCount) + ' ' + esc(C.chipDistricts) + '</span>';
    $('#facts').innerHTML =
      '<li><b data-count="' + esc(C.coinsCount) + '">0</b><span>' + esc(C.factCoins) + '</span></li>' +
      '<li><b data-count="' + esc(C.districtsCount) + '">0</b><span>' + esc(C.factDistricts) + '</span></li>' +
      '<li><b>' + esc(C.factEraValue) + '</b><span>' + esc(C.factEraLabel) + '</span></li>';

    // Story tags: all open, they drop in one after another as you scroll
    $('#tags').innerHTML = C.chapters.map((c, i) =>
      '<li class="tag-wrap reveal" style="transition-delay:' + (i * 180) + 'ms"><div class="tag"><span class="hole"></span><span class="eyebrow">' + esc(c.tag) + '</span>' +
      '<h3>' + esc(c.title) + '</h3><p class="t">' + esc(c.text) + '</p></div></li>').join('');

    // Thank you
    $('#thxNote').textContent = C.thxNote;
    $('#thxTitle').textContent = C.thxTitle;
    wordSplit($('#thxTitle'));
    $('#thxText').textContent = C.thxText;
    $('#thxSign').textContent = C.thxSign;
    $('#coinNote').textContent = C.coinNote;
    $('#coinBd').innerHTML = window.Maps.coinFace('bd', 'a'); $('#coinIn').innerHTML = window.Maps.coinFace('in', 'b');
    $('#mapFig').innerHTML = window.Maps.arrowFigure({ a: C.mapA, aSub: C.mapASub, arrowA: C.mapArrowA, b: C.mapB, bSub: C.mapBSub, west: C.mapWest, east: C.mapEast, arrowB: C.mapArrowB, c: C.mapC, cSub: C.mapCSub });

    let cta = '<a class="btn brass" data-magnet href="mailto:' + esc(C.email) + '">' + esc(C.emailLabel) + '</a>';
    const wa = String(C.whatsapp || '').replace(/\D/g, '');
    if (wa) cta += '<a class="btn" data-magnet target="_blank" rel="noopener" href="https://wa.me/' + esc(wa) + '">' + esc(C.whatsappLabel) + '</a>';
    cta += '<span class="mail-text">' + esc(C.email) + '</span>';
    $('#cta').innerHTML = cta;

    $('#dots').innerHTML = SECTIONS.map((s) => '<a href="#' + s[0] + '"><span>' + esc(C[s[1]]) + '</span></a>').join('');
  }

  /* ================= HELPERS FOR COINS ================= */
  const nf = (c) => (c.frame === false ? ' noframe' : '');
  // One tidy grid for all coin details: every cell has the same width, so short and long values line up.
  function infoGrid(c, all) {
    const it = (all ? [['lblTheme', c.theme], ['lblEra', c.era], ['lblPlace', c.place], ['lblDate', c.date]] : [])
      .concat([['lblMaterial', c.material], ['lblYear', c.year], ['lblDenomination', c.denomination], ['lblCondition', c.condition], ['lblId', c.collectionId]]).filter((x) => x[1]);
    if (!it.length) return '';
    const n = it.length, cols = n <= 3 ? n : n === 4 ? 2 : 3, rest = n % cols;
    return '<dl class="ig" style="grid-template-columns:repeat(' + cols + ',minmax(0,1fr))">' + it.map((x, i) =>
      '<div' + (i === n - 1 && rest ? ' style="grid-column:span ' + (cols - rest + 1) + '"' : '') + '><dt>' + esc(C[x[0]]) + '</dt><dd>' + esc(x[1]) + '</dd></div>').join('') + '</dl>';
  }
  const specHTML = (c) => infoGrid(c, false);

  /* ================= HERO COIN ================= */
  function buildHeroCoin(c) {
    const flat = c.frame === false;
    let h = '';
    if (!flat) for (let i = -6; i <= 6; i++) h += '<div class="slice" style="transform:translateZ(' + i + 'px)"></div>';
    h += '<div class="face front' + nf(c) + '"><img src="' + esc(c.front) + '" alt="Front of a coin from the collection"><i class="shine"></i></div>' +
         '<div class="face back' + nf(c) + '"><img src="' + esc(c.back || c.front) + '" alt="Back of a coin from the collection"><i class="shine"></i></div>';
    $('#coin3d').innerHTML = h;
    $('#coin3d').classList.toggle('noframe', flat);
  }

  /* ================= THE TRUNK ================= */
  function seedr(i) { const x = Math.sin(i * 97.13 + 3.1) * 10000; return x - Math.floor(x); }

  function buildTrunk() {
    const coins = state.coins, n = coins.length;
    const cols = n <= 3 ? n : Math.min(6, Math.ceil(Math.sqrt(n * 1.6)));
    const rows = Math.ceil(n / cols);
    const d = Math.min(22, 76 / cols - 1.5);                 // coin width, % of the pile width
    const dh = d / 1.094;                                     // coin height, % of the pile height
    $('#pcoins').innerHTML = coins.map((c, i) => {
      const r = Math.floor(i / cols), cc = i % cols, inRow = Math.min(cols, n - r * cols);
      const x = 50 + (cc - (inRow - 1) / 2) * (d + 3) + (seedr(i) - .5) * 3;
      const y = rows > 1 ? 13 + r * (40 / (rows - 1)) : 32;
      const yy = y + (seedr(i + 5) - .5) * 3;
      const rot = ((seedr(i + 9) - .5) * 40).toFixed(1);
      return '<div class="pcoin' + nf(c) + '" data-i="' + i + '" style="--i:' + i + ';--r:' + rot + 'deg;width:' + d + '%;left:' + (x - d / 2).toFixed(2) + '%;top:' + (yy - dh / 2).toFixed(2) + '%"><img loading="lazy" decoding="async" src="' + esc(c.front) + '" alt=""></div>';
    }).join('');
    $$('.pcoin img').forEach((im) => im.addEventListener('error', () => {
      const i = Number(im.closest('.pcoin').dataset.i) || 0; im.onerror = null; im.src = Data.placeholder(i, 0);
    }, { once: true }));
    $('#unlock').addEventListener('click', unlock);
  }

  /* ================= TIMELINE: a border that runs around the trunk ================= */
  const NS = 'http://www.w3.org/2000/svg';
  function buildTimeline() {
    const ph = C.phases || [];
    state.runOf = null; state.tl = null;
    $('#ring').innerHTML = ''; $('#tlNow').hidden = true; $('#tlLeg').hidden = true; $('#pframe').classList.remove('has-tl');
    if (!state.coins.some((c) => ph.some((p) => p.id === c.phase))) return;
    let cur = 0; const idxs = state.coins.map((c) => { const k = ph.findIndex((p) => p.id === c.phase); if (k >= 0) cur = k; return cur; });
    const runs = [];
    idxs.forEach((k, i) => { const r = runs[runs.length - 1]; if (r && r.k === k) r.to = i; else runs.push({ k: k, from: i, to: i }); });
    state.runOf = []; runs.forEach((r, ri) => { for (let i = r.from; i <= r.to; i++) state.runOf[i] = ri; });
    state.tl = { runs: runs, ph: ph, run: -1, idx: -1 };
    $('#pframe').classList.add('has-tl');
    $('#tlLeg').innerHTML = runs.map((r) => '<li><b>' + esc(ph[r.k].tag) + '</b><span>' + esc(ph[r.k].title) + '</span></li>').join('');
    $('#tlLeg').hidden = false;
    if (!$('#ring').dataset.bound) {
      $('#ring').dataset.bound = 1;
      $('#ring').addEventListener('click', (e) => {
        const d = e.target.closest('[data-i]'); if (!d) return;
        const n = state.coins.length, span = Math.max(1, L.run.h - VH);
        window.scrollTo({ top: L.run.top + (Number(d.dataset.i) + .25) / n * span, behavior: REDUCED ? 'auto' : 'smooth' });
      });
    }
  }

  // draws the border around the trunk frame and puts the coin dots and group chips on it (re-run when the size changes)
  function layoutRing() {
    const T = state.tl; if (!T) return;
    const f = $('#pframe'), w = f.offsetWidth, h = f.offsetHeight; if (!w || !h) return;
    const x0 = 6, x1 = w - 6, y0 = 30, y1 = h - 6, r = Math.min(24, (x1 - x0) / 4);
    const d = 'M' + (x0 + r) + ' ' + y0 + 'H' + (x1 - r) + 'A' + r + ' ' + r + ' 0 0 1 ' + x1 + ' ' + (y0 + r) + 'V' + (y1 - r) + 'A' + r + ' ' + r + ' 0 0 1 ' + (x1 - r) + ' ' + y1 +
      'H' + (x0 + r) + 'A' + r + ' ' + r + ' 0 0 1 ' + x0 + ' ' + (y1 - r) + 'V' + (y0 + r) + 'A' + r + ' ' + r + ' 0 0 1 ' + (x0 + r) + ' ' + y0;
    const ring = $('#ring'); ring.setAttribute('viewBox', '0 0 ' + w + ' ' + h);
    ring.innerHTML = '<defs><linearGradient id="ringG" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="' + w + '" y2="' + h + '"><stop offset="0" stop-color="#e0b25a"/><stop offset="1" stop-color="#6cc3ac"/></linearGradient></defs>' +
      '<path class="ring-track" d="' + d + '"/><path class="ring-fill" d="' + d + '"/>';
    const track = $('.ring-track', ring), fill = $('.ring-fill', ring), len = track.getTotalLength(), n = state.coins.length;
    fill.style.strokeDasharray = len; fill.style.strokeDashoffset = len;
    const at = (fr) => track.getPointAtLength(len * fr);
    const mk = (tag, attrs, parent) => { const el = document.createElementNS(NS, tag); Object.keys(attrs).forEach((k) => el.setAttribute(k, attrs[k])); (parent || ring).appendChild(el); return el; };
    const dots = [], chips = [];
    for (let i = 0; i < n; i++) {
      const p = at((i + .5) / n), g = mk('g', { class: 'rdot', 'data-i': i, transform: 'translate(' + p.x.toFixed(1) + ' ' + p.y.toFixed(1) + ')' });
      g.setAttribute('role', 'button'); g.setAttribute('aria-label', C.cntWord + ' ' + (i + 1));
      mk('circle', { class: 'hit', r: 11 }, g); mk('circle', { class: 'd', r: 5 }, g); dots.push(g);
    }
    T.runs.forEach((rr, k) => {
      const p = at(rr.from / n), g = mk('g', { class: 'rchip', 'data-i': rr.from, transform: 'translate(' + p.x.toFixed(1) + ' ' + p.y.toFixed(1) + ')' });
      mk('circle', { r: 14 }, g); const t = mk('text', {}, g); t.textContent = T.ph[rr.k].tag; chips.push(g);
    });
    T.len = len; T.fill = fill; T.dots = dots; T.chips = chips; T.idx = -1; T.run = -1;
  }

  function tlUpdate(t, idx) {
    const T = state.tl; if (!T || !T.fill) return;
    T.fill.style.strokeDashoffset = (T.len * (1 - clamp(t / state.coins.length))).toFixed(1);
    if (idx === T.idx) return; T.idx = idx;
    const cur = state.runOf[idx];
    T.dots.forEach((d, i) => { d.classList.toggle('pass', i < idx); d.classList.toggle('cur', i === idx); });
    T.chips.forEach((c, k) => { c.classList.toggle('on', k === cur); c.classList.toggle('past', k < cur); });
    $$('#tlLeg li').forEach((li, k) => li.classList.toggle('on', k === cur));
    if (cur !== T.run) {
      T.run = cur; const p = T.ph[T.runs[cur].k], now = $('#tlNow');
      now.hidden = false; now.innerHTML = '<b>' + esc(p.tag) + '</b><span>' + esc(p.title) + '</span>';
      now.classList.remove('swap'); void now.offsetWidth; now.classList.add('swap');
    }
  }

  // make the card fit the screen: shrink the story text a little first; if it still does not fit, the story scrolls inside the card (nothing is ever cut off)
  function fitCard() {
    const card = $('#card'), st = $('.story-text', card); if (!st || !state.open) return;
    st.style.fontSize = ''; st.style.maxHeight = ''; st.classList.remove('scroll');
    const stacked = innerWidth <= 900, avail = VH - 28 - (stacked ? $('#pframe').offsetHeight + (state.tl ? 34 : 0) + 14 : 0);
    let size = parseFloat(getComputedStyle(st).fontSize); const min = Math.max(12.5, size * .8);
    while (card.offsetHeight > avail && size > min) { size -= .5; st.style.fontSize = size + 'px'; }
    if (card.offsetHeight > avail) {
      const lh = parseFloat(getComputedStyle(st).lineHeight) || size * 1.5;
      st.style.maxHeight = Math.max(lh * 3, st.offsetHeight - (card.offsetHeight - avail)) + 'px'; st.classList.add('scroll');
    }
  }

  function unlock() {
    const v = $('#vault');
    if (state.open || v.classList.contains('opening')) return;
    v.classList.add('opening'); burst = 1;
    setTimeout(() => {
      v.dataset.state = 'open'; state.open = true; layoutRing();
      const col = $('#collection'); col.style.setProperty('--n', state.coins.length); col.classList.add('run');
      select(0);
      measure();
      window.scrollTo({ top: L.run.top, behavior: REDUCED ? 'auto' : 'smooth' });
      setTimeout(() => v.classList.add('settled'), 250 + state.coins.length * 90 + 1000);
    }, REDUCED ? 0 : 800);
  }

  // Scrolling picks the coin: each coin gets a stretch of scroll; the second half shows its back
  function colUpdate(sy) {
    if (!state.open) return;
    const n = state.coins.length, span = Math.max(1, L.run.h - VH);
    const t = clamp((sy - L.run.top) / span) * n;
    const idx = Math.min(n - 1, Math.floor(t)), f = t - idx;
    if (idx !== state.sel) select(idx);
    tlUpdate(t, idx);
    const want = !!state.coins[idx].back && f > .5;
    if (want !== state.flipped && state.fl) { state.flipped = want; state.fl.classList.toggle('flipped', want); }
  }

  function select(i) {
    const n = state.coins.length; if (!n) return;
    state.sel = clamp(i, 0, n - 1); state.flipped = false;
    const c = state.coins[state.sel];
    const ph = state.runOf ? state.runOf[state.sel] : -1;
    $$('.pcoin').forEach((b) => { const i = Number(b.dataset.i); b.classList.toggle('sel', i === state.sel); b.classList.toggle('dim', ph >= 0 && state.runOf[i] !== ph); });
    if (ph !== state.lastRun) { if (state.lastRun !== undefined && !REDUCED) burst = .35; state.lastRun = ph; }
    $('#card').innerHTML =
      '<div class="anim">' +
      '<div class="cnt"><span>' + esc(C.cntWord) + ' ' + pad(state.sel + 1) + ' ' + esc(C.ofWord) + ' ' + pad(n) + '</span><em>' + esc(state.sel < n - 1 ? C.hintMore : C.hintLast) + '</em></div>' +
      '<div class="card-top"><div class="coin-wrap" data-front="' + esc(c.front) + '" data-back="' + esc(c.back || c.front) + '">' +
        '<div class="flipper"><div class="coin-face' + nf(c) + '"><img decoding="async" src="' + esc(c.front) + '" alt="' + esc(c.title) + ', front"></div>' +
        '<div class="coin-face back' + nf(c) + '"><img decoding="async" src="' + esc(c.back || c.front) + '" alt="' + esc(c.title) + ', back"></div></div><i class="lens"></i></div>' +
        '<h3>' + esc(c.title) + '</h3></div>' +
      infoGrid(c, true) +
      (c.story ? '<p class="story-text">' + esc(c.story) + '</p>' : '') +
      '</div>';
    $$('#card .coin-face img').forEach((im) => im.addEventListener('error', () => {
      im.onerror = null; im.src = Data.placeholder(state.sel, im.closest('.coin-face').classList.contains('back'));
    }, { once: true }));
    state.fl = $('#card .flipper');
    fitCard();
    // magnifier on hover (desktop only, no click needed)
    const wrap = $('#card .coin-wrap'), lens = $('.lens', wrap);
    if (FINE) wrap.addEventListener('mousemove', (e) => {
      const r = wrap.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top, Z = 2.5;
      lens.style.left = x + 'px'; lens.style.top = y + 'px';
      lens.style.backgroundImage = 'url("' + (state.flipped ? wrap.dataset.back : wrap.dataset.front) + '")';
      lens.style.backgroundSize = (r.width * Z) + 'px ' + (r.height * Z) + 'px';
      lens.style.backgroundPosition = (-(x * Z) + 65) + 'px ' + (-(y * Z) + 65) + 'px';
    });
  }

  /* ================= THE TREASURE GAME (vintage map) ================= */
  const ICON = {
    concrete: '<svg viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect x="8" y="12" width="48" height="40" rx="2"/><path d="M8 25h48M8 38h48M24 12v13M40 25v13M24 38v14" stroke-width="2"/><path d="M36 13l-5 10 6 5-4 9"/></svg>',
    tree: '<svg viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="32" cy="22" r="15"/><path d="M26 58l2-26M38 58l-2-26M22 58h20"/><ellipse cx="32" cy="44" rx="4" ry="7" fill="currentColor" fill-opacity=".55"/></svg>',
    trunk: '<svg viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M8 26c0-8 6-13 13-13h22c7 0 13 5 13 13"/><rect x="8" y="26" width="48" height="26" rx="3"/><path d="M8 36h48M18 26v26M46 26v26"/><rect x="28" y="33" width="8" height="10" rx="1.5"/></svg>',
    box: '<svg viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M4 22c8-4 12 2 20-2s14 2 20-2 12 2 16 0"/><rect x="16" y="32" width="32" height="22" rx="1.5"/><path d="M16 40h32M26 32v22M38 32v22"/><path d="M10 30v.1M54 28v.1M8 44v.1M56 46v.1" stroke-width="4"/></svg>',
    home: '<svg viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M6 32L32 9l26 23"/><path d="M13 29v26h38V29"/><rect x="26" y="40" width="12" height="15"/><path d="M42 33l6 6M48 33l-6 6"/><path d="M17 36h8v7h-8z"/></svg>'
  };
  const MAP = { W: 1000, H: 640, start: { x: 96, y: 345 }, at: { concrete: { x: 332, y: 205 }, tree: { x: 240, y: 452 }, trunk: { x: 566, y: 318 }, box: { x: 826, y: 456 }, home: { x: 812, y: 178 } } };
  const Q = { picks: [], idx: 0, collected: [], used: new Set(), lab: null, coin: null, busy: false, ran: false };
  const locName = (id) => { const l = window.CONTENT.locs.find((x) => x.id === id); return l ? C[l.k] : id; };
  const qShow = (html) => { const st = $('#qStage'); st.innerHTML = html; if (st.firstElementChild) st.firstElementChild.classList.add('anim'); };
  const qOpen = (html) => { qShow(html); $('#qModal').hidden = false; document.body.classList.add('lock'); $('#qStage').scrollTop = 0; };
  const qClose = () => { $('#qModal').hidden = true; document.body.classList.remove('lock'); };

  function mapRnd(seed) { let s = seed >>> 0 || 1; return () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296; }
  const f1 = (n) => Math.round(n * 10) / 10;

  function labelLines(t) {
    t = String(t); if (t.length <= 17) return [t];
    const w = t.split(' '); let best = 1, bd = 1e9;
    for (let i = 1; i < w.length; i++) { const d = Math.abs(w.slice(0, i).join(' ').length - w.slice(i).join(' ').length); if (d < bd) { bd = d; best = i; } }
    return [w.slice(0, best).join(' '), w.slice(best).join(' ')];
  }

  function mapMarkup() {
    const W = MAP.W, H = MAP.H, R = mapRnd(11), INK = '#5a3d22';
    const spots = [MAP.start].concat(Object.keys(MAP.at).map((k) => MAP.at[k]));
    const near = (x, y, r) => spots.some((p) => Math.hypot(p.x - x, p.y - y) < r);
    // ragged paper edge
    const edge = [];
    const line = (x0, y0, x1, y1) => {
      const len = Math.hypot(x1 - x0, y1 - y0), n = Math.round(len / 32), nx = (y1 - y0) / len, ny = -(x1 - x0) / len;
      for (let i = 0; i < n; i++) { const t = i / n, j = (R() - .5) * 8 + (R() < .1 ? (R() - .5) * 16 : 0); edge.push([x0 + (x1 - x0) * t + nx * j, y0 + (y1 - y0) * t + ny * j]); }
    };
    line(14, 14, 986, 14); line(986, 14, 986, 626); line(986, 626, 14, 626); line(14, 626, 14, 14);
    const paper = 'M' + edge.map((p) => f1(p[0]) + ' ' + f1(p[1])).join('L') + 'Z';
    let s = '<svg viewBox="0 0 ' + W + ' ' + H + '" xmlns="http://www.w3.org/2000/svg" role="group" aria-label="' + esc(C.mapTitle) + '">';
    s += '<defs>' +
      '<linearGradient id="mpPaper" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#f0dfb2"/><stop offset=".5" stop-color="#e3cc93"/><stop offset="1" stop-color="#d3b574"/></linearGradient>' +
      '<radialGradient id="mpBurn" cx="50%" cy="50%" r="72%"><stop offset=".55" stop-color="#6b3d12" stop-opacity="0"/><stop offset="1" stop-color="#4a230a" stop-opacity=".62"/></radialGradient>' +
      '<linearGradient id="mpFold" x1="0" x2="1"><stop offset="0" stop-color="#3b200a" stop-opacity="0"/><stop offset=".5" stop-color="#3b200a" stop-opacity=".16"/><stop offset="1" stop-color="#fff" stop-opacity=".1"/></linearGradient>' +
      '<filter id="mpNoise" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency=".9" numOctaves="3" seed="5"/><feColorMatrix values="0 0 0 0 .35  0 0 0 0 .2  0 0 0 0 .08  0 0 0 .55 -.15"/></filter>' +
      '<filter id="mpBlot" x="-20%" y="-20%" width="140%" height="140%"><feTurbulence type="fractalNoise" baseFrequency=".012" numOctaves="3" seed="9"/><feColorMatrix values="0 0 0 0 .45  0 0 0 0 .27  0 0 0 0 .1  0 0 0 1.3 -.55"/></filter>' +
      '<filter id="mpWob" x="-2%" y="-2%" width="104%" height="104%"><feTurbulence type="fractalNoise" baseFrequency=".03" numOctaves="2" seed="2"/><feDisplacementMap in="SourceGraphic" scale="3"/></filter>' +
      '<clipPath id="mpClip"><path d="' + paper + '"/></clipPath></defs>';
    s += '<path d="' + paper + '" fill="url(#mpPaper)"/>';
    s += '<g clip-path="url(#mpClip)">';
    s += '<rect width="' + W + '" height="' + H + '" filter="url(#mpBlot)" opacity=".5"/><rect width="' + W + '" height="' + H + '" filter="url(#mpNoise)" opacity=".4"/>';
    s += '<g filter="url(#mpWob)" fill="none" stroke="' + INK + '" stroke-linecap="round" stroke-linejoin="round">';
    // sea along the bottom
    s += '<path d="M0 556Q70 536 150 560T300 556T450 568T610 558T760 570T900 548T1000 562V640H0Z" fill="rgba(100,140,146,.38)" stroke-width="2"/>';
    s += '<path d="M0 566Q70 546 150 570T300 566T450 578T610 568T760 580T900 558T1000 572" stroke-width="1" stroke-dasharray="3 7" opacity=".6"/>';
    for (let i = 0; i < 16; i++) { const x = 30 + i * 62 + R() * 26, y = 590 + R() * 30; s += '<path d="M' + f1(x) + ' ' + f1(y) + 'q6 -7 12 0q6 7 12 0" stroke-width="1.6" opacity=".6"/>'; }
    // river
    s += '<path d="M236 118C312 196 452 172 470 262S650 380 578 566" stroke-width="13" opacity=".35"/>';
    s += '<path d="M236 118C312 196 452 172 470 262S650 380 578 566" stroke="#6f9aa0" stroke-width="8" opacity=".75"/>';
    s += '<path d="M236 118C312 196 452 172 470 262S650 380 578 566" stroke="#d6e6e0" stroke-width="2" stroke-dasharray="2 12" opacity=".8"/>';
    // mountains (top-left)
    [[62, 100, 30], [112, 74, 38], [160, 108, 28], [206, 76, 36], [254, 100, 26], [138, 132, 22], [300, 84, 24], [32, 150, 20]].forEach((m) => {
      const x = m[0], y = m[1], z = m[2];
      s += '<path d="M' + (x - z) + ' ' + f1(y + z * .8) + 'L' + x + ' ' + f1(y - z * .2) + 'L' + (x + z) + ' ' + f1(y + z * .8) + 'Z" fill="rgba(122,84,44,.2)" stroke-width="2.2"/>';
      s += '<path d="M' + x + ' ' + f1(y - z * .2) + 'L' + f1(x + z * .18) + ' ' + f1(y + z * .3) + 'L' + f1(x + z * .02) + ' ' + f1(y + z * .8) + 'M' + f1(x + z * .38) + ' ' + f1(y + z * .25) + 'l' + f1(z * .22) + ' ' + f1(z * .5) + 'M' + f1(x + z * .6) + ' ' + f1(y + z * .42) + 'l' + f1(z * .18) + ' ' + f1(z * .36) + '" stroke-width="1.3" opacity=".8"/>';
    });
    // hill with the old house
    [[96, 52], [70, 38], [44, 25]].forEach((e) => { s += '<ellipse cx="808" cy="204" rx="' + e[0] + '" ry="' + e[1] + '" stroke-width="1.3" opacity="' + (e[0] === 96 ? .5 : .65) + '"/>'; });
    // farm fields
    [[736, 404, 120, 62, -4], [862, 420, 104, 56, 5], [726, 488, 124, 44, 2]].forEach((r) => {
      s += '<g transform="rotate(' + r[4] + ' ' + (r[0] + r[2] / 2) + ' ' + (r[1] + r[3] / 2) + ')"><rect x="' + r[0] + '" y="' + r[1] + '" width="' + r[2] + '" height="' + r[3] + '" fill="rgba(160,140,60,.2)" stroke-width="1.6"/>';
      for (let y = r[1] + 8; y < r[1] + r[3]; y += 8) s += '<path d="M' + r[0] + ' ' + y + 'H' + (r[0] + r[2]) + '" stroke-width=".9" opacity=".55"/>';
      s += '</g>';
    });
    // forest around the old tree and a few lone trees
    const tree = (x, y, z) => '<g><path d="M' + x + ' ' + f1(y + z) + 'V' + f1(y + z * .3) + '" stroke-width="2"/><circle cx="' + x + '" cy="' + y + '" r="' + z + '" fill="rgba(98,118,60,.42)" stroke-width="1.8"/></g>';
    for (let i = 0, n = 0; i < 260 && n < 30; i++) {
      const a = R() * 6.283, d = Math.sqrt(R()), x = 232 + Math.cos(a) * d * 118, y = 446 + Math.sin(a) * d * 76;
      if (near(x, y, 70) || y > 536) continue; s += tree(f1(x), f1(y), f1(7 + R() * 4)); n++;
    }
    for (let i = 0, n = 0; i < 400 && n < 14; i++) {
      const x = 40 + R() * 920, y = 60 + R() * 470;
      if (near(x, y, 95) || (x < 350 && y < 150) || (x > 700 && y > 380 && y < 540) || (x > 170 && x < 350 && y > 360) || (x > 440 && x < 700 && y < 90)) continue;
      s += tree(f1(x), f1(y), f1(6 + R() * 3)); n++;
    }
    // little ship in the sea
    s += '<g transform="translate(640 598)"><path d="M-26 0Q0 20 26 0Z" fill="rgba(240,223,178,.9)" stroke-width="2"/><path d="M0 0V-34M0 -32L20 -8H0M0 -28L-14 -8H0" stroke-width="2"/></g>';
    // compass rose
    s += '<g transform="translate(920 84)"><circle r="42" stroke-width="2"/><circle r="33" stroke-width="1" stroke-dasharray="2 5"/>' +
      '<path d="M0 -50L8 -8L50 0L8 8L0 50L-8 8L-50 0L-8 -8Z" fill="rgba(90,61,34,.7)" stroke-width="1.6"/><path d="M0 -30L5 -5L30 0L5 5L0 30L-5 5L-30 0L-5 -5Z" transform="rotate(45)" fill="rgba(240,223,178,.9)" stroke-width="1.2"/>' +
      '<text y="-58" text-anchor="middle" font-size="26" fill="#a3322a" stroke="none" class="mlab">N</text></g>';
    // scale bar
    s += '<g transform="translate(60 520)"><path d="M0 0H120M0 -7V7M60 -5V5M120 -7V7" stroke-width="2"/><path d="M0 0H60" stroke-width="6" opacity=".75"/></g>';
    s += '</g>';  // end sketch group
    // border, folds, burnt edges
    s += '<rect x="30" y="30" width="940" height="580" fill="none" stroke="' + INK + '" stroke-width="2.4" opacity=".6"/><rect x="38" y="38" width="924" height="564" fill="none" stroke="' + INK + '" stroke-width="1" opacity=".5"/>';
    s += '<rect x="323" width="44" height="' + H + '" fill="url(#mpFold)"/><rect x="657" width="44" height="' + H + '" fill="url(#mpFold)"/><rect y="300" width="' + W + '" height="40" fill="url(#mpFold)" transform="rotate(0)" opacity=".7"/>';
    s += '<rect width="' + W + '" height="' + H + '" fill="url(#mpBurn)"/>';
    s += '</g>';
    // title ribbon
    const tw = Math.max(320, String(C.mapTitle).length * 17 + 80);
    s += '<g transform="translate(500 56)"><path d="M' + (-tw / 2) + ' -22h' + tw + 'l18 22l-18 22h' + (-tw) + 'l-18 -22z" fill="#c79a4a" stroke="' + INK + '" stroke-width="2.6" stroke-linejoin="round"/><path d="M' + (-tw / 2 + 8) + ' -15h' + (tw - 16) + 'M' + (-tw / 2 + 8) + ' 15h' + (tw - 16) + '" stroke="' + INK + '" stroke-opacity=".5" stroke-width="1" stroke-dasharray="3 4"/>' +
      '<text y="9" text-anchor="middle" font-size="28" fill="#3b200a" class="mlab">' + esc(C.mapTitle) + '</text></g>';
    // starting camp
    const st = MAP.start;
    s += '<g class="mcamp" transform="translate(' + st.x + ' ' + st.y + ')"><path d="M-30 6L0 -34L30 6Z" fill="#e8d4a0" stroke="' + INK + '" stroke-width="3" stroke-linejoin="round"/><path d="M0 -34V6M-12 6L0 -10L12 6" stroke="' + INK + '" stroke-width="2" fill="none"/><path d="M0 -34V-62" stroke="' + INK + '" stroke-width="3"/><path d="M0 -62L26 -54L0 -46Z" fill="#a3322a" stroke="' + INK + '" stroke-width="2"/>' +
      '<g transform="translate(0 34)"><rect x="-44" y="-14" width="88" height="28" rx="6" fill="#c79a4a" stroke="' + INK + '" stroke-width="2"/><text y="7" text-anchor="middle" font-size="22" fill="#3b200a" class="mlab">' + esc(C.mapStart) + '</text></g></g>';
    s += '<g id="qRoute"></g><g id="qTrail"></g>';
    // the five places
    Object.keys(MAP.at).forEach((id) => {
      const p = MAP.at[id], ln = labelLines(locName(id)), w = Math.max.apply(null, ln.map((x) => x.length)) * 15.5 + 34, h = 16 + ln.length * 31;
      const lo = p.x - w / 2, hi = p.x + w / 2, dx = lo < 24 ? 24 - lo : hi > 976 ? 976 - hi : 0;
      s += '<g class="mloc" data-loc="' + id + '" role="button" tabindex="0" aria-pressed="false" aria-label="' + esc(locName(id)) + '" transform="translate(' + p.x + ' ' + p.y + ')">' +
        '<circle class="pulse" r="58" fill="none"/><circle class="halo" r="62"/>' +
        '<circle class="plate" r="54"/><circle r="45" fill="none" stroke="' + INK + '" stroke-opacity=".5" stroke-width="1.6" stroke-dasharray="3 5"/>' +
        '<g class="pg">' + ICON[id].replace('<svg ', '<svg class="pico" x="-30" y="-36" width="60" height="60" ') + '</g>' +
        '<g transform="translate(' + dx + ' 66)"><rect class="rib" x="' + (-w / 2) + '" y="0" width="' + w + '" height="' + h + '" rx="9"/>' +
        ln.map((t, i) => '<text y="' + (28 + i * 31) + '" text-anchor="middle" font-size="27" class="mlab">' + esc(t) + '</text>').join('') + '</g>' +
        '<g class="badge" transform="translate(40 -42)"><circle r="21"/><text y="9" text-anchor="middle" font-size="26"></text></g></g>';
    });
    // the explorer
    s += '<g id="qWalker" transform="translate(' + st.x + ' ' + st.y + ')"><ellipse cy="3" rx="13" ry="4.5" fill="rgba(0,0,0,.3)"/><g class="bob"><g transform="scale(1.25)"><path d="M0 0C-17 -22 -15 -46 0 -46C15 -46 17 -22 0 0Z" fill="#a3322a" stroke="#3b0f0b" stroke-width="2.6" stroke-linejoin="round"/><circle cy="-31" r="7.5" fill="#f2e3b8" stroke="#3b0f0b" stroke-width="2"/></g></g></g>';
    return s + '</svg>';
  }

  function segPath(a, b, k) {
    const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2, dx = b.x - a.x, dy = b.y - a.y, len = Math.hypot(dx, dy) || 1, sgn = k % 2 ? -1 : 1, bend = len * .2 * sgn;
    return 'M' + f1(a.x) + ' ' + f1(a.y) + 'Q' + f1(mx - dy / len * bend) + ' ' + f1(my + dx / len * bend) + ' ' + f1(b.x) + ' ' + f1(b.y);
  }
  function drawRoute() {
    let d = '', prev = MAP.start;
    Q.picks.forEach((id, i) => { const p = MAP.at[id]; d += '<path class="ghost" data-s="' + i + '" d="' + segPath(prev, p, i) + '"/>'; prev = p; });
    $('#qRoute').innerHTML = d;
    $$('.mloc', $('#qMap')).forEach((g) => {
      const at = Q.picks.indexOf(g.dataset.loc), on = at >= 0;
      g.classList.toggle('on', on); g.setAttribute('aria-pressed', on ? 'true' : 'false');
      $('.badge text', g).textContent = on ? String(at + 1) : '';
    });
  }

  function qTrunk() {
    let slots = '';
    for (let i = 0; i < 3; i++) { const c = Q.collected[i]; slots += c ? '<span class="slot full' + nf(c) + '"><img src="' + esc(c.front) + '" alt=""></span>' : '<span class="slot"></span>'; }
    $('#qTrunk').innerHTML = '<span class="lbl">' + esc(C.trunkLabel) + '</span><span class="box">' + slots + '</span>';
    $$('#qTrunk img').forEach((im, i) => im.addEventListener('error', () => { im.onerror = null; im.src = Data.placeholder(i, 0); }, { once: true }));
  }

  function setFoot(kind, text) {
    const ft = $('#qFoot');
    if (kind === 'pick') ft.innerHTML = '<span class="note" id="qCount">' + esc(C.pickCount.replace('{n}', Q.picks.length)) + '</span><button type="button" class="btn brass" id="qGo"' + (Q.picks.length === 3 ? '' : ' disabled') + '>' + esc(C.pickGo) + '</button>';
    else ft.innerHTML = '<span class="trav' + (kind === 'dig' ? ' dig' : '') + '"><span class="stops">' + [0, 1, 2].map((i) => '<i class="' + (i < Q.idx ? 'done' : i === Q.idx ? 'now' : '') + '"></i>').join('') + '</span><span class="note">' + esc(text) + '</span>' + (kind === 'dig' ? '<span class="dots"><i></i><i></i><i></i></span>' : '') + '</span>';
  }

  function qPick() {
    Q.picks = []; Q.idx = 0; Q.collected = []; Q.used = new Set(); Q.lab = null; Q.coin = null; Q.busy = false; Q.ran = false;
    qClose(); $('#qEnd').hidden = true; $('#qBoard').hidden = false; $('#qTrunk').hidden = false;
    $('#qHead').classList.remove('min'); $('#qMapWrap').classList.remove('going');
    $('#qHead').innerHTML = '<p class="note">' + esc(C.pickNote) + '</p><h3 class="h3">' + esc(C.pickTitle) + '</h3><p class="sub2">' + esc(C.pickSub) + '</p>';
    if (!$('#qMap svg')) $('#qMap').innerHTML = mapMarkup();
    $('#qTrail').innerHTML = ''; $('#qWalker').setAttribute('transform', 'translate(' + MAP.start.x + ' ' + MAP.start.y + ')');
    qTrunk(); drawRoute(); setFoot('pick'); measure();
  }

  function qToggle(g) {
    if (Q.busy) return;
    const id = g.dataset.loc, at = Q.picks.indexOf(id);
    if (at >= 0) Q.picks.splice(at, 1);
    else if (Q.picks.length < 3) Q.picks.push(id);
    else { g.classList.remove('wiggle'); void g.getBoundingClientRect(); g.classList.add('wiggle'); setTimeout(() => g.classList.remove('wiggle'), 450); return; }
    drawRoute(); setFoot('pick');
  }

  // the explorer walks along the planned path and leaves a dotted trail
  function walk(path, dur) {
    return new Promise((resolve) => {
      const len = path.getTotalLength(), w = $('#qWalker'), tr = $('#qTrail'), t0 = performance.now(); let last = 0;
      const dot = (L) => { const q = path.getPointAtLength(L), c = document.createElementNS('http://www.w3.org/2000/svg', 'circle'); c.setAttribute('class', 'td'); c.setAttribute('cx', q.x.toFixed(1)); c.setAttribute('cy', q.y.toFixed(1)); c.setAttribute('r', '5'); tr.appendChild(c); };
      (function step(now) {
        const k = clamp((now - t0) / dur), e = k < .5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2, L = len * e, p = path.getPointAtLength(L);
        w.setAttribute('transform', 'translate(' + p.x.toFixed(1) + ' ' + p.y.toFixed(1) + ')');
        while (L - last >= 16) { last += 16; dot(last); }
        if (k < 1) requestAnimationFrame(step); else { dot(len); resolve(); }
      })(t0);
    });
  }

  async function qJourney(i) {
    Q.idx = i; Q.busy = true;
    const id = Q.picks[i], seg = $('#qRoute path[data-s="' + i + '"]'), place = $('.mloc[data-loc="' + id + '"]');
    $('#qHead').classList.add('min'); $('#qMapWrap').classList.add('going');
    setFoot('go', (Q.ran ? C.runTo : C.travelTo) + ' ' + locName(id) + '…');
    $('#qMapWrap').scrollIntoView({ behavior: REDUCED ? 'auto' : 'smooth', block: 'center' });
    const dist = seg.getTotalLength();
    await walk(seg, REDUCED ? 200 : clamp(dist * (Q.ran ? 3.4 : 5.4), 1500, 3800));
    place.classList.add('arrived', 'digging'); setFoot('dig', C.searching + ' ' + locName(id).toLowerCase() + '…');
    await wait(REDUCED ? 300 : 2000);
    place.classList.remove('digging');
    const pool = state.qcoins.filter((c) => c.qLoc === id && !Q.used.has(c.id));
    Q.busy = false;
    if (pool.length) { const c = pool[Math.floor(Math.random() * pool.length)]; Q.used.add(c.id); Q.ran = false; qLab(c); } else { Q.ran = true; qEmpty(id); }
  }

  const nextLabel = () => (Q.idx >= 2 ? C.finishBtn : C.nextPlace);
  function qEmpty(id) {
    qOpen('<div class="q-card empty"><div class="ico">' + ICON[id] + '</div><p class="note">' + esc(locName(id)) + '</p><h3 class="h3">' + esc(C.emptyTitle) + '</h3>' +
      '<p class="run note">' + esc(C.emptyText) + '</p>' +
      '<div class="q-foot"><button type="button" class="btn brass" data-q="next">' + esc(nextLabel()) + '</button></div></div>');
  }

  function qLab(c) {
    qOpen('<div class="q-card lab">' +
      '<div class="lab-view"><div class="lab-lens' + nf(c) + '" id="labLens"><img id="labImg" alt="" src="' + esc(c.front) + '" draggable="false"></div>' +
        '<div class="lab-tools"><button type="button" class="pill" data-lab="out" aria-label="Zoom out">&minus;</button><input type="range" id="labZoom" min="1" max="5" step=".1" value="1" aria-label="Zoom"><button type="button" class="pill" data-lab="in" aria-label="Zoom in">+</button>' +
        (c.back ? '<button type="button" class="pill" data-lab="flip">' + esc(C.flipLabel) + '</button>' : '') + '</div>' +
        '<p class="lab-hint">' + esc(C.zoomHint) + '</p></div>' +
      '<div class="lab-info"><p class="note">' + esc(C.labNote) + '</p><h3 class="h3">' + esc(C.foundTitle) + '</h3>' + specHTML(c) +
        '<p class="lab-q">' + esc(C.labQuestion) + '</p>' +
        '<div class="lab-actions"><button type="button" class="btn brass" data-ans="restore">' + esc(C.restoreLabel) + '</button><button type="button" class="btn" data-ans="leave">' + esc(C.leaveLabel) + '</button></div></div></div>');
    Q.coin = c; labSetup(c);
  }

  function labSetup(c) {
    const lens = $('#labLens'), img = $('#labImg'), range = $('#labZoom');
    let s = 1, tx = 0, ty = 0, side = 0, drag = null;
    img.addEventListener('error', () => { img.onerror = null; img.src = Data.placeholder(10, side); }, { once: true });
    const limit = () => { const m = (s - 1) * lens.getBoundingClientRect().width / 2; tx = clamp(tx, -m, m); ty = clamp(ty, -m, m); };
    const apply = () => { img.style.transform = 'translate(' + tx + 'px,' + ty + 'px) scale(' + s + ')'; lens.classList.toggle('zoomed', s > 1); range.value = s; };
    const setZ = (z) => { s = clamp(z, 1, 5); if (s === 1) tx = ty = 0; else limit(); apply(); };
    range.addEventListener('input', () => setZ(parseFloat(range.value)));
    lens.addEventListener('pointerdown', (e) => { if (s <= 1) return; drag = { x: e.clientX - tx, y: e.clientY - ty }; lens.setPointerCapture(e.pointerId); });
    lens.addEventListener('pointermove', (e) => { if (!drag) return; tx = e.clientX - drag.x; ty = e.clientY - drag.y; limit(); apply(); });
    lens.addEventListener('pointerup', () => { drag = null; });
    lens.addEventListener('wheel', (e) => { e.preventDefault(); setZ(s * (e.deltaY < 0 ? 1.15 : .87)); }, { passive: false });
    lens.addEventListener('dblclick', () => setZ(s > 1 ? 1 : 2.6));
    Q.lab = { zoom: (k) => setZ(s * k), flip: () => { side = side ? 0 : 1; img.src = side ? (c.back || c.front) : c.front; } };
  }

  function qAnswer(ans) {
    const c = Q.coin; if (!c) return;
    const right = ans === c.qAnswer;
    const why = c.qExplain ? '<p class="why"><b>' + esc(C.whyLabel) + '</b>' + esc(c.qExplain) + '</p>' : '';
    const img = '<img src="' + esc(c.front) + '" alt="">';
    if (right) {
      Q.collected.push(c); qTrunk();
      qOpen('<div class="q-card res ok"><div class="res-coin' + nf(c) + '">' + img + '</div><div><span class="tagline">' + esc(C.collectedNote) + '</span>' +
        '<h3 class="h3">' + esc(C.okTitle) + '</h3>' + why +
        '<div class="q-foot"><button type="button" class="btn brass" data-q="next">' + esc(nextLabel()) + '</button></div></div></div>');
      burst = .7;
    } else {
      const kind = c.qAnswer === 'restore' ? 'rot' : 'hair';
      qOpen('<div class="q-card res bad"><div class="res-coin' + nf(c) + ' ' + kind + '">' + img + '</div><div><span class="tagline">&#9888; ' + esc(C.lostNote) + '</span>' +
        '<h3 class="h3">' + esc(C.failTitle) + '</h3><p class="dmg">' + esc(window.CONTENT.damageText(c)) + '</p>' + why +
        '<div class="q-foot"><button type="button" class="btn brass" data-q="next">' + esc(nextLabel()) + '</button></div></div></div>');
    }
    $$('.res-coin img', $('#qStage')).forEach((im) => im.addEventListener('error', () => { im.onerror = null; im.src = Data.placeholder(10, 0); }, { once: true }));
    Q.coin = null; Q.lab = null;
  }

  /* The visitor's own trunk (teal, to set it apart from the walnut trunk above): every coin they saved, with its story */
  const CHEST = '<svg class="tc-back" viewBox="0 0 420 260" aria-hidden="true"><defs><linearGradient id="tcL" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1f6561"/><stop offset="1" stop-color="#0f3a3b"/></linearGradient><linearGradient id="tcI" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#06201f"/><stop offset="1" stop-color="#0b2e2e"/></linearGradient>' +
    '<radialGradient id="tcG" cx="50%" cy="50%" r="50%"><stop offset="0" stop-color="#c8f4e8" stop-opacity=".9"/><stop offset=".55" stop-color="#6cc3ac" stop-opacity=".35"/><stop offset="1" stop-color="#6cc3ac" stop-opacity="0"/></radialGradient></defs>' +
    '<ellipse cx="210" cy="246" rx="170" ry="10" fill="#000" opacity=".6"/>' +
    '<polygon points="70,118 350,118 336,14 84,14" fill="url(#tcL)" stroke="#cfe3e6" stroke-width="3" stroke-linejoin="round"/><polygon points="82,110 338,110 327,28 93,28" fill="url(#tcI)" stroke="#8fb5b8" stroke-opacity=".5"/>' +
    '<path d="M210 28V110M140 28L134 110M280 28L286 110" stroke="#000" stroke-opacity=".35"/>' +
    '<ellipse cx="210" cy="132" rx="150" ry="14" fill="url(#tcG)"/></svg>';
  const CHEST_FRONT = '<svg class="tc-front" viewBox="0 0 420 260" aria-hidden="true"><defs><linearGradient id="tcF" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#216f69"/><stop offset="1" stop-color="#0d3335"/></linearGradient><linearGradient id="tcS" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#eef6f7"/><stop offset=".5" stop-color="#a9bfc3"/><stop offset="1" stop-color="#6d8588"/></linearGradient></defs>' +
    '<rect x="50" y="130" width="320" height="108" rx="6" fill="url(#tcF)" stroke="#cfe3e6" stroke-opacity=".6" stroke-width="2"/>' +
    '<g stroke="#000" stroke-opacity=".28" stroke-width="1.4"><line x1="50" y1="166" x2="370" y2="166"/><line x1="50" y1="202" x2="370" y2="202"/></g>' +
    '<rect x="50" y="126" width="320" height="10" rx="3" fill="url(#tcS)"/><rect x="50" y="228" width="320" height="10" rx="3" fill="url(#tcS)"/>' +
    '<rect x="104" y="136" width="16" height="92" fill="url(#tcS)" opacity=".92"/><rect x="300" y="136" width="16" height="92" fill="url(#tcS)" opacity=".92"/>' +
    '<g fill="#e7f1f2" stroke="#4b6b6f" stroke-width=".8"><circle cx="112" cy="150" r="3"/><circle cx="112" cy="214" r="3"/><circle cx="308" cy="150" r="3"/><circle cx="308" cy="214" r="3"/></g>' +
    '<rect x="188" y="132" width="44" height="52" rx="6" fill="url(#tcS)" stroke="#355357" stroke-width="1.5"/><circle cx="210" cy="154" r="5.5" fill="#0c2a2b"/><path d="M207 158h6l2 12h-10z" fill="#0c2a2b"/></svg>';

  function endCard(c, i) {
    return '<article class="tcard"><div class="tc-coin' + nf(c) + '"' + (c.back ? ' data-flip="1" title="' + esc(C.flipLabel) + '"' : '') + '><img src="' + esc(c.front) + '" data-f="' + esc(c.front) + '" data-b="' + esc(c.back || c.front) + '" alt="' + esc(c.title) + '"></div>' +
      '<span class="tagline">№ ' + pad(i + 1) + ' · ' + esc(C.collectedNote) + '</span><h4>' + esc(c.title) + '</h4>' + infoGrid(c, true) +
      (c.story ? '<p class="tc-story">' + esc(c.story) + '</p>' : '') + '</article>';
  }

  function qFinish() {
    const n = Q.collected.length;
    $('#qBoard').hidden = true; $('#qTrunk').hidden = true; $('#qEnd').hidden = false;
    const coins = Q.collected.map((c, i) => '<img class="tc-c' + nf(c) + '" style="--k:' + i + ';--n:' + n + '" src="' + esc(c.front) + '" alt="">').join('');
    $('#qEnd').innerHTML = '<div class="te"><p class="note">' + esc(C.trunkLabel) + '</p><h3 class="h3">' + esc(C.endTitle.replace('{n}', n)) + '</h3>' +
      '<div class="tchest">' + CHEST + '<div class="tc-coins">' + coins + '</div>' + CHEST_FRONT + '</div>' +
      '<p class="text">' + esc(n ? C.endText : C.trunkEmpty) + '</p>' +
      (n ? '<div class="tcards n' + n + '">' + Q.collected.map(endCard).join('') + '</div>' : '') +
      '<div class="q-foot"><button type="button" class="btn brass" data-q="about">' + esc(C.endContinue) + '</button><button type="button" class="btn" data-q="retry">' + esc(C.retryLabel) + '</button></div></div>';
    $$('#qEnd img').forEach((im, i) => im.addEventListener('error', () => { im.onerror = null; im.src = Data.placeholder(10 + i, 0); }, { once: true }));
    measure();
    $('#qGame').scrollIntoView({ behavior: REDUCED ? 'auto' : 'smooth', block: 'start' });
    setTimeout(() => { const t = $('.tchest'); if (t) t.classList.add('in'); burst = .6; }, 500);
  }

  function setupQuest() {
    $('#qYes').addEventListener('click', () => {
      $('#qPrompt').classList.add('done'); $('#qGame').hidden = false; qPick();
      $('#qGame').scrollIntoView({ behavior: REDUCED ? 'auto' : 'smooth', block: 'start' });
    });
    $('#qSkip').addEventListener('click', () => { $('#qPrompt').classList.add('done'); $('#about').scrollIntoView({ behavior: REDUCED ? 'auto' : 'smooth' }); });
    const map = $('#qMap');
    map.addEventListener('click', (e) => { const g = e.target.closest('.mloc'); if (g) qToggle(g); });
    map.addEventListener('keydown', (e) => { if (e.key !== 'Enter' && e.key !== ' ') return; const g = e.target.closest('.mloc'); if (g) { e.preventDefault(); qToggle(g); } });
    if (FINE) $('#qMapWrap').addEventListener('mousemove', (e) => {
      const r = e.currentTarget.getBoundingClientRect(), x = (e.clientX - r.left) / r.width - .5, y = (e.clientY - r.top) / r.height - .5;
      map.style.setProperty('--ry', (x * 7).toFixed(2) + 'deg'); map.style.setProperty('--rx', (21 - y * 6).toFixed(2) + 'deg');
    });
    if (FINE) $('#qMapWrap').addEventListener('mouseleave', () => { map.style.removeProperty('--ry'); map.style.removeProperty('--rx'); });
    $('#qFoot').addEventListener('click', (e) => { if (e.target.closest('#qGo') && Q.picks.length === 3 && !Q.busy) qJourney(0); });
    $('#qModal').addEventListener('click', (e) => {
      const lab = e.target.closest('[data-lab]');
      if (lab && Q.lab) { if (lab.dataset.lab === 'flip') Q.lab.flip(); else Q.lab.zoom(lab.dataset.lab === 'in' ? 1.4 : .72); return; }
      const ans = e.target.closest('[data-ans]'); if (ans) return qAnswer(ans.dataset.ans);
      if (e.target.closest('[data-q="next"]')) { qClose(); if (Q.idx < 2) qJourney(Q.idx + 1); else qFinish(); }
    });
    $('#qEnd').addEventListener('click', (e) => {
      const fl = e.target.closest('[data-flip]');
      if (fl) { const im = $('img', fl), back = im.dataset.side === 'b'; im.dataset.side = back ? 'f' : 'b'; im.src = back ? im.dataset.f : im.dataset.b; return; }
      const q = e.target.closest('[data-q]'); if (!q) return;
      if (q.dataset.q === 'about') $('#about').scrollIntoView({ behavior: REDUCED ? 'auto' : 'smooth' });
      else if (q.dataset.q === 'retry') { qPick(); $('#qGame').scrollIntoView({ behavior: REDUCED ? 'auto' : 'smooth', block: 'start' }); }
    });
  }

  /* ================= LAYOUT ================= */
  function measure() {
    VW = document.documentElement.clientWidth; VH = innerHeight;
    const rect = (e) => { const r = e.getBoundingClientRect(); return { top: r.top + scrollY, h: r.height }; };
    L.story = rect($('#story')); L.col = rect($('#collection')); L.run = rect($('#colRun'));
    L.secs = SECTIONS.map((s) => ({ id: s[0], top: rect($('#' + s[0])).top }));
    if (state.open) { layoutRing(); fitCard(); }
    if (dustW !== VW || dustH !== VH) { dustW = VW; dustH = VH; dustResize(); }
  }

  /* ================= DUST ================= */
  const cv = $('#dust'), cx = cv.getContext('2d');
  let P = [], DPR = 1;
  function dustResize() {
    DPR = Math.min(2, window.devicePixelRatio || 1);
    cv.width = VW * DPR; cv.height = VH * DPR; cv.style.width = VW + 'px'; cv.style.height = VH + 'px';
    const n = VW < 700 ? 34 : 80;
    P = Array.from({ length: n }, () => ({ x: Math.random() * VW, y: Math.random() * VH, r: Math.random() * 1.7 + .4, s: Math.random() * .25 + .06, a: Math.random() * .5 + .15, ph: Math.random() * 6.28, z: Math.random() * .9 + .1 }));
  }
  function dustDraw(vel) {
    burst *= .95; vel = vel - burst * 22;
    cx.setTransform(DPR, 0, 0, DPR, 0, 0); cx.clearRect(0, 0, VW, VH); cx.fillStyle = '#f0c874';
    for (const p of P) {
      p.y -= p.s + vel * p.z * .32; p.ph += .004; p.x += Math.sin(p.ph) * .15;
      const dx = p.x - M.px, dy = p.y - M.py, d2 = dx * dx + dy * dy;
      if (d2 < 15000) { const f = (1 - d2 / 15000) * 1.6; p.x += dx * .02 * f; p.y += dy * .02 * f; }
      if (p.y < -12) { p.y = VH + 12; p.x = Math.random() * VW; } else if (p.y > VH + 12) { p.y = -12; p.x = Math.random() * VW; }
      if (p.x < -12) p.x = VW + 12; else if (p.x > VW + 12) p.x = -12;
      cx.globalAlpha = p.a;
      const len = Math.max(-16, Math.min(16, vel * p.z * .8));
      if (Math.abs(len) > 2.5) cx.fillRect(p.x, p.y, p.r * .8, len);
      else { cx.beginPath(); cx.arc(p.x, p.y, p.r, 0, 6.2832); cx.fill(); }
    }
  }

  /* ================= FRAME LOOP ================= */
  let lastSy = 0, lastNavY = 0, lastAct = -1, curX = -100, curY = -100, tcx = -100, tcy = -100;
  const el = { bar: $('#progress i'), nav: $('#nav'), hero: $('#heroCopy'), heroCoin: $('#heroCoin'), coin: $('#coin3d'), stage: $('#heroStage'), cursor: $('#cursor'), tags: $('#tags'), glow: $('.col-glow') };

  function frame() {
    const sy = window.scrollY;
    const vel = smooth('vel', sy - lastSy, .2); lastSy = sy;
    const docH = document.documentElement.scrollHeight - VH;
    el.bar.style.transform = 'scaleX(' + (docH > 0 ? sy / docH : 0) + ')';

    if (sy > 240 && sy > lastNavY + 6) el.nav.classList.add('hide'); else if (sy < lastNavY - 6 || sy < 240) el.nav.classList.remove('hide');
    lastNavY = sy;
    const mid = sy + VH * .4; let act = 0;
    L.secs.forEach((s, i) => { if (mid >= s.top) act = i; });
    if (act !== lastAct) {
      lastAct = act;
      $$('#dots a').forEach((a, i) => a.classList.toggle('active', i === act));
      $$('#nav nav a').forEach((a) => a.classList.toggle('active', a.getAttribute('href') === '#' + L.secs[act].id));
    }

    heroUpdate(sy);
    colUpdate(sy);
    if (!REDUCED && sy > L.story.top - VH && sy < L.story.top + L.story.h) {
      el.tags.style.setProperty('--sway', smooth('sway', clamp(vel * .22, -5, 5), .14).toFixed(2));
    }
    if (!REDUCED && sy > L.col.top - VH && sy < L.col.top + L.col.h) {
      const k = clamp((sy + VH / 2 - L.col.top) / L.col.h) - .5;
      el.glow.style.transform = 'translate(-50%,calc(-50% + ' + (k * -140).toFixed(1) + 'px))';
    }
    dustDraw(vel);

    if (FINE) {
      curX = lerp(curX, tcx, .22); curY = lerp(curY, tcy, .22);
      el.cursor.style.transform = 'translate3d(' + curX.toFixed(1) + 'px,' + curY.toFixed(1) + 'px,0)';
    }
    requestAnimationFrame(frame);
  }

  let lastHero = -1;
  function heroUpdate(sy) {
    if (sy > VH * 1.4 && lastHero > VH * 1.4) return;
    lastHero = sy;
    const p = smooth('hero', clamp(sy / VH), .12);
    const mx = smooth('mx', M.x, .07), my = smooth('my', M.y, .07);
    // The coin only spins in place (no scale, no sideways move), so it can never cross the text.
    const spin = REDUCED ? 0 : p * 360;
    el.coin.style.transform = 'rotateX(' + ((my - .5) * -14) + 'deg) rotateY(' + (spin + (mx - .5) * 20) + 'deg)';
    el.stage.style.setProperty('--lx', (mx * 100).toFixed(1) + '%');
    el.stage.style.setProperty('--ly', (my * 100).toFixed(1) + '%');
    el.heroCoin.style.transform = 'translate3d(0,' + (-p * 70) + 'px,0)';
    el.hero.style.transform = 'translate3d(0,' + (-p * 90) + 'px,0)';
    el.hero.style.opacity = String(clamp(1 - p * 1.6));
  }

  /* ================= INTERACTION ================= */
  function setupPointer() {
    addEventListener('mousemove', (e) => {
      M.x = e.clientX / VW; M.y = e.clientY / VH; M.px = e.clientX; M.py = e.clientY;
      tcx = e.clientX; tcy = e.clientY;
      if (FINE && !document.body.classList.contains('has-cursor')) { document.body.classList.add('has-cursor'); curX = tcx; curY = tcy; }
    }, { passive: true });
    document.addEventListener('mouseover', (e) => { document.body.classList.toggle('hover', !!e.target.closest('a,button,[data-magnet],.mloc')); });
    if (FINE) $$('[data-magnet]').forEach((b) => {
      b.addEventListener('mousemove', (e) => { const r = b.getBoundingClientRect(); b.style.transform = 'translate(' + ((e.clientX - r.left - r.width / 2) * .25) + 'px,' + ((e.clientY - r.top - r.height / 2) * .35) + 'px)'; });
      b.addEventListener('mouseleave', () => { b.style.transition = 'transform .6s cubic-bezier(.2,.7,.1,1)'; b.style.transform = ''; setTimeout(() => { b.style.transition = ''; }, 600); });
    });
  }

  function setupObservers() {
    const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }), { threshold: .15 });
    $$('.reveal, .big').forEach((n) => io.observe(n));
    // the ending coin turns over by itself while it is on screen: Bangladesh on one side, British India on the other
    let turnT = 0, turnFirst = false;
    const bo = new IntersectionObserver((es) => es.forEach((e) => {
      clearInterval(turnT);
      if (!e.isIntersecting) return;
      turnT = setInterval(() => { $('#blank').classList.toggle('turned'); burst = .5; }, REDUCED ? 6000 : 4600);
      if (!turnFirst) { turnFirst = true; setTimeout(() => { $('#blank').classList.add('turned'); }, 1400); }
    }), { threshold: .5 });
    bo.observe($('#blank'));
    const co = new IntersectionObserver((es) => es.forEach((e) => {
      if (!e.isIntersecting) return; co.unobserve(e.target);
      $$('[data-count]', e.target).forEach((b) => {
        const to = Number(b.dataset.count) || 0, t0 = performance.now();
        (function tick(t) { const k = clamp((t - t0) / 1800); b.textContent = Math.round(to * (1 - Math.pow(1 - k, 4))); if (k < 1) requestAnimationFrame(tick); })(t0);
      });
    }), { threshold: .4 });
    const facts = $('#facts'); if (facts) co.observe(facts);
  }

  /* ================= PRELOADER / INIT ================= */
  function preloader(ready) {
    return new Promise((resolve) => {
      const num = $('#preNum'), t0 = performance.now(); let v = 0, isReady = false;
      ready.then(() => { isReady = true; });
      (function tick() {
        const e = performance.now() - t0;
        const target = isReady && e > (REDUCED ? 100 : 1500) ? 100 : Math.min(88, e / 18);
        v = lerp(v, target, .09); if (target === 100 && v > 99.3) v = 100;
        num.textContent = Math.round(v);
        if (v >= 100) { finish(); return; }
        requestAnimationFrame(tick);
      })();
      function finish() {
        setTimeout(() => {
          $('#preloader').classList.add('done');
          document.body.classList.remove('loading'); document.body.classList.add('loaded');
          setTimeout(() => { const p = $('#preloader'); if (p) p.remove(); }, 1500);
          resolve();
        }, 250);
      }
    });
  }

  function showNote() {
    if (!state.note) return;
    const t = document.createElement('div'); t.id = 'demoTag'; t.textContent = state.note; document.body.appendChild(t);
  }

  async function init() {
    VW = document.documentElement.clientWidth; VH = innerHeight;
    const loaded = Data.load().then((r) => {
      C = window.CONTENT.merge(r.settings);
      state.coins = r.coins.filter((c) => c.use !== 'quest'); state.qcoins = r.coins.filter((c) => c.use === 'quest');
      state.demo = r.demo; state.note = r.note || '';
      if (!state.qcoins.length) { $('#quest').remove(); SECTIONS = SECTIONS.filter((s) => s[0] !== 'quest'); }
      buildStatic();
      setupPointer();
      buildHeroCoin(state.coins[0]);
      buildTrunk(); buildTimeline();
      if (state.qcoins.length) setupQuest();
      measure(); setupObservers();
    });
    await preloader(Promise.race([loaded, wait(8000)]));
    await loaded.catch(() => {});
    measure();
    showNote();
    if (!running) { running = true; requestAnimationFrame(frame); }
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(measure);
    addEventListener('load', measure);
    let rt; addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(measure, 160); });
  }

  init();
})();
