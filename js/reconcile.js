(function (global) {
  'use strict';

  var Ledger = global.Ledger;
  var Report = global.Report;
  var Inventory = global.Inventory;

  function persediaan(state) {
    var account = Ledger.accountByKode(state, '1-1300');
    var stockValue = Inventory.totalNilai(state);
    var ledgerValue = account ? Report.saldoAkun(state, account.id, null, null) : 0;
    return {
      akun: account,
      nilaiStok: stockValue,
      saldoBuku: ledgerValue,
      selisih: stockValue - ledgerValue,
      ok: stockValue === ledgerValue
    };
  }

  function utang(state) {
    var account = Ledger.accountByKode(state, '2-1100');
    var invoiceValue = state.invoices
      .filter(function (invoice) { return invoice.jenis === 'utang'; })
      .reduce(function (sum, invoice) {
        return sum + Report.sisaTagihan(state, invoice.id);
      }, 0);
    var ledgerValue = account ? Report.saldoAkun(state, account.id, null, null) : 0;
    return {
      akun: account,
      nilaiTagihan: invoiceValue,
      saldoBuku: ledgerValue,
      selisih: invoiceValue - ledgerValue,
      ok: invoiceValue === ledgerValue
    };
  }

  function ringkasan(state) {
    var stok = persediaan(state);
    var ap = utang(state);
    return {
      stok: stok,
      utang: ap,
      legacy: state.meta && state.meta.scenarioType === 'legacy',
      ok: stok.ok && ap.ok
    };
  }

  global.Reconcile = {
    persediaan: persediaan,
    utang: utang,
    ringkasan: ringkasan
  };
})(typeof window !== 'undefined' ? window : globalThis);
