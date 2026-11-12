/* Calderilla service worker: modo sin conexión + avisos en Android sin servidor.
   Sube VERSION cada vez que publiques cambios. */
const VERSION = 'calderilla-v4';
const SHELL = ['./', 'index.html', 'styles.css', 'app.js', 'parser.js', 'manifest.webmanifest', 'icon.svg', 'icon-192.png', 'icon-512.png', 'badge.png', 'vendor/capacitor.js'];
const KEEP = [VERSION, 'calderilla-ocr', 'calderilla-sw'];

self.addEventListener('install', e => { e.waitUntil(caches.open(VERSION).then(c => c.addAll(SHELL)).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => !KEEP.includes(k)).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.pathname.endsWith('__calderilla_state')) return;
  if (url.origin === location.origin) {
    e.respondWith(fetch(e.request).then(r => { const copy = r.clone(); caches.open(VERSION).then(c => c.put(e.request, copy)); return r; })
      .catch(() => caches.match(e.request, { ignoreSearch: true }).then(r => r || caches.match('index.html'))));
  } else if (url.origin === 'https://cdn.jsdelivr.net' && url.pathname.startsWith('/npm/@tesseract.js-data/spa/4.0.0_best_int/')) {
    // diccionario del OCR (datos, versión fija): se descarga una vez y queda guardado
    e.respondWith(caches.open('calderilla-ocr').then(c => c.match(e.request).then(hit => hit || fetch(e.request).then(r => { if (r.ok) c.put(e.request, r.clone()); return r; }))));
  }
});

/* ---- Avisos: Android despierta al SW varias veces al día (Periodic Background Sync) ---- */
const pad = n => String(n).padStart(2, '0');
const iso = d => d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
const money = c => new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(c / 100);

async function check() {
  const c = await caches.open('calderilla-sw');
  const stateUrl = new URL('__calderilla_state', self.registration.scope).href;
  const sentUrl = new URL('__calderilla_sent', self.registration.scope).href;
  const r = await c.match(stateUrl); if (!r) return;
  const st = await r.json();
  const sentR = await c.match(sentUrl); const sent = sentR ? await sentR.json() : {};
  const now = new Date(), today = iso(now);
  const tomorrow = new Date(now); tomorrow.setDate(now.getDate() + 1);
  const jobs = [];

  if (st.notif && st.notif.daily && now.getHours() >= (st.notif.hour || 21) && now.getHours() < 24 && !st.recentDates.includes(today) && sent.daily !== today) {
    sent.daily = today;
    jobs.push(self.registration.showNotification('¿Apuntamos lo de hoy?', {
      body: 'Hoy no has anotado ningún gasto. Son dos segundos 😉', icon: 'icon-192.png', badge: 'badge.png', tag: 'daily', data: { url: './?add' } }));
  }
  if (st.notif && st.notif.subs) {
    for (const u of st.upcoming || []) {
      const k = 'sub:' + u.key + ':' + u.next;
      if (u.next === iso(tomorrow) && !sent[k]) {
        sent[k] = today;
        jobs.push(self.registration.showNotification('Mañana te cobran ' + u.desc, {
          body: money(u.amount) + '. ¿Lo sigues usando? Si no, es buen momento para darlo de baja.', icon: 'icon-192.png', badge: 'badge.png', tag: k, data: { url: './#analisis' } }));
      }
    }
  }
  // limpia registros antiguos
  for (const k of Object.keys(sent)) if (k !== 'daily' && sent[k] < iso(new Date(now - 40 * 864e5))) delete sent[k];
  await c.put(sentUrl, new Response(JSON.stringify(sent)));
  await Promise.all(jobs);
}
self.addEventListener('periodicsync', e => { if (e.tag === 'calderilla-check') e.waitUntil(check()); });
self.addEventListener('notificationclick', e => {
  e.notification.close();
  const target = new URL((e.notification.data && e.notification.data.url) || './', self.registration.scope).href;
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
    for (const w of list) if ('focus' in w) { w.navigate(target).catch(() => {}); return w.focus(); }
    return self.clients.openWindow(target);
  }));
});
