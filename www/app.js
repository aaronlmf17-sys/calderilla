/* Calderilla — interfaz */
(function () {
  'use strict';
  const H = window.Core;
  const Cap = window.Capacitor;
  const NATIVE = !!(Cap && Cap.isNativePlatform && Cap.isNativePlatform());
  const NL = NATIVE ? Cap.registerPlugin('NotificationsListener') : null;
  const LN = NATIVE ? Cap.registerPlugin('LocalNotifications') : null;
  const APP = NATIVE ? Cap.registerPlugin('App') : null;
  const cats = () => S.categories;
  const catById = id => id === 'ingreso' ? H.INCOME_CAT : (cats().find(c => c.id === id) || cats().find(c => c.id === 'otros') || cats()[0]);
  const essentialIds = () => cats().filter(c => c.essential).map(c => c.id);
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const safeColor = c => /^#[0-9a-f]{6}$/i.test(c) ? c : '#868e96';
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const fmt = new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' });
  const fmt0 = new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 });
  const money = c => fmt.format((c || 0) / 100);
  const money0 = c => fmt0.format(Math.round((c || 0) / 100));
  const monthName = (y, m) => {
    const t = new Date(y, m, 1).toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
    let label = t.charAt(0).toUpperCase() + t.slice(1);
    if ((S.settings.payday || 1) > 1) { const r = periodRange(y, m), f = d => d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' }); label += ' · ' + f(r.start) + ' – ' + f(r.end); }
    return label;
  };
  const todayISO = () => H.toISO(new Date());
  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

  /* ---------- Almacenamiento ---------- */
  const KEY = 'calderilla.v1', OLD_KEY = 'hucha.v1';
  const defaultCats = () => JSON.parse(JSON.stringify(H.CATEGORIES));
  const blank = () => ({ v: 2, expenses: [], budgets: {}, learned: {}, decisions: {}, goals: [], categories: defaultCats(),
    settings: { monthlyBudget: null }, notif: { daily: true, hour: 21, subs: true }, inbox: [],
    bank: { enabled: false, auto: true, packages: {}, discovered: {}, discoverUntil: 0, seen: [] } });
  /* Seguridad: todo lo que se carga (almacenamiento o copia importada) pasa por aquí.
     Solo se conservan campos conocidos, con tipo, formato y longitud válidos. */
  const ID_RE = /^[a-z0-9][a-z0-9_-]{0,39}$/i, COLOR_RE = /^#[0-9a-f]{6}$/i, DATE_RE = /^\d{4}-\d{2}-\d{2}$/, YM_RE = /^\d{4}-\d{2}$/;
  const PKG_RE = /^[a-z][a-z0-9_]*(\.[a-z0-9_]+){1,10}$/i;
  const MAX_CENTS = 1e11;
  const safeLabel = (v, max) => String(v == null ? '' : v).replace(/[<>"'`&\\\u0000-\u001f\u007f]/g, '').trim().slice(0, max);
  const safeText = (v, max) => String(v == null ? '' : v).replace(/[\u0000-\u001f\u007f]/g, ' ').trim().slice(0, max);
  const posCents = v => (typeof v === 'number' && Number.isFinite(v) && v > 0 && v < MAX_CENTS) ? Math.round(v) : null;
  const isObj = v => !!v && typeof v === 'object' && !Array.isArray(v);
  const ownEntries = o => isObj(o) ? Object.keys(o).filter(k => k !== '__proto__' && k !== 'constructor' && k !== 'prototype').map(k => [k, o[k]]) : [];
  function upgrade(d) {
    d = isObj(d) ? d : {};
    const o = blank();
    // categorías
    const seen = new Set();
    const cs = [];
    for (const c of (Array.isArray(d.categories) ? d.categories : [])) {
      if (!isObj(c) || !ID_RE.test(String(c.id)) || c.id === 'ingreso' || seen.has(c.id)) continue;
      seen.add(c.id);
      cs.push({ id: c.id, name: safeLabel(c.name, 30) || c.id, emoji: safeLabel(c.emoji, 8) || '🏷️', color: COLOR_RE.test(c.color) ? c.color : '#868e96',
        essential: c.essential === true, kw: (Array.isArray(c.kw) ? c.kw : []).slice(0, 200).map(k => safeLabel(k, 40)).filter(Boolean) });
      if (cs.length >= 60) break;
    }
    o.categories = cs.length ? cs : defaultCats();
    if (!o.categories.some(c => c.id === 'otros')) o.categories.push(defaultCats().find(c => c.id === 'otros'));
    const catIds = new Set(o.categories.map(c => c.id));
    // movimientos y bandeja
    const mov = e => {
      if (!isObj(e)) return null;
      const amount = posCents(e.amount);
      if (!amount || !DATE_RE.test(String(e.date))) return null;
      const type = e.type === 'income' ? 'income' : 'expense';
      const r = { id: ID_RE.test(String(e.id)) ? e.id : uid(), amount, desc: safeText(e.desc, 80) || 'Movimiento', date: e.date,
        ts: (typeof e.ts === 'number' && Number.isFinite(e.ts)) ? e.ts : +H.fromISO(e.date), type,
        cat: type === 'income' ? 'ingreso' : (catIds.has(e.cat) ? e.cat : 'otros') };
      if (e.src === 'banco') r.src = 'banco';
      if (e.bank) r.bank = safeLabel(e.bank, 30);
      if (e.raw) r.raw = safeText(e.raw, 200);
      if (ID_RE.test(String(e.imp))) r.imp = e.imp;
      if (['high', 'medium', 'low'].includes(e.confidence)) r.confidence = e.confidence;
      return r;
    };
    o.expenses = (Array.isArray(d.expenses) ? d.expenses : []).slice(0, 200000).map(mov).filter(Boolean);
    o.inbox = (Array.isArray(d.inbox) ? d.inbox : []).slice(0, 500).map(mov).filter(Boolean);
    for (const [k, v] of ownEntries(d.budgets)) if (catIds.has(k) && posCents(v)) o.budgets[k] = posCents(v);
    for (const [k, v] of ownEntries(d.learned)) { const nk = H.normalize(k).slice(0, 80); if (nk && catIds.has(v)) o.learned[nk] = v; }
    for (const [k, v] of ownEntries(d.decisions)) { const nk = safeLabel(k, 80); if (nk && v === 'cut') o.decisions[nk] = 'cut'; }
    // metas
    o.goals = (Array.isArray(d.goals) ? d.goals : []).slice(0, 50).map(g => {
      if (!isObj(g) || !posCents(g.target)) return null;
      return { id: ID_RE.test(String(g.id)) ? g.id : uid(), name: safeLabel(g.name, 40) || 'Meta', emoji: safeLabel(g.emoji, 8) || '🎯',
        target: posCents(g.target), deadline: YM_RE.test(String(g.deadline)) ? g.deadline : null, created: DATE_RE.test(String(g.created)) ? g.created : todayISO(),
        entries: (Array.isArray(g.entries) ? g.entries : []).slice(0, 5000).filter(x => isObj(x) && DATE_RE.test(String(x.date)) && Number.isFinite(x.amount) && Math.abs(x.amount) < MAX_CENTS && x.amount !== 0)
          .map(x => ({ id: ID_RE.test(String(x.id)) ? x.id : uid(), date: x.date, amount: Math.round(x.amount) })) };
    }).filter(Boolean);
    // ajustes
    const st = isObj(d.settings) ? d.settings : {};
    o.settings.monthlyBudget = posCents(st.monthlyBudget);
    o.settings.payday = Number.isInteger(st.payday) && st.payday >= 1 && st.payday <= 28 ? st.payday : 1;
    const nf = isObj(d.notif) ? d.notif : {};
    o.notif = { daily: nf.daily !== false, hour: Number.isInteger(nf.hour) && nf.hour >= 0 && nf.hour <= 23 ? nf.hour : 21, subs: nf.subs !== false };
    const bk = isObj(d.bank) ? d.bank : {};
    o.bank.enabled = bk.enabled === true; o.bank.auto = bk.auto !== false;
    for (const [k, v] of ownEntries(bk.packages)) if (PKG_RE.test(k) && typeof v === 'boolean') o.bank.packages[k] = v;
    for (const [k, v] of ownEntries(bk.discovered)) if (PKG_RE.test(k) && isObj(v)) o.bank.discovered[k] = { count: Math.min(1e6, Math.max(0, parseInt(v.count, 10) || 0)), last: Number(v.last) || 0, sample: safeText(v.sample, 140) };
    o.bank.discoverUntil = Math.min(Number(bk.discoverUntil) || 0, Date.now() + 48 * 3600000);
    o.bank.seen = (Array.isArray(bk.seen) ? bk.seen : []).filter(x => typeof x === 'string' && /^[a-z0-9]{1,14}$/.test(x)).slice(-400);
    return o;
  }
  let memoryOnly = false;
  function load() {
    try {
      const raw = localStorage.getItem(KEY) || localStorage.getItem(OLD_KEY);
      if (raw) return upgrade(JSON.parse(raw));
    } catch (e) { memoryOnly = true; }
    return blank();
  }
  let S = load();
  function save() {
    if (memoryOnly) return;
    try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { memoryOnly = true; }
    clearTimeout(swTimer); swTimer = setTimeout(() => { writeSwState(); scheduleLocal(); }, 800);
  }
  let swTimer;
  try { navigator.storage && navigator.storage.persist && navigator.storage.persist(); } catch (e) {}

  /* ---------- Estado de UI ---------- */
  const now0 = new Date();
  let viewMonth; // se fija justo después de definir los periodos
  let currentTab = 'inicio';
  let draft = null;       // resultado de parseQuick
  let draftCatManual = null;

  const monthKey = (y, m) => y + '-' + String(m + 1).padStart(2, '0');
  /* Un "mes" de la app va de nómina a nómina. Con día de cobro 28, «noviembre» = 28 oct – 27 nov.
     Con día 1 (por defecto) es el mes natural. */
  const payday = () => S.settings.payday || 1;
  const periodCache = new Map();
  function periodRange(y, m) {
    const key = y + '-' + m + '-' + payday();
    if (periodCache.has(key)) return periodCache.get(key);
    const d = payday();
    const start = d > 1 ? new Date(y, m - 1, d) : new Date(y, m, 1);
    const next = d > 1 ? new Date(y, m, d) : new Date(y, m + 1, 1);
    const end = new Date(next); end.setDate(end.getDate() - 1);
    const r = { start, end, startISO: H.toISO(start), endISO: H.toISO(end), days: Math.round((next - start) / 86400000) };
    periodCache.set(key, r); return r;
  }
  function periodOf(iso) {
    const dt = H.fromISO(iso), d = payday();
    let y = dt.getFullYear(), m = dt.getMonth();
    if (d > 1 && dt.getDate() >= d) { m++; if (m > 11) { m = 0; y++; } }
    return { y, m };
  }
  const shiftPeriod = (y, m, k) => { const t = new Date(y, m + k, 1); return { y: t.getFullYear(), m: t.getMonth() }; };
  const inMonth = (e, y, m) => { const r = periodRange(y, m); return e.date >= r.startISO && e.date <= r.endISO; };
  viewMonth = periodOf(todayISO());
  const spentIn = (y, m, cat) => S.expenses.filter(e => e.type !== 'income' && inMonth(e, y, m) && (!cat || e.cat === cat)).reduce((s, e) => s + e.amount, 0);
  const incomeIn = (y, m) => S.expenses.filter(e => e.type === 'income' && inMonth(e, y, m)).reduce((s, e) => s + e.amount, 0);

  /* ---------- Toast & sheet ---------- */
  let toastTimer;
  function toast(msg, actionLabel, action, ms) {
    const t = $('#toast');
    t.innerHTML = '<span>' + msg + '</span>' + (actionLabel ? '<button>' + actionLabel + '</button>' : '');
    t.hidden = false;
    if (actionLabel) t.querySelector('button').onclick = () => { t.hidden = true; action(); };
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { t.hidden = true; }, ms || 4000);
  }
  function openSheet(html, onMount) {
    const sh = $('#sheet');
    sh.innerHTML = '<div class="grab"></div>' + html;
    sh.hidden = false; $('#sheetBackdrop').hidden = false;
    onMount && onMount(sh);
  }
  function closeSheet() { $('#sheet').hidden = true; $('#sheetBackdrop').hidden = true; }
  $('#sheetBackdrop').onclick = closeSheet;

  /* ---------- Alta de gastos ---------- */
  function addExpense(e, opts) {
    const item = Object.assign({ id: uid(), ts: Date.now(), type: 'expense' }, e);
    if (item.date !== todayISO()) { const d = H.fromISO(item.date); const n = new Date(); d.setHours(n.getHours(), n.getMinutes()); item.ts = +d; }
    S.expenses.push(item);
    if (item.desc && item.type !== 'income') S.learned[H.normalize(item.desc)] = item.cat;
    save();
    const c = catById(item.cat);
    toast(esc(c.emoji) + ' ' + esc(item.desc || c.name) + ' · ' + money(item.amount), 'Deshacer', () => {
      S.expenses = S.expenses.filter(x => x.id !== item.id); save(); renderAll();
    });
    checkBudgetCross(item);
    renderAll();
    if (!(opts && opts.keepFocus)) $('#quickInput').blur();
    return item;
  }

  function checkBudgetCross(item) {
    if (item.type === 'income') return;
    const { y, m } = periodOf(item.date);
    const check = (limit, after, label) => {
      if (!limit) return;
      const before = after - item.amount;
      for (const th of [1, 0.8]) {
        if (before < limit * th && after >= limit * th) {
          setTimeout(() => toast((th === 1 ? '🚨 Has superado ' : '⚠️ Llevas el 80 % de ') + label + ' (' + money0(after) + ' de ' + money0(limit) + ')', null, null, 5000), 1600);
          return;
        }
      }
    };
    check(S.budgets[item.cat], spentIn(y, m, item.cat), 'tu límite de ' + esc(catById(item.cat).name.toLowerCase()));
    check(S.settings.monthlyBudget, spentIn(y, m), 'tu presupuesto del mes');
  }

  /* ---------- Entrada rápida ---------- */
  const qi = $('#quickInput');
  function updateDraft() {
    const txt = qi.value;
    if (!txt.trim()) { draft = null; draftCatManual = null; $('#preview').hidden = true; $('#catPicker').hidden = true; renderAuto(''); return; }
    draft = H.parseQuick(txt, S.learned, new Date(), cats());
    draft.goal = matchGoal(txt, draft);
    if (draftCatManual && draft.type !== 'income') draft.cat = draftCatManual;
    const c = catById(draft.cat);
    $('#preview').hidden = false;
    if (draft.goal) {
      const g = draft.goal;
      $('#previewCat').textContent = (g.emoji || '🎯') + ' Meta';
      $('#previewText').innerHTML = (draft.amount != null ? '<b>' + money(draft.amount) + '</b> · ' : '<i>falta el importe</i> · ') + 'aportar a ' + esc(g.name);
      $('#addBtn').disabled = !draft.amount; $('#addBtn').textContent = 'Aportar';
      renderAuto(''); return;
    }
    $('#addBtn').textContent = 'Añadir';
    $('#previewCat').textContent = c.emoji + ' ' + c.name;
    const when = draft.date === todayISO() ? 'hoy' : H.fromISO(draft.date).toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' });
    $('#previewText').innerHTML = (draft.amount != null ? '<b>' + (draft.type === 'income' ? '+' : '') + money(draft.amount) + '</b> · ' : '<i>falta el importe</i> · ') + esc(draft.desc || c.name) + ' · ' + when;
    $('#addBtn').disabled = draft.amount == null || draft.amount <= 0;
    renderAuto(txt);
  }
  qi.addEventListener('input', updateDraft);
  $('#quickForm').addEventListener('submit', ev => {
    ev.preventDefault();
    if (!draft || !draft.amount) { qi.focus(); return; }
    if (draft.goal) { contribute(draft.goal, draft.amount); qi.value = ''; updateDraft(); qi.blur(); return; }
    addExpense({ amount: draft.amount, desc: draft.desc || catById(draft.cat).name, cat: draft.cat, date: draft.date, type: draft.type });
    qi.value = ''; updateDraft();
  });
  $('#previewCat').onclick = () => {
    if (draft && draft.goal) { switchTab('metas'); return; }
    const p = $('#catPicker');
    if (!p.hidden) { p.hidden = true; return; }
    p.innerHTML = cats().map(c => '<button type="button" class="chip' + (draft && draft.cat === c.id ? ' sel' : '') + '" data-cat="' + esc(c.id) + '">' + esc(c.emoji + ' ' + c.name) + '</button>').join('')
      + '<button type="button" class="chip' + (draft && draft.type === 'income' ? ' sel' : '') + '" data-cat="ingreso">💶 Es un ingreso</button>';
    p.hidden = false;
  };
  $('#catPicker').addEventListener('click', ev => {
    const b = ev.target.closest('[data-cat]'); if (!b) return;
    const id = b.dataset.cat;
    if (id === 'ingreso') { if (!qi.value.trim().startsWith('+')) qi.value = '+' + qi.value.trim(); draftCatManual = null; }
    else { qi.value = qi.value.replace(/^\s*\+/, ''); draftCatManual = id; }
    $('#catPicker').hidden = true; updateDraft(); qi.focus();
  });

  function renderAuto(txt) {
    const box = $('#autoList');
    const words = txt.replace(/[\d.,€]+/g, ' ').trim();
    if (!words || words.length < 2) { box.innerHTML = ''; return; }
    const items = H.autocomplete(S.expenses, words, 3).filter(a => H.normalize(a.desc) !== H.normalize(draft && draft.desc));
    box.innerHTML = items.map(a => '<button type="button" data-k="' + esc(a.key) + '"><span>' + esc(catById(a.cat).emoji) + ' ' + esc(a.desc) + '</span><span>' + money(a.amount) + '</span></button>').join('');
    box.onclick = ev => {
      const b = ev.target.closest('button'); if (!b) return;
      const a = items.find(i => i.key === b.dataset.k);
      const hasAmount = draft && draft.amount;
      qi.value = a.desc + ' ' + (hasAmount ? (draft.amount / 100).toString().replace('.', ',') : (a.amount / 100).toString().replace('.', ','));
      draftCatManual = a.cat; updateDraft(); qi.focus();
    };
  }

  /* ---------- Foto de ticket (OCR local) ---------- */
  let tessLoading = null;
  function loadTesseract() {
    if (window.Tesseract) return Promise.resolve();
    if (tessLoading) return tessLoading;
    tessLoading = new Promise((res, rej) => {
      const s = document.createElement('script');
      s.src = 'vendor/tesseract/tesseract.min.js';
      s.onload = res; s.onerror = () => { tessLoading = null; rej(new Error('no se pudo cargar el lector')); };
      document.head.appendChild(s);
    });
    return tessLoading;
  }
  function prepImage(file) {
    return new Promise((res, rej) => {
      const img = new Image();
      img.onload = () => {
        const max = 1600, k = Math.min(1, max / Math.max(img.width, img.height));
        const c = document.createElement('canvas'); c.width = img.width * k; c.height = img.height * k;
        const x = c.getContext('2d'); x.filter = 'grayscale(1) contrast(1.4)'; x.drawImage(img, 0, 0, c.width, c.height);
        URL.revokeObjectURL(img.src); res(c);
      };
      img.onerror = rej; img.src = URL.createObjectURL(file);
    });
  }
  $('#ticketInput').addEventListener('change', async ev => {
    const file = ev.target.files[0]; ev.target.value = '';
    if (!file) return;
    const st = $('#ocrStatus'); st.hidden = false; st.textContent = '📷 Leyendo el ticket…';
    try {
      await loadTesseract();
      const canvas = await prepImage(file);
      const { data } = await window.Tesseract.recognize(canvas, 'spa', {
        workerPath: new URL('vendor/tesseract/worker.min.js', location.href).href,
        corePath: new URL('vendor/tesseract/', location.href).href,
        langPath: 'https://cdn.jsdelivr.net/npm/@tesseract.js-data/spa/4.0.0_best_int',
        logger: m => { if (m.status === 'recognizing text') st.textContent = '📷 Leyendo el ticket… ' + Math.round(m.progress * 100) + ' %'; }
      });
      const r = H.parseReceipt(data.text);
      if (!r.total) { st.textContent = 'No he encontrado el total. Escríbelo tú y lo guardo.'; qi.value = (r.store || '') + ' '; qi.focus(); updateDraft(); return; }
      let txt = (r.store || 'Ticket') + ' ' + (r.total / 100).toFixed(2).replace('.', ',');
      if (r.date && r.date !== todayISO()) { const d = H.fromISO(r.date); txt += ' ' + d.getDate() + '/' + (d.getMonth() + 1) + '/' + d.getFullYear(); }
      qi.value = txt; updateDraft();
      st.textContent = '✔️ Revisa que esté bien y pulsa Añadir.';
      setTimeout(() => { st.hidden = true; }, 6000);
    } catch (e) {
      st.textContent = 'No he podido leer el ticket (' + e.message + '). Apúntalo a mano, son dos segundos.';
    }
  });

  /* ---------- Render: inicio ---------- */
  function rowHTML(e, showDate) {
    const c = catById(e.cat);
    const date = H.fromISO(e.date).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
    return '<button class="row" data-id="' + esc(e.id) + '"><span class="em" style="background:' + safeColor(c.color) + '22">' + esc(c.emoji) + '</span>'
      + '<span class="mid"><div class="d">' + esc(e.desc) + '</div><div class="s">' + esc(c.name) + (showDate ? ' · ' + date : '') + (e.src === 'banco' ? ' · 🔔' : '') + '</div></span>'
      + '<span class="amt' + (e.type === 'income' ? ' inc' : '') + '">' + (e.type === 'income' ? '+' : '−') + money(e.amount) + '</span></button>';
  }
  const sortDesc = (a, b) => b.date.localeCompare(a.date) || (b.ts || 0) - (a.ts || 0);

  function renderInicio() {
    const n = new Date(), { y, m } = periodOf(todayISO());
    const spent = spentIn(y, m), inc = incomeIn(y, m);
    const today = S.expenses.filter(e => e.type !== 'income' && e.date === todayISO()).reduce((s, e) => s + e.amount, 0);
    $('#heroAmount').textContent = money(spent);
    const daysLeft = H.daysBetween(todayISO(), periodRange(y, m).endISO) + 1;
    const mb = S.settings.monthlyBudget;
    let meta = 'Hoy ' + money(today);
    if (inc) meta += ' · Ingresos ' + money0(inc) + ' · Ahorro ' + money0(inc - spent);
    if (mb) {
      const left = mb - spent;
      meta += left >= 0 ? ' · Te quedan ' + money0(left) + ' (' + money0(left / daysLeft) + '/día)' : ' · Te has pasado ' + money0(-left);
      const meter = $('#heroMeter'); meter.hidden = false;
      const r = spent / mb; meter.className = 'meter' + (r >= 1 ? ' over' : r >= 0.8 ? ' warn' : '');
      meter.firstElementChild.style.width = Math.min(100, r * 100) + '%';
    } else $('#heroMeter').hidden = true;
    $('#heroMeta').textContent = meta;
    $('#topSub').textContent = new Date().toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' });

    // alertas de presupuesto
    const al = [];
    for (const [cat, lim] of Object.entries(S.budgets)) {
      if (!lim) continue;
      const s = spentIn(y, m, cat), r = s / lim, c = catById(cat);
      if (r >= 1) al.push('<div class="alert over">🚨 ' + esc(c.emoji + ' ' + c.name) + ': ' + money0(s) + ' de ' + money0(lim) + '. Te has pasado ' + money0(s - lim) + '.</div>');
      else if (r >= 0.8) al.push('<div class="alert">⚠️ ' + esc(c.emoji + ' ' + c.name) + ': llevas el ' + Math.round(r * 100) + ' % (' + money0(lim - s) + ' disponibles)</div>');
    }
    if (S.inbox.length) al.unshift('<button class="alert inbox" id="inboxBtn">📥 ' + S.inbox.length + (S.inbox.length === 1 ? ' movimiento del banco' : ' movimientos del banco') + ' por revisar <b>Revisar ›</b></button>');
    $('#alerts').innerHTML = al.join('');
    const ib = $('#inboxBtn'); if (ib) ib.onclick = inboxSheet;

    // atajos
    const sugg = H.buildSuggestions(S.expenses, new Date(), 6);
    $('#shortcuts').innerHTML = sugg.length ? sugg.map(s => {
      const c = catById(s.cat);
      return '<button class="shortcut" data-k="' + esc(s.key) + '"><span class="em">' + esc(c.emoji) + '</span><div><div class="t">' + esc(s.desc) + '</div><div class="a">' + money(s.amount) + '</div></div></button>';
    }).join('') : '<div class="empty">Aquí aparecerán los gastos que repites (el café, el súper, la gasolina…) con su importe habitual, ordenados según la hora y el día. Un toque y apuntado.</div>';
    $('#shortcuts').onclick = ev => {
      const b = ev.target.closest('.shortcut'); if (!b) return;
      const s = sugg.find(x => x.key === b.dataset.k);
      addExpense({ amount: s.amount, desc: s.desc, cat: s.cat, date: todayISO() });
    };
    $('#shortcuts').oncontextmenu = ev => {
      const b = ev.target.closest('.shortcut'); if (!b) return;
      ev.preventDefault();
      const s = sugg.find(x => x.key === b.dataset.k);
      qi.value = s.desc + ' '; draftCatManual = s.cat; updateDraft(); qi.focus();
    };

    const recent = [...S.expenses].sort(sortDesc).slice(0, 5);
    $('#recentList').innerHTML = recent.length ? recent.map(e => rowHTML(e, true)).join('') : '<div class="empty" style="padding:12px">Aún no hay movimientos. Escribe arriba algo como <b>café 1,80</b> y pulsa Añadir.</div>';
  }

  /* ---------- Render: movimientos ---------- */
  function renderMovimientos() {
    $$('.month-label').forEach(l => l.textContent = monthName(viewMonth.y, viewMonth.m));
    const q = H.normalize($('#search').value);
    const items = S.expenses.filter(e => inMonth(e, viewMonth.y, viewMonth.m) && (!q || H.normalize(e.desc + ' ' + catById(e.cat).name).includes(q))).sort(sortDesc);
    if (!items.length) { $('#movList').innerHTML = '<div class="empty center" style="padding:30px">Nada por aquí este mes.</div>'; return; }
    const byDay = new Map();
    items.forEach(e => { if (!byDay.has(e.date)) byDay.set(e.date, []); byDay.get(e.date).push(e); });
    let html = '';
    for (const [d, list] of byDay) {
      const tot = list.filter(e => e.type !== 'income').reduce((s, e) => s + e.amount, 0);
      const label = d === todayISO() ? 'Hoy' : H.fromISO(d).toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' });
      html += '<div class="day-head"><span style="text-transform:capitalize">' + label + '</span><span>' + (tot ? '−' + money(tot) : '') + '</span></div><div class="card list">' + list.map(e => rowHTML(e)).join('') + '</div>';
    }
    $('#movList').innerHTML = html;
  }
  $('#search').addEventListener('input', renderMovimientos);

  /* ---------- Editar movimiento ---------- */
  document.addEventListener('click', ev => {
    const r = ev.target.closest('.row[data-id]'); if (!r) return;
    const e = S.expenses.find(x => x.id === r.dataset.id); if (e) editSheet(e);
  });
  function editSheet(e) {
    let type = e.type, cat = e.cat;
    openSheet('<h3>Editar movimiento</h3>'
      + '<div class="seg"><button data-t="expense">Gasto</button><button data-t="income">Ingreso</button></div>'
      + '<label class="field"><span>Importe (€)</span><input id="edAmount" inputmode="decimal" value="' + (e.amount / 100).toFixed(2).replace('.', ',') + '"></label>'
      + '<label class="field"><span>Concepto</span><input id="edDesc" value="' + esc(e.desc) + '"></label>'
      + '<label class="field"><span>Fecha</span><input id="edDate" type="date" value="' + e.date + '"></label>'
      + '<div class="field" id="edCatWrap"><span>Categoría</span><div class="cat-picker" id="edCats"></div></div>'
      + '<div class="actions"><button class="btn-ghost danger" id="edDel">Borrar</button><button class="btn-primary" id="edSave">Guardar</button></div>', sh => {
      const paint = () => {
        $$('.seg button', sh).forEach(b => b.classList.toggle('on', b.dataset.t === type));
        $('#edCatWrap', sh).hidden = type === 'income';
        $('#edCats', sh).innerHTML = cats().map(c => '<button class="chip' + (cat === c.id ? ' sel' : '') + '" data-cat="' + esc(c.id) + '">' + esc(c.emoji + ' ' + c.name) + '</button>').join('');
      };
      paint();
      $('.seg', sh).onclick = ev => { const b = ev.target.closest('button'); if (b) { type = b.dataset.t; if (type === 'expense' && cat === 'ingreso') cat = H.guessCategory($('#edDesc', sh).value, S.learned, cats()); paint(); } };
      $('#edCats', sh).onclick = ev => { const b = ev.target.closest('[data-cat]'); if (b) { cat = b.dataset.cat; paint(); } };
      $('#edSave', sh).onclick = () => {
        const amt = H.parseAmountStr($('#edAmount', sh).value);
        if (!amt || amt <= 0) { $('#edAmount', sh).focus(); return; }
        if (amt >= MAX_CENTS) return $('#edAmount', sh).focus();
        e.amount = amt; e.desc = safeText($('#edDesc', sh).value, 80) || catById(cat).name; e.date = DATE_RE.test($('#edDate', sh).value) ? $('#edDate', sh).value : e.date;
        e.type = type; e.cat = type === 'income' ? 'ingreso' : cat;
        if (type !== 'income') S.learned[H.normalize(e.desc)] = e.cat;
        save(); closeSheet(); renderAll(); toast('Guardado');
      };
      $('#edDel', sh).onclick = () => {
        const idx = S.expenses.indexOf(e); S.expenses.splice(idx, 1); save(); closeSheet(); renderAll();
        toast('Movimiento borrado', 'Deshacer', () => { S.expenses.splice(idx, 0, e); save(); renderAll(); });
      };
    });
  }

  /* ---------- Render: análisis ---------- */
  function renderAnalisis() {
    $$('.month-label').forEach(l => l.textContent = monthName(viewMonth.y, viewMonth.m));
    const { y, m } = viewMonth;
    const spent = spentIn(y, m), inc = incomeIn(y, m);
    const { y: py, m: pm } = shiftPeriod(y, m, -1);
    const prev = spentIn(py, pm);
    const cur = periodOf(todayISO());
    const isCurrent = y === cur.y && m === cur.m;
    const range = periodRange(y, m), prange = periodRange(py, pm);
    const dayN = isCurrent ? H.daysBetween(range.startISO, todayISO()) : range.days - 1;
    let delta = '';
    if (prev) {
      // comparar a misma altura de mes si es el mes en curso
      const prevSame = isCurrent ? S.expenses.filter(e => e.type !== 'income' && inMonth(e, py, pm) && H.daysBetween(prange.startISO, e.date) <= dayN).reduce((s, e) => s + e.amount, 0) : prev;
      if (prevSame) {
        const p = Math.round((spent - prevSame) / prevSame * 100);
        delta = '<div class="delta ' + (p > 0 ? 'up' : 'down') + '">' + (p > 0 ? '▲ ' : '▼ ') + Math.abs(p) + ' % vs ' + (isCurrent ? 'mismo día del mes pasado' : 'mes anterior') + '</div>';
      }
    }
    $('#summaryCard').innerHTML = '<div class="sum-grid"><div><div class="k">Gastado</div><div class="v">' + money0(spent) + '</div>' + delta + '</div>'
      + '<div><div class="k">' + (inc ? 'Ahorrado' : 'Ingresos') + '</div><div class="v" style="color:var(--income)">' + (inc ? money0(inc - spent) : '—') + '</div>'
      + (inc ? '<div class="delta down">' + Math.round((inc - spent) / inc * 100) + ' % de lo que entra</div>' : '<div class="muted small">Apunta <code>+1500 nómina</code> para ver tu ahorro</div>') + '</div></div>';

    // por categoría
    const byCat = cats().map(c => ({ c, s: spentIn(y, m, c.id), lim: S.budgets[c.id] })).filter(x => x.s || x.lim).sort((a, b) => b.s - a.s);
    const max = Math.max(1, ...byCat.map(x => Math.max(x.s, x.lim || 0)));
    $('#catBars').innerHTML = byCat.length ? byCat.map(({ c, s, lim }) => {
      let limTxt = '';
      if (lim) { const r = s / lim; limTxt = '<div class="bar-limit ' + (r >= 1 ? 'over' : r >= 0.8 ? 'warn' : '') + '">Límite ' + money0(lim) + ' · ' + (r >= 1 ? 'te has pasado ' + money0(s - lim) : 'quedan ' + money0(lim - s)) + '</div>'; }
      return '<button class="bar-row" data-cat="' + esc(c.id) + '"><div class="bar-top"><span>' + esc(c.emoji + ' ' + c.name) + '</span><b>' + money(s) + (spent ? ' <span class="muted">' + Math.round(s / spent * 100) + ' %</span>' : '') + '</b></div>'
        + '<div class="bar"><i style="width:' + (s / max * 100) + '%;background:' + safeColor(c.color) + '"></i></div>' + limTxt + '</button>';
    }).join('') + '<button class="link" id="addLimit" style="margin-top:8px">+ Poner límite a otra categoría</button>' : '<div class="empty">Sin gastos este mes.</div>';
    $('#catBars').onclick = ev => {
      if (ev.target.id === 'addLimit') return pickCatForLimit();
      const b = ev.target.closest('.bar-row'); if (b) categoryDetailSheet(b.dataset.cat);
    };

    renderAllocation(y, m, spent, inc);
    renderBalance(y, m);
    renderPace(y, m, range, prange, isCurrent, dayN, spent);

    // suscripciones y fijos
    const rec = H.detectRecurring(S.expenses, new Date());
    const recActive = rec.filter(r => r.active);
    const yearlyFixed = recActive.reduce((s, r) => s + r.yearly, 0);
    $('#subsList').innerHTML = recActive.length ? recActive.map(r => saveItemHTML(r.key, esc(catById(r.cat).emoji) + ' ' + esc(r.desc) + (r.probable ? '<span class="tag">¿mensual?</span>' : ''),
      money(r.amount) + ' ' + r.period + ' · <b>' + money0(r.yearly) + '/año</b> · próximo ~' + H.fromISO(r.next).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' }), r.yearly)).join('')
      + '<div class="savings-total">Tus pagos fijos suman <b>' + money0(yearlyFixed) + '</b> al año (' + money0(yearlyFixed / 12) + '/mes).</div>'
      : '<div class="empty">Cuando un pago se repita (Netflix, gimnasio, seguro…) lo detectaré solo y te diré cuánto te cuesta al año.</div>';

    // hábitos / dónde ahorrar
    const hab = H.detectHabits(S.expenses, new Date(), rec.map(r => r.key), essentialIds());
    $('#habitsList').innerHTML = hab.length ? hab.slice(0, 8).map(h => saveItemHTML(h.key, esc(catById(h.cat).emoji) + ' ' + esc(h.desc) + (h.ant ? '<span class="tag">hormiga</span>' : ''),
      h.perMonth.toString().replace('.', ',') + ' veces/mes · media ' + money(h.avg) + ' · <b>' + money0(h.yearly) + '/año</b>', h.yearly)).join('')
      : '<div class="empty">Con unas semanas de datos te enseñaré tus hábitos de gasto (cafés, comida a domicilio, caprichos…) y cuánto suman al año, para que decidas cuáles recortar.</div>';

    // total de ahorro potencial
    const tot = cutSavingsYearly();
    if (tot) {
      const g = S.goals.find(g => goalSaved(g) < g.target);
      $('#habitsList').insertAdjacentHTML('beforeend', '<div class="savings-total">Si recortas lo marcado ahorrarías <b>' + money0(tot) + ' al año</b> (' + money0(tot / 12) + ' al mes).'
        + (g ? ' <button class="link" data-goto="metas">Llévalo a «' + esc(g.name) + '» →</button>' : '') + '</div>');
    }
  }
  /* ---------- Gráficos (SVG propio, sin librerías) ---------- */
  const pct = (a, b) => b ? Math.round(a / b * 100) : 0;
  const MONTH_INI = ['E', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'];
  const monthShort = (y, m) => new Date(y, m, 1).toLocaleDateString('es-ES', { month: 'short' }).replace('.', '');

  // ¿A dónde va tu sueldo? + regla 50/30/20
  function renderAllocation(y, m, spent, inc) {
    const box = $('#allocCard');
    if (!inc) {
      box.innerHTML = '<div class="empty">Apunta lo que cobras (por ejemplo <code>+1850 nómina</code>) o importa el extracto del banco, y verás qué parte de tu sueldo se va en cada cosa y cuánto ahorras.</div>';
      return;
    }
    const byCat = cats().map(c => ({ c, s: spentIn(y, m, c.id) })).filter(x => x.s > 0).sort((a, b) => b.s - a.s);
    const saving = inc - spent, base = Math.max(inc, spent);
    // barra apilada: cada categoría en proporción a lo ingresado; el hueco verde es el ahorro
    const segs = byCat.map(({ c, s }) => '<i style="width:' + (s / base * 100) + '%;background:' + safeColor(c.color) + '" title="' + esc(c.name) + '"></i>').join('')
      + (saving > 0 ? '<i class="seg-save" style="width:' + (saving / base * 100) + '%"></i>' : '');
    const legend = byCat.map(({ c, s }) => '<div class="leg"><span class="dot" style="background:' + safeColor(c.color) + '"></span><span class="leg-n">' + esc(c.emoji + ' ' + c.name) + '</span><b>' + pct(s, inc) + ' %</b><span class="muted">' + money0(s) + '</span></div>').join('')
      + '<div class="leg"><span class="dot" style="background:var(--income)"></span><span class="leg-n">💰 Ahorro</span><b class="' + (saving < 0 ? 'over-txt' : 'ok-txt') + '">' + pct(saving, inc) + ' %</b><span class="muted">' + money0(saving) + '</span></div>';

    // 50/30/20: necesidades = categorías básicas; caprichos = el resto
    const ess = new Set(essentialIds());
    const needs = byCat.filter(x => ess.has(x.c.id)).reduce((t, x) => t + x.s, 0);
    const wants = spent - needs;
    const rule = [
      { k: 'Necesidades', sub: 'casa, súper, facturas…', v: pct(needs, inc), goal: 50, ok: v => v <= 50 },
      { k: 'Caprichos', sub: 'ocio, comer fuera, compras…', v: pct(wants, inc), goal: 30, ok: v => v <= 30 },
      { k: 'Ahorro', sub: 'lo que no gastas', v: pct(saving, inc), goal: 20, ok: v => v >= 20 },
    ];
    const rows = rule.map(r => '<div class="rule-row"><div class="rule-top"><span><b>' + r.k + '</b> <span class="muted small">' + r.sub + '</span></span><b class="' + (r.ok(r.v) ? 'ok-txt' : 'warn-txt') + '">' + r.v + ' %</b></div>'
      + '<div class="bar rule-bar"><i style="width:' + Math.max(0, Math.min(100, r.v)) + '%;background:' + (r.ok(r.v) ? 'var(--income)' : 'var(--warn)') + '"></i><s style="left:' + r.goal + '%"></s></div>'
      + '<div class="muted small">Objetivo: ' + (r.k === 'Ahorro' ? 'al menos ' : 'como mucho ') + r.goal + ' %</div></div>').join('');
    const savePct = pct(saving, inc);
    let verdict;
    if (saving < 0) verdict = '🚨 Este mes has gastado <b>' + money0(-saving) + ' más</b> de lo que has ingresado.';
    else if (savePct >= 20 && rule[0].ok(rule[0].v) && rule[1].ok(rule[1].v)) verdict = '🎉 Cumples la regla 50/30/20 este mes. ¡Bien hecho!';
    else if (savePct >= 20) verdict = '👍 Ahorras un ' + savePct + ' %, por encima del 20 % recomendado.';
    else verdict = 'Ahorras un ' + savePct + ' %. Para llegar al 20 % te faltan <b>' + money0(inc * 0.2 - saving) + '</b>' + (wants > inc * 0.3 ? ', y los caprichos son lo más fácil de recortar.' : '.');
    box.innerHTML = '<div class="alloc-head"><span>Has ingresado <b>' + money0(inc) + '</b></span><span class="muted small">' + pct(spent, inc) + ' % gastado</span></div>'
      + '<div class="stack">' + segs + '</div>' + (spent > inc ? '<div class="muted small over-txt" style="margin-top:4px">La barra pasa de lo ingresado: te has pasado ' + money0(spent - inc) + '</div>' : '')
      + '<div class="legend">' + legend + '</div>'
      + '<div class="rule"><div class="rule-title">Regla 50 / 30 / 20</div>' + rows + '<div class="verdict">' + verdict + '</div>'
      + '<div class="muted small">Cuentan como necesidades las categorías marcadas como «gasto básico». Puedes cambiarlas en Ajustes → Categorías.</div></div>';
  }

  // Balance de los últimos 12 meses
  function renderBalance(y, m) {
    const box = $('#balanceCard');
    const months = Array.from({ length: 12 }, (_, i) => shiftPeriod(y, m, i - 11)).map(p => ({ ...p, inc: incomeIn(p.y, p.m), exp: spentIn(p.y, p.m) }));
    const firstData = months.findIndex(p => p.inc || p.exp);
    if (firstData < 0) { box.innerHTML = '<div class="empty">Aquí verás mes a mes lo que entra, lo que sale y lo que ahorras.</div>'; return; }
    const shown = months.slice(Math.min(firstData, 6)); // al menos 6 meses en pantalla
    const W = 320, Hh = 130, top = 16, n = shown.length, gw = W / n, bw = Math.min(11, gw / 2 - 2);
    const max = Math.max(1, ...shown.map(p => Math.max(p.inc, p.exp)));
    const yv = v => top + (Hh - top) * (1 - v / max);
    let svg = '<svg class="chart" viewBox="0 0 ' + W + ' ' + (Hh + 20) + '" role="img" aria-label="Ingresos y gastos por mes">';
    svg += '<line class="axis" x1="0" x2="' + W + '" y1="' + Hh + '" y2="' + Hh + '"/>';
    shown.forEach((p, i) => {
      const cx = gw * i + gw / 2, sel = p.y === y && p.m === m;
      if (sel) svg += '<rect class="sel-bg" x="' + (gw * i + 1) + '" y="0" width="' + (gw - 2) + '" height="' + (Hh + 18) + '" rx="6"/>';
      svg += '<rect class="b-inc" x="' + (cx - bw - 1) + '" y="' + yv(p.inc) + '" width="' + bw + '" height="' + (Hh - yv(p.inc)) + '" rx="2"/>';
      svg += '<rect class="b-exp" x="' + (cx + 1) + '" y="' + yv(p.exp) + '" width="' + bw + '" height="' + (Hh - yv(p.exp)) + '" rx="2"/>';
      if (p.inc) { const r = pct(p.inc - p.exp, p.inc); svg += '<text class="rate ' + (r < 0 ? 'neg' : r >= 20 ? 'good' : '') + '" x="' + cx + '" y="' + Math.max(10, Math.min(yv(p.inc), yv(p.exp)) - 4) + '" text-anchor="middle">' + r + '%</text>'; }
      svg += '<text class="lbl' + (sel ? ' sel' : '') + '" x="' + cx + '" y="' + (Hh + 14) + '" text-anchor="middle">' + (n > 8 ? MONTH_INI[p.m] : monthShort(p.y, p.m)) + '</text>';
      svg += '<rect class="hit" data-per="' + p.y + '-' + p.m + '" x="' + (gw * i) + '" y="0" width="' + gw + '" height="' + (Hh + 20) + '"><title>' + esc(monthName(p.y, p.m)) + ': entra ' + money0(p.inc) + ', sale ' + money0(p.exp) + '</title></rect>';
    });
    svg += '</svg>';
    const tInc = shown.reduce((t, p) => t + p.inc, 0), tExp = shown.reduce((t, p) => t + p.exp, 0);
    box.innerHTML = '<div class="chart-legend"><span><i class="sw b-inc"></i>Ingresos</span><span><i class="sw b-exp"></i>Gastos</span><span class="muted small">% = lo que ahorras</span></div>' + svg
      + '<div class="muted small">En ' + n + ' meses: entran ' + money0(tInc) + ', salen ' + money0(tExp) + ' · ' + (tInc ? 'ahorras el <b>' + pct(tInc - tExp, tInc) + ' %</b> (' + money0(tInc - tExp) + ')' : 'apunta tus ingresos para ver el ahorro') + '. Toca un mes para verlo.</div>';
    box.querySelector('svg').onclick = ev => {
      const h = ev.target.closest('[data-per]'); if (!h) return;
      const [py, pm] = h.dataset.per.split('-').map(Number); viewMonth = { y: py, m: pm }; renderAll(); window.scrollTo(0, 0);
    };
  }

  // Ritmo del mes: gasto acumulado vs mes anterior y presupuesto
  function renderPace(y, m, range, prange, isCurrent, dayN, spent) {
    const box = $('#paceCard');
    const cum = (r, until) => { const arr = new Array(r.days).fill(0); S.expenses.forEach(e => { if (e.type === 'income' || e.date < r.startISO || e.date > r.endISO) return; const i = H.daysBetween(r.startISO, e.date); if (i >= 0 && i < r.days) arr[i] += e.amount; }); let t = 0; return arr.map((v, i) => (t += v, i <= until ? t : null)); };
    const curr = cum(range, dayN), prev = cum(prange, prange.days);
    const budget = S.settings.monthlyBudget || 0;
    const days = range.days, W = 320, Hh = 130, top = 8;
    const max = Math.max(1, ...curr.filter(v => v != null), ...prev, budget);
    const xv = i => (i / (days - 1)) * (W - 6) + 3, yv = v => top + (Hh - top) * (1 - v / max);
    const path = arr => arr.map((v, i) => v == null ? '' : (i && arr[i - 1] != null ? 'L' : 'M') + xv(Math.min(i, days - 1)).toFixed(1) + ' ' + yv(v).toFixed(1)).join(' ');
    let svg = '<svg class="chart" viewBox="0 0 ' + W + ' ' + (Hh + 18) + '" role="img" aria-label="Ritmo de gasto del mes">';
    svg += '<line class="axis" x1="0" x2="' + W + '" y1="' + Hh + '" y2="' + Hh + '"/>';
    if (budget) svg += '<line class="budget" x1="0" x2="' + W + '" y1="' + yv(budget) + '" y2="' + yv(budget) + '"/><line class="ideal" x1="' + xv(0) + '" y1="' + yv(0) + '" x2="' + xv(days - 1) + '" y2="' + yv(budget) + '"/>';
    svg += '<path class="l-prev" d="' + path(prev.slice(0, days)) + '"/><path class="l-cur" d="' + path(curr) + '"/>';
    if (isCurrent && curr[dayN] != null) svg += '<circle class="pt" cx="' + xv(dayN) + '" cy="' + yv(curr[dayN]) + '" r="4"/>';
    const lbl = i => { const d = new Date(range.start); d.setDate(d.getDate() + i); return d.getDate(); };
    [0, Math.round((days - 1) / 2), days - 1].forEach(i => { svg += '<text class="lbl" x="' + Math.max(8, Math.min(W - 8, xv(i))) + '" y="' + (Hh + 14) + '" text-anchor="middle">' + lbl(i) + '</text>'; });
    svg += '</svg>';
    const prevAtDay = prev[Math.min(dayN, prev.length - 1)] || 0;
    let txt;
    if (isCurrent) {
      // Proyección: los pagos fijos (alquiler, suscripciones) no se reparten por días;
      // solo el gasto variable se extrapola. Se suman los fijos que aún faltan por cobrar este mes.
      const rec = H.detectRecurring(S.expenses, new Date()).filter(r => r.active);
      const recKeys = new Set(rec.map(r => r.key));
      const fixedSpent = S.expenses.filter(e => e.type !== 'income' && inMonth(e, y, m) && recKeys.has(H.normalize(e.desc))).reduce((t, e) => t + e.amount, 0);
      const pendingFixed = rec.filter(r => r.next > todayISO() && r.next <= range.endISO).reduce((t, r) => t + r.amount, 0);
      const variable = spent - fixedSpent;
      const proj = Math.round(spent + variable / (dayN + 1) * (days - dayN - 1) + pendingFixed);
      txt = 'Llevas <b>' + money0(spent) + '</b>' + (prevAtDay ? '; el mes pasado a estas alturas llevabas ' + money0(prevAtDay) + ' (' + (spent > prevAtDay ? '<span class="over-txt">+' : '<span class="ok-txt">−') + money0(Math.abs(spent - prevAtDay)) + '</span>)' : '') + '. '
        + 'A este ritmo acabarás en unos <b>' + money0(proj) + '</b>' + (budget ? (proj > budget ? ', <span class="over-txt">' + money0(proj - budget) + ' por encima</span> de tu presupuesto.' : ', <span class="ok-txt">dentro</span> de tu presupuesto.') : '.');
    } else txt = 'Gastaste ' + money0(spent) + (prev[prev.length - 1] ? ' frente a ' + money0(prev[prev.length - 1]) + ' el mes anterior' : '') + '.';
    box.innerHTML = '<div class="chart-legend"><span><i class="sw l-cur"></i>Este mes</span><span><i class="sw l-prev"></i>Mes anterior</span>' + (budget ? '<span><i class="sw budget"></i>Presupuesto</span>' : '') + '</div>' + svg + '<div class="muted small">' + txt + '</div>'
      + (budget ? '' : '<div class="muted small">Pon un presupuesto mensual en Ajustes para ver si vas por encima del ritmo.</div>');
  }

  // Detalle de una categoría: evolución de 6 meses y movimientos
  function categoryDetailSheet(catId) {
    const c = catById(catId), { y, m } = viewMonth;
    const ps = Array.from({ length: 6 }, (_, i) => shiftPeriod(y, m, i - 5)).map(p => ({ ...p, v: spentIn(p.y, p.m, catId) }));
    const max = Math.max(1, ...ps.map(p => p.v)), avg = ps.slice(0, 5).reduce((t, p) => t + p.v, 0) / 5;
    const W = 300, Hh = 90, gw = W / 6;
    let svg = '<svg class="chart" viewBox="0 0 ' + W + ' ' + (Hh + 18) + '">';
    ps.forEach((p, i) => {
      const h = p.v / max * (Hh - 14), x = gw * i + gw * 0.2;
      svg += '<rect x="' + x + '" y="' + (Hh - h) + '" width="' + gw * 0.6 + '" height="' + Math.max(p.v ? 2 : 0, h) + '" rx="3" style="fill:' + safeColor(c.color) + ';opacity:' + (i === 5 ? 1 : .5) + '"/>';
      if (p.v) svg += '<text class="rate" x="' + (x + gw * 0.3) + '" y="' + (Hh - h - 3) + '" text-anchor="middle">' + Math.round(p.v / 100) + '</text>';
      svg += '<text class="lbl" x="' + (x + gw * 0.3) + '" y="' + (Hh + 14) + '" text-anchor="middle">' + monthShort(p.y, p.m) + '</text>';
    });
    if (avg) svg += '<line class="budget" x1="0" x2="' + W + '" y1="' + (Hh - avg / max * (Hh - 14)) + '" y2="' + (Hh - avg / max * (Hh - 14)) + '"/>';
    svg += '</svg>';
    const items = S.expenses.filter(e => e.cat === catId && inMonth(e, y, m)).sort(sortDesc);
    const inc = incomeIn(y, m), now = ps[5].v, lim = S.budgets[catId];
    const diff = avg ? Math.round((now - avg) / avg * 100) : 0;
    openSheet('<h3>' + esc(c.emoji + ' ' + c.name) + '</h3>'
      + '<div class="sum-grid" style="margin-bottom:8px"><div><div class="k">Este mes</div><div class="v">' + money0(now) + '</div>' + (avg ? '<div class="delta ' + (diff > 0 ? 'up' : 'down') + '">' + (diff > 0 ? '▲ ' : '▼ ') + Math.abs(diff) + ' % vs tu media</div>' : '') + '</div>'
      + '<div><div class="k">' + (inc ? 'De lo ingresado' : 'Media (5 meses)') + '</div><div class="v">' + (inc ? pct(now, inc) + ' %' : money0(avg)) + '</div>' + (inc && avg ? '<div class="muted small">media ' + money0(avg) + '/mes</div>' : '') + '</div></div>'
      + svg + '<div class="muted small" style="margin-bottom:10px">Últimos 6 meses (€). La línea es tu media.</div>'
      + (items.length ? '<div class="list sheet-list">' + items.slice(0, 50).map(e => rowHTML(e, true)).join('') + '</div>' : '<div class="empty">Sin movimientos este mes.</div>')
      + '<div class="actions" style="margin-top:12px"><button class="btn-ghost" id="cdClose">Cerrar</button><button class="btn-primary" id="cdLimit">' + (lim ? 'Límite: ' + money0(lim) + ' · cambiar' : 'Poner límite mensual') + '</button></div>', sh => {
      $('#cdClose', sh).onclick = closeSheet;
      $('#cdLimit', sh).onclick = () => limitSheet(catId);
    });
  }

  // Día de cobro
  function paydaySheet() {
    const cur = payday();
    openSheet('<h3>¿Qué día cobras la nómina?</h3><p class="muted">Así cada mes de la app va de nómina a nómina y los porcentajes de ahorro salen bien. Por ejemplo, si cobras el 28, «noviembre» será del 28 de octubre al 27 de noviembre.</p>'
      + '<label class="field"><span>Día del mes (1 = mes natural)</span><input id="pdIn" type="number" inputmode="numeric" min="1" max="28" value="' + cur + '"></label>'
      + '<p class="muted small">Si cobras el 29, 30 o 31, pon 28.</p>'
      + '<div class="actions"><button class="btn-ghost" id="pdNo">Cancelar</button><button class="btn-primary" id="pdOk">Guardar</button></div>', sh => {
      $('#pdNo', sh).onclick = closeSheet;
      $('#pdOk', sh).onclick = () => {
        const v = parseInt($('#pdIn', sh).value, 10);
        if (!(v >= 1 && v <= 28)) return $('#pdIn', sh).focus();
        S.settings.payday = v; periodCache.clear(); viewMonth = periodOf(todayISO()); save(); closeSheet(); renderAll();
        toast(v === 1 ? 'Meses naturales' : 'Tus meses empiezan el día ' + v);
      };
    });
  }
  $('#paydayBtn').onclick = paydaySheet;

  function saveItemHTML(key, title, sub) {
    const on = S.decisions[key] === 'cut';
    if (/^(alquiler|hipoteca|comunidad|ibi)\b/.test(key)) return '<div class="save-item"><div class="mid"><div class="d">' + title + '</div><div class="s">' + sub + '</div></div></div>';
    return '<div class="save-item"><div class="mid"><div class="d">' + title + '</div><div class="s">' + sub + '</div></div><button class="toggle' + (on ? ' on' : '') + '" data-cut="' + esc(key) + '">' + (on ? '✓ Recortar' : 'Recortar') + '</button></div>';
  }
  document.addEventListener('click', ev => {
    const b = ev.target.closest('[data-cut]'); if (!b) return;
    const k = b.dataset.cut;
    if (S.decisions[k] === 'cut') delete S.decisions[k]; else S.decisions[k] = 'cut';
    save(); renderAnalisis();
  });

  function limitSheet(catId) {
    const c = catById(catId), cur = S.budgets[catId];
    const avg = (() => { let t = 0; for (let i = 1; i <= 3; i++) { const p = shiftPeriod(viewMonth.y, viewMonth.m, -i); t += spentIn(p.y, p.m, catId); } return t / 3; })();
    openSheet('<h3>' + esc(c.emoji) + ' Límite mensual de ' + esc(c.name.toLowerCase()) + '</h3>'
      + (avg ? '<p class="muted">Los últimos 3 meses has gastado de media ' + money0(avg) + '.</p>' : '')
      + '<label class="field"><span>Límite (€ al mes)</span><input id="limIn" inputmode="decimal" value="' + (cur ? cur / 100 : '') + '" placeholder="' + (avg ? Math.round(avg / 100 * 0.85) : '100') + '"></label>'
      + '<div class="actions">' + (cur ? '<button class="btn-ghost danger" id="limDel">Quitar</button>' : '') + '<button class="btn-primary" id="limSave">Guardar</button></div>', sh => {
      const inp = $('#limIn', sh); setTimeout(() => inp.focus(), 50);
      $('#limSave', sh).onclick = () => { const v = H.parseAmountStr(inp.value || inp.placeholder); if (v > 0) S.budgets[catId] = v; save(); closeSheet(); renderAll(); };
      const del = $('#limDel', sh); if (del) del.onclick = () => { delete S.budgets[catId]; save(); closeSheet(); renderAll(); };
    });
  }
  function pickCatForLimit() {
    openSheet('<h3>¿A qué categoría?</h3><div class="cat-picker">' + cats().map(c => '<button class="chip" data-cat="' + esc(c.id) + '">' + esc(c.emoji + ' ' + c.name) + '</button>').join('') + '</div>', sh => {
      $('.cat-picker', sh).onclick = ev => { const b = ev.target.closest('[data-cat]'); if (b) limitSheet(b.dataset.cat); };
    });
  }

  /* ---------- Ajustes ---------- */
  function renderAjustes() {
    $('#nDaily').checked = !!S.notif.daily; $('#nHour').value = String(S.notif.hour); $('#nSubs').checked = !!S.notif.subs;
    $('#catsCount').textContent = cats().length + ' categorías';
    notifStatus();
    renderBank();
    $('#setMonthly').textContent = S.settings.monthlyBudget ? money0(S.settings.monthlyBudget) : 'Fijar';
    $('#paydayBtn').textContent = payday() > 1 ? 'Día ' + payday() : 'Mes natural';
    $('#storageInfo').textContent = memoryOnly
      ? '⚠️ Este navegador no permite guardar datos: lo que apuntes se perderá al cerrar. Instala la app desde su enlace.'
      : S.expenses.length + ' movimientos guardados en este dispositivo.';
  }
  $('#setMonthly').onclick = () => {
    const cur = S.settings.monthlyBudget;
    openSheet('<h3>Presupuesto mensual</h3><p class="muted">Lo máximo que quieres gastar al mes. En Inicio verás cuánto te queda por día.</p>'
      + '<label class="field"><span>€ al mes</span><input id="mbIn" inputmode="decimal" value="' + (cur ? cur / 100 : '') + '" placeholder="1200"></label>'
      + '<div class="actions">' + (cur ? '<button class="btn-ghost danger" id="mbDel">Quitar</button>' : '') + '<button class="btn-primary" id="mbSave">Guardar</button></div>', sh => {
      const inp = $('#mbIn', sh); setTimeout(() => inp.focus(), 50);
      $('#mbSave', sh).onclick = () => { const v = H.parseAmountStr(inp.value); S.settings.monthlyBudget = v > 0 ? v : null; save(); closeSheet(); renderAll(); };
      const del = $('#mbDel', sh); if (del) del.onclick = () => { S.settings.monthlyBudget = null; save(); closeSheet(); renderAll(); };
    });
  };
  $('#exportBtn').onclick = () => {
    const json = JSON.stringify(S);
    if (NATIVE) {
      // Se guarda como archivo y se abre el menú de compartir del sistema (Drive, correo…).
      // No se usa el portapapeles: otras apps podrían leerlo.
      (async () => {
        try {
          const FS = Cap.registerPlugin('Filesystem'), SH = Cap.registerPlugin('Share');
          const name = 'export/calderilla-copia-' + todayISO() + '.json';
          const r = await FS.writeFile({ path: name, data: json, directory: 'CACHE', encoding: 'utf8', recursive: true });
          await SH.share({ title: 'Copia de seguridad de Calderilla', files: [r.uri], dialogTitle: 'Guardar la copia en…' });
        } catch (e) { if (!/cancel/i.test(String(e && e.message))) toast('No he podido exportar la copia'); }
      })();
      return;
    }
    try {
      const a = document.createElement('a');
      a.href = URL.createObjectURL(new Blob([json], { type: 'application/json' }));
      a.download = 'calderilla-copia-' + todayISO() + '.json';
      document.body.appendChild(a); a.click(); a.remove();
      toast('Copia descargada');
    } catch (e) {}
  };
  $('#importInput').addEventListener('change', async ev => {
    const f = ev.target.files[0]; ev.target.value = ''; if (!f) return;
    if (f.size > 20 * 1024 * 1024) return toast('El archivo es demasiado grande para ser una copia de Calderilla');
    try {
      const data = JSON.parse(await f.text());
      if (!Array.isArray(data.expenses)) throw new Error('formato');
      const prev = S; S = upgrade(data); save(); renderAll();
      toast('Importados ' + S.expenses.length + ' movimientos', 'Deshacer', () => { S = prev; save(); renderAll(); }, 7000);
    } catch (e) { toast('Ese archivo no es una copia de Calderilla'); }
  });
  $('#wipeBtn').onclick = () => {
    openSheet('<h3>¿Borrar todos los datos?</h3><p class="muted">Se eliminarán ' + S.expenses.length + ' movimientos, límites y lo aprendido. Exporta una copia antes si la quieres.</p><div class="actions"><button class="btn-ghost" id="wNo">Cancelar</button><button class="btn-primary" style="background:var(--danger)" id="wYes">Borrar todo</button></div>', sh => {
      $('#wNo', sh).onclick = closeSheet;
      $('#wYes', sh).onclick = () => { S = blank(); save(); closeSheet(); renderAll(); toast('Datos borrados'); };
    });
  };
  $('#demoBtn').onclick = () => {
    const prev = S; S = blank(); S.notif = prev.notif; S.settings.monthlyBudget = 140000; S.budgets = { comer: 15000, cafe: 4000 };
    const n = new Date();
    const add = (desc, eur, cat, daysAgo, h, type) => { const d = new Date(n); d.setDate(d.getDate() - daysAgo); d.setHours(h || 12, Math.floor(Math.random() * 60)); S.expenses.push({ id: uid(), desc, amount: Math.round(eur * 100), cat, date: H.toISO(d), ts: +d, type: type || 'expense' }); };
    for (let i = 0; i < 95; i++) {
      const dow = (n.getDay() - i % 7 + 7) % 7;
      if (dow >= 1 && dow <= 5 && Math.random() < 0.8) add('Café', 1.8, 'cafe', i, 9);
      if (i % 7 === 2) add('Mercadona', 38 + Math.round(Math.random() * 30), 'super', i, 19);
      if (i % 9 === 4) add('Glovo', 16 + Math.round(Math.random() * 10), 'comer', i, 21);
      if (i % 12 === 3) add('Gasolina', 55 + Math.round(Math.random() * 10), 'transporte', i, 8);
      if (i % 6 === 1 && Math.random() < 0.6) add('Cervezas', 6 + Math.round(Math.random() * 8), 'cafe', i, 20);
      if (i % 15 === 7) add('Amazon', 12 + Math.round(Math.random() * 40), 'compras', i, 22);
    }
    [3, 33, 63, 93].forEach(d => { add('Netflix', 12.99, 'subs', d, 3); add('Alquiler', 750, 'hogar', d + 1, 10); });
    [10, 40, 70].forEach(d => { add('Gimnasio', 39.9, 'salud', d, 7); add('Spotify', 10.99, 'subs', d, 4); add('Movistar', 45, 'hogar', d, 6); });
    [5, 35, 65, 95].forEach(d => add('Nómina', 1850, 'ingreso', d, 9, 'income'));
    const gd = d => { const x = new Date(n); x.setDate(x.getDate() - d); return H.toISO(x); };
    const dl = new Date(n.getFullYear(), n.getMonth() + 7, 1);
    S.goals = [
      { id: uid(), name: 'Viaje a Japón', emoji: '🗾', target: 250000, deadline: H.toISO(dl).slice(0, 7), created: gd(90), entries: [{ id: uid(), date: gd(85), amount: 30000 }, { id: uid(), date: gd(55), amount: 25000 }, { id: uid(), date: gd(25), amount: 30000 }] },
      { id: uid(), name: 'Colchón de emergencia', emoji: '🛟', target: 300000, deadline: null, created: gd(90), entries: [{ id: uid(), date: gd(80), amount: 50000 }, { id: uid(), date: gd(20), amount: 20000 }] },
    ];
    add('Cine', 9.5, 'ocio', 12, 19); add('Cena cumple', 42, 'comer', 18, 22); add('Farmacia', 8.4, 'salud', 4, 18);
    save(); renderAll();
    toast('Datos de ejemplo cargados', 'Deshacer', () => { S = prev; save(); renderAll(); }, 7000);
    switchTab('analisis');
  };

  /* ---------- Metas de ahorro ---------- */
  const goalSaved = g => g.entries.reduce((s, e) => s + e.amount, 0);
  const monthsUntil = ym => { const [y, m] = ym.split('-').map(Number); const n = new Date(); return (y - n.getFullYear()) * 12 + (m - 1 - n.getMonth()) + (1 - (n.getDate() - 1) / 30); };
  const ymLabel = ym => { const [y, m] = ym.split('-').map(Number); return new Date(y, m - 1, 1).toLocaleDateString('es-ES', { month: 'long', year: 'numeric' }); };

  function goalPace(g) {
    // aportación media mensual de los últimos 90 días (o desde que existe la meta)
    const since = g.created || (g.entries[0] && g.entries[0].date) || todayISO();
    const days = Math.max(30, Math.min(90, H.daysBetween(since, todayISO())));
    const recent = g.entries.filter(e => H.daysBetween(e.date, todayISO()) <= days).reduce((s, e) => s + e.amount, 0);
    return Math.max(0, recent / days * 30);
  }

  function cutSavingsYearly() {
    const rec = H.detectRecurring(S.expenses, new Date()).filter(r => r.active);
    const hab = H.detectHabits(S.expenses, new Date(), rec.map(r => r.key), essentialIds());
    return [...rec, ...hab].filter(x => S.decisions[x.key] === 'cut').reduce((s, x) => s + x.yearly, 0);
  }

  /* "ahorro viaje 50", "aparto 20 colchón", "meta japón 100" */
  function matchGoal(txt, d) {
    const m = String(txt).match(/^\s*(ahorro|ahorrar|ahorra|aparto|apartar|aporto|aportar|meta|hucha)\b\s*(.*)$/i);
    if (!m || !S.goals.length) return null;
    const rest = H.normalize(m[2].replace(/[\d.,€]+/g, ' '));
    const open = S.goals.filter(g => goalSaved(g) < g.target);
    const pool = open.length ? open : S.goals;
    if (!rest) return pool.length === 1 ? pool[0] : pool[0];
    return pool.find(g => H.normalize(g.name).split(' ').some(w => w.length > 2 && rest.split(' ').some(r => r.length > 2 && (w.startsWith(r) || r.startsWith(w))))) || null;
  }

  function contribute(g, amount, note) {
    const before = goalSaved(g);
    const entry = { id: uid(), date: todayISO(), amount };
    g.entries.push(entry); save();
    const after = goalSaved(g);
    if (before < g.target && after >= g.target) toast('🎉 ¡Meta conseguida! ' + esc(g.name), null, null, 6000);
    else toast((amount > 0 ? '🎯 +' : '↩️ ') + money(Math.abs(amount)) + (amount > 0 ? ' a ' : ' retirados de ') + esc(g.name), 'Deshacer', () => { g.entries = g.entries.filter(e => e.id !== entry.id); save(); renderAll(); });
    renderAll();
  }

  function renderMetas() {
    const box = $('#goalsList');
    const totalSaved = S.goals.reduce((s, g) => s + goalSaved(g), 0);
    const cut = cutSavingsYearly();
    let head = '<div class="sum-grid"><div><div class="k">Ahorrado en metas</div><div class="v" style="color:var(--income)">' + money0(totalSaved) + '</div></div>'
      + '<div><div class="k">Metas activas</div><div class="v">' + S.goals.filter(g => goalSaved(g) < g.target).length + '</div></div></div>';
    const firstOpen = S.goals.find(g => goalSaved(g) < g.target);
    if (cut && firstOpen) {
      const rem = firstOpen.target - goalSaved(firstOpen), pace = goalPace(firstOpen);
      const mNow = pace ? rem / pace : null, mCut = rem / (pace + cut / 12);
      head += '<div class="savings-total" style="margin-top:12px">✂️ Lo que marcaste para recortar son <b>' + money0(cut / 12) + '/mes</b>. '
        + (mNow ? 'Aportándolo a «' + esc(firstOpen.name) + '» llegarías <b>' + Math.max(1, Math.round(mNow - mCut)) + ' ' + (Math.round(mNow - mCut) === 1 ? 'mes' : 'meses') + ' antes</b>.' : 'Con eso completarías «' + esc(firstOpen.name) + '» en unos ' + Math.ceil(mCut) + ' meses.') + '</div>';
    }
    $('#goalsHead').innerHTML = head;
    if (!S.goals.length) {
      box.innerHTML = '<div class="card empty" style="padding:18px">Crea tu primera meta: un viaje, un colchón para imprevistos, un móvil nuevo… Te diré cuánto apartar al mes y si vas bien de ritmo.<br><br>Atajo: escribe <code>ahorro viaje 50</code> en Inicio para aportar sin entrar aquí.</div>';
      return;
    }
    box.innerHTML = S.goals.map(g => {
      const saved = goalSaved(g), r = Math.min(1, saved / g.target), rem = g.target - saved;
      let line;
      if (rem <= 0) line = '<span style="color:var(--income);font-weight:700">🎉 ¡Conseguida!</span>';
      else {
        const pace = goalPace(g);
        const parts = [];
        if (g.deadline) {
          const ml = monthsUntil(g.deadline);
          if (ml <= 0) parts.push('<span class="over-txt">El plazo (' + ymLabel(g.deadline) + ') ya pasó</span>');
          else {
            const need = rem / Math.max(ml, 0.5);
            parts.push('Necesitas <b>' + money0(need) + '/mes</b> hasta ' + ymLabel(g.deadline));
            if (pace) parts.push(pace >= need * 0.95 ? '<span class="ok-txt">✓ vas bien (' + money0(pace) + '/mes)</span>' : '<span class="warn-txt">a tu ritmo (' + money0(pace) + '/mes) no llegas</span>');
          }
        } else if (pace) {
          const d = new Date(); d.setMonth(d.getMonth() + Math.ceil(rem / pace));
          parts.push('A tu ritmo (' + money0(pace) + '/mes) la tendrás en ' + d.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' }));
        } else parts.push('Te faltan ' + money0(rem));
        line = parts.join(' · ');
      }
      return '<div class="card goal"><div class="goal-top"><span class="goal-em">' + esc(g.emoji || '🎯') + '</span><div class="mid"><div class="d">' + esc(g.name) + '</div>'
        + '<div class="s"><b>' + money0(saved) + '</b> de ' + money0(g.target) + ' · ' + Math.round(r * 100) + ' %</div></div>'
        + '<button class="round small-round" data-gedit="' + esc(g.id) + '" aria-label="Editar">⋯</button></div>'
        + '<div class="bar goal-bar"><i style="width:' + (r * 100) + '%;background:var(--income)"></i></div>'
        + '<div class="goal-line">' + line + '</div>'
        + '<div class="goal-actions"><button class="btn-ghost" data-gout="' + esc(g.id) + '">Retirar</button><button class="btn-add" data-gin="' + esc(g.id) + '">+ Aportar</button></div></div>';
    }).join('');
  }
  $('#newGoal').onclick = () => goalSheet(null);
  document.addEventListener('click', ev => {
    const a = ev.target.closest('[data-gin],[data-gout],[data-gedit]'); if (!a) return;
    const g = S.goals.find(x => x.id === (a.dataset.gin || a.dataset.gout || a.dataset.gedit)); if (!g) return;
    if (a.dataset.gedit) goalSheet(g); else moneySheet(g, !!a.dataset.gout);
  });
  function moneySheet(g, withdraw) {
    const rem = Math.max(0, g.target - goalSaved(g));
    let sugg = [1000, 2000, 5000, 10000];
    if (!withdraw && g.deadline && rem) { const need = Math.round(rem / Math.max(monthsUntil(g.deadline), 0.5) / 100) * 100; if (need > 0) sugg = [need, ...sugg.filter(x => x !== need)].slice(0, 4); }
    openSheet('<h3>' + esc(g.emoji || '🎯') + ' ' + (withdraw ? 'Retirar de ' : 'Aportar a ') + esc(g.name) + '</h3>'
      + '<label class="field"><span>Importe (€)</span><input id="gAmt" inputmode="decimal" placeholder="0,00"></label>'
      + '<div class="cat-picker" id="gSugg">' + sugg.map((v, i) => '<button class="chip" data-v="' + v + '">' + money0(v) + (i === 0 && !withdraw && g.deadline ? ' · lo del mes' : '') + '</button>').join('') + '</div>'
      + '<div class="actions" style="margin-top:12px"><button class="btn-primary" id="gOk">' + (withdraw ? 'Retirar' : 'Aportar') + '</button></div>', sh => {
      const inp = $('#gAmt', sh); setTimeout(() => inp.focus(), 50);
      $('#gSugg', sh).onclick = ev => { const b = ev.target.closest('[data-v]'); if (b) inp.value = (b.dataset.v / 100).toString().replace('.', ','); };
      $('#gOk', sh).onclick = () => { const v = H.parseAmountStr(inp.value); if (!v || v <= 0) return inp.focus(); closeSheet(); contribute(g, withdraw ? -Math.min(v, goalSaved(g)) : v); };
    });
  }
  function goalSheet(g) {
    const isNew = !g;
    openSheet('<h3>' + (isNew ? 'Nueva meta' : 'Editar meta') + '</h3>'
      + '<div class="row2"><label class="field" style="width:76px"><span>Icono</span><input id="gEm" maxlength="4" value="' + esc(g ? g.emoji || '' : '🎯') + '" style="text-align:center;font-size:22px"></label>'
      + '<label class="field" style="flex:1"><span>¿Para qué ahorras?</span><input id="gName" value="' + esc(g ? g.name : '') + '" placeholder="Viaje a Japón"></label></div>'
      + '<label class="field"><span>¿Cuánto necesitas? (€)</span><input id="gTarget" inputmode="decimal" value="' + (g ? (g.target / 100).toString().replace('.', ',') : '') + '" placeholder="2500"></label>'
      + '<label class="field"><span>¿Para cuándo? (opcional)</span><input id="gDl" type="month" value="' + (g && g.deadline ? g.deadline : '') + '"></label>'
      + (isNew ? '<label class="field"><span>¿Ya tienes algo ahorrado? (opcional)</span><input id="gInit" inputmode="decimal" placeholder="0"></label>' : '')
      + '<div class="actions">' + (isNew ? '' : '<button class="btn-ghost danger" id="gDel">Borrar</button>') + '<button class="btn-primary" id="gSave">Guardar</button></div>', sh => {
      if (isNew) setTimeout(() => $('#gName', sh).focus(), 50);
      $('#gSave', sh).onclick = () => {
        const name = safeLabel($('#gName', sh).value, 40), target = H.parseAmountStr($('#gTarget', sh).value);
        if (!name) return $('#gName', sh).focus();
        if (!target || target <= 0 || target >= MAX_CENTS) return $('#gTarget', sh).focus();
        const em = safeLabel($('#gEm', sh).value, 8) || '🎯', dl = YM_RE.test($('#gDl', sh).value) ? $('#gDl', sh).value : null;
        if (isNew) {
          const ng = { id: uid(), name, emoji: em, target, deadline: dl, created: todayISO(), entries: [] };
          const init = H.parseAmountStr(($('#gInit', sh).value || '').trim());
          if (init > 0) ng.entries.push({ id: uid(), date: todayISO(), amount: init });
          S.goals.push(ng);
        } else Object.assign(g, { name, emoji: em, target, deadline: dl });
        save(); closeSheet(); renderAll();
      };
      const del = $('#gDel', sh);
      if (del) del.onclick = () => { const i = S.goals.indexOf(g); S.goals.splice(i, 1); save(); closeSheet(); renderAll(); toast('Meta borrada', 'Deshacer', () => { S.goals.splice(i, 0, g); save(); renderAll(); }); };
    });
  }

  /* ---------- Categorías editables ---------- */
  const PALETTE = ['#2f9e6b', '#e8590c', '#a0522d', '#1971c2', '#5f3dc4', '#c2255c', '#f08c00', '#0c8599', '#d6336c', '#37b24d', '#7048e8', '#868e96'];
  function categoriesSheet() {
    const counts = {}; S.expenses.forEach(e => { counts[e.cat] = (counts[e.cat] || 0) + 1; });
    openSheet('<h3>Tus categorías</h3><p class="muted small" style="margin-top:-6px">Toca una para cambiar nombre, icono o las palabras con las que la reconozco.</p><div class="list" id="catList">'
      + cats().map(c => '<button class="row" data-ced="' + esc(c.id) + '"><span class="em" style="background:' + safeColor(c.color) + '22">' + esc(c.emoji) + '</span><span class="mid"><div class="d">' + esc(c.name) + (c.essential ? ' <span class="tag tag-ok">básica</span>' : '') + '</div><div class="s">' + (counts[c.id] || 0) + ' movimientos' + ((c.kw || []).length ? ' · ' + esc((c.kw || []).slice(0, 4).join(', ')) + (c.kw.length > 4 ? '…' : '') : '') + '</div></span><span class="muted">›</span></button>').join('')
      + '</div><div class="actions" style="margin-top:12px"><button class="btn-ghost" id="catReset">Restaurar</button><button class="btn-primary" id="catNew">+ Nueva categoría</button></div>', sh => {
      $('#catList', sh).onclick = ev => { const b = ev.target.closest('[data-ced]'); if (b) categoryEditSheet(cats().find(c => c.id === b.dataset.ced)); };
      $('#catNew', sh).onclick = () => categoryEditSheet(null);
      $('#catReset', sh).onclick = () => {
        openSheet('<h3>¿Restaurar categorías?</h3><p class="muted">Vuelven las categorías originales. Los movimientos de categorías que hayas creado pasan a «Otros».</p><div class="actions"><button class="btn-ghost" id="rNo">Cancelar</button><button class="btn-primary" id="rYes">Restaurar</button></div>', s2 => {
          $('#rNo', s2).onclick = categoriesSheet;
          $('#rYes', s2).onclick = () => { S.categories = defaultCats(); const ids = new Set(S.categories.map(c => c.id)); S.expenses.forEach(e => { if (e.type !== 'income' && !ids.has(e.cat)) e.cat = 'otros'; }); save(); renderAll(); categoriesSheet(); };
        });
      };
    });
  }
  function categoryEditSheet(c) {
    const isNew = !c;
    let color = c ? c.color : PALETTE[Math.floor(Math.random() * PALETTE.length)];
    openSheet('<h3>' + (isNew ? 'Nueva categoría' : 'Editar categoría') + '</h3>'
      + '<div class="row2"><label class="field" style="width:76px"><span>Icono</span><input id="cEm" maxlength="4" value="' + esc(c ? c.emoji : '🏷️') + '" style="text-align:center;font-size:22px"></label>'
      + '<label class="field" style="flex:1"><span>Nombre</span><input id="cName" value="' + esc(c ? c.name : '') + '" placeholder="Mascotas"></label></div>'
      + '<div class="field"><span>Color</span><div class="swatches" id="cCol">' + PALETTE.map(p => '<button style="background:' + p + '" data-col="' + p + '"></button>').join('') + '</div></div>'
      + '<label class="field"><span>Palabras que la identifican (separadas por comas)</span><textarea id="cKw" rows="3" placeholder="tiendanimal, pienso, veterinario">' + esc(c ? (c.kw || []).join(', ') : '') + '</textarea></label>'
      + '<label class="check"><input type="checkbox" id="cEss"' + (c && c.essential ? ' checked' : '') + '> Gasto básico <span class="muted small">(no te sugeriré recortarlo)</span></label>'
      + '<div class="actions">' + (!isNew && c.id !== 'otros' ? '<button class="btn-ghost danger" id="cDel">Borrar</button>' : '') + '<button class="btn-ghost" id="cBack">Volver</button><button class="btn-primary" id="cSave">Guardar</button></div>', sh => {
      const paintCol = () => $$('#cCol button', sh).forEach(b => b.classList.toggle('sel', b.dataset.col === color));
      paintCol();
      $('#cCol', sh).onclick = ev => { const b = ev.target.closest('[data-col]'); if (b) { color = b.dataset.col; paintCol(); } };
      if (isNew) setTimeout(() => $('#cName', sh).focus(), 50);
      $('#cBack', sh).onclick = categoriesSheet;
      $('#cSave', sh).onclick = () => {
        const name = safeLabel($('#cName', sh).value, 30); if (!name) return $('#cName', sh).focus();
        const data = { name, emoji: safeLabel($('#cEm', sh).value, 8) || '🏷️', color: safeColor(color), essential: $('#cEss', sh).checked,
          kw: $('#cKw', sh).value.split(/[,\n]/).map(x => H.normalize(x).slice(0, 40)).filter(Boolean).slice(0, 200) };
        if (isNew) {
          let id = H.normalize(name).replace(/ /g, '-').slice(0, 20) || 'cat'; while (cats().some(x => x.id === id)) id += '-' + Math.random().toString(36).slice(2, 4);
          const otrosIdx = cats().findIndex(x => x.id === 'otros');
          S.categories.splice(otrosIdx >= 0 ? otrosIdx : S.categories.length, 0, Object.assign({ id }, data));
        } else Object.assign(c, data);
        save(); renderAll(); categoriesSheet(); toast('Categoría guardada');
      };
      const del = $('#cDel', sh);
      if (del) del.onclick = () => {
        const n = S.expenses.filter(e => e.cat === c.id).length;
        openSheet('<h3>¿Borrar «' + esc(c.name) + '»?</h3><p class="muted">' + (n ? 'Sus ' + n + ' movimientos pasarán a «Otros». ' : '') + 'También se quita su límite de gasto.</p><div class="actions"><button class="btn-ghost" id="dNo">Cancelar</button><button class="btn-primary" style="background:var(--danger)" id="dYes">Borrar</button></div>', s2 => {
          $('#dNo', s2).onclick = () => categoryEditSheet(c);
          $('#dYes', s2).onclick = () => {
            S.categories = S.categories.filter(x => x.id !== c.id);
            S.expenses.forEach(e => { if (e.cat === c.id) e.cat = 'otros'; });
            delete S.budgets[c.id];
            for (const k in S.learned) if (S.learned[k] === c.id) delete S.learned[k];
            save(); renderAll(); categoriesSheet();
          };
        });
      };
    });
  }
  $('#catsBtn').onclick = categoriesSheet;

  /* ---------- Importar extracto del banco ---------- */
  let xlsxLoading = null;
  function loadXLSX() {
    if (window.XLSX) return Promise.resolve();
    if (xlsxLoading) return xlsxLoading;
    xlsxLoading = new Promise((res, rej) => {
      const s = document.createElement('script');
      s.src = 'vendor/xlsx.full.min.js';
      s.onload = res; s.onerror = () => { xlsxLoading = null; rej(new Error('no se pudo cargar el lector de Excel')); };
      document.head.appendChild(s);
    });
    return xlsxLoading;
  }
  function decodeText(buf) {
    try { return new TextDecoder('utf-8', { fatal: true }).decode(buf); } catch (e) { return new TextDecoder('windows-1252').decode(buf); }
  }
  async function readStatement(file) {
    const buf = await file.arrayBuffer();
    const b = new Uint8Array(buf.slice(0, 8));
    const isZip = b[0] === 0x50 && b[1] === 0x4b, isOle = b[0] === 0xd0 && b[1] === 0xcf;
    const looksHtml = /^\s*</.test(decodeText(buf.slice(0, 200)));
    if (isZip || isOle || looksHtml || /\.(xlsx?|ods)$/i.test(file.name)) {
      await loadXLSX();
      const wb = window.XLSX.read(buf, { type: 'array', cellDates: true, cellFormula: false, cellHTML: false, sheetRows: 50000 });
      let best = null;
      for (const name of wb.SheetNames) {
        const rows = window.XLSX.utils.sheet_to_json(wb.Sheets[name], { header: 1, raw: true, defval: '' });
        if (!best || rows.length > best.length) best = rows;
      }
      return (best || []).slice(0, 50000).map(r => r.slice(0, 50).map(v => (typeof v === 'string' ? v.trim().slice(0, 500) : v)));
    }
    return H.parseCSV(decodeText(buf)).slice(0, 50000).map(r => r.slice(0, 50).map(v => v.slice(0, 500)));
  }
  async function onStatementFile(ev) {
    const f = ev.target.files[0]; ev.target.value = ''; if (!f) return;
    if (f.size > 15 * 1024 * 1024) return toast('El extracto es demasiado grande (máx. 15 MB)');
    toast('Leyendo ' + esc(f.name) + '…', null, null, 2500);
    try {
      const rows = await readStatement(f);
      if (!rows.length) throw new Error('el archivo está vacío');
      importSheet(rows, H.detectBankColumns(rows), f.name);
    } catch (e) { toast('No he podido leer el extracto: ' + esc(e.message)); }
  }
  $('#bankInput').addEventListener('change', onStatementFile);
  $('#bankInput2').addEventListener('change', onStatementFile);

  function importSheet(rows, map, fileName) {
    let includeIncome = true;
    let items = [];
    const header = map.headerRow >= 0 ? rows[map.headerRow] : null;
    const nCols = Math.max(...rows.slice(0, 40).map(r => r.length));
    const sampleRow = rows[map.headerRow + 1] || rows[0] || [];
    const colOpts = (sel, allowNone) => (allowNone ? '<option value="-1">—</option>' : '') + Array.from({ length: nCols }, (_, i) => {
      const label = header && String(header[i] || '').trim() ? String(header[i]).trim() : 'Columna ' + (i + 1);
      let sample = sampleRow[i]; if (sample instanceof Date) sample = sample.toLocaleDateString('es-ES');
      return '<option value="' + i + '"' + (i === sel ? ' selected' : '') + '>' + esc(label) + (sample !== undefined && sample !== '' ? ' (' + esc(String(sample).slice(0, 18)) + ')' : '') + '</option>';
    }).join('');
    const catOpts = sel => cats().map(c => '<option value="' + esc(c.id) + '"' + (c.id === sel ? ' selected' : '') + '>' + esc(c.emoji + ' ' + c.name) + '</option>').join('');
    const rebuild = () => {
      items = H.parseBankRows(rows, map, { cats: cats(), learned: S.learned, existing: S.expenses });
      items.forEach(it => { it.on = !it.dup && !it.transfer; });
    };
    rebuild();
    openSheet('<h3>Importar extracto</h3><div class="muted small" id="impSum"></div>'
      + '<details class="imp-map"' + (map.found ? '' : ' open') + '><summary>Columnas detectadas' + (map.found ? '' : ' (revísalas)') + '</summary>'
      + '<label class="field"><span>Fecha</span><select id="mDate">' + colOpts(map.date) + '</select></label>'
      + '<label class="field"><span>Concepto</span><select id="mDesc">' + colOpts(map.desc) + '</select></label>'
      + (map.amount >= 0 || map.debit < 0
        ? '<label class="field"><span>Importe (negativo = gasto)</span><select id="mAmt">' + colOpts(map.amount) + '</select></label>'
        : '<label class="field"><span>Cargos (gastos)</span><select id="mDeb">' + colOpts(map.debit, true) + '</select></label><label class="field"><span>Abonos (ingresos)</span><select id="mCre">' + colOpts(map.credit, true) + '</select></label>')
      + '</details>'
      + '<label class="check"><input type="checkbox" id="mInc" checked> Importar también los ingresos (nómina, bizums recibidos…)</label>'
      + '<div class="imp-tools"><button class="link" id="mAll">Marcar todos</button><button class="link" id="mNone">Ninguno</button></div>'
      + '<div class="imp-list" id="impList"></div>'
      + '<div class="actions imp-actions"><button class="btn-ghost" id="mCancel">Cancelar</button><button class="btn-primary" id="mGo">Importar</button></div>', sh => {
      const paint = () => {
        const vis = items.filter(it => includeIncome || it.type !== 'income');
        const sel = vis.filter(it => it.on);
        const dups = items.filter(it => it.dup).length, transf = items.filter(it => it.transfer).length;
        const range = items.length ? H.fromISO(items[items.length - 1].date).toLocaleDateString('es-ES') + ' – ' + H.fromISO(items[0].date).toLocaleDateString('es-ES') : '';
        $('#impSum', sh).innerHTML = esc(fileName) + '<br>' + items.length + ' movimientos' + (range ? ' · ' + range : '') + (dups ? ' · <b>' + dups + ' ya los tenías</b> (desmarcados)' : '') + (transf ? ' · ' + transf + ' traspasos entre cuentas (desmarcados)' : '');
        $('#impList', sh).innerHTML = vis.length ? vis.map(it => {
          const i = items.indexOf(it);
          return '<div class="imp-row' + (it.on ? '' : ' off') + '"><input type="checkbox" data-i="' + i + '"' + (it.on ? ' checked' : '') + '>'
            + '<div class="mid"><div class="d">' + esc(it.desc) + (it.dup ? ' <span class="tag">repetido</span>' : '') + '</div><div class="s">' + H.fromISO(it.date).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' }) + ' · ' + esc(it.raw.slice(0, 42)) + '</div>'
            + (it.type === 'income' ? '<div class="s" style="color:var(--income)">💶 Ingreso</div>' : '<select data-c="' + i + '">' + catOpts(it.cat) + '</select>') + '</div>'
            + '<div class="amt' + (it.type === 'income' ? ' inc' : '') + '">' + (it.type === 'income' ? '+' : '−') + money(it.amount) + '</div></div>';
        }).join('') : '<div class="empty" style="padding:16px">No encuentro movimientos con estas columnas. Ábrelas arriba y elige cuál es cada una.</div>';
        $('#mGo', sh).textContent = 'Importar ' + sel.length;
        $('#mGo', sh).disabled = !sel.length;
      };
      paint();
      const remap = () => {
        map = Object.assign({}, map, { date: +$('#mDate', sh).value, desc: +$('#mDesc', sh).value });
        if ($('#mAmt', sh)) map.amount = +$('#mAmt', sh).value; else { map.debit = +$('#mDeb', sh).value; map.credit = +$('#mCre', sh).value; }
        rebuild(); paint();
      };
      $$('select[id^="m"]', sh).forEach(s => s.addEventListener('change', remap));
      $('#mInc', sh).onchange = ev => { includeIncome = ev.target.checked; paint(); };
      $('#mAll', sh).onclick = () => { items.forEach(it => it.on = true); paint(); };
      $('#mNone', sh).onclick = () => { items.forEach(it => it.on = false); paint(); };
      $('#impList', sh).addEventListener('change', ev => {
        if (ev.target.dataset.i !== undefined) { items[+ev.target.dataset.i].on = ev.target.checked; paint(); }
        if (ev.target.dataset.c !== undefined) { items[+ev.target.dataset.c].cat = ev.target.value; items[+ev.target.dataset.c].catTouched = true; }
      });
      $('#mCancel', sh).onclick = closeSheet;
      $('#mGo', sh).onclick = () => {
        const batch = uid();
        const chosen = items.filter(it => it.on && (includeIncome || it.type !== 'income'));
        chosen.forEach(it => {
          const d = H.fromISO(it.date); d.setHours(12);
          S.expenses.push({ id: uid(), ts: +d, date: it.date, amount: it.amount, desc: it.desc, cat: it.type === 'income' ? 'ingreso' : it.cat, type: it.type, imp: batch });
          if (it.type !== 'income' && (it.catTouched || it.cat !== 'otros')) S.learned[H.normalize(it.desc)] = it.cat;
        });
        save(); closeSheet(); switchTab('movimientos');
        toast('Importados ' + chosen.length + ' movimientos', 'Deshacer', () => { S.expenses = S.expenses.filter(e => e.imp !== batch); save(); renderAll(); }, 8000);
      };
    });
  }

  /* ---------- Avisos (Android, sin servidor) ---------- */
  const STATE_URL = () => new URL('__calderilla_state', location.href).href;
  const bgSupported = () => 'serviceWorker' in navigator && 'Notification' in window && typeof ServiceWorkerRegistration !== 'undefined' && 'periodicSync' in ServiceWorkerRegistration.prototype;
  function writeSwState() {
    if (!('caches' in window)) return;
    try {
      const rec = H.detectRecurring(S.expenses, new Date()).filter(r => r.active && !r.probable);
      const recentDates = [...new Set(S.expenses.filter(e => H.daysBetween(e.date, todayISO()) <= 3).map(e => e.date))];
      const st = { notif: S.notif, recentDates, upcoming: rec.map(r => ({ key: r.key, desc: r.desc, amount: r.amount, next: r.next })), written: Date.now() };
      caches.open('calderilla-sw').then(c => c.put(STATE_URL(), new Response(JSON.stringify(st), { headers: { 'content-type': 'application/json' } }))).catch(() => {});
    } catch (e) {}
  }
  async function registerBg() {
    const reg = await navigator.serviceWorker.ready;
    let state = 'unknown';
    try { state = (await navigator.permissions.query({ name: 'periodic-background-sync' })).state; } catch (e) {}
    if (state !== 'granted') return state;
    await reg.periodicSync.register('calderilla-check', { minInterval: 4 * 60 * 60 * 1000 });
    return 'granted';
  }
  async function notifStatus() {
    const el = $('#notifStatus'), btn = $('#notifBtn');
    if (NATIVE) {
      let st = 'prompt'; try { st = (await LN.checkPermissions()).display; } catch (e) {}
      btn.hidden = false;
      if (st === 'granted') { btn.textContent = 'Probar'; el.textContent = '✅ Activos. Te aviso a la hora que elijas y antes de cada cobro.'; }
      else if (st === 'denied') { btn.textContent = 'Ajustes'; el.textContent = 'Bloqueados. Actívalos en Ajustes del móvil → Apps → Calderilla → Notificaciones.'; }
      else { btn.textContent = 'Activar'; el.textContent = 'Desactivados.'; }
      return;
    }
    if (!bgSupported()) { el.innerHTML = 'Este navegador no permite avisos con la app cerrada. Funcionan en <b>Chrome para Android</b> con la app instalada.'; btn.hidden = true; return; }
    if (Notification.permission === 'denied') { el.textContent = 'Has bloqueado las notificaciones. Actívalas en los ajustes del móvil → Apps → Calderilla.'; btn.hidden = true; return; }
    if (Notification.permission !== 'granted') { el.textContent = 'Desactivados.'; btn.hidden = false; btn.textContent = 'Activar'; return; }
    let st = 'unknown'; try { st = await registerBg(); } catch (e) {}
    btn.hidden = false; btn.textContent = 'Probar';
    el.innerHTML = st === 'granted' ? '✅ Activos. Android revisa varias veces al día si hay algo que avisarte.' : 'Permiso dado, pero falta <b>instalar la app</b> (menú ⋮ → Instalar aplicación) para que pueda avisarte con ella cerrada.';
  }
  $('#notifBtn').onclick = async () => {
    if (NATIVE) {
      let st = 'prompt'; try { st = (await LN.checkPermissions()).display; } catch (e) {}
      if (st !== 'granted') { try { await LN.requestPermissions(); } catch (e) {} scheduleLocal(); return notifStatus(); }
      await LN.schedule({ notifications: [{ id: 4999, title: 'Calderilla', body: 'Así te llegarán los avisos 👋', schedule: { at: new Date(Date.now() + 2000), allowWhileIdle: true } }] });
      return;
    }
    if (Notification.permission !== 'granted') {
      const p = await Notification.requestPermission();
      if (p === 'granted') { writeSwState(); await notifStatus(); toast('Avisos activados'); } else notifStatus();
      return;
    }
    const reg = await navigator.serviceWorker.ready;
    reg.showNotification('Calderilla', { body: 'Así te llegarán los avisos 👋', icon: 'icon-192.png', badge: 'icon-192.png', tag: 'test' });
  };
  $('#nDaily').onchange = ev => { S.notif.daily = ev.target.checked; save(); };
  $('#nHour').onchange = ev => { S.notif.hour = +ev.target.value; save(); };
  $('#nSubs').onchange = ev => { S.notif.subs = ev.target.checked; save(); };
  $('#nHour').innerHTML = Array.from({ length: 10 }, (_, i) => i + 14).map(h => '<option value="' + h + '">' + h + ':00</option>').join('');

  /* ---------- App Android: notificaciones del banco y avisos locales ---------- */
  function bankName(pkg) {
    if (H.KNOWN_BANK_APPS[pkg]) return H.KNOWN_BANK_APPS[pkg];
    const parts = String(pkg).split('.').filter(p => !/^(com|es|net|org|www|app|android|mobile|movil|apps)$/.test(p));
    const p = parts[0] || pkg; return p.charAt(0).toUpperCase() + p.slice(1);
  }
  const discovering = () => Date.now() < (S.bank.discoverUntil || 0);
  const bankAllowed = pkg => S.bank.packages[pkg] === false ? false : (S.bank.packages[pkg] === true || !!H.KNOWN_BANK_APPS[pkg]);
  const whitelist = () => [...new Set([...Object.keys(H.KNOWN_BANK_APPS), ...Object.keys(S.bank.packages)])].filter(bankAllowed);
  const hashStr = str => { let h = 5381; for (let i = 0; i < str.length; i++) h = ((h << 5) + h + str.charCodeAt(i)) | 0; return (h >>> 0).toString(36); };

  let bankAdded = [], bankPendingNew = 0, bankFlush;
  function onBankNotification(n) {
    if (!n || !n.package || n.package === 'es.calderilla.app') return;
    const text = [n.apptitle, n.title, n.text].filter(Boolean).join(' · ');
    const h = hashStr(n.package + '|' + text + '|' + Math.round((n.time || 0) / 60000));
    if (S.bank.seen.includes(h)) return;
    S.bank.seen.push(h); if (S.bank.seen.length > 400) S.bank.seen.splice(0, S.bank.seen.length - 400);

    if (!bankAllowed(n.package)) {
      // Modo detección: solo apunto qué app avisó de un importe; el texto no se guarda como movimiento
      if (discovering() && H.looksLikeMoney(text) && (H.BANKISH.test(n.package) || /pago|compra|bizum|transfer|cargo|recib/i.test(text))) {
        const d = S.bank.discovered[n.package] || (S.bank.discovered[n.package] = { count: 0 });
        d.count++; d.last = Date.now(); d.sample = text.slice(0, 140);
      }
      save(); return;
    }
    const r = H.parseBankNotification(n, cats(), S.learned);
    if (!r.ok) { save(); return; }
    // El mismo pago puede llegar dos veces (banco + Google Wallet) o haberlo apuntado tú a mano
    const near = e => e.type === r.type && e.amount === r.amount && Math.abs((e.ts || 0) - r.ts) < 20 * 60000;
    const dup = S.expenses.find(near) || S.inbox.find(near);
    if (dup) {
      if (dup.src === 'banco' && /^Pago con tarjeta$/.test(dup.desc) && r.party) { dup.desc = r.desc; dup.cat = r.cat; }
      save(); return;
    }
    const item = { id: uid(), amount: r.amount, desc: r.desc, cat: r.cat, date: r.date, ts: r.ts, type: r.type, src: 'banco', bank: r.bank || bankName(n.package), raw: r.raw.slice(0, 200) };
    if (S.bank.auto && r.confidence === 'high') { S.expenses.push(item); bankAdded.push(item); checkBudgetCross(item); }
    else { item.confidence = r.confidence; S.inbox.push(item); bankPendingNew++; }
    save();
    clearTimeout(bankFlush); bankFlush = setTimeout(flushBankToast, 600);
  }
  function flushBankToast() {
    const added = bankAdded, pend = bankPendingNew; bankAdded = []; bankPendingNew = 0;
    renderAll();
    if (added.length === 1) {
      const it = added[0], c = catById(it.cat);
      toast('🔔 ' + esc(c.emoji) + ' ' + esc(it.desc) + ' · ' + (it.type === 'income' ? '+' : '') + money(it.amount), 'Deshacer', () => { S.expenses = S.expenses.filter(e => e.id !== it.id); save(); renderAll(); }, 6000);
    } else if (added.length > 1) {
      toast('🔔 ' + added.length + ' movimientos del banco apuntados', 'Ver', () => switchTab('movimientos'), 6000);
    } else if (pend) toast('📥 ' + pend + ' del banco por revisar', 'Revisar', inboxSheet, 6000);
  }

  function inboxSheet() {
    if (!S.inbox.length) { closeSheet(); return; }
    const catOpts = sel => cats().map(c => '<option value="' + esc(c.id) + '"' + (c.id === sel ? ' selected' : '') + '>' + esc(c.emoji + ' ' + c.name) + '</option>').join('') + '<option value="ingreso"' + (sel === 'ingreso' ? ' selected' : '') + '>💶 Es un ingreso</option>';
    openSheet('<h3>📥 Por revisar</h3><p class="muted small" style="margin-top:-6px">Movimientos que he leído de tus notificaciones pero no he entendido del todo. Corrige lo que haga falta y confirma.</p>'
      + '<div class="imp-list" id="inbList">' + S.inbox.map(it => '<div class="imp-row inbox-row" data-id="' + esc(it.id) + '"><div class="mid">'
        + '<input class="inb-desc" value="' + esc(it.desc) + '">'
        + '<div class="s">' + esc(it.bank || '') + ' · ' + H.fromISO(it.date).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' }) + '</div>'
        + '<div class="s raw">«' + esc(it.raw || '') + '»</div>'
        + '<select class="inb-cat">' + catOpts(it.type === 'income' ? 'ingreso' : it.cat) + '</select></div>'
        + '<div class="inb-side"><div class="amt' + (it.type === 'income' ? ' inc' : '') + '">' + (it.type === 'income' ? '+' : '−') + money(it.amount) + '</div>'
        + '<div class="inb-btns"><button class="btn-ghost danger" data-no="' + esc(it.id) + '" aria-label="Descartar">✕</button><button class="btn-add" data-ok="' + esc(it.id) + '" aria-label="Confirmar">✓</button></div></div></div>').join('') + '</div>'
      + '<div class="actions imp-actions"><button class="btn-ghost" id="inbNone">Descartar todos</button><button class="btn-primary" id="inbAll">Confirmar todos</button></div>', sh => {
      const accept = row => {
        const it = S.inbox.find(x => x.id === row.dataset.id); if (!it) return;
        const v = $('.inb-cat', row).value, cat = (v === 'ingreso' || cats().some(c => c.id === v)) ? v : 'otros', desc = safeText($('.inb-desc', row).value, 80) || it.desc;
        const e = Object.assign({}, it, { desc, type: cat === 'ingreso' ? 'income' : 'expense', cat });
        delete e.confidence; S.expenses.push(e);
        if (e.type !== 'income') S.learned[H.normalize(desc)] = cat;
        S.inbox = S.inbox.filter(x => x.id !== it.id);
      };
      $('#inbList', sh).onclick = ev => {
        const ok = ev.target.closest('[data-ok]'), no = ev.target.closest('[data-no]');
        if (ok) accept(ok.closest('.inbox-row'));
        else if (no) S.inbox = S.inbox.filter(x => x.id !== no.dataset.no);
        else return;
        save(); renderAll(); inboxSheet();
      };
      $('#inbAll', sh).onclick = () => { $$('.inbox-row', sh).forEach(accept); save(); closeSheet(); renderAll(); toast('Movimientos confirmados'); };
      $('#inbNone', sh).onclick = () => { S.inbox = []; save(); closeSheet(); renderAll(); };
    });
  }

  let nlListener = false;
  async function bankStart() {
    if (!NATIVE || !S.bank.enabled) return;
    try {
      const g = await NL.isPermissionGranted();
      if (!g.value) return;
      if (!nlListener) { await NL.addListener('notificationReceivedEvent', onBankNotification); nlListener = true; }
      await NL.startListening({ cacheNotifications: true, packagesWhitelist: discovering() ? null : whitelist() });
      await NL.replacePackagesWhitelist({ packagesWhitelist: discovering() ? null : whitelist() });
      await NL.restoreCachedNotifications();
    } catch (e) { console.warn('bankStart', e); }
  }

  async function renderBank() {
    const box = $('#bankBox'); if (!box) return;
    if (!NATIVE) {
      const isAndroid = /Android/i.test(navigator.userAgent);
      let link = '';
      const m = location.hostname.match(/^([^.]+)\.github\.io$/);
      if (m) { const repo = location.pathname.split('/').filter(Boolean)[0]; if (repo) link = 'https://github.com/' + m[1] + '/' + repo + '/releases/latest/download/calderilla.apk'; }
      box.innerHTML = '<div class="set-row"><div><b>Leer las notificaciones del banco</b><div class="muted">' + (isAndroid
        ? 'Instala la app de Android y tus pagos, bizums y transferencias se apuntarán solos.'
        : 'Solo en la app de Android: en iPhone Apple no deja leer notificaciones de otras apps.') + '</div></div>'
        + (isAndroid && link ? '<a class="btn-ghost" href="' + link + '">Descargar</a>' : '') + '</div>';
      return;
    }
    let granted = false, listening = false;
    try { granted = (await NL.isPermissionGranted()).value; listening = (await NL.isListening()).value; } catch (e) {}
    const known = Object.keys(H.KNOWN_BANK_APPS).filter(bankAllowed).map(bankName);
    const disc = Object.entries(S.bank.discovered).filter(([pkg]) => !H.KNOWN_BANK_APPS[pkg]).sort((a, b) => b[1].count - a[1].count);
    const status = !S.bank.enabled ? 'Desactivado.' : !granted ? '⚠️ Falta darle permiso.' : listening ? '✅ Leyendo notificaciones de tus bancos.' : '⏳ Permiso dado. Si no arranca, reinicia el móvil.';
    box.innerHTML = '<div class="set-row"><div><b>Leer las notificaciones del banco</b><div class="muted">' + status + '</div></div>'
      + '<button class="btn-ghost" id="bankToggle">' + (!S.bank.enabled ? 'Activar' : !granted ? 'Dar permiso' : 'Desactivar') + '</button></div>'
      + (S.bank.enabled ? '<div class="set-row"><label class="check" style="margin:0"><input type="checkbox" id="bankAuto"' + (S.bank.auto ? ' checked' : '') + '> <span>Apuntar solos los que entiendo bien <span class="muted small">(el resto te los dejo en «Por revisar»)</span></span></label></div>'
        + '<div class="set-row" style="display:block"><b>Bancos</b><div class="muted small" style="margin:4px 0 8px">Ya reconozco: ' + esc(known.join(', ')) + '.</div>'
        + (disc.length ? disc.map(([pkg, d]) => '<label class="check"><input type="checkbox" data-pkg="' + esc(pkg) + '"' + (bankAllowed(pkg) ? ' checked' : '') + '> <span><b>' + esc(bankName(pkg)) + '</b> <span class="muted small">' + d.count + ' avisos · «' + esc((d.sample || '').slice(0, 70)) + '…»</span></span></label>').join('') : '')
        + (discovering() ? '<div class="savings-total">🔎 Buscando tu banco hasta el ' + new Date(S.bank.discoverUntil).toLocaleString('es-ES', { weekday: 'long', hour: '2-digit', minute: '2-digit' }) + '. Haz algún pago o bizum y vuelve aquí. <button class="link" id="discStop">Parar</button></div>'
          : '<button class="link" id="discStart">¿No está tu banco? Detectarlo (48 h) →</button>') + '</div>'
        + '<div class="muted small" style="padding:4px 0 10px">Consejo: si tienes Xiaomi, Huawei u OnePlus, quita el ahorro de batería a Calderilla para que no se pierda ningún aviso.</div>' : '');
    $('#bankToggle').onclick = async () => {
      if (!S.bank.enabled) { S.bank.enabled = true; save(); }
      else if (granted) { S.bank.enabled = false; save(); try { await NL.replacePackagesWhitelist({ packagesWhitelist: ['es.calderilla.none'] }); } catch (e) {} return renderBank(); }
      if (!granted) return permissionSheet();
      bankStart(); renderBank();
    };
    const au = $('#bankAuto'); if (au) au.onchange = ev => { S.bank.auto = ev.target.checked; save(); };
    $$('[data-pkg]', box).forEach(cb => cb.onchange = () => { S.bank.packages[cb.dataset.pkg] = cb.checked; save(); bankStart(); });
    const ds = $('#discStart'); if (ds) ds.onclick = () => {
      openSheet('<h3>🔎 Detectar mi banco</h3><p>Durante 48 horas miraré <b>todas</b> las notificaciones que te lleguen, solo para ver qué app avisa de pagos con importes en euros.</p><p class="muted">No guardo nada de las demás apps: las descarto al momento. Al acabar vuelvo a leer solo las apps que marques.</p><div class="actions"><button class="btn-ghost" id="dNo">Cancelar</button><button class="btn-primary" id="dYes">Empezar</button></div>', sh => {
        $('#dNo', sh).onclick = closeSheet;
        $('#dYes', sh).onclick = () => { S.bank.discoverUntil = Date.now() + 48 * 3600000; save(); closeSheet(); bankStart(); renderBank(); };
      });
    };
    const dst = $('#discStop'); if (dst) dst.onclick = () => { S.bank.discoverUntil = 0; save(); bankStart(); renderBank(); };
  }

  function permissionSheet() {
    openSheet('<h3>Dar permiso a Calderilla</h3>'
      + '<ol class="steps"><li>Pulsa <b>Abrir ajustes</b> y activa <b>Calderilla</b> en «Acceso a notificaciones».</li>'
      + '<li>Si el interruptor sale gris o pone <b>«Ajuste restringido»</b>: ve a Ajustes → Aplicaciones → Calderilla → menú <b>⋮</b> (arriba a la derecha) → <b>Permitir ajustes restringidos</b>. Después repite el paso 1.</li>'
      + '<li>Vuelve aquí. Desde ese momento tus pagos se apuntan solos.</li></ol>'
      + '<p class="muted small">Calderilla solo lee el texto de los avisos de tus bancos. No ve tus cuentas ni tus claves, y nada sale de tu móvil.</p>'
      + '<div class="actions"><button class="btn-ghost" id="pNo">Ahora no</button><button class="btn-primary" id="pGo">Abrir ajustes</button></div>', sh => {
      $('#pNo', sh).onclick = closeSheet;
      $('#pGo', sh).onclick = async () => { closeSheet(); try { await NL.requestPermission({ forceOpenSettings: true }); } catch (e) { toast('No he podido abrir los ajustes'); } };
    });
  }

  // Probar el lector con un texto pegado (también en la web)
  $('#bankTestBtn').onclick = () => {
    openSheet('<h3>Probar con una notificación</h3><p class="muted small">Pega el texto de un aviso de tu banco y te enseño cómo lo entiendo.</p>'
      + '<label class="field"><textarea id="btText" rows="3" placeholder="Has pagado 12,50 € en MERCADONA con tu tarjeta"></textarea></label><div id="btOut" class="muted"></div>'
      + '<div class="actions"><button class="btn-ghost" id="btClose">Cerrar</button><button class="btn-primary" id="btAdd" disabled>Apuntarlo</button></div>', sh => {
      let r = null;
      const run = () => {
        r = H.parseBankNotification({ text: $('#btText', sh).value, time: Date.now() }, cats(), S.learned);
        const c = r.ok ? catById(r.cat) : null;
        $('#btOut', sh).innerHTML = !$('#btText', sh).value.trim() ? '' : r.ok
          ? '<div class="savings-total">' + (r.type === 'income' ? '💶 Ingreso' : c.emoji + ' ' + esc(c.name)) + ' · <b>' + (r.type === 'income' ? '+' : '−') + money(r.amount) + '</b> · ' + esc(r.desc)
            + '<br><span class="small">Confianza: ' + ({ high: 'alta, lo apuntaría solo', medium: 'media, te lo dejaría para revisar', low: 'baja, te lo dejaría para revisar' })[r.confidence] + '</span></div>'
          : '<div class="alert">No lo apuntaría: ' + esc(r.ignored || 'no lo entiendo') + '.</div>';
        $('#btAdd', sh).disabled = !(r && r.ok);
      };
      $('#btText', sh).addEventListener('input', run); setTimeout(() => $('#btText', sh).focus(), 50);
      $('#btClose', sh).onclick = closeSheet;
      $('#btAdd', sh).onclick = () => { closeSheet(); addExpense({ amount: r.amount, desc: r.desc, cat: r.cat, date: todayISO(), type: r.type }); };
    });
  };

  // Avisos locales (app Android): recordatorio diario y cobros fijos
  async function scheduleLocal() {
    if (!NATIVE) return;
    try {
      if ((await LN.checkPermissions()).display !== 'granted') return;
      const pend = await LN.getPending();
      const mine = (pend.notifications || []).filter(x => x.id >= 5000 && x.id < 5100).map(x => ({ id: x.id }));
      if (mine.length) await LN.cancel({ notifications: mine });
      const list = [], now = new Date();
      if (S.notif.daily) {
        const at = new Date(now); at.setHours(S.notif.hour, 0, 0, 0);
        const loggedToday = S.expenses.some(e => e.date === todayISO());
        if (loggedToday || at <= now) at.setDate(at.getDate() + 1);
        list.push({ id: 5000, title: '¿Repasamos lo de hoy?', body: 'Abre Calderilla para apuntar o revisar los gastos del día.', schedule: { at, allowWhileIdle: true }, extra: { go: 'add' } });
      }
      if (S.notif.subs) {
        H.detectRecurring(S.expenses, now).filter(r => r.active && !r.probable).slice(0, 30).forEach((r, i) => {
          const at = H.fromISO(r.next); at.setDate(at.getDate() - 1); at.setHours(10, 0, 0, 0);
          if (at > now) list.push({ id: 5001 + i, title: 'Mañana te cobran ' + r.desc, body: money(r.amount) + '. ¿Lo sigues usando? Si no, es buen momento para darlo de baja.', schedule: { at, allowWhileIdle: true }, extra: { go: 'analisis' } });
        });
      }
      if (list.length) await LN.schedule({ notifications: list });
    } catch (e) { console.warn('scheduleLocal', e); }
  }

  if (NATIVE) {
    try {
      LN.addListener('localNotificationActionPerformed', a => {
        const go = a && a.notification && a.notification.extra && a.notification.extra.go;
        if (go === 'add') { switchTab('inicio'); setTimeout(() => qi.focus(), 300); } else if (go) switchTab(go);
      });
      APP.addListener('resume', () => { bankStart(); renderAll(); });
      APP.addListener('backButton', () => {
        if (!$('#sheet').hidden) closeSheet();
        else if (currentTab !== 'inicio') switchTab('inicio');
        else APP.minimizeApp();
      });
    } catch (e) {}
    document.documentElement.classList.add('native');
  }

  /* ---------- Navegación ---------- */
  function switchTab(t) {
    currentTab = t;
    $$('.view').forEach(v => v.hidden = v.id !== 'view-' + t);
    $$('.tabs button').forEach(b => b.classList.toggle('active', b.dataset.tab === t));
    $('#fab').hidden = t === 'inicio';
    if (location.hash.slice(1) !== t) history.replaceState(null, '', t === 'inicio' ? location.pathname + location.search : '#' + t);
    renderAll(); window.scrollTo(0, 0);
  }
  $('.tabs').onclick = ev => { const b = ev.target.closest('[data-tab]'); if (b) switchTab(b.dataset.tab); };
  document.addEventListener('click', ev => { const g = ev.target.closest('[data-goto]'); if (g) switchTab(g.dataset.goto); });
  $('#fab').onclick = () => { switchTab('inicio'); setTimeout(() => qi.focus(), 60); };
  $$('[data-month]').forEach(b => b.onclick = () => {
    viewMonth = shiftPeriod(viewMonth.y, viewMonth.m, Number(b.dataset.month)); renderAll();
  });

  function renderAll() {
    if (currentTab === 'inicio') renderInicio();
    else if (currentTab === 'movimientos') renderMovimientos();
    else if (currentTab === 'analisis') renderAnalisis();
    else if (currentTab === 'metas') renderMetas();
    else renderAjustes();
  }

  // Atajos del icono (manifest shortcuts) y ruta por hash
  const params = new URLSearchParams(location.search);
  const startTab = ['movimientos', 'analisis', 'metas', 'ajustes'].includes(location.hash.slice(1)) ? location.hash.slice(1) : 'inicio';
  switchTab(startTab);
  if (params.has('add')) setTimeout(() => qi.focus(), 300);
  bankStart();
  scheduleLocal();
  if (params.has('scan')) { $('#ocrStatus').hidden = false; $('#ocrStatus').innerHTML = '📷 Toca el icono de la cámara para fotografiar el ticket.'; }
  window.addEventListener('hashchange', () => { const h = location.hash.slice(1) || 'inicio'; if (h !== currentTab && ['inicio', 'movimientos', 'analisis', 'metas', 'ajustes'].includes(h)) switchTab(h); });
  // Refresca atajos al volver a la app (cambian según la hora)
  document.addEventListener('visibilitychange', () => { if (!document.hidden) renderAll(); });

  // Service worker (solo cuando se sirve desde tu propio dominio)
  if (!NATIVE && 'serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) {
    try {
      navigator.serviceWorker.register('sw.js').then(() => {
        writeSwState();
        if (window.Notification && Notification.permission === 'granted' && bgSupported()) registerBg().catch(() => {});
      }).catch(() => {});
    } catch (e) {}
  }
})();
