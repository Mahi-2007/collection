/* Hand-sketched line maps: British India, Pakistan (East + West) and Bangladesh.
   Outlines are simplified [longitude, latitude] points, drawn twice with a little wobble so they look like pen sketches.
   Exposes window.Maps = { arrowFigure(text), coinFace('bd' | 'in') }. */
(function () {
  'use strict';

  // Bangladesh (East Pakistan, 1947-1971)
  const BD = [[88.1, 26.6], [88.7, 26.4], [89.8, 26.0], [89.7, 25.3], [90.5, 25.15], [91.5, 25.2], [92.2, 25.0], [92.1, 24.4], [91.7, 24.1], [91.6, 23.3], [91.9, 23.0], [92.2, 22.2], [92.6, 21.4], [92.3, 20.7],
    [91.8, 22.3], [90.6, 22.0], [89.8, 21.8], [89.1, 21.8], [88.9, 22.2], [88.7, 23.2], [88.4, 23.9], [88.0, 24.6], [88.5, 25.2], [88.0, 25.5]];

  // West Pakistan (today's Pakistan)
  const PKW = [[61.6, 25.2], [62.3, 25.1], [63.5, 25.3], [65.0, 25.4], [66.7, 25.4], [67.2, 24.8], [67.4, 24.2], [68.2, 23.7], [69.5, 24.2], [70.0, 25.0], [70.2, 26.0], [70.3, 27.0], [70.9, 27.9], [71.9, 28.9], [72.9, 29.9],
    [74.0, 30.8], [74.6, 31.1], [74.5, 31.7], [74.6, 32.5], [74.7, 32.9], [74.4, 33.9], [74.0, 34.7], [75.4, 34.9], [76.5, 35.5], [77.0, 35.6], [75.5, 36.8], [74.9, 37.0], [73.5, 36.9], [71.3, 36.0], [71.5, 35.0], [71.1, 34.0],
    [70.0, 33.2], [69.3, 31.9], [68.0, 31.7], [66.4, 31.2], [66.3, 29.9], [64.1, 29.4], [62.5, 29.4], [60.9, 29.9], [61.7, 28.5], [62.9, 27.2], [63.3, 26.7]];

  // The whole of British India (India + Pakistan + Bangladesh)
  const IND = [[61.6, 25.2], [63.3, 26.7], [62.9, 27.2], [61.7, 28.5], [60.9, 29.9], [62.5, 29.4], [64.1, 29.4], [66.3, 29.9], [66.4, 31.2], [68.0, 31.7], [69.3, 31.9], [70.0, 33.2], [71.1, 34.0], [71.5, 35.0], [71.3, 36.0],
    [73.5, 36.9], [74.9, 37.0], [75.5, 36.8], [77.0, 35.6], [77.8, 35.4], [78.8, 34.0], [79.0, 32.5], [80.2, 30.8], [81.0, 30.2], [80.1, 28.8], [81.8, 27.9], [83.3, 27.35], [84.7, 27.0], [85.9, 26.6], [87.0, 26.4], [88.1, 26.5],
    [88.3, 27.3], [88.9, 27.3], [89.0, 26.8], [92.1, 26.9], [92.7, 27.8], [94.5, 29.3], [96.1, 29.4], [97.4, 28.2], [96.0, 27.3], [95.3, 26.7], [94.7, 25.5], [94.4, 24.6], [94.0, 23.8], [93.4, 23.1], [93.2, 22.2], [92.6, 21.4],
    [92.3, 20.7], [91.8, 22.3], [90.6, 22.0], [89.8, 21.8], [89.1, 21.8], [88.9, 22.2], [88.2, 21.7], [87.0, 21.6], [86.8, 20.8], [86.0, 19.8], [85.0, 19.3], [84.0, 18.4], [83.0, 17.2], [82.2, 16.5], [81.2, 16.0], [80.3, 15.5],
    [80.2, 13.5], [80.3, 12.8], [79.9, 11.5], [79.8, 10.3], [79.2, 9.3], [78.4, 8.8], [77.6, 8.1], [77.0, 8.3], [76.4, 9.5], [75.7, 11.2], [74.9, 12.8], [74.5, 14.3], [73.9, 15.8], [73.4, 17.3], [72.9, 19.0], [72.8, 20.4],
    [72.6, 21.4], [71.3, 20.8], [70.3, 20.8], [69.2, 21.8], [69.0, 22.4], [70.0, 22.9], [70.6, 22.9], [69.5, 23.3], [68.5, 23.2], [68.2, 23.7], [67.4, 24.2], [67.2, 24.8], [66.7, 25.4], [65.0, 25.4], [63.5, 25.3], [62.3, 25.1]];

  const f = (p) => p[0].toFixed(1) + ' ' + p[1].toFixed(1);
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  function rnd(seed) { let s = (seed >>> 0) || 1; return () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296; }

  // fit one or more outlines into a w x h box (longitude is squeezed by cos(latitude) so shapes look right)
  function fit(polys, w, h, pad) {
    let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9;
    polys.forEach((poly) => poly.forEach((p) => { x0 = Math.min(x0, p[0]); x1 = Math.max(x1, p[0]); y0 = Math.min(y0, p[1]); y1 = Math.max(y1, p[1]); }));
    const k = Math.cos(((y0 + y1) / 2) * Math.PI / 180), dx = (x1 - x0) * k, dy = y1 - y0;
    const s = Math.min((w - 2 * pad) / dx, (h - 2 * pad) / dy), ox = (w - dx * s) / 2, oy = (h - dy * s) / 2;
    return (p) => [ox + (p[0] - x0) * k * s, oy + (y1 - p[1]) * s];
  }

  // a wobbly, softly rounded outline
  function outline(poly, proj, seed, jit) {
    const r = rnd(seed), n = poly.length;
    const pts = poly.map((p) => { const q = proj(p); return [q[0] + (r() - .5) * jit, q[1] + (r() - .5) * jit]; });
    const mid = (a, b) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
    let d = 'M' + f(mid(pts[n - 1], pts[0]));
    for (let i = 0; i < n; i++) d += 'Q' + f(pts[i]) + ' ' + f(mid(pts[i], pts[(i + 1) % n]));
    return d + 'Z';
  }

  // diagonal pen hatching across a w x h box
  function hatch(w, h, gap) {
    let d = '';
    for (let x = -h; x < w + h; x += gap) d += 'M' + x + ' 0L' + (x + h) + ' ' + h;
    return d;
  }

  /* One sketched region: hatch fill (clipped to the shape) + two slightly different outline passes. */
  function region(id, poly, proj, w, h, o) {
    const d1 = outline(poly, proj, o.seed || 1, o.jit || 1.4), d2 = outline(poly, proj, (o.seed || 1) + 17, (o.jit || 1.4) * 1.6);
    return '<clipPath id="' + id + '"><path d="' + d1 + '"/></clipPath>' +
      (o.hatch ? '<path class="hat" clip-path="url(#' + id + ')" d="' + hatch(w, h, o.gap || 7) + '" stroke="' + o.hatch + '" stroke-width="1.1" fill="none" style="--ho:' + (o.ho || .55) + '"/>' : '') +
      '<path class="dr" pathLength="1" d="' + d1 + '" fill="none" stroke="' + o.stroke + '" stroke-width="' + (o.sw || 2.4) + '" stroke-linejoin="round" stroke-linecap="round"' + (o.dash ? ' stroke-dasharray="' + o.dash + '" style="--d:' + (o.delay || 0) + 's"' : ' style="--d:' + (o.delay || 0) + 's"') + '/>' +
      (o.double === false ? '' : '<path class="dr" pathLength="1" d="' + d2 + '" fill="none" stroke="' + o.stroke + '" stroke-opacity=".45" stroke-width="1.1" stroke-linecap="round" style="--d:' + ((o.delay || 0) + .3) + 's"/>');
  }

  function filterDef(p, scale) {
    return '<filter id="' + p + 'sk" x="-5%" y="-5%" width="110%" height="110%"><feTurbulence type="fractalNoise" baseFrequency=".04" numOctaves="2" seed="4" result="n"/><feDisplacementMap in="SourceGraphic" in2="n" scale="' + (scale || 3) + '"/></filter>';
  }

  /* ---------- the arrow map: British India -> Pakistan (East + West) -> Bangladesh ---------- */
  function arrowFigure(t) {
    const W = 1200, H = 480, PW = 300, PH = 340, p = 'af';
    const pIn = fit([IND], PW, PH, 10), pBd = fit([BD], PW - 20, PH, 10);
    const CREAM = '#f4e9d3', BRASS = '#e0b25a', VERD = '#6cc3ac';
    const arrow = (x, y, id, lab) =>
      '<g class="dr-g">' +
      '<path class="dr" pathLength="1" d="M' + x + ' ' + (y + 6) + 'C' + (x + 34) + ' ' + (y - 34) + ',' + (x + 80) + ' ' + (y - 34) + ',' + (x + 110) + ' ' + (y + 4) + '" fill="none" stroke="' + BRASS + '" stroke-width="3" stroke-linecap="round" style="--d:' + (id === 1 ? 1.6 : 3.4) + 's"/>' +
      '<path class="dr" pathLength="1" d="M' + (x + 96) + ' ' + (y - 8) + 'L' + (x + 111) + ' ' + (y + 5) + 'L' + (x + 92) + ' ' + (y + 14) + '" fill="none" stroke="' + BRASS + '" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" style="--d:' + (id === 1 ? 2.6 : 4.4) + 's"/>' +
      '<text class="cap" x="' + (x + 56) + '" y="' + (y - 50) + '" text-anchor="middle" font-size="34" fill="' + BRASS + '" style="--d:' + (id === 1 ? 2.2 : 4) + 's">' + esc(lab) + '</text></g>';
    const cap = (cx, a, b, d) =>
      '<text class="cap" x="' + cx + '" y="414" text-anchor="middle" font-size="31" fill="' + CREAM + '" style="--d:' + d + 's;font-family:var(--serif)">' + esc(a) + '</text>' +
      '<text class="cap" x="' + cx + '" y="448" text-anchor="middle" font-size="24" fill="#cfc1a8" style="--d:' + (d + .15) + 's;font-family:var(--hand)">' + esc(b) + '</text>';
    // panel 1: all of British India
    const p1 = region(p + 'c1', IND, pIn, PW, PH, { seed: 3, stroke: CREAM, hatch: BRASS, gap: 8, ho: .4, delay: 0 });
    // panel 2: India faint, Pakistan (West + East) highlighted
    const p2 = region(p + 'c2', IND, pIn, PW, PH, { seed: 3, stroke: '#cfc1a8', dash: '.012 .012', sw: 1.4, double: false, delay: 0 }) +
      region(p + 'c3', PKW, pIn, PW, PH, { seed: 8, stroke: CREAM, hatch: BRASS, gap: 6, ho: .7, delay: 1.2 }) +
      region(p + 'c4', BD, pIn, PW, PH, { seed: 9, stroke: CREAM, hatch: BRASS, gap: 5, ho: .7, delay: 1.6 });
    const wp = pIn([66.3, 37.3]), ep = pIn([90.4, 24.0]);
    const lab2 = '<text class="cap" x="' + wp[0].toFixed(0) + '" y="' + (wp[1] - 4).toFixed(0) + '" text-anchor="middle" font-size="24" fill="' + CREAM + '" style="--d:3s">' + esc(t.west) + '</text>' +
      '<text class="cap" x="' + (ep[0] + 8).toFixed(0) + '" y="' + (ep[1] + 56).toFixed(0) + '" text-anchor="middle" font-size="26" fill="' + CREAM + '" style="--d:3.2s">' + esc(t.east) + '</text>';
    // panel 3: Bangladesh
    const p3 = region(p + 'c5', BD, pBd, PW - 20, PH, { seed: 5, stroke: CREAM, hatch: VERD, gap: 6, ho: .7, sw: 2.8, delay: 0 });
    return '<svg class="mapfig-svg" viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="' + esc(t.a + ' to ' + t.b + ' to ' + t.c) + '" xmlns="http://www.w3.org/2000/svg">' +
      '<defs>' + filterDef(p, 3.2) + '</defs>' +
      '<g filter="url(#' + p + 'sk)">' +
      '<g transform="translate(20 24)">' + p1 + '</g>' +
      '<g transform="translate(460 24)">' + p2 + lab2 + '</g>' +
      '<g transform="translate(910 24)">' + p3 + '</g>' +
      arrow(340, 210, 1, t.arrowA) + arrow(780, 210, 2, t.arrowB) +
      '</g>' +
      cap(170, t.a, t.aSub, .6) + cap(610, t.b, t.bSub, 2.4) + cap(1050, t.c, t.cSub, 4.2) +
      '</svg>';
  }

  /* ---------- the ending coin: one map on each face ---------- */
  function coinFace(kind, uid) {
    const p = 'cf' + (uid || kind), INK = '#4b2d0c';
    const bd = kind === 'bd', poly = bd ? BD : IND, box = bd ? 112 : 128;
    const proj = fit([poly], box, box, 2);
    const d1 = outline(poly, proj, bd ? 11 : 5, 1.2), d2 = outline(poly, proj, bd ? 29 : 23, 2);
    return '<svg viewBox="0 0 200 200" aria-hidden="true" xmlns="http://www.w3.org/2000/svg"><defs>' + filterDef(p, 1.8) + '<clipPath id="' + p + 'c"><path d="' + d1 + '"/></clipPath></defs>' +
      '<circle cx="100" cy="100" r="86" fill="none" stroke="' + INK + '" stroke-opacity=".5" stroke-width="1.6" stroke-dasharray="1 7" stroke-linecap="round"/>' +
      '<circle cx="100" cy="100" r="74" fill="none" stroke="' + INK + '" stroke-opacity=".35" stroke-width="1"/>' +
      '<g filter="url(#' + p + 'sk)"><g transform="translate(' + (100 - box / 2) + ' ' + (100 - box / 2) + ')">' +
      '<path d="' + d1 + '" fill="none" stroke="#fff3cf" stroke-opacity=".55" stroke-width="2.4" transform="translate(1.2 1.4)"/>' +
      '<path d="' + hatch(box, box, bd ? 5 : 4.5) + '" clip-path="url(#' + p + 'c)" stroke="' + INK + '" stroke-opacity=".42" stroke-width=".9" fill="none"/>' +
      '<path d="' + d1 + '" fill="none" stroke="' + INK + '" stroke-width="2.3" stroke-linejoin="round"/>' +
      '<path d="' + d2 + '" fill="none" stroke="' + INK + '" stroke-opacity=".45" stroke-width="1"/>' +
      '</g></g></svg>';
  }

  window.Maps = { arrowFigure: arrowFigure, coinFace: coinFace };
})();
