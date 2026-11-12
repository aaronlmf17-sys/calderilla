/* Calderilla — lógica pura (sin interfaz). Se puede probar con node. */
(function (root) {
  'use strict';

  const CATEGORIES = [
    { id: 'super', name: 'Supermercado', emoji: '🛒', color: '#2f9e6b', essential: true,
      kw: ['mercadona', 'carrefour', 'lidl', 'aldi', 'dia', 'eroski', 'alcampo', 'super', 'supermercado', 'compra', 'hipercor', 'consum', 'bonarea', 'ahorramas', 'caprabo', 'froiz', 'gadis', 'condis', 'fruteria', 'carniceria', 'panaderia', 'pan'] },
    { id: 'comer', name: 'Comer fuera', emoji: '🍽️', color: '#e8590c',
      kw: ['restaurante', 'cena', 'comida', 'menu', 'burger', 'burguer', 'mcdonalds', 'mcdonald', 'kfc', 'pizza', 'telepizza', 'dominos', 'glovo', 'just eat', 'justeat', 'uber eats', 'ubereats', 'sushi', 'kebab', 'tapas', 'vermut', 'bocadillo', 'almuerzo', 'brunch', 'chino', 'japones', 'foodoo'] },
    { id: 'cafe', name: 'Cafés y caprichos', emoji: '☕', color: '#a0522d',
      kw: ['cafe', 'cafes', 'cafeteria', 'starbucks', 'desayuno', 'cruasan', 'croissant', 'bolleria', 'snack', 'chuches', 'helado', 'vending', 'refresco', 'cocacola', 'tabaco', 'loteria', 'cerveza', 'cana', 'canas', 'bar'] },
    { id: 'transporte', name: 'Transporte', emoji: '🚗', color: '#1971c2',
      kw: ['gasolina', 'gasoil', 'diesel', 'combustible', 'repsol', 'cepsa', 'bp', 'galp', 'shell', 'parking', 'aparcamiento', 'metro', 'bus', 'autobus', 'renfe', 'cercanias', 'taxi', 'uber', 'cabify', 'bolt', 'peaje', 'abono', 'itv', 'taller', 'coche', 'moto', 'bici', 'patinete', 'zona azul', 'ora'] },
    { id: 'hogar', name: 'Casa y facturas', emoji: '🏠', color: '#5f3dc4', essential: true,
      kw: ['alquiler', 'hipoteca', 'luz', 'agua', 'gas', 'iberdrola', 'endesa', 'naturgy', 'totalenergies', 'holaluz', 'ikea', 'leroy', 'bricomart', 'comunidad', 'internet', 'fibra', 'movil', 'telefono', 'movistar', 'vodafone', 'orange', 'digi', 'pepephone', 'lowi', 'o2', 'jazztel', 'seguro', 'limpieza', 'ferreteria', 'ibi'] },
    { id: 'subs', name: 'Suscripciones', emoji: '📺', color: '#c2255c',
      kw: ['netflix', 'spotify', 'hbo', 'max', 'disney', 'prime', 'amazon prime', 'youtube', 'icloud', 'google one', 'chatgpt', 'claude', 'xbox', 'game pass', 'playstation', 'ps plus', 'dazn', 'movistar plus', 'filmin', 'apple tv', 'apple music', 'audible', 'kindle', 'suscripcion', 'patreon', 'twitch', 'microsoft 365', 'office', 'dropbox'] },
    { id: 'ocio', name: 'Ocio', emoji: '🎉', color: '#f08c00',
      kw: ['cine', 'concierto', 'entradas', 'entrada', 'copas', 'copa', 'fiesta', 'discoteca', 'juego', 'videojuego', 'steam', 'libro', 'libros', 'museo', 'teatro', 'escape', 'bolera', 'karaoke', 'festival', 'futbol', 'padel'] },
    { id: 'viajes', name: 'Viajes', emoji: '✈️', color: '#0c8599',
      kw: ['hotel', 'vuelo', 'avion', 'ryanair', 'vueling', 'iberia', 'easyjet', 'airbnb', 'booking', 'hostal', 'viaje', 'vacaciones', 'ave', 'blablacar', 'maleta'] },
    { id: 'compras', name: 'Compras', emoji: '🛍️', color: '#d6336c',
      kw: ['ropa', 'zara', 'primark', 'bershka', 'pull', 'mango', 'hm', 'amazon', 'shein', 'aliexpress', 'temu', 'zapatillas', 'zapatos', 'decathlon', 'corte ingles', 'mediamarkt', 'fnac', 'pccomponentes', 'regalo', 'regalos', 'perfume', 'peluqueria', 'barberia', 'cosmetica', 'druni', 'primor'] },
    { id: 'salud', name: 'Salud y deporte', emoji: '💪', color: '#37b24d', essential: true,
      kw: ['farmacia', 'gimnasio', 'gym', 'dentista', 'medico', 'fisio', 'fisioterapeuta', 'optica', 'gafas', 'lentillas', 'basic fit', 'basicfit', 'mcfit', 'vivagym', 'psicologo', 'clinica', 'veterinario', 'proteina'] },
    { id: 'otros', name: 'Otros', emoji: '📦', color: '#868e96', kw: [] },
  ];
  const INCOME_CAT = { id: 'ingreso', name: 'Ingreso', emoji: '💶', color: '#2b8a3e' };

  const INCOME_WORDS = ['nomina', 'ingreso', 'cobro', 'sueldo', 'salario', 'devolucion', 'reembolso', 'me pagan', 'me devuelven', 'paga extra', 'bizum recibido', 'he cobrado', 'venta', 'vendido', 'wallapop venta'];

  const WEEKDAYS = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'];

  function normalize(s) {
    return String(s || '')
      .toLowerCase()
      .normalize('NFD').replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9ñ ]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function pad(n) { return String(n).padStart(2, '0'); }
  function toISO(d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
  function fromISO(s) { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); }
  function daysBetween(a, b) { return Math.round((fromISO(b) - fromISO(a)) / 86400000); }

  /* "1.234,56" / "45,3" / "12.99" / "1,234.56" → céntimos */
  function parseAmountStr(s) {
    s = String(s).trim();
    const lastDot = s.lastIndexOf('.'), lastComma = s.lastIndexOf(',');
    let normalized;
    if (lastDot >= 0 && lastComma >= 0) {
      const dec = lastDot > lastComma ? '.' : ',';
      const thou = dec === '.' ? ',' : '.';
      normalized = s.split(thou).join('').replace(dec, '.');
    } else if (lastDot >= 0 || lastComma >= 0) {
      const sep = lastDot >= 0 ? '.' : ',';
      const parts = s.split(sep);
      const tail = parts[parts.length - 1];
      if (parts.length === 2 && tail.length <= 2) normalized = parts[0] + '.' + tail;
      else normalized = parts.join('');
    } else normalized = s;
    const v = parseFloat(normalized);
    return isFinite(v) ? Math.round(v * 100) : null;
  }

  function guessCategory(desc, learned, cats) {
    cats = cats || CATEGORIES;
    const n = normalize(desc);
    if (!n) return 'otros';
    learned = learned || {};
    if (learned[n]) return learned[n];
    const first = n.split(' ')[0];
    if (learned[first]) return learned[first];
    const padded = ' ' + n + ' ';
    for (const c of cats) {
      for (const raw of (c.kw || [])) {
        const kw = normalize(raw); if (!kw) continue;
        if (padded.includes(' ' + kw + ' ')) return c.id;
        if (kw.length >= 5 && n.includes(kw)) return c.id;
      }
    }
    return 'otros';
  }

  /* Interpreta texto libre: "café 1,80", "mercadona 45 ayer", "+1500 nómina", "gasolina 60€ el lunes" */
  function parseQuick(text, learned, now, cats) {
    now = now || new Date();
    let t = ' ' + String(text || '').trim() + ' ';
    const res = { amount: null, desc: '', date: toISO(now), type: 'expense', cat: null };
    if (/^\s*\+/.test(t)) { res.type = 'income'; t = t.replace(/^\s*\+/, ' '); }

    const low = () => normalize(t);

    // Fechas
    const dmy = t.match(/\s(\d{1,2})[\/\-](\d{1,2})(?:[\/\-](\d{2,4}))?(?=\s)/);
    if (dmy) {
      let y = dmy[3] ? Number(dmy[3]) : now.getFullYear();
      if (y < 100) y += 2000;
      const d = new Date(y, Number(dmy[2]) - 1, Number(dmy[1]));
      if (!isNaN(d) && Number(dmy[2]) <= 12 && Number(dmy[1]) <= 31) {
        if (!dmy[3] && d > now) d.setFullYear(d.getFullYear() - 1);
        res.date = toISO(d);
        t = t.replace(dmy[0], ' ');
      }
    }
    const rel = [[/\s(antes de ayer|anteayer)(?=\s)/i, 2], [/\sayer(?=\s)/i, 1], [/\shoy(?=\s)/i, 0]];
    for (const [re, back] of rel) {
      if (re.test(t)) { const d = new Date(now); d.setDate(d.getDate() - back); res.date = toISO(d); t = t.replace(re, ' '); break; }
    }
    const wd = t.match(/\s(?:el\s+)?(lunes|martes|mi[eé]rcoles|jueves|viernes|s[aá]bado|domingo)(?=\s)/i);
    if (wd) {
      const target = WEEKDAYS.indexOf(normalize(wd[1]));
      const d = new Date(now);
      let diff = (d.getDay() - target + 7) % 7;
      d.setDate(d.getDate() - diff);
      res.date = toISO(d);
      t = t.replace(wd[0], ' ');
    }

    // Importe: prioriza el que lleva € al lado; si no, el último número
    const numRe = /(€\s*)?(\d{1,3}(?:\.\d{3})+(?:,\d{1,2})?|\d+(?:[.,]\d{1,2})?)(\s*(?:€|eur(?:os?)?\b))?/gi;
    let m, best = null;
    while ((m = numRe.exec(t)) !== null) {
      const withCurrency = !!(m[1] || m[3]);
      if (!best || withCurrency || !best.withCurrency) best = { raw: m[0], num: m[2], withCurrency, index: m.index };
      if (withCurrency) break;
    }
    if (best) {
      res.amount = parseAmountStr(best.num);
      t = t.slice(0, best.index) + ' ' + t.slice(best.index + best.raw.length);
    }

    let desc = t.replace(/€|\beuros?\b|\beur\b/gi, ' ').replace(/\s+/g, ' ').trim();
    desc = desc.replace(/^(en|de|del|por|un|una)\s+/i, '').replace(/\s+(en|de|del|por)$/i, '');
    const nd = normalize(desc);
    if (res.type === 'expense' && INCOME_WORDS.some(w => (' ' + nd + ' ').includes(' ' + w + ' ') || nd.startsWith(w))) res.type = 'income';
    res.desc = desc ? desc.charAt(0).toUpperCase() + desc.slice(1) : '';
    res.cat = res.type === 'income' ? 'ingreso' : guessCategory(res.desc, learned, cats);
    return res;
  }

  function groupByDesc(expenses) {
    const groups = new Map();
    for (const e of expenses) {
      if (e.type === 'income') continue;
      const k = normalize(e.desc) || ('cat:' + e.cat);
      if (!groups.has(k)) groups.set(k, []);
      groups.get(k).push(e);
    }
    return groups;
  }

  function mode(arr) {
    const c = new Map(); let best = arr[arr.length - 1], bc = 0;
    for (const v of arr) { const n = (c.get(v) || 0) + 1; c.set(v, n); if (n >= bc) { bc = n; best = v; } }
    return best;
  }
  function median(arr) { const s = [...arr].sort((a, b) => a - b); const h = s.length >> 1; return s.length % 2 ? s[h] : Math.round((s[h - 1] + s[h]) / 2); }

  /* Atajos: gastos que repites, ordenados por frecuencia, recencia y franja horaria */
  function buildSuggestions(expenses, now, limit) {
    now = now || new Date(); limit = limit || 6;
    const today = toISO(now);
    const hour = now.getHours(), dow = now.getDay();
    const recent = expenses.filter(e => e.type !== 'income' && daysBetween(e.date, today) <= 120 && daysBetween(e.date, today) >= 0);
    const out = [];
    for (const [key, items] of groupByDesc(recent)) {
      if (items.length < 2 || key.startsWith('cat:')) continue;
      let score = 0;
      for (const e of items) {
        const age = daysBetween(e.date, today);
        let w = Math.exp(-age / 30);
        if (e.ts) {
          const d = new Date(e.ts);
          const dh = Math.min(Math.abs(d.getHours() - hour), 24 - Math.abs(d.getHours() - hour));
          if (dh <= 2) w *= 2;
          if (d.getDay() === dow) w *= 1.5;
        }
        score += w;
      }
      const last = items.reduce((a, b) => ((b.ts || 0) > (a.ts || 0) ? b : a));
      out.push({ key, desc: last.desc, cat: last.cat, amount: mode(items.map(e => e.amount)), count: items.length, score });
    }
    return out.sort((a, b) => b.score - a.score).slice(0, limit);
  }

  /* Autocompletado mientras escribes */
  function autocomplete(expenses, prefix, limit) {
    const p = normalize(prefix);
    if (p.length < 2) return [];
    const out = [];
    for (const [key, items] of groupByDesc(expenses)) {
      if (key.startsWith('cat:')) continue;
      if (key.startsWith(p) || key.split(' ').some(w => w.startsWith(p))) {
        const last = items.reduce((a, b) => ((b.ts || 0) > (a.ts || 0) ? b : a));
        out.push({ key, desc: last.desc, cat: last.cat, amount: mode(items.map(e => e.amount)), count: items.length });
      }
    }
    return out.sort((a, b) => b.count - a.count).slice(0, limit || 3);
  }

  const VARIABLE_CATS = ['super', 'comer', 'cafe', 'transporte', 'ocio', 'compras'];
  const ESSENTIAL_CATS = ['super', 'hogar', 'salud'];

  const PERIODS = [
    { id: 'semanal', min: 6, max: 8, perYear: 52 },
    { id: 'mensual', min: 26, max: 35, perYear: 12 },
    { id: 'bimestral', min: 56, max: 66, perYear: 6 },
    { id: 'trimestral', min: 85, max: 97, perYear: 4 },
    { id: 'anual', min: 350, max: 380, perYear: 1 },
  ];

  /* Pagos que se repiten con importe parecido y cadencia regular */
  function detectRecurring(expenses, now) {
    now = now || new Date();
    const today = toISO(now);
    const out = [];
    for (const [key, items] of groupByDesc(expenses)) {
      if (key.startsWith('cat:')) continue;
      const sorted = [...items].sort((a, b) => a.date.localeCompare(b.date));
      const last = sorted[sorted.length - 1];
      const amounts = sorted.map(e => e.amount);
      const med = median(amounts);
      if (sorted.length >= 2) {
        const intervals = [];
        for (let i = 1; i < sorted.length; i++) intervals.push(daysBetween(sorted[i - 1].date, sorted[i].date));
        const mi = median(intervals);
        const period = PERIODS.find(p => mi >= p.min && mi <= p.max);
        const tol = VARIABLE_CATS.includes(last.cat) ? 0.03 : 0.15;
        const consistentAmount = amounts.every(a => Math.abs(a - med) <= med * tol);
        const regular = intervals.filter(i => period && i >= period.min * 0.8 && i <= period.max * 1.2).length >= Math.ceil(intervals.length * 0.6);
        if (period && consistentAmount && regular) {
          const since = daysBetween(last.date, today);
          const next = fromISO(last.date); next.setDate(next.getDate() + Math.round(mi));
          out.push({ key, desc: last.desc, cat: last.cat, period: period.id, amount: med, yearly: med * period.perYear,
            last: last.date, next: toISO(next), count: sorted.length, active: since <= period.max * 1.5, probable: false });
          continue;
        }
      }
      if (last.cat === 'subs' && daysBetween(last.date, today) <= 40) {
        const next = fromISO(last.date); next.setMonth(next.getMonth() + 1);
        out.push({ key, desc: last.desc, cat: last.cat, period: 'mensual', amount: med, yearly: med * 12,
          last: last.date, next: toISO(next), count: sorted.length, active: true, probable: true });
      }
    }
    return out.sort((a, b) => b.yearly - a.yearly);
  }

  /* Hábitos de gasto (incluye gastos hormiga) de los últimos 60 días, excluyendo pagos fijos */
  function detectHabits(expenses, now, recurringKeys, essentialIds) {
    const essential = essentialIds || ESSENTIAL_CATS;
    now = now || new Date();
    const today = toISO(now);
    const skip = new Set(recurringKeys || []);
    const recent = expenses.filter(e => e.type !== 'income' && daysBetween(e.date, today) >= 0 && daysBetween(e.date, today) < 60);
    const out = [];
    for (const [key, items] of groupByDesc(recent)) {
      if (skip.has(key) || key.startsWith('cat:') || items.length < 3) continue;
      if (essential.includes(items[items.length - 1].cat)) continue;
      const total = items.reduce((s, e) => s + e.amount, 0);
      const firstDate = items.reduce((a, e) => (e.date < a ? e.date : a), today);
      const spanDays = Math.max(30, daysBetween(firstDate, today) + 1);
      const monthly = Math.round(total / spanDays * 30);
      const avg = Math.round(total / items.length);
      const last = items.reduce((a, b) => ((b.ts || 0) > (a.ts || 0) ? b : a));
      out.push({ key, desc: last.desc, cat: last.cat, count: items.length, perMonth: +(items.length / spanDays * 30).toFixed(1),
        avg, monthly, yearly: monthly * 12, ant: avg < 600 });
    }
    return out.sort((a, b) => b.yearly - a.yearly);
  }

  const BRANDS = ['mercadona', 'carrefour', 'lidl', 'aldi', 'dia', 'eroski', 'alcampo', 'hipercor', 'consum', 'bonarea', 'ahorramas', 'caprabo', 'repsol', 'cepsa', 'galp', 'shell', 'zara', 'primark', 'decathlon', 'ikea', 'leroy merlin', 'mediamarkt', 'el corte ingles', 'starbucks', 'mcdonalds', 'burger king', 'telepizza', 'druni', 'primor', 'farmacia'];

  /* Interpreta el texto OCR de un ticket */
  function parseReceipt(text) {
    const lines = String(text || '').split(/\r?\n/).map(l => l.trim()).filter(Boolean);
    const amtRe = /(\d{1,3}(?:[.,]\d{3})*[.,]\d{2})(?!\d)/g;
    const amountsIn = l => (l.match(amtRe) || []).map(parseAmountStr).filter(v => v != null && v > 0);
    let total = null;
    const bad = /subtotal|sub total|base|iva|i\.v\.a|cuota|dto|descuento|entregado|efectivo|cambio|devol|ahorro|puntos/i;
    const cand = [];
    lines.forEach((l, i) => {
      if (/total|importe|a pagar|tarjeta|pagado/i.test(l) && !bad.test(l)) {
        let a = amountsIn(l);
        if (!a.length && lines[i + 1]) a = amountsIn(lines[i + 1]);
        const strong = /total/i.test(l);
        a.forEach(v => cand.push({ v, strong }));
      }
    });
    const strong = cand.filter(c => c.strong);
    if (strong.length) total = Math.max(...strong.map(c => c.v));
    else if (cand.length) total = Math.max(...cand.map(c => c.v));
    else {
      const all = lines.filter(l => !bad.test(l)).flatMap(amountsIn).filter(v => v < 500000);
      if (all.length) total = Math.max(...all);
    }
    const n = normalize(text);
    let store = BRANDS.find(b => (' ' + n + ' ').includes(' ' + b + ' ') || (b.length >= 6 && n.includes(b.replace(/ /g, ''))));
    if (store) store = store.replace(/\b\w/g, c => c.toUpperCase());
    else {
      const l = lines.slice(0, 6).find(x => /[a-záéíóúñ]{3,}/i.test(x) && (x.replace(/[^a-záéíóúñ ]/gi, '').length / x.length) > 0.6);
      store = l ? l.replace(/[^\wáéíóúñ .&'-]/gi, '').trim().slice(0, 30) : '';
      if (store) store = store.charAt(0).toUpperCase() + store.slice(1).toLowerCase();
    }
    let date = null;
    const dm = String(text).match(/(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})/);
    if (dm) {
      let y = Number(dm[3]); if (y < 100) y += 2000;
      const d = new Date(y, Number(dm[2]) - 1, Number(dm[1]));
      if (!isNaN(d) && Number(dm[2]) <= 12 && y > 2000) date = toISO(d);
    }
    return { total, store, date };
  }


  /* ---------------- Extractos bancarios ---------------- */
  function parseCSV(text) {
    const lines = text.replace(/^﻿/, '').split(/\r?\n/).filter(l => l.trim()).slice(0, 15);
    const count = (l, d) => { let n = 0, q = false; for (const ch of l) { if (ch === '"') q = !q; else if (ch === d && !q) n++; } return n; };
    let delim = ';', best = -1;
    for (const d of [';', ',', '\t', '|']) {
      const cs = lines.map(l => count(l, d));
      const score = cs.filter(c => c > 0).length * 10 + Math.max(0, ...cs);
      if (score > best) { best = score; delim = d; }
    }
    const rows = []; let row = [], cell = '', q = false;
    const t = text.replace(/^﻿/, '');
    for (let i = 0; i < t.length; i++) {
      const ch = t[i];
      if (q) {
        if (ch === '"') { if (t[i + 1] === '"') { cell += '"'; i++; } else q = false; }
        else cell += ch;
      } else if (ch === '"') q = true;
      else if (ch === delim) { row.push(cell.trim()); cell = ''; }
      else if (ch === '\n' || ch === '\r') {
        if (ch === '\r' && t[i + 1] === '\n') i++;
        row.push(cell.trim()); cell = '';
        if (row.some(c => c !== '')) rows.push(row);
        row = [];
      } else cell += ch;
    }
    row.push(cell.trim()); if (row.some(c => c !== '')) rows.push(row);
    return rows;
  }

  function parseBankDate(v) {
    if (v == null || v === '') return null;
    if (v instanceof Date && !isNaN(v)) return toISO(v);
    if (typeof v === 'number') {
      if (v > 20000 && v < 80000) { const d = new Date(Math.round((v - 25569) * 86400000)); return d.getUTCFullYear() + '-' + pad(d.getUTCMonth() + 1) + '-' + pad(d.getUTCDate()); }
      return null;
    }
    const s = String(v).trim();
    let m = s.match(/^(\d{4})[\-\/.](\d{1,2})[\-\/.](\d{1,2})/);
    if (m) return m[1] + '-' + pad(m[2]) + '-' + pad(m[3]);
    m = s.match(/^(\d{1,2})[\-\/.](\d{1,2})[\-\/.](\d{2,4})/);
    if (m) { let y = Number(m[3]); if (y < 100) y += 2000; if (Number(m[2]) > 12) return null; return y + '-' + pad(m[2]) + '-' + pad(m[1]); }
    return null;
  }

  function parseBankAmount(v) {
    if (v == null || v === '') return null;
    if (typeof v === 'number') return isFinite(v) ? Math.round(v * 100) : null;
    let s = String(v).replace(/−/g, '-').replace(/[€\s]|eur/gi, '');
    if (!/\d/.test(s)) return null;
    let neg = false;
    if (/^\(.*\)$/.test(s)) { neg = true; s = s.slice(1, -1); }
    if (/-$/.test(s)) { neg = true; s = s.slice(0, -1); }
    if (/^-/.test(s)) { neg = true; s = s.slice(1); }
    if (/^\+/.test(s)) s = s.slice(1);
    if (!/^[\d.,]+$/.test(s)) return null;
    const c = parseAmountStr(s);
    return c == null ? null : (neg ? -c : c);
  }

  const H_DATE = ['fecha operacion', 'f operacion', 'fecha', 'fecha valor', 'f valor', 'date', 'dia'];
  const H_DESC = ['concepto', 'descripcion', 'movimiento', 'detalle', 'concepto comun', 'concepto propio', 'observaciones', 'description', 'comercio', 'mas datos'];
  const H_AMOUNT = ['importe', 'cantidad', 'importe eur', 'amount', 'importe euros', 'valor'];
  const H_DEBIT = ['cargo', 'cargos', 'debe', 'gasto', 'gastos', 'salida', 'debito'];
  const H_CREDIT = ['abono', 'abonos', 'haber', 'ingreso', 'ingresos', 'entrada', 'credito'];
  function findCol(header, names) {
    for (const n of names) { const i = header.findIndex(h => h === n); if (i >= 0) return i; }
    for (const n of names) { const i = header.findIndex(h => h.startsWith(n + ' ') || h.startsWith(n)); if (i >= 0) return i; }
    return -1;
  }
  /* Busca la fila de cabecera y las columnas de fecha, concepto e importe */
  function detectBankColumns(rows) {
    for (let r = 0; r < Math.min(rows.length, 40); r++) {
      const header = rows[r].map(c => normalize(c));
      const date = findCol(header, H_DATE);
      if (date < 0) continue;
      const amount = findCol(header, H_AMOUNT);
      const debit = findCol(header, H_DEBIT), credit = findCol(header, H_CREDIT);
      if (amount < 0 && debit < 0) continue;
      let desc = findCol(header, H_DESC);
      if (desc < 0) desc = header.findIndex((h, i) => i !== date && i !== amount && h && !/saldo|divisa|moneda|valor/.test(h));
      return { headerRow: r, date, desc, amount, debit: amount < 0 ? debit : -1, credit: amount < 0 ? credit : -1, found: true };
    }
    // Sin cabecera: deducir por contenido
    const sample = rows.slice(0, 40); const nCols = Math.max(0, ...sample.map(r => r.length));
    const score = (fn) => Array.from({ length: nCols }, (_, c) => sample.filter(r => fn(r[c])).length);
    const dS = score(v => parseBankDate(v) != null);
    const aS = score(v => parseBankAmount(v) != null && parseBankDate(v) == null);
    const tS = score(v => typeof v === 'string' && /[a-z]{3,}/i.test(v) && parseBankAmount(v) == null);
    const argmax = (a, skip) => a.reduce((b, v, i) => (skip.includes(i) || v <= (a[b] ?? -1) ? b : i), -1);
    const date = argmax(dS, []); const amount = argmax(aS, [date]); const desc = argmax(tS, [date, amount]);
    return { headerRow: -1, date, desc, amount, debit: -1, credit: -1, found: false };
  }

  const GENERIC = new Set(['compra', 'pago', 'super', 'comida', 'cena', 'entrada', 'entradas', 'juego', 'abono', 'seguro', 'regalo', 'viaje', 'menu', 'bar', 'pan', 'luz', 'agua', 'gas', 'ora', 'max', 'prime', 'office', 'ave', 'coche', 'moto', 'bici', 'movil', 'telefono', 'internet', 'fibra', 'libro', 'copa', 'copas', 'fiesta', 'ropa', 'chino', 'dia', 'bus', 'metro', 'pull', 'hm', 'bp', 'o2', 'gym', 'vuelo', 'hotel', 'alquiler', 'comunidad', 'limpieza', 'panaderia', 'farmacia', 'fruteria', 'carniceria', 'cafeteria', 'peluqueria', 'barberia', 'optica', 'clinica', 'dentista', 'restaurante', 'gimnasio', 'ferreteria', 'taller', 'parking', 'veterinario', 'cafe', 'cafes', 'desayuno', 'tapas', 'kebab', 'sushi', 'pizza', 'hostal']);
  function titleCase(s) { return s.toLowerCase().replace(/(^|[\s\-\/.])([a-záéíóúñü])/g, (m, a, b) => a + b.toUpperCase()); }
  /* "COMPRA TARJ. 4940XXXXXXXX1234 MERCADONA AV. AMERICA" → "Mercadona" */
  function cleanBankConcept(raw, cats, plain) {
    let s = String(raw || '').replace(/\s+/g, ' ').trim();
    s = s.replace(/\b\d{4,6}[x*]{4,}\d{0,4}\b/gi, ' ')
      .replace(/\b(tarj(eta)?|card)\.?\s*(n[ºo°.]?\s*)?[\dx*]{4,}/gi, ' ')
      .replace(/^(compra|pago|cargo|adeudo|recibo|disposicion)\s+((en|con|de|tarj\.?|tarjeta|movil|contactless|internet|comercio|recibo|domiciliado|sepa|cajero)\s+)*/i, '')
      .replace(/^(en|de)\s+/i, '')
      .replace(/\b\d{1,2}[\/\-.]\d{1,2}([\/\-.]\d{2,4})?\b/g, ' ')
      .replace(/\b(fecha|ref|referencia|autoriz|aut)[:.]?\s*\S*/gi, ' ')
      .replace(/\s+/g, ' ').trim();
    if (/^transferencia/i.test(s)) return titleCase(s.replace(/\s+(a favor de|de|a)\s+/i, ' a ').slice(0, 40));
    if (/^bizum/i.test(s)) return 'Bizum ' + titleCase(s.replace(/^bizum\s*(a favor de|de|a|recibido de|enviado a)?\s*/i, '').split(/\s+concepto\s+/i)[0].slice(0, 30)).trim();
    const n = ' ' + normalize(s) + ' ';
    let brand = null;
    if (plain) cats = [];
    for (const c of (cats || CATEGORIES)) for (const raw of (c.kw || [])) {
      const kw = normalize(raw);
      if (kw.length < 3 || GENERIC.has(kw)) continue;
      if (n.includes(' ' + kw + ' ') || (kw.length >= 6 && n.replace(/ /g, '').includes(kw.replace(/ /g, '')))) { if (!brand || kw.length > brand.length) brand = kw; }
    }
    if (brand) return titleCase(brand);
    s = s.replace(/\b(s\.?a\.?u?|s\.?l\.?u?|sociedad limitada)\.?\s*$/i, '').replace(/[,;].*$/, '').trim();
    const words = s.split(' ').filter(Boolean).slice(0, 4).join(' ');
    return titleCase(words || String(raw).trim().slice(0, 30));
  }

  function dupKey(e) { return e.date + '|' + Math.abs(e.amount) + '|' + (e.type || 'expense'); }
  /* Convierte filas en movimientos listos para revisar */
  function parseBankRows(rows, map, opts) {
    opts = opts || {};
    const cats = opts.cats || CATEGORIES, learned = opts.learned || {};
    const existing = new Map();
    for (const e of (opts.existing || [])) { const k = dupKey(e); existing.set(k, (existing.get(k) || 0) + 1); }
    const out = [];
    for (let r = map.headerRow + 1; r < rows.length; r++) {
      const row = rows[r]; if (!row) continue;
      const date = parseBankDate(row[map.date]);
      if (!date) continue;
      let amt;
      if (map.amount >= 0) amt = parseBankAmount(row[map.amount]);
      else {
        const d = parseBankAmount(row[map.debit]), c = parseBankAmount(row[map.credit]);
        amt = d ? -Math.abs(d) : (c ? Math.abs(c) : null);
      }
      if (!amt) continue;
      const raw = map.desc >= 0 ? String(row[map.desc] ?? '') : '';
      const type = amt > 0 ? 'income' : 'expense';
      const desc = cleanBankConcept(raw, cats, amt > 0) || 'Movimiento';
      const nraw = normalize(raw);
      const isIncome = type === 'income';
      const cat = isIncome ? 'ingreso' : guessCategory(desc, learned, cats) !== 'otros' ? guessCategory(desc, learned, cats) : guessCategory(raw, learned, cats);
      const item = { date, amount: Math.abs(amt), desc, raw: raw.trim(), type, cat };
      const k = dupKey(item);
      const dup = (existing.get(k) || 0) > 0;
      if (dup) existing.set(k, existing.get(k) - 1);
      item.dup = dup;
      item.transfer = /traspaso|transferencia.*(propia|entre cuentas)|tarjeta credito liquidacion|liquidacion tarjeta/.test(nraw);
      out.push(item);
    }
    return out.sort((a, b) => b.date.localeCompare(a.date));
  }

  /* ---------------- Notificaciones del banco (Android) ---------------- */
  const KNOWN_BANK_APPS = {
    'com.bbva.bbvacontigo': 'BBVA', 'es.bancosantander.apps': 'Santander', 'es.lacaixa.mobile.android.newwapicon': 'CaixaBank',
    'com.imaginbank.app': 'imagin', 'www.ingdirect.nativeframe': 'ING', 'es.openbank.mobile': 'Openbank',
    'net.inverline.bancosabadell.officelocator.android': 'Sabadell', 'com.bankinter.launcher': 'Bankinter', 'es.evobanco.bancamovil': 'EVO',
    'es.ibercaja.ibercajaapp': 'Ibercaja', 'com.revolut.revolut': 'Revolut', 'de.number26.android': 'N26', 'com.transferwise.android': 'Wise',
    'com.paypal.android.p2pmobile': 'PayPal', 'com.google.android.apps.walletnfcrel': 'Google Wallet',
  };
  const BANKISH = /bank|banco|bbva|santander|caixa|ing|openbank|sabadell|bankinter|unicaja|kutxa|abanca|ibercaja|cajamar|rural|ruralvia|revolut|number26|n26|imagin|evo|wizink|myinvestor|paypal|bizum|pibank|triodos|deutsche|wise|transferwise|wallet|pay|cecabank|laboral|cajasur|liberbank|sabadell|mediolanum|selfbank|renta4|vivid|bunq/i;

  const CUR_AMT = /([-−+]\s*)?(\d{1,3}(?:[.\s ]\d{3})+(?:,\d{1,2})?|\d+(?:[.,]\d{1,2})?)\s*(?:€|eur(?:os)?\b)|(?:€|eur)\s*([-−+]?\s*\d{1,3}(?:[.\s]\d{3})*(?:[.,]\d{1,2})?|[-−+]?\s*\d+(?:[.,]\d{1,2})?)/gi;
  const RE_IGNORE = /(c[oó]digo|clave|contrase[ñn]a|\botp\b|verifica|confirma (la|tu|el|esta)|confirmar (la|tu|el)|¿autorizas|autoriza(r)? (la|el|esta)|aprueba|aprobar|firma(r)? (la|el)|pendiente de (confirmar|firma|autoriza)|denegad|rechazad|cancelad|anulad|no se ha podido|no hemos podido|fallid|tu saldo|saldo disponible|saldo actual|oferta|promoci|sorteo|\bgana\b|\bpuntos\b|l[ií]mite|preconcedid|pr[eé]stamo de hasta|financia)/i;
  const RE_INCOME = /(recibid|has recibido|te (ha|han) (enviado|ingresado|devuelto|hecho|pagado|transferido)|ingreso|abono|abonad|n[oó]mina|devoluci|devuelt|reembols|a tu favor|has cobrado|te han pagado)/i;
  const RE_EXPENSE = /(pago|pagad|pagaste|compra|cargo|cargad|cobrad|cobro|enviad|has enviado|retirad|reintegro|recibo|adeudo|domicilia|transferencia (enviada|emitida|realizada)|has hecho|operaci[oó]n con (tu |la )?tarjeta|suscripci|gasto|has gastado)/i;
  const STOP = '(?=\\s+(?:con|por|el d[ií]a|el \\d|a las|desde|mediante|usando|tarjeta|terminada|concepto|y\\s|para|en (?:tu|su|la|el) )\\b|\\s*[.,;·(\\[|]|\\s+-\\s|$)';
  const GENERIC_TITLE = /(pago|compra|bizum|transferencia|movimiento|operaci|cargo|ingreso|aviso|notificaci|tarjeta|cuenta|banco|recibid|enviad|realizad|cobro|recibo|alerta|gasto|nueva|nuevo|actividad|has |te han)/i;

  function cleanParty(s) {
    if (!s) return '';
    s = s.replace(/\s+/g, ' ').replace(/\b(terminada en|acabada en)\s*\d+/i, '').replace(/[*•·x]{2,}\s*\d{2,4}/gi, '')
      .replace(/\b(s\.?\s?l\.?u?|s\.?\s?a\.?u?)\.?$/i, '').replace(/[.:\s]+$/, '').trim();
    if (/^(tu|su|la|el|mi|una?)\s+(cuenta|tarjeta)/i.test(s) || /^(tu|su|tus)\b/i.test(s)) return '';
    if (s.length > 42) s = s.slice(0, 42).replace(/\s+\S*$/, '');
    return s === s.toUpperCase() ? titleCase(s) : s;
  }
  function firstMatch(text, re) { const m = text.match(re); return m ? cleanParty(m[1]) : ''; }

  /* Interpreta una notificación: { package, apptitle (título), title (ticker), text, textlines, time } */
  function parseBankNotification(n, cats, learned) {
    cats = cats || CATEGORIES;
    let lines = n.textlines;
    if (typeof lines === 'string') { try { lines = JSON.parse(lines); } catch (e) { lines = [lines]; } }
    const parts = [];
    for (const p of [n.apptitle, n.title, n.text].concat(Array.isArray(lines) ? lines : [])) {
      const t = String(p || '').trim();
      if (t && !parts.some(x => x.includes(t))) { for (let i = parts.length - 1; i >= 0; i--) if (t.includes(parts[i])) parts.splice(i, 1); parts.push(t); }
    }
    const full = parts.join(' · ');
    const res = { ok: false, raw: full, pkg: n.package || '' };
    if (!full) return res;
    if (RE_IGNORE.test(full)) { res.ignored = 'no es un movimiento'; return res; }

    // importe
    CUR_AMT.lastIndex = 0;
    let m = CUR_AMT.exec(full), sign = '', num = null;
    if (m) { sign = (m[1] || '').trim() || ((m[3] || '').trim().match(/^[-−+]/) || [''])[0]; num = (m[2] || m[3] || '').replace(/^[-−+]\s*/, '').replace(/[\s ]/g, '.'); }
    else { const im = full.match(/importe(?: de)?:?\s*([-−]?\d+(?:[.,]\d{1,2})?)/i); if (im) { num = im[1].replace(/^[-−]/, ''); sign = /^[-−]/.test(im[1]) ? '-' : ''; } }
    if (!num) { res.ignored = 'sin importe'; return res; }
    const amount = parseAmountStr(num);
    if (!amount || amount <= 0) { res.ignored = 'sin importe'; return res; }

    // sentido
    let type = null;
    if (sign === '-' || sign === '−') type = 'expense';
    else if (sign === '+') type = 'income';
    else if (RE_INCOME.test(full)) type = 'income';
    else if (RE_EXPENSE.test(full)) type = 'expense';
    else if (/wallet|pay|tpv/i.test(n.package || '')) type = 'expense';

    // contraparte
    const t = full.replace(CUR_AMT, ' ¤ ');
    const isBizum = /bizum/i.test(t), isTransfer = /transferencia|traspaso/i.test(t), isCash = /retirada|reintegro|cajero/i.test(t);
    let party = '', concept = firstMatch(t, new RegExp('concepto:?\\s+(.+?)' + '(?=\\s*[.;·|]|$)', 'i'));
    if (type === 'income') party = firstMatch(t, new RegExp('\\b(?:de|desde|por parte de)\\s+(?!¤|tu\\b|su\\b|la cuenta)([A-ZÁÉÍÓÚÑ0-9][^·]*?)' + STOP)) || firstMatch(t, /(?:^|·\s*)([A-ZÁÉÍÓÚÑ][^·]*?)\s+te ha/);
    else if (isBizum || isTransfer) party = firstMatch(t, new RegExp('\\b(?:a|para)\\s+(?!¤|tu\\b|su\\b|la cuenta|las\\b)([A-ZÁÉÍÓÚÑ][^·]*?)' + STOP));
    if (!party && !isBizum && !isTransfer && !isCash) party = firstMatch(t, new RegExp('\\b(?:en el comercio|comercio:?|en)\\s+(?!¤|tu\\b|su\\b|la cuenta|el cajero|cajero)([A-ZÁÉÍÓÚÑ0-9][^·]*?)' + STOP, 'i'));
    if (!party && !isBizum && !isTransfer) party = firstMatch(t, /\brecibo de\s+([^·]+?)(?=\s+(?:por|con)\b|[.,·]|$)/i);
    if (!party && n.apptitle && !GENERIC_TITLE.test(n.apptitle) && !/[€\d]{3,}/.test(n.apptitle) && !(KNOWN_BANK_APPS[n.package] && normalize(n.apptitle).includes(normalize(KNOWN_BANK_APPS[n.package])))) party = cleanParty(n.apptitle);
    if (!party && !isBizum && !isTransfer && !isCash) { const b = cleanBankConcept(t.replace(/¤/g, ' '), cats); if (b && guessCategory(b, learned, cats) !== 'otros' && b.split(' ').length <= 3) party = b; }

    let desc, cat;
    const brand = party && !isBizum && !isTransfer ? cleanBankConcept(party, cats) : party;
    if (isCash && type !== 'income') { desc = 'Retirada de efectivo'; }
    else if (isBizum) desc = 'Bizum ' + (type === 'income' ? 'de ' : 'a ') + (party || '?');
    else if (isTransfer) desc = 'Transferencia ' + (type === 'income' ? 'de ' : 'a ') + (party || '?');
    else if (type === 'income' && /devoluci|devuelt|reembols/i.test(t)) desc = 'Devolución' + (brand ? ' ' + brand : '');
    else if (type === 'income' && /n[oó]mina/i.test(t)) desc = 'Nómina' + (party ? ' ' + party : '');
    else if (type === 'income') desc = (/pago/i.test(t) ? 'Pago de ' : 'Ingreso de ') + (party || '?');
    else desc = brand || 'Pago con tarjeta';
    desc = desc.replace(/ \?$/, '');
    if (type === 'income') cat = 'ingreso';
    else {
      const g1 = guessCategory(desc, learned, cats), g2 = concept ? guessCategory(concept, learned, cats) : 'otros';
      cat = (isBizum || isTransfer) && g2 !== 'otros' ? g2 : (g1 !== 'otros' ? g1 : g2);
    }
    if (concept && (isBizum || isTransfer)) desc += ' (' + concept.toLowerCase() + ')';

    const when = n.time && n.time > 1e12 ? new Date(n.time) : new Date();
    Object.assign(res, { ok: true, amount, type: type || 'expense', typeKnown: !!type, desc, cat, date: toISO(when), ts: +when,
      confidence: type && (party || isCash) ? 'high' : type ? 'medium' : 'low', party, concept, bank: KNOWN_BANK_APPS[n.package] || '' });
    return res;
  }
  function looksLikeMoney(text) { CUR_AMT.lastIndex = 0; return CUR_AMT.test(String(text || '')); }

  const api = { KNOWN_BANK_APPS, BANKISH, parseBankNotification, looksLikeMoney, parseCSV, parseBankDate, parseBankAmount, detectBankColumns, cleanBankConcept, parseBankRows, CATEGORIES, INCOME_CAT, normalize, toISO, fromISO, daysBetween, parseAmountStr, guessCategory, parseQuick,
    buildSuggestions, autocomplete, detectRecurring, detectHabits, parseReceipt, groupByDesc };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.Core = api;
})(typeof window !== 'undefined' ? window : globalThis);
