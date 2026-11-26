/* Private admin page: sign in, add / edit / publish / delete coins, and edit all site text.
   Stores text + Google Drive links only. */
(function () {
  'use strict';
  const SITE = window.SITE || {}, Data = window.CoinData, CONTENT = window.CONTENT;
  const $ = (s, r = document) => r.querySelector(s);
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const show = (sel, on) => { $(sel).hidden = !on; };
  let col, rows = [], db, siteVals = CONTENT.merge(null), phs = [];

  const explain = (err) => err.message + (err.code === 'permission-denied' ? ' (Check that the UID in the published Firestore rules matches the UID shown at the top of this page.)' : '');

  async function boot() {
    if (!SITE.firebase) { show('#noconfig', true); return; }
    try {
      await Data.loadScript(Data.FB + 'firebase-app-compat.js');
      await Data.loadScript(Data.FB + 'firebase-auth-compat.js');
      await Data.loadScript(Data.FB + 'firebase-firestore-compat.js');
    } catch (e) { $('#noconfig').hidden = false; $('#noconfig').innerHTML = '<h2>Could not load Firebase</h2><p>Check your internet connection and try again.</p>'; return; }
    firebase.initializeApp(SITE.firebase);
    const auth = firebase.auth(); db = firebase.firestore();
    col = db.collection(SITE.collection || 'coins');

    auth.onAuthStateChanged((u) => {
      if (u) { show('#login', false); show('#tabs', true); show('#who', true); $('#whoMail').textContent = u.email + '  ·  UID: ' + u.uid; showTab(curTab); listen(); loadSite(); }
      else { show('#login', true); show('#app', false); show('#siteApp', false); show('#tabs', false); show('#who', false); if (unsub) { unsub(); unsub = null; } }
    });
    $('#loginForm').addEventListener('submit', (e) => {
      e.preventDefault(); $('#lMsg').className = 'msg'; $('#lMsg').textContent = 'Signing in…';
      auth.signInWithEmailAndPassword($('#lEmail').value.trim(), $('#lPass').value)
        .catch((err) => { $('#lMsg').className = 'msg err'; $('#lMsg').textContent = 'Could not sign in: ' + err.message; });
    });
    $('#logout').addEventListener('click', () => auth.signOut());
    setupForm();
    setupSite();
  }

  let unsub = null;
  function listen() {
    if (unsub) return;
    unsub = col.onSnapshot((snap) => {
      rows = snap.docs.map((d) => Object.assign({ id: d.id }, d.data()));
      rows.sort((a, b) => (a.order || 999) - (b.order || 999) || String(a.title).localeCompare(String(b.title)));
      render(); suggest(); phaseRender();
    }, (err) => { $('#list').innerHTML = '<li class="msg err">Could not read coins: ' + esc(explain(err)) + '</li>'; });
  }

  const phTag = (id) => { const p = (siteVals.phases || []).find((x) => x.id === id); return p ? p.tag : ''; };
  const locName = (id) => { const l = CONTENT.locs.find((x) => x.id === id); return l ? siteVals[l.k] : id; };

  function render() {
    $('#count').textContent = rows.length + (rows.length === 1 ? ' coin' : ' coins');
    const cur = $('#f_id').value;
    $('#list').innerHTML = rows.length ? rows.map((r) => {
      const game = r.use === 'quest';
      return '<li class="item' + (r.id === cur ? ' active' : '') + '" data-id="' + esc(r.id) + '">' +
        '<img src="' + esc(Data.imgUrl(r.frontUrl, 200)) + '" alt="" onerror="this.style.visibility=\'hidden\'">' +
        '<div><b>' + esc(r.title) + '</b><span><i class="badge ' + esc(r.status) + '">' + esc(r.status) + '</i>' +
        (game ? '<i class="badge game">game · ' + esc(locName(r.qLoc)) + '</i>' : '#' + esc(r.order || '–') + (phTag(r.phase) ? ' · ' + esc(phTag(r.phase)) : '') + (r.theme ? ' · ' + esc(r.theme) : '')) + '</span></div>' +
        '<div class="btns"><button class="ghost" data-a="edit">Edit</button>' +
        '<button class="ghost" data-a="toggle">' + (r.status === 'published' ? 'Unpublish' : 'Publish') + '</button>' +
        '<button class="danger" data-a="del">Delete</button></div></li>';
    }).join('') : '<li class="msg">No coins yet. Add your first one on the left.</li>';
  }

  /* ---------- suggestions: anything you saved before is offered again ---------- */
  const SEEDS = {
    material: ['Copper', 'Bronze', 'Brass', 'Silver', 'Gold', 'Iron', 'Nickel'],
    condition: ['Fine', 'Very fine', 'Worn', 'Corroded', 'Encrusted']
  };
  function fillDL(id, key, extra) {
    const cnt = {};
    rows.forEach((r) => { const v = String(r[key] == null ? '' : r[key]).trim(); if (v) cnt[v] = (cnt[v] || 0) + 1; });
    const used = Object.keys(cnt).sort((a, b) => cnt[b] - cnt[a]);
    const seen = new Set(used.map((v) => v.toLowerCase()));
    const all = used.concat((extra || []).filter((s) => !seen.has(String(s).toLowerCase())));
    $('#dl_' + id).innerHTML = all.map((v) => '<option value="' + esc(v) + '">').join('');
  }
  function suggest() {
    ['era', 'place', 'year', 'denomination', 'collectionId'].forEach((k) => fillDL(k, k));
    fillDL('material', 'material', SEEDS.material); fillDL('condition', 'condition', SEEDS.condition);
    fillDL('theme', 'theme', siteVals.themes);
    const ids = rows.map((r) => String(r.collectionId || '').trim()).filter(Boolean).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
    $('#idHint').textContent = ids.length ? 'Highest used so far: ' + ids[ids.length - 1] : '';
  }

  function fillPhaseSelect() {
    const sel = $('#f_phase'), cur = sel.value;
    sel.innerHTML = '<option value="">Same group as the coin before</option>' + (siteVals.phases || []).map((p) => '<option value="' + esc(p.id) + '">' + esc((p.tag ? p.tag + ' · ' : '') + p.title) + '</option>').join('');
    sel.value = cur || '';
  }

  function fillLocSelect() {
    const sel = $('#f_qLoc'), cur = sel.value;
    sel.innerHTML = CONTENT.locs.map((l) => '<option value="' + l.id + '">' + esc(siteVals[l.k]) + '</option>').join('');
    if (cur) sel.value = cur;
  }

  function setupForm() {
    const f = (id) => $('#f_' + id);
    const preview = () => {
      ['front', 'back'].forEach((k) => {
        const img = $('#pv_' + k), v = f(k).value.trim();
        img.parentElement.style.display = v ? '' : 'none';
        if (v) img.src = Data.imgUrl(v, 400); else img.removeAttribute('src');
      });
      $('#pvMsg').hidden = true;
      document.querySelectorAll('.previews img').forEach((i) => { i.style.borderRadius = f('frame').checked ? '50%' : '10px'; i.style.objectFit = f('frame').checked ? 'cover' : 'contain'; });
    };
    const useUI = () => { const g = f('use').value === 'quest'; $('#questBox').hidden = !g; $('#phaseRow').hidden = g; };
    f('use').addEventListener('change', useUI);
    f('frame').addEventListener('change', preview);
    ['front', 'back'].forEach((k) => {
      f(k).addEventListener('input', () => { clearTimeout(f(k)._t); f(k)._t = setTimeout(preview, 450); });
      $('#pv_' + k).addEventListener('error', () => { if ($('#pv_' + k).getAttribute('src')) $('#pvMsg').hidden = false; });
    });
    f('story').addEventListener('input', () => { const n = f('story').value.trim().split(/\s+/).filter(Boolean).length; $('#wc').textContent = n + ' words'; });
    fillLocSelect(); fillPhaseSelect();

    const clear = () => {
      $('#coinForm').reset(); f('id').value = ''; $('#formTitle').textContent = 'Add a coin';
      f('order').value = (rows.reduce((m, r) => Math.max(m, r.order || 0), 0) + 1);
      f('frame').checked = true;
      $('#wc').textContent = '0 words'; $('#fMsg').textContent = ''; useUI(); preview(); render();
    };
    $('#resetBtn').addEventListener('click', clear);

    $('#coinForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      const game = f('use').value === 'quest';
      const data = {
        title: f('title').value.trim(), era: f('era').value.trim(), place: f('place').value.trim(), date: f('date').value,
        theme: f('theme').value.trim(), story: f('story').value.trim(),
        material: f('material').value.trim(), year: f('year').value.trim(), denomination: f('denomination').value.trim(),
        condition: f('condition').value.trim(), collectionId: f('collectionId').value.trim(),
        frontUrl: f('front').value.trim(), backUrl: f('back').value.trim(),
        frame: f('frame').checked,
        phase: game ? '' : f('phase').value,
        use: game ? 'quest' : 'showcase',
        qLoc: game ? f('qLoc').value : '', qAnswer: game ? f('qAnswer').value : '',
        qExplain: game ? f('qExplain').value.trim() : '', qDamage: game ? f('qDamage').value.trim() : '',
        order: Number(f('order').value) || 1, status: f('status').value,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      };
      $('#saveBtn').disabled = true; $('#fMsg').className = 'msg'; $('#fMsg').textContent = 'Saving…';
      try {
        if (f('id').value) await col.doc(f('id').value).set(data, { merge: true });
        else await col.add(data);
        $('#fMsg').textContent = 'Saved ✓';
        setTimeout(clear, 700);
      } catch (err) { $('#fMsg').className = 'msg err'; $('#fMsg').textContent = 'Could not save: ' + explain(err); }
      $('#saveBtn').disabled = false;
    });

    $('#list').addEventListener('click', async (e) => {
      const btn = e.target.closest('[data-a]'), li = e.target.closest('.item'); if (!li) return;
      const r = rows.find((x) => x.id === li.dataset.id); if (!r) return;
      const a = btn ? btn.dataset.a : 'edit';
      if (a === 'edit') {
        f('id').value = r.id; $('#formTitle').textContent = 'Edit coin';
        f('title').value = r.title || ''; f('era').value = r.era || ''; f('place').value = r.place || '';
        f('date').value = /^\d{4}-\d{2}-\d{2}$/.test(r.date || '') ? r.date : ''; f('theme').value = r.theme || '';
        f('material').value = r.material || ''; f('year').value = r.year || ''; f('denomination').value = r.denomination || '';
        f('condition').value = r.condition || ''; f('collectionId').value = r.collectionId || '';
        f('story').value = r.story || ''; f('front').value = r.frontUrl || ''; f('back').value = r.backUrl || '';
        f('frame').checked = r.frame !== false; f('phase').value = r.phase || '';
        f('use').value = r.use === 'quest' ? 'quest' : 'showcase';
        f('qLoc').value = r.qLoc || CONTENT.locs[0].id; f('qAnswer').value = r.qAnswer === 'restore' ? 'restore' : 'leave';
        f('qExplain').value = r.qExplain || ''; f('qDamage').value = r.qDamage || '';
        f('order').value = r.order || 1; f('status').value = r.status || 'draft';
        f('story').dispatchEvent(new Event('input')); useUI(); preview(); render(); window.scrollTo({ top: 0, behavior: 'smooth' });
      } else if (a === 'toggle') {
        try { await col.doc(r.id).set({ status: r.status === 'published' ? 'draft' : 'published' }, { merge: true }); }
        catch (err) { alert('Could not change: ' + explain(err)); }
      } else if (a === 'del') {
        if (confirm('Delete "' + r.title + '"? This cannot be undone.')) {
          try { await col.doc(r.id).delete(); if (f('id').value === r.id) clear(); } catch (err) { alert('Could not delete: ' + explain(err)); }
        }
      }
    });
    f('order').value = 1; useUI(); preview();
  }

  /* ================= SITE TEXT EDITOR ================= */
  let curTab = 'coins', chs = [];
  function showTab(t) {
    curTab = t; show('#app', t === 'coins'); show('#siteApp', t === 'site');
    document.querySelectorAll('#tabs button').forEach((b) => b.classList.toggle('on', b.dataset.tab === t));
  }

  function fieldHTML(it) {
    const hint = it.hint ? '<span class="hint">' + esc(it.hint) + '</span>' : '';
    if (it.type === 'phases') return '<div class="chap-wrap"><label>' + esc(it.label) + '</label><div id="phaseEd"></div><button type="button" class="ghost" id="phaseAdd">+ Add a group</button>' + hint + '</div>';
    if (it.type === 'chapters') return '<div class="chap-wrap"><label>' + esc(it.label) + '</label><div id="chapEd"></div><button type="button" class="ghost" id="chapAdd">+ Add a tag</button>' + hint + '</div>';
    const reset = '<button type="button" class="mini" data-reset="' + esc(it.k) + '" title="Put back the original text">&#8634;</button>';
    const ctl = (it.type === 'long' || it.type === 'list')
      ? '<textarea data-k="' + esc(it.k) + '" rows="' + (it.type === 'list' ? 6 : 4) + '"></textarea>'
      : '<input data-k="' + esc(it.k) + '">';
    return '<label>' + esc(it.label) + '<div class="fld">' + ctl + reset + '</div>' + hint + '</label>';
  }

  function chapRender() {
    $('#chapEd').innerHTML = chs.map((c, i) =>
      '<div class="chap" data-i="' + i + '"><div class="ctrl"><button type="button" class="ghost" data-c="up">&uarr;</button><button type="button" class="ghost" data-c="down">&darr;</button><button type="button" class="danger" data-c="del">Remove</button></div>' +
      '<label>Small label<input data-f="tag" value="' + esc(c.tag) + '"></label>' +
      '<label>Headline<input data-f="title" value="' + esc(c.title) + '"></label>' +
      '<label>One line<textarea data-f="text" rows="2">' + esc(c.text) + '</textarea></label></div>').join('');
    $('#chapAdd').hidden = chs.length >= 5;
  }

  function phaseRender() {
    const host = $('#phaseEd'); if (!host) return;
    host.innerHTML = phs.map((p, i) => {
      const mine = rows.filter((r) => r.use !== 'quest' && r.phase === p.id);
      return '<div class="chap" data-i="' + i + '"><div class="ctrl"><button type="button" class="ghost" data-pc="up">&uarr;</button><button type="button" class="ghost" data-pc="down">&darr;</button><button type="button" class="danger" data-pc="del">Remove</button></div>' +
        '<div class="row"><label>Number or label<input data-pf="tag" value="' + esc(p.tag) + '" placeholder="e.g. I"></label><label>Group name<input data-pf="title" value="' + esc(p.title) + '" placeholder="e.g. The Crown"></label></div>' +
        '<span class="hint">' + (mine.length ? 'Coins in this group: ' + mine.map((r) => '#' + esc(r.order || '–') + ' ' + esc(r.title)).join(', ') : 'No coin has been placed in this group yet. Choose it on a coin in the Coins tab.') + '</span></div>';
    }).join('');
  }

  function fillSite(vals) {
    siteVals = vals;
    CONTENT.groups.forEach((g) => g.items.forEach((it) => {
      if (it.type === 'chapters') { chs = JSON.parse(JSON.stringify(vals.chapters)); chapRender(); return; }
      if (it.type === 'phases') { phs = JSON.parse(JSON.stringify(vals.phases)); phaseRender(); return; }
      const el = document.querySelector('[data-k="' + it.k + '"]'); if (!el) return;
      el.value = it.type === 'list' ? (vals[it.k] || []).join('\n') : (vals[it.k] == null ? '' : vals[it.k]);
    }));
    fillLocSelect(); fillPhaseSelect(); suggest(); render();
  }

  function readSite() {
    const out = {};
    CONTENT.groups.forEach((g) => g.items.forEach((it) => {
      if (it.type === 'phases') { out.phases = phs.filter((p) => p.tag || p.title); if (!out.phases.length) out.phases = it.def; return; }
      if (it.type === 'chapters') { out.chapters = chs.filter((c) => c.tag || c.title || c.text); if (!out.chapters.length) out.chapters = it.def; return; }
      const el = document.querySelector('[data-k="' + it.k + '"]'); if (!el) return;
      out[it.k] = it.type === 'list' ? el.value.split('\n').map((s) => s.trim()).filter(Boolean) : el.value.trim();
    }));
    out.whatsapp = String(out.whatsapp || '').replace(/\D/g, '');
    return out;
  }

  let siteLoaded = false;
  async function loadSite() {
    if (siteLoaded) return;
    let saved = null;
    try { const s = await db.doc('settings/site').get(); if (s.exists) saved = s.data(); }
    catch (e) { $('#siteMsg').className = 'msg err'; $('#siteMsg').textContent = 'Could not read saved text: ' + explain(e); }
    fillSite(CONTENT.merge(saved)); siteLoaded = true;
  }

  function setupSite() {
    $('#siteFields').innerHTML = CONTENT.groups.map((g) => '<fieldset><legend>' + esc(g.title) + '</legend>' + g.items.map(fieldHTML).join('') + '</fieldset>').join('');
    chapRender(); phaseRender();
    document.querySelectorAll('#tabs button').forEach((b) => b.addEventListener('click', () => showTab(b.dataset.tab)));
    $('#siteFields').addEventListener('click', (e) => {
      const r = e.target.closest('[data-reset]');
      if (r) { const it = CONTENT.groups.flatMap((g) => g.items).find((x) => x.k === r.dataset.reset); const el = document.querySelector('[data-k="' + r.dataset.reset + '"]'); el.value = it.type === 'list' ? it.def.join('\n') : it.def; return; }
      if (e.target.id === 'phaseAdd') { const n = phs.reduce((m, p) => Math.max(m, Number(String(p.id).replace(/\D/g, '')) || 0), 0) + 1; phs.push({ id: 'p' + n, tag: '', title: '' }); phaseRender(); return; }
      const pc = e.target.closest('[data-pc]');
      if (pc) {
        const i = Number(pc.closest('.chap').dataset.i);
        if (pc.dataset.pc === 'del') { if (phs.length > 1 && (!rows.some((r) => r.phase === phs[i].id) || confirm('Coins are placed in this group. Remove it anyway? Those coins will join the group before them.'))) phs.splice(i, 1); }
        else { const j = pc.dataset.pc === 'up' ? i - 1 : i + 1; if (j >= 0 && j < phs.length) { const t = phs[i]; phs[i] = phs[j]; phs[j] = t; } }
        phaseRender(); return;
      }
      if (e.target.id === 'chapAdd') { chs.push({ tag: '', title: '', text: '' }); chapRender(); return; }
      const b = e.target.closest('[data-c]'); if (!b) return;
      const i = Number(b.closest('.chap').dataset.i);
      if (b.dataset.c === 'del') { if (chs.length > 1) chs.splice(i, 1); }
      else { const j = b.dataset.c === 'up' ? i - 1 : i + 1; if (j >= 0 && j < chs.length) { const t = chs[i]; chs[i] = chs[j]; chs[j] = t; } }
      chapRender();
    });
    $('#siteFields').addEventListener('input', (e) => {
      const pf = e.target.dataset.pf; if (pf) { phs[Number(e.target.closest('.chap').dataset.i)][pf] = e.target.value; return; }
      const f = e.target.dataset.f; if (!f) return;
      chs[Number(e.target.closest('.chap').dataset.i)][f] = e.target.value;
    });
    $('#siteDefaults').addEventListener('click', () => {
      if (confirm('Put every text back to the original wording? Nothing is saved until you press "Save all text".')) fillSite(CONTENT.merge(null));
    });
    $('#siteForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      const m = $('#siteMsg'); m.className = 'msg'; m.textContent = 'Saving…'; $('#siteSave').disabled = true;
      try {
        const data = readSite();
        await db.doc('settings/site').set(Object.assign(data, { updatedAt: firebase.firestore.FieldValue.serverTimestamp() }));
        siteVals = CONTENT.merge(data); fillLocSelect(); fillPhaseSelect(); suggest(); render(); phaseRender();
        m.textContent = 'Saved ✓ The site now shows this text.';
      } catch (err) { m.className = 'msg err'; m.textContent = 'Could not save: ' + explain(err); }
      $('#siteSave').disabled = false;
    });
  }

  boot();
})();
