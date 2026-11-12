(function (global) {
  'use strict';

  var Ledger = global.Ledger;
  var Report = global.Report;
  var Roles = global.Roles;
  var Store = global.Store;
  var Inventory = global.Inventory;
  var Reconcile = global.Reconcile;
  var Returns = global.Returns;
  var SeedPurchasing = global.SeedPurchasing;
  var Format = global.Format;

  function run() {
    var results = [];

    function assert(name, actual, expected) {
      results.push({
        name: name,
        actual: actual,
        expected: expected,
        ok: actual === expected
      });
    }

    var state = SeedPurchasing.scenario();
    var semen = SeedPurchasing.BRG_SEMEN;
    var cat = SeedPurchasing.BRG_CAT;
    var po = state.purchaseOrders[0];
    var pr = state.purchaseRequests[0];

    assert('Jumlah barang dummy', state.barang.length, 10);
    assert('Jumlah supplier dummy', state.parties.filter(function (party) {
      return party.jenis === 'pemasok';
    }).length, 4);
    assert('Jumlah kategori dummy', state.kategoris.length, 6);
    assert('Jumlah satuan dummy', state.satuans.length, 8);
    assert('Jumlah gudang dummy', state.gudangs.length, 2);

    assert('Role Finance bisa melihat Persetujuan', Roles.canView('finance', 'persetujuan'), true);
    assert('Role Finance tidak bisa melihat Master Barang', Roles.canView('finance', 'masterBarang'), false);
    assert('Role Logistik bisa melihat Master Barang', Roles.canView('logistik', 'masterBarang'), true);
    assert('Role Logistik tidak bisa melihat Jurnal', Roles.canView('logistik', 'jurnal'), false);
    assert('Finance boleh menyetujui PR', Roles.can('finance', 'pr.approve'), true);
    assert('Logistik tidak boleh menyetujui PR', Roles.can('logistik', 'pr.approve'), false);
    assert('Logistik boleh posting penerimaan', Roles.can('logistik', 'receipt.post'), true);
    assert('Finance tidak boleh posting penerimaan', Roles.can('finance', 'receipt.post'), false);

    var persediaan = Ledger.accountByKode(state, '1-1300');
    var utang = Ledger.accountByKode(state, '2-1100');
    assert('Akun Persediaan dikunci', persediaan ? persediaan.dikunci : null, true);
    assert('Akun Utang Usaha dikunci', utang ? utang.dikunci : null, true);

    var legacy = global.Seed.scenario();
    legacy.accounts.forEach(function (account) { delete account.dikunci; });
    legacy.settings = undefined;
    var migrated = Store.normalize(legacy);
    assert('Migrasi mengunci akun Persediaan', Ledger.accountByKode(migrated, '1-1300').dikunci, true);
    assert('Migrasi membuat settings default', migrated.settings.ambangPersetujuanPO, 5000000);

    assert('PR selesai dipesan', pr ? pr.status : null, 'selesai');
    assert('PO diterima penuh', po ? po.status : null, 'diterima_penuh');
    assert('Total PO', po ? po.total : null, 9500000);
    assert('Jumlah penerimaan', state.receipts.length, 2);
    assert('Semua penerimaan posted', state.receipts.every(function (receipt) {
      return receipt.status === 'posted';
    }), true);

    assert('Stok Semen', Inventory.qty(state, semen), 100);
    assert('Stok Cat', Inventory.qty(state, cat), 20);
    assert('Nilai persediaan', Inventory.totalNilai(state), 9500000);
    assert('Saldo akun Persediaan', Report.saldoAkun(state, persediaan.id, null, null), 9500000);
    assert('Saldo akun Utang Usaha', Report.saldoAkun(state, utang.id, null, null), 9500000);
    assert('Saldo Bank BCA', Report.saldoAkun(state, Ledger.accountByKode(state, '1-1110').id, null, null), 50000000);
    assert('Jumlah tagihan utang', state.invoices.filter(function (invoice) {
      return invoice.jenis === 'utang';
    }).length, 2);
    assert('Sisa tagihan supplier', state.invoices.reduce(function (sum, invoice) {
      return sum + Report.sisaTagihan(state, invoice.id);
    }, 0), 9500000);

    var reconcile = Reconcile.ringkasan(state);
    assert('Rekonsiliasi stok selisih 0', reconcile.stok.selisih, 0);
    assert('Rekonsiliasi utang selisih 0', reconcile.utang.selisih, 0);
    assert('Rekonsiliasi purchasing seimbang', reconcile.ok, true);

    var allJournalsBalanced = state.journals.every(function (journal) {
      var lines = state.journalLines.filter(function (line) { return line.journalId === journal.id; });
      return Ledger.totals(lines).selisih === 0;
    });
    assert('Semua jurnal purchasing seimbang', allJournalsBalanced, true);
    assert('Jurnal penerimaan punya sumber', state.journals.filter(function (journal) {
      return journal.sumber === 'penerimaan';
    }).length, 2);
    assert('Tanggal jatuh tempo tagihan', state.invoices[0].jatuhTempo, Format.addDays('2026-11-05', 30));

    var receiptOne = state.receipts[0];
    var catReceiptLine = state.receiptLines.find(function (line) {
      return line.receiptId === receiptOne.id && line.barangId === cat;
    });
    var invoiceOne = state.invoices.find(function (invoice) {
      return invoice.refId === receiptOne.id && invoice.jenis === 'utang';
    });

    var createRetur = Returns.createReturn(state, {
      tanggal: '2026-11-08',
      receiptId: receiptOne.id,
      jenis: 'potong_invoice',
      alasan: 'Cat rusak',
      lines: [{ receiptLineId: catReceiptLine.id, qty: 5 }]
    }, SeedPurchasing.USER_LOGISTIK);
    assert('Retur potong invoice dibuat', createRetur.ok, true);
    var retur = createRetur.retur;
    var confirmRetur = Returns.confirmReturn(state, retur.id, SeedPurchasing.USER_LOGISTIK);
    assert('Retur potong invoice dikonfirmasi', confirmRetur.ok, true);
    assert('Stok Cat setelah retur', Inventory.qty(state, cat), 15);
    assert('Nilai persediaan setelah retur', Inventory.totalNilai(state), 8750000);
    assert('Saldo 1-1300 setelah retur', Report.saldoAkun(state, persediaan.id, null, null), 8750000);
    assert('Saldo 2-1100 setelah retur', Report.saldoAkun(state, utang.id, null, null), 8750000);
    assert('Sisa tagihan penerimaan 1 setelah retur', Report.sisaTagihan(state, invoiceOne.id), 6150000);
    assert('Potong AP retur', retur.potongAP, 750000);
    assert('Piutang supplier retur lunas', retur.piutangSupplier, 0);
    assert('Qty diretur tercatat', catReceiptLine.qtyDiretur, 5);
    assert('Jumlah jurnal retur', state.journals.filter(function (journal) {
      return journal.sumber === 'retur';
    }).length, 1);
    assert('Rekonsiliasi setelah retur', Reconcile.ringkasan(state).ok, true);

    var paidState = JSON.parse(JSON.stringify(SeedPurchasing.scenario()));
    var paidReceipt = paidState.receipts[0];
    var paidCatLine = paidState.receiptLines.find(function (line) {
      return line.receiptId === paidReceipt.id && line.barangId === cat;
    });
    var paidInvoice = paidState.invoices.find(function (invoice) {
      return invoice.refId === paidReceipt.id && invoice.jenis === 'utang';
    });
    var bank = Ledger.accountByKode(paidState, '1-1110');
    var paidUtang = Ledger.accountByKode(paidState, '2-1100');
    paidState.payments.push({
      id: 'pay_test',
      invoiceId: paidInvoice.id,
      tanggal: '2026-11-08',
      jumlah: paidInvoice.total,
      akunKasId: bank.id,
      jenis: 'bayar'
    });
    Ledger.createJournal(paidState, {
      tanggal: '2026-11-08',
      keterangan: 'Pembayaran uji retur',
      sumber: 'pembayaran',
      refId: 'pay_test',
      lines: [
        { accountId: paidUtang.id, debit: paidInvoice.total, kredit: 0 },
        { accountId: bank.id, debit: 0, kredit: paidInvoice.total }
      ]
    });
    var paidReturn = Returns.createReturn(paidState, {
      tanggal: '2026-11-09',
      receiptId: paidReceipt.id,
      jenis: 'potong_invoice',
      alasan: 'Rusak setelah pembayaran',
      lines: [{ receiptLineId: paidCatLine.id, qty: 5 }]
    }, SeedPurchasing.USER_LOGISTIK);
    assert('Retur setelah pembayaran dibuat', paidReturn.ok, true);
    var confirmPaid = Returns.confirmReturn(paidState, paidReturn.retur.id, SeedPurchasing.USER_LOGISTIK);
    assert('Retur setelah pembayaran dikonfirmasi', confirmPaid.ok, true);
    assert('Retur setelah pembayaran jadi piutang supplier', paidReturn.retur.piutangSupplier, 750000);
    assert('Saldo Piutang Supplier', Returns.piutangSupplierBalance(paidState), 750000);
    assert('Sisa tagihan sudah lunas', Report.sisaTagihan(paidState, paidInvoice.id), 0);
    assert('Status tagihan lunas setelah retur', Report.statusTagihan(paidInvoice.total, paidInvoice.total, 750000), 'lunas');
    assert('Rekonsiliasi setelah retur lunas', Reconcile.ringkasan(paidState).ok, true);

    var gantiState = JSON.parse(JSON.stringify(SeedPurchasing.scenario()));
    var gantiReceipt = gantiState.receipts[0];
    var gantiCatLine = gantiState.receiptLines.find(function (line) {
      return line.receiptId === gantiReceipt.id && line.barangId === cat;
    });
    var gantiUtang = Ledger.accountByKode(gantiState, '2-1100');
    var gantiCreate = Returns.createReturn(gantiState, {
      tanggal: '2026-11-08',
      receiptId: gantiReceipt.id,
      jenis: 'ganti_barang',
      alasan: 'Salah warna, minta ganti',
      lines: [{ receiptLineId: gantiCatLine.id, qty: 5 }]
    }, SeedPurchasing.USER_LOGISTIK);
    assert('Retur ganti barang dibuat', gantiCreate.ok, true);
    var gantiConfirm = Returns.confirmReturn(gantiState, gantiCreate.retur.id, SeedPurchasing.USER_LOGISTIK);
    assert('Retur ganti barang dikonfirmasi', gantiConfirm.ok, true);
    assert('Stok Cat setelah retur ganti', Inventory.qty(gantiState, cat), 15);
    assert('Piutang supplier retur ganti', Returns.piutangSupplierBalance(gantiState), 750000);
    assert('Utang tidak berubah pada retur ganti', Report.saldoAkun(gantiState, gantiUtang.id, null, null), 9500000);
    var gantiLine = Returns.returnLines(gantiState, gantiCreate.retur.id)[0];
    var replacement = Returns.createReplacementReceipt(gantiState, {
      returnId: gantiCreate.retur.id,
      tanggal: '2026-11-10',
      gudangId: SeedPurchasing.GDG_UTAMA,
      suratJalan: 'SJ-R1',
      lines: [{ returnLineId: gantiLine.id, qty: 5 }]
    }, SeedPurchasing.USER_LOGISTIK);
    assert('Penerimaan pengganti dibuat', replacement.ok, true);
    assert('Stok Cat setelah pengganti', Inventory.qty(gantiState, cat), 20);
    assert('Piutang supplier setelah pengganti', Returns.piutangSupplierBalance(gantiState), 0);
    assert('Utang tetap setelah pengganti', Report.saldoAkun(gantiState, gantiUtang.id, null, null), 9500000);
    assert('Status pengganti selesai', gantiCreate.retur.replacementStatus, 'selesai');
    assert('Rekonsiliasi setelah pengganti', Reconcile.ringkasan(gantiState).ok, true);

    var overState = JSON.parse(JSON.stringify(SeedPurchasing.scenario()));
    var overReceipt = overState.receipts[0];
    var overCatLine = overState.receiptLines.find(function (line) {
      return line.receiptId === overReceipt.id && line.barangId === cat;
    });
    var overReturn = Returns.createReturn(overState, {
      tanggal: '2026-11-08',
      receiptId: overReceipt.id,
      jenis: 'potong_invoice',
      alasan: 'Melebihi qty',
      lines: [{ receiptLineId: overCatLine.id, qty: 25 }]
    }, SeedPurchasing.USER_LOGISTIK);
    assert('Retur melebihi qty ditolak', overReturn.ok, false);

    var failed = results.filter(function (row) { return !row.ok; });
    return {
      ok: failed.length === 0,
      results: results,
      passed: results.length - failed.length,
      failed: failed.length,
      checkedAt: Format.todayISO()
    };
  }

  global.SelfTestPurchasing = { run: run };
})(typeof window !== 'undefined' ? window : globalThis);
