(function (global) {
  'use strict';

  var Format = global.Format;
  var Ledger = global.Ledger;
  var Report = global.Report;
  var Seed = global.Seed;

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

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

    var state = Seed.scenario();
    var dari = '2026-11-01';
    var sampai = '2026-11-30';

    var lr = Report.labaRugi(state, dari, sampai);
    assert('Laba bersih November', lr.labaBersih, 1800000);
    assert('Total pendapatan', lr.totalPendapatan, 14000000);
    assert('Total HPP', lr.totalHpp, 8400000);
    assert('Total beban operasional', lr.totalBeban, 3800000);
    assert('Laba kotor', lr.labaKotor, 5600000);

    var nc = Report.neraca(state, sampai);
    assert('Total aset', nc.totalAset, 57800000);
    assert('Kas', Report.saldoAkun(state, 'acc_11100', null, sampai), 45200000);
    assert('Piutang Usaha', Report.saldoAkun(state, 'acc_11200', null, sampai), 4000000);
    assert('Persediaan Barang', Report.saldoAkun(state, 'acc_11300', null, sampai), 3600000);
    assert('Peralatan', Report.saldoAkun(state, 'acc_12100', null, sampai), 5000000);
    assert('Utang Usaha', Report.saldoAkun(state, 'acc_21100', null, sampai), 7000000);
    assert('Modal Pemilik', Report.saldoAkun(state, 'acc_31100', null, sampai), 50000000);
    assert('Prive (saldo normal debit)', Report.saldoAkun(state, 'acc_31200', null, sampai), 1000000);
    var priveRow = nc.ekuitas.find(function (row) { return row.akun.kode === '3-1200'; });
    assert('Prive mengurangi ekuitas', priveRow ? priveRow.jumlah : null, -1000000);
    assert('Laba berjalan', nc.labaBerjalan, 1800000);
    assert('Total kewajiban + ekuitas', nc.totalKewajibanEkuitas, 57800000);
    assert('Selisih neraca', nc.selisih, 0);
    assert('Neraca seimbang', nc.seimbang, true);

    var ns = Report.neracaSaldo(state, sampai);
    assert('Neraca saldo seimbang', ns.seimbang, true);
    assert('Total debit = total kredit', ns.totalDebit === ns.totalKredit, true);

    var aging = Report.umurPiutang(state, sampai);
    assert('Total umur piutang', aging.total, 4000000);
    assert('Sisa piutang Pelanggan B', Report.sisaTagihan(state, state.invoices[1].id), 4000000);
    assert('Status tagihan Pelanggan B', Report.statusTagihan(10000000, 6000000), 'sebagian');
    assert('Status tagihan lunas', Report.statusTagihan(10000000, 10000000), 'lunas');

    var transferState = clone(state);
    var beforeAset = Report.neraca(transferState, sampai).totalAset;
    var beforeLaba = Report.labaRugi(transferState, dari, sampai).labaBersih;
    var transfer = Ledger.createJournal(transferState, {
      tanggal: '2026-11-30',
      keterangan: 'Transfer Kas ke Bank BCA',
      lines: [
        { accountId: 'acc_11110', debit: 10000000, kredit: 0 },
        { accountId: 'acc_11100', debit: 0, kredit: 10000000 }
      ]
    });
    assert('Transfer berhasil dibuat', transfer.ok, true);
    assert('Total aset tidak berubah setelah transfer', Report.neraca(transferState, sampai).totalAset, beforeAset);
    assert('Laba bersih tidak berubah setelah transfer', Report.labaRugi(transferState, dari, sampai).labaBersih, beforeLaba);

    var unbalanced = Ledger.createJournal(clone(state), {
      tanggal: '2026-11-30',
      keterangan: 'Jurnal tidak seimbang',
      lines: [
        { accountId: 'acc_11100', debit: 1000, kredit: 0 },
        { accountId: 'acc_41100', debit: 0, kredit: 900 }
      ]
    });
    assert('Jurnal tidak seimbang ditolak', unbalanced.ok, false);

    var allJournalsBalanced = state.journals.every(function (journal) {
      var lines = state.journalLines.filter(function (line) { return line.journalId === journal.id; });
      var sum = Ledger.totals(lines);
      return sum.selisih === 0;
    });
    assert('Semua jurnal seimbang', allJournalsBalanced, true);

    var failed = results.filter(function (row) { return !row.ok; });

    return {
      ok: failed.length === 0,
      results: results,
      passed: results.length - failed.length,
      failed: failed.length,
      checkedAt: Format.todayISO()
    };
  }

  global.SelfTest = { run: run };
})(typeof window !== 'undefined' ? window : globalThis);
