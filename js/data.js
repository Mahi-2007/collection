/* Data layer: Google Drive links -> image URLs, sample coins, Firestore loading. */
(function () {
  'use strict';
  const SITE = window.SITE || {};
  const FB = 'https://www.gstatic.com/firebasejs/10.12.2/';

  /* ---------- Google Drive helpers ---------- */
  function driveId(u) {
    if (!u) return '';
    const s = String(u);
    const m = s.match(/\/d\/([a-zA-Z0-9_-]{10,})/) || s.match(/[?&]id=([a-zA-Z0-9_-]{10,})/);
    return m ? m[1] : '';
  }
  // Works when the file is shared as "Anyone with the link: Viewer"
  function imgUrl(u, w) {
    if (!u) return '';
    const id = driveId(u);
    return id ? 'https://drive.google.com/thumbnail?id=' + id + '&sz=w' + (w || 1600) : String(u);
  }
  function fmtDate(d) {
    if (!d) return '';
    if (/^\d{4}-\d{2}-\d{2}$/.test(d)) {
      const p = d.split('-').map(Number);
      return new Date(p[0], p[1] - 1, p[2]).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
    }
    return String(d);
  }

  /* ---------- Procedural sample coins (used until real coins are added) ---------- */
  const METALS = {
    bronze: ['#f0bd80', '#a9692f', '#4c2c12'],
    silver: ['#f4f5f6', '#a9aeb4', '#4d5258'],
    copper: ['#f2a67e', '#b4552d', '#4a1f0e'],
    brass: ['#f7e394', '#c19a35', '#5a4310']
  };
  function coinSVG(seed, side) {
    const keys = Object.keys(METALS);
    const m = METALS[keys[seed % keys.length]];
    const n = 6 + (seed % 4) * 2;
    let star = '';
    for (let i = 0; i < n * 2; i++) {
      const a = (Math.PI * i) / n - Math.PI / 2;
      const r = i % 2 ? (side ? 92 : 78) : (side ? 130 : 150);
      star += (300 + Math.cos(a) * r).toFixed(1) + ',' + (300 + Math.sin(a) * r).toFixed(1) + ' ';
    }
    const label = (side ? 'SAMPLE BACK' : 'SAMPLE FRONT') + ' • COIN ' + String(seed + 1).padStart(2, '0') + ' • ';
    const txt = label + label;
    const inner = side
      ? '<circle cx="300" cy="300" r="196" fill="none" stroke="' + m[2] + '" stroke-opacity=".5" stroke-width="2"/>' +
        '<circle cx="300" cy="300" r="150" fill="none" stroke="' + m[2] + '" stroke-opacity=".5" stroke-width="10" stroke-dasharray="3 14" stroke-linecap="round"/>' +
        '<polygon points="' + star + '" fill="url(#r)" stroke="' + m[2] + '" stroke-opacity=".6" stroke-width="3"/>'
      : '<circle cx="300" cy="300" r="196" fill="none" stroke="' + m[2] + '" stroke-opacity=".5" stroke-width="2"/>' +
        '<polygon points="' + star + '" fill="url(#r)" stroke="' + m[2] + '" stroke-opacity=".6" stroke-width="3"/>' +
        '<circle cx="300" cy="300" r="46" fill="url(#b)" stroke="' + m[2] + '" stroke-opacity=".7" stroke-width="4"/>';
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 600">' +
      '<defs>' +
      '<radialGradient id="b" cx="35%" cy="30%" r="85%"><stop offset="0" stop-color="' + m[0] + '"/><stop offset=".55" stop-color="' + m[1] + '"/><stop offset="1" stop-color="' + m[2] + '"/></radialGradient>' +
      '<linearGradient id="r" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="' + m[0] + '"/><stop offset="1" stop-color="' + m[2] + '"/></linearGradient>' +
      '<filter id="n" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency=".85" numOctaves="2" seed="' + (seed + 3) + '"/>' +
      '<feColorMatrix values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 .6 -.2"/></filter>' +
      '<path id="c" d="M300,300 m-232,0 a232,232 0 1,1 464,0 a232,232 0 1,1 -464,0"/>' +
      '</defs>' +
      '<circle cx="300" cy="300" r="299" fill="url(#b)"/>' +
      '<circle cx="300" cy="300" r="290" fill="none" stroke="url(#r)" stroke-width="12"/>' +
      '<circle cx="300" cy="300" r="266" fill="none" stroke="' + m[2] + '" stroke-opacity=".55" stroke-width="3" stroke-dasharray="1 12" stroke-linecap="round"/>' +
      '<text font-family="Georgia,serif" font-size="30" fill="' + m[2] + '" fill-opacity=".85"><textPath href="#c" textLength="1440" lengthAdjust="spacing">' + txt + '</textPath></text>' +
      inner +
      '<rect width="600" height="600" filter="url(#n)" opacity=".55"/>' +
      '</svg>';
  }
  function placeholder(seed, side) {
    return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(coinSVG(seed || 0, side ? 1 : 0));
  }

  function demo(themeList) {
    const themes = themeList && themeList.length ? themeList : ['Theme'];
    const eras = ['Pre-colonial', 'Colonial', 'British period', 'Pakistan period', 'Early Bangladesh', 'Colonial', 'Pre-colonial', 'Regional issue'];
    const places = ['District A', 'District B', 'District C', 'District D', 'District E', 'District F', 'District G', 'District H'];
    const dates = ['12 March 2021', '3 July 2021', '19 January 2022', '8 May 2022', '30 September 2022', '14 February 2023', '2 June 2023', '21 October 2023'];
    const mats = ['Copper', 'Silver', 'Bronze', 'Brass', 'Copper', 'Silver', 'Bronze', 'Copper'];
    const out = [];
    for (let i = 0; i < 8; i++) {
      const theme = themes[Math.min(themes.length - 1, Math.floor(i * themes.length / 8))];
      out.push({
        id: 'demo' + i, use: 'showcase', frame: true, phase: i < 2 ? 'p1' : i < 5 ? 'p2' : i < 7 ? 'p3' : 'p4',
        title: 'Sample coin ' + String(i + 1).padStart(2, '0'),
        era: eras[i], place: places[i], date: dates[i], theme: theme,
        material: mats[i], year: i % 3 === 0 ? '' : String(1790 + i * 11), denomination: i % 2 ? 'One pice' : 'Half anna', condition: i % 2 ? 'Fine' : 'Worn', collectionId: 'HH-' + String(i + 1).padStart(3, '0'),
        story: 'This is a sample entry for “' + theme + '”. When you add a real coin in the admin page, its photos, era, place, date and your own short story replace this text. Aim for 60 to 100 words: what it is, how it was found, what you discovered about it, and why it stayed with you.',
        front: placeholder(i, 0), back: placeholder(i, 1), order: i + 1
      });
    }
    // three sample coins for the treasure game
    [
      { loc: 'tree', seed: 10, mat: 'Copper', t: 'Copper pice from a hollow tree', st: 'Wrapped in a rag and pushed deep into a hollow. Green-brown patina covered it evenly, which is exactly how it survived a century.', ans: 'leave', ex: 'The smooth green-brown layer is stable patina. It protects the metal and is part of the coin’s history, so cleaning it would only damage it.' },
      { loc: 'trunk', seed: 11, mat: 'Bronze', t: 'Bronze coin from a rusty trunk', st: 'It sat among folded cloth at the bottom of a trunk. Damp air had started a slow, spreading corrosion on one edge.', ans: 'restore', ex: 'Light green powder breaking out of tiny pits is active corrosion ("bronze disease"). It keeps spreading, so it needs careful treatment, not neglect.' },
      { loc: 'box', seed: 12, mat: 'Silver', t: 'Silver rupee from a farm box', st: 'Buried in a wooden box under a field, it came out dark and toned. The dark colour was age, not dirt.', ans: 'leave', ex: 'The dark tone is natural toning, not dirt. Gentle handling is enough; polishing silver strips the toning and leaves hairline scratches.' }
    ].forEach(function (q, i) {
      out.push({
        id: 'demoq' + i, use: 'quest', frame: true, phase: '', title: q.t, era: '', place: '', date: '', theme: '', story: q.st,
        material: q.mat, year: '', denomination: '', condition: i === 1 ? 'Green powder in the pits' : '', collectionId: '',
        qLoc: q.loc, qAnswer: q.ans, qExplain: q.ex, qDamage: '',
        front: placeholder(q.seed, 0), back: placeholder(q.seed, 1), order: 100 + i
      });
    });
    return out;
  }

  /* ---------- Loading ---------- */
  function loadScript(src) {
    return new Promise(function (res, rej) {
      const s = document.createElement('script');
      s.src = src; s.onload = res; s.onerror = function () { rej(new Error('Could not load ' + src)); };
      document.head.appendChild(s);
    });
  }

  function fromDoc(d) {
    const x = d.data();
    return {
      id: d.id, title: x.title || 'Untitled', era: x.era || '', place: x.place || '',
      date: fmtDate(x.date), theme: x.theme || '', story: x.story || '',
      front: imgUrl(x.frontUrl), back: imgUrl(x.backUrl), order: typeof x.order === 'number' ? x.order : 999,
      frame: x.frame !== false, phase: x.phase || '',
      material: x.material || '', year: x.year || '', denomination: x.denomination || '', condition: x.condition || '', collectionId: x.collectionId || '',
      use: x.use === 'quest' ? 'quest' : 'showcase',
      qLoc: x.qLoc || '', qAnswer: x.qAnswer === 'restore' ? 'restore' : 'leave', qExplain: x.qExplain || '', qDamage: x.qDamage || ''
    };
  }

  const DEFAULT_THEMES = (window.CONTENT && window.CONTENT.defaults.themes) || [];

  async function load() {
    if (!SITE.firebase) return { coins: demo(DEFAULT_THEMES), demo: true, settings: null, note: 'Preview mode: sample coins. Add your Firebase config in site-config.js to show real ones.' };
    let settings = null;
    try {
      await loadScript(FB + 'firebase-app-compat.js');
      await loadScript(FB + 'firebase-firestore-compat.js');
      if (!firebase.apps.length) firebase.initializeApp(SITE.firebase);
      const db = firebase.firestore();
      try { const s = await db.doc('settings/site').get(); if (s.exists) settings = s.data(); } catch (e) { console.warn('[settings] using defaults:', e); }
      const themes = (settings && Array.isArray(settings.themes) && settings.themes) || DEFAULT_THEMES;
      const snap = await db.collection(SITE.collection || 'coins').where('status', '==', 'published').get();
      const coins = snap.docs.map(fromDoc);
      coins.sort(function (a, b) { return a.order - b.order || a.title.localeCompare(b.title); });
      if (!coins.length) return { coins: demo(themes), demo: true, settings: settings, note: 'No published coins yet: showing samples. Publish a coin in the admin page.' };
      if (!coins.some(function (c) { return c.use !== 'quest'; })) {
        // only game coins published so far: keep them, show sample coins in the trunk
        return { coins: demo(themes).filter(function (c) { return c.use !== 'quest'; }).concat(coins), demo: true, settings: settings, note: 'No trunk coins published yet: showing samples in the trunk.' };
      }
      return { coins: coins, demo: false, settings: settings };
    } catch (e) {
      console.warn('[coins] Falling back to samples:', e);
      return { coins: demo(DEFAULT_THEMES), demo: true, settings: settings, note: 'Could not reach Firebase: showing samples.' };
    }
  }

  window.CoinData = { load: load, imgUrl: imgUrl, driveId: driveId, fmtDate: fmtDate, placeholder: placeholder, demo: demo, loadScript: loadScript, FB: FB };
})();
