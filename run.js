/* Pruebas mínimas: si alguna falla, GitHub no publica el APK */
const assert = require('assert');
const H = require('../www/parser.js');
const T = Date.now();
const n = (pkg, title, text) => H.parseBankNotification({ package: pkg, apptitle: title, title: '', text, textlines: [], time: T });
let r;
r = n('com.bbva.bbvacontigo', 'Pago con tarjeta', 'Has pagado 12,50 € en MERCADONA con tu tarjeta'); assert(r.ok && r.amount === 1250 && r.type === 'expense' && r.desc === 'Mercadona' && r.cat === 'super');
r = n('x', 'Bizum recibido', 'Has recibido un Bizum de 20,00 € de MARIA LOPEZ'); assert(r.ok && r.type === 'income' && /Maria Lopez/.test(r.desc));
r = n('x', 'Transferencia', 'Te han ingresado 1.850,00 € de EMPRESA SL en tu cuenta'); assert(r.ok && r.amount === 185000 && r.type === 'income');
r = n('x', 'Banco', 'Tu código para confirmar la compra de 50,00 € es 123456'); assert(!r.ok);
r = n('x', 'Banco', 'Tu saldo es 1.234,56 €'); assert(!r.ok);
r = n('com.google.android.apps.walletnfcrel', 'Mercadona', '12,50 € con Visa •• 1234'); assert(r.ok && r.type === 'expense' && r.desc === 'Mercadona');
r = H.parseQuick('café 1,80'); assert(r.amount === 180 && r.cat === 'cafe');
const rows = H.parseCSV('Fecha;Concepto;Importe\n12/11/2026;COMPRA TARJ. 1234XXXXXXXX5678 MERCADONA;-45,30\n');
const map = H.detectBankColumns(rows); const items = H.parseBankRows(rows, map, {});
assert(items.length === 1 && items[0].desc === 'Mercadona' && items[0].amount === 4530);
// Gasto compartido
r = H.parseQuick('cena 100 entre 4'); assert(r.amount === 10000 && r.splitN === 4 && r.desc === 'Cena', JSON.stringify(r));
r = H.parseQuick('taxi 30 a medias'); assert(r.amount === 3000 && r.splitN === 2 && r.desc === 'Taxi');
r = H.parseQuick('súper 45 ayer'); assert(!r.splitN && r.amount === 4500);
{
  const today = H.toISO(new Date());
  const cena = { id: 'a', type: 'expense', date: today, amount: 2500, split: { total: 10000, people: [
    { id: 'p1', name: 'Laura', amount: 2500, paid: false }, { id: 'p2', name: 'Pablo Ruiz', amount: 2500, paid: false }, { id: 'p3', name: '', amount: 2500, paid: false }] } };
  let m = H.matchSplit({ amount: 2500, party: 'LAURA GOMEZ', date: today }, [cena]); assert(m && m.p.id === 'p1');
  m = H.matchSplit({ amount: 2400, desc: 'Bizum de Pablo (cena)', date: today }, [cena]); assert(m && m.p.id === 'p2');
  m = H.matchSplit({ amount: 2500, party: 'Marta', date: today }, [cena]); assert(m && m.p.id === 'p3');   // sin nombre, importe exacto
  m = H.matchSplit({ amount: 999, party: 'Laura', date: today }, [cena]); assert(!m);
  cena.split.people.forEach(p => p.paid = true);
  assert(!H.matchSplit({ amount: 2500, party: 'Laura', date: today }, [cena]));
}
// Pagos programados
r = H.parseQuick('netflix 12,99 mensual'); assert(r.amount === 1299 && r.freq === 'month' && r.desc === 'Netflix', JSON.stringify(r));
r = H.parseQuick('gimnasio 40 cada mes'); assert(r.freq === 'month' && r.desc === 'Gimnasio');
r = H.parseQuick('clases 25 cada semana'); assert(r.freq === 'week' && r.amount === 2500);
r = H.parseQuick('seguro coche 300 al año'); assert(r.freq === 'year' && r.desc === 'Seguro coche');
assert(H.nextDate('2026-01-31', 'month', 31) === '2026-02-28' && H.nextDate('2026-02-28', 'month', 31) === '2026-03-31');
assert(H.nextDate('2026-11-16', 'week') === '2026-11-23' && H.nextDate('2024-02-29', 'year', 29) === '2025-02-28');
console.log('OK: todas las pruebas pasan');
