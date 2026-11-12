'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const root = path.resolve(__dirname, '..');
const files = [
  'js/format.js','js/glosarium.js','js/store.js','js/ledger.js','js/report.js','js/roles.js','js/auth.js',
  'js/numbering.js','js/master.js','js/inventory.js','js/purchasing.js','js/receiving.js','js/returns.js','js/reconcile.js',
  'js/seed.js','js/seed-purchasing.js','js/overlays.js','js/pages-purchasing.js','js/app.js'
];
const storage = {};
const localStorage = { getItem:k=>Object.prototype.hasOwnProperty.call(storage,k)?storage[k]:null, setItem:(k,v)=>{storage[k]=String(v);}, removeItem:k=>{delete storage[k];} };
const stores = {}, factories = {};
const Alpine = { store(n,v){ if(arguments.length>1){stores[n]=v;return v;} return stores[n]; }, data(n,f){factories[n]=f;}, directive(){} };
const context = { console, Date, Math, JSON, parseInt, parseFloat, isFinite, String, Number, Object, Array, Boolean, RegExp, setTimeout, clearTimeout, localStorage, location:{hash:'',search:''}, history:{replaceState(){}}, Alpine };
context.globalThis=context; context.window=undefined; context.document=undefined;
vm.createContext(context);
files.forEach(f=>vm.runInContext(fs.readFileSync(path.join(root,f),'utf8'),context,{filename:f}));
context.AkunApp.registerAlpine();
const auth=stores.auth, app=stores.app;
function make(name){ const c=factories[name](); c.$store={app,auth}; c.$watch=function(){}; c.$refs={}; c.$nextTick=function(fn){if(fn)fn();}; if(c.init)c.init(); return c; }
function assert(name, actual, expected){ const ok=actual===expected; console.log((ok?'OK   ':'FAIL ')+name+': '+JSON.stringify(actual)+(ok?'':' expected '+JSON.stringify(expected))); if(!ok)process.exitCode=1; }
app.replaceData(context.SeedPurchasing.master());
auth.setRole('logistik');
const prPage=make('purchaseRequestPage');
prPage.openAdd(); prPage.form.tanggal='2026-11-02'; prPage.form.keperluan='Uji action';
prPage.form.lines=[{barangId:context.SeedPurchasing.BRG_SEMEN,qty:10,catatan:''},{barangId:context.SeedPurchasing.BRG_CAT,qty:2,catatan:''}];
prPage.save();
const pr=app.db.purchaseRequests[0];
assert('PR dibuat', pr ? pr.status : null, 'draft');
prPage.submit(pr);
assert('PR diajukan', pr.status, 'diajukan');
auth.setRole('finance');
const approval=make('persetujuanPage'); approval.approvePR(pr);
assert('PR disetujui', pr.status, 'disetujui');
auth.setRole('logistik');
const poPage=make('purchaseOrderPage'); poPage.openAdd();
poPage.form.prId=pr.id; poPage.loadPR(); poPage.form.supplierId=context.Seed.PARTY_PEMASOK; poPage.onSupplierChange(); poPage.save();
const po=app.db.purchaseOrders[0];
assert('PO dibuat', po ? po.status : null, 'disetujui');
assert('Total PO', po ? po.total : null, 950000);
auth.setRole('finance'); approval.approvePO(po);
assert('PO disetujui', po.status, 'disetujui');
auth.setRole('logistik');
const recPage=make('receivingPage'); recPage.openAdd();
recPage.form.poId=po.id; recPage.loadPO();
assert('Baris penerimaan', recPage.form.lines.length, 2);
recPage.saveAndPost();
assert('PO diterima penuh', po.status, 'diterima_penuh');
assert('Stok semen', context.Inventory.qty(app.db, context.SeedPurchasing.BRG_SEMEN), 10);
assert('Stok cat', context.Inventory.qty(app.db, context.SeedPurchasing.BRG_CAT), 2);
assert('Tagihan utang', app.db.invoices.filter(i=>i.jenis==='utang').length, 1);
assert('Rekonsiliasi', context.Reconcile.ringkasan(app.db).ok, true);

const receipt = app.db.receipts[0];
const returPage = make('returPage');
returPage.openAdd(receipt.id);
assert('Baris retur tersedia', returPage.form.lines.length, 2);
returPage.form.jenis = 'potong_invoice';
returPage.form.alasan = 'Uji retur';
const catReturnLine = returPage.form.lines.find(l => l.barangId === context.SeedPurchasing.BRG_CAT);
catReturnLine.qty = 1;
returPage.saveDraft();
const returPotong = app.db.purchaseReturns[0];
returPage.confirm(returPotong);
app.confirmDialog();
assert('Retur potong terkonfirmasi', returPotong.status, 'confirmed');
assert('Stok cat setelah retur potong', context.Inventory.qty(app.db, context.SeedPurchasing.BRG_CAT), 1);

returPage.openAdd(receipt.id);
returPage.form.jenis = 'ganti_barang';
returPage.form.alasan = 'Uji ganti';
const catGantiLine = returPage.form.lines.find(l => l.barangId === context.SeedPurchasing.BRG_CAT);
catGantiLine.qty = 1;
returPage.saveDraft();
const returGanti = app.db.purchaseReturns[1];
returPage.confirm(returGanti);
app.confirmDialog();
assert('Stok cat setelah retur ganti', context.Inventory.qty(app.db, context.SeedPurchasing.BRG_CAT), 0);
assert('Piutang supplier sebelum pengganti', context.Returns.piutangSupplierBalance(app.db), 150000);
returPage.openReplacement(returGanti);
returPage.postReplacement();
assert('Stok cat setelah pengganti', context.Inventory.qty(app.db, context.SeedPurchasing.BRG_CAT), 1);
assert('Piutang supplier setelah pengganti', context.Returns.piutangSupplierBalance(app.db), 0);

const barangPage = make('masterBarangPage');
barangPage.openAdd();
barangPage.form.nama = 'Barang uji dirty';
barangPage.requestClose();
assert('Konfirmasi dirty muncul', app.dialog.open, true);
app.confirmDialog();
assert('Form ditutup setelah konfirmasi', barangPage.adding, false);
barangPage.openAdd();
barangPage.requestClose();
assert('Form bersih langsung ditutup', barangPage.adding, false);
assert('Dialog tidak muncul untuk form bersih', app.dialog.open, false);
