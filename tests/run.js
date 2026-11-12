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
console.log('OK: todas las pruebas pasan');
