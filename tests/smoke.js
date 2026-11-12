'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const files = [
  'js/format.js',
  'js/glosarium.js',
  'js/store.js',
  'js/ledger.js',
  'js/report.js',
  'js/roles.js',
  'js/auth.js',
  'js/numbering.js',
  'js/master.js',
  'js/inventory.js',
  'js/purchasing.js',
  'js/receiving.js',
  'js/returns.js',
  'js/reconcile.js',
  'js/seed.js',
  'js/seed-purchasing.js',
  'js/overlays.js',
  'js/pages-purchasing.js',
  'js/app.js',
  'js/selftest.js',
  'js/selftest-purchasing.js'
];

const storage = {};
const localStorage = {
  getItem(key) { return Object.prototype.hasOwnProperty.call(storage, key) ? storage[key] : null; },
  setItem(key, value) { storage[key] = String(value); },
  removeItem(key) { delete storage[key]; }
};

const stores = {};
const dataFactories = {};
const Alpine = {
  store(name, value) {
    if (arguments.length > 1) {
      stores[name] = value;
      return value;
    }
    return stores[name];
  },
  data(name, factory) {
    dataFactories[name] = factory;
  },
  directive() {}
};

const context = {
  console,
  Date,
  Math,
  JSON,
  parseInt,
  parseFloat,
  isFinite,
  String,
  Number,
  Object,
  Array,
  Boolean,
  RegExp,
  setTimeout,
  clearTimeout,
  localStorage,
  location: { hash: '', search: '' },
  history: { replaceState() {} },
  Alpine
};
context.globalThis = context;
context.window = undefined;
context.document = undefined;
vm.createContext(context);

files.forEach((file) => {
  const code = fs.readFileSync(path.join(root, file), 'utf8');
  vm.runInContext(code, context, { filename: file });
});

context.AkunApp.registerAlpine();

const auth = stores.auth;
const app = stores.app;
app.replaceData(context.SeedPurchasing.scenario());

function instantiate(name) {
  const factory = dataFactories[name];
  if (!factory) throw new Error(`Alpine.data ${name} tidak terdaftar`);
  const component = factory();
  component.$store = { app, auth };
  component.$watch = function () {};
  component.$refs = {};
  component.$nextTick = function (fn) { if (fn) fn(); };
  if (typeof component.init === 'function') component.init();
  return component;
}

function check(label, fn) {
  try {
    const value = fn();
    console.log(`OK   ${label}${value === undefined ? '' : ' -> ' + JSON.stringify(value)}`);
  } catch (error) {
    console.error(`FAIL ${label}: ${error.stack || error.message}`);
    process.exitCode = 1;
  }
}

check('Finance menu terfilter', () => {
  auth.setRole('finance');
  return app.visibleMenu.map((item) => item.id);
});
check('Logistik menu terfilter', () => {
  auth.setRole('logistik');
  return app.visibleMenu.map((item) => item.id);
});
check('Role guard mengalihkan halaman terlarang', () => {
  auth.setRole('finance');
  app.page = 'masterBarang';
  app.ensurePageAllowed();
  return app.page;
});
check('Dashboard Finance', () => {
  auth.setRole('finance');
  const page = instantiate('dashboardPage');
  return [page.kas, page.piutang, page.utang, page.pendingPR, page.pendingPO, page.lowStock.length, page.piutangSupplier, page.reconcile.ok];
});
check('Dashboard Logistik', () => {
  auth.setRole('logistik');
  const page = instantiate('dashboardPage');
  return [page.role, page.pendingPR, page.pendingPO, page.openPO, page.lowStock.length, page.reconcile.ok];
});
check('Persetujuan page', () => {
  auth.setRole('finance');
  const page = instantiate('persetujuanPage');
  return [page.prs.length, page.pos.length, page.pendingPR.length, page.pendingPO.length];
});
check('Master Barang page', () => {
  auth.setRole('logistik');
  const page = instantiate('masterBarangPage');
  return [page.categories.length, page.units.length, page.rows.length];
});
check('Master Supplier page', () => {
  auth.setRole('logistik');
  const page = instantiate('masterSupplierPage');
  return [page.suppliers.length, page.items.length];
});
check('Master Pendukung page', () => {
  auth.setRole('logistik');
  const page = instantiate('masterPendukungPage');
  return [page.kategoris.length, page.satuans.length, page.gudangs.length];
});
check('Purchase Request page', () => {
  auth.setRole('logistik');
  const page = instantiate('purchaseRequestPage');
  return [page.items.length, page.list.length, page.list[0].status];
});
check('Purchase Order page', () => {
  auth.setRole('logistik');
  const page = instantiate('purchaseOrderPage');
  return [page.suppliers.length, page.approvedPRs.length, page.list.length, page.list[0].status];
});
check('Receiving page', () => {
  auth.setRole('logistik');
  const page = instantiate('receivingPage');
  return [page.gudangs.length, page.receipts.length, page.receipts[0].status];
});
check('Retur page', () => {
  auth.setRole('logistik');
  const page = instantiate('returPage');
  return [page.receipts.length, page.returns.length];
});
check('Stock page', () => {
  auth.setRole('logistik');
  const page = instantiate('stockPage');
  return [page.rows.length, page.totalNilai, page.reconcile.ok];
});

console.log(`\nRoles: ${auth.roles.map((role) => role.id).join(', ')}`);
