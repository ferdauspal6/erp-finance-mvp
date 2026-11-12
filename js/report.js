(function (global) {
  'use strict';

  var Format = global.Format;
  var Ledger = global.Ledger;

  function inRange(tanggal, dari, sampai) {
    if (dari && tanggal < dari) return false;
    if (sampai && tanggal > sampai) return false;
    return true;
  }

  function journalIdsInRange(state, dari, sampai) {
    var ids = {};
    state.journals.forEach(function (journal) {
      if (inRange(journal.tanggal, dari, sampai)) ids[journal.id] = true;
    });
    return ids;
  }

  function jumlahAkun(state, accountId, dari, sampai) {
    var ids = journalIdsInRange(state, dari, sampai);
    var debit = 0;
    var kredit = 0;
    state.journalLines.forEach(function (line) {
      if (line.accountId === accountId && ids[line.journalId]) {
        debit += Number(line.debit) || 0;
        kredit += Number(line.kredit) || 0;
      }
    });
    return { debit: debit, kredit: kredit, net: debit - kredit };
  }

  function saldoAkun(state, accountId, dari, sampai) {
    var account = Ledger.accountOf(state, accountId);
    var sum = jumlahAkun(state, accountId, dari, sampai);
    if (!account) return 0;
    return account.saldoNormal === 'Debit' ? sum.debit - sum.kredit : sum.kredit - sum.debit;
  }

  function nilaiAkun(state, account, dari, sampai) {
    var sum = jumlahAkun(state, account.id, dari, sampai);
    if (account.tipe === 'Aset' || account.tipe === 'Beban') return sum.debit - sum.kredit;
    return sum.kredit - sum.debit;
  }

  function sortByKode(a, b) {
    return String(a.kode).localeCompare(String(b.kode));
  }

  function neracaSaldo(state, sampai) {
    var rows = state.accounts.map(function (account) {
      var sum = jumlahAkun(state, account.id, null, sampai);
      var net = sum.debit - sum.kredit;
      return {
        akun: account,
        debit: net > 0 ? net : 0,
        kredit: net < 0 ? -net : 0,
        net: net
      };
    }).filter(function (row) {
      return row.debit !== 0 || row.kredit !== 0;
    });

    rows.sort(function (a, b) { return sortByKode(a.akun, b.akun); });

    var totalDebit = 0;
    var totalKredit = 0;
    rows.forEach(function (row) {
      totalDebit += row.debit;
      totalKredit += row.kredit;
    });

    return {
      sampai: sampai,
      rows: rows,
      totalDebit: totalDebit,
      totalKredit: totalKredit,
      selisih: totalDebit - totalKredit,
      seimbang: totalDebit === totalKredit
    };
  }

  function isHppAccount(account) {
    return account.hpp === true || /^5-11/.test(account.kode);
  }

  function labaRugi(state, dari, sampai) {
    var pendapatan = [];
    var hpp = [];
    var beban = [];

    state.accounts.forEach(function (account) {
      var value = nilaiAkun(state, account, dari, sampai);
      if (value === 0) return;
      if (account.tipe === 'Pendapatan') {
        pendapatan.push({ akun: account, jumlah: value });
      } else if (account.tipe === 'Beban') {
        if (isHppAccount(account)) hpp.push({ akun: account, jumlah: value });
        else beban.push({ akun: account, jumlah: value });
      }
    });

    pendapatan.sort(function (a, b) { return sortByKode(a.akun, b.akun); });
    hpp.sort(function (a, b) { return sortByKode(a.akun, b.akun); });
    beban.sort(function (a, b) { return sortByKode(a.akun, b.akun); });

    var totalPendapatan = pendapatan.reduce(function (sum, row) { return sum + row.jumlah; }, 0);
    var totalHpp = hpp.reduce(function (sum, row) { return sum + row.jumlah; }, 0);
    var totalBeban = beban.reduce(function (sum, row) { return sum + row.jumlah; }, 0);
    var labaKotor = totalPendapatan - totalHpp;
    var labaBersih = labaKotor - totalBeban;

    return {
      dari: dari,
      sampai: sampai,
      pendapatan: pendapatan,
      hpp: hpp,
      beban: beban,
      totalPendapatan: totalPendapatan,
      totalHpp: totalHpp,
      totalBeban: totalBeban,
      labaKotor: labaKotor,
      labaBersih: labaBersih,
      tooltip: 'Pendapatan ' + Format.num(totalPendapatan) + ' dikurangi HPP ' + Format.num(totalHpp) +
        ' dan beban ' + Format.num(totalBeban) + ' = ' + Format.num(labaBersih)
    };
  }

  function labaBersih(state, dari, sampai) {
    return labaRugi(state, dari, sampai).labaBersih;
  }

  function neraca(state, sampai) {
    var aset = [];
    var kewajiban = [];
    var ekuitas = [];

    state.accounts.forEach(function (account) {
      var value = nilaiAkun(state, account, null, sampai);
      if (value === 0) return;
      var row = { akun: account, jumlah: value };
      if (account.tipe === 'Aset') aset.push(row);
      else if (account.tipe === 'Kewajiban') kewajiban.push(row);
      else if (account.tipe === 'Ekuitas') ekuitas.push(row);
    });

    aset.sort(function (a, b) { return sortByKode(a.akun, b.akun); });
    kewajiban.sort(function (a, b) { return sortByKode(a.akun, b.akun); });
    ekuitas.sort(function (a, b) { return sortByKode(a.akun, b.akun); });

    var asetLancar = aset.filter(function (row) { return /^1-1/.test(row.akun.kode); });
    var asetTetap = aset.filter(function (row) { return !/^1-1/.test(row.akun.kode); });
    var kewajibanPendek = kewajiban.filter(function (row) { return /^2-1/.test(row.akun.kode); });
    var kewajibanPanjang = kewajiban.filter(function (row) { return !/^2-1/.test(row.akun.kode); });

    var totalAset = aset.reduce(function (sum, row) { return sum + row.jumlah; }, 0);
    var totalKewajiban = kewajiban.reduce(function (sum, row) { return sum + row.jumlah; }, 0);
    var totalEkuitasAkun = ekuitas.reduce(function (sum, row) { return sum + row.jumlah; }, 0);
    var tahun = (sampai || Format.todayISO()).slice(0, 4);
    var labaBerjalan = labaBersih(state, tahun + '-01-01', sampai);
    var totalEkuitas = totalEkuitasAkun + labaBerjalan;
    var totalKewajibanEkuitas = totalKewajiban + totalEkuitas;
    var selisih = totalAset - totalKewajibanEkuitas;

    var komponenAset = aset.map(function (row) {
      return row.akun.nama + ' ' + Format.num(row.jumlah);
    }).join(' + ');

    return {
      sampai: sampai,
      aset: aset,
      asetLancar: asetLancar,
      asetTetap: asetTetap,
      kewajiban: kewajiban,
      kewajibanPendek: kewajibanPendek,
      kewajibanPanjang: kewajibanPanjang,
      ekuitas: ekuitas,
      labaBerjalan: labaBerjalan,
      totalAset: totalAset,
      totalKewajiban: totalKewajiban,
      totalEkuitas: totalEkuitas,
      totalKewajibanEkuitas: totalKewajibanEkuitas,
      selisih: selisih,
      seimbang: selisih === 0,
      tooltipAset: (komponenAset ? komponenAset + ' = ' : '') + Format.num(totalAset)
    };
  }

  function dibayarTagihan(state, invoiceId) {
    return state.payments.reduce(function (sum, payment) {
      if (payment.invoiceId !== invoiceId) return sum;
      if (payment.jenis === 'retur') return sum;
      return sum + (Number(payment.jumlah) || 0);
    }, 0);
  }

  function totalReturPotong(state, invoiceId) {
    return (state.purchaseReturns || []).reduce(function (sum, retur) {
      if (retur.invoiceId !== invoiceId) return sum;
      if (retur.status !== 'confirmed') return sum;
      if (retur.jenis !== 'potong_invoice') return sum;
      return sum + (Number(retur.total) || 0);
    }, 0);
  }

  function sisaTagihan(state, invoiceId) {
    var invoice = state.invoices.find(function (item) { return item.id === invoiceId; });
    if (!invoice) return 0;
    var net = (Number(invoice.total) || 0) - totalReturPotong(state, invoiceId);
    var sisa = net - dibayarTagihan(state, invoiceId);
    return Math.max(0, sisa);
  }

  function statusTagihan(total, dibayar, retur) {
    var net = (Number(total) || 0) - (Number(retur) || 0);
    if (net <= 0) return 'lunas';
    if ((Number(dibayar) || 0) <= 0) return 'belum';
    if ((Number(dibayar) || 0) >= net) return 'lunas';
    return 'sebagian';
  }

  function umurPiutang(state, sampai) {
    var per = sampai || Format.todayISO();
    var buckets = {
      belum: 0,
      d1_30: 0,
      d31_60: 0,
      d60: 0
    };
    var rows = [];

    state.invoices.forEach(function (invoice) {
      if (invoice.jenis !== 'piutang') return;
      var dibayar = dibayarTagihan(state, invoice.id);
      var sisa = (Number(invoice.total) || 0) - dibayar;
      if (sisa <= 0) return;
      var hari = Format.daysBetween(invoice.jatuhTempo, per);
      var bucket;
      if (hari <= 0) bucket = 'belum';
      else if (hari <= 30) bucket = 'd1_30';
      else if (hari <= 60) bucket = 'd31_60';
      else bucket = 'd60';

      buckets[bucket] += sisa;
      rows.push({
        invoiceId: invoice.id,
        partyId: invoice.partyId,
        party: state.parties.find(function (p) { return p.id === invoice.partyId; }) || null,
        tanggal: invoice.tanggal,
        jatuhTempo: invoice.jatuhTempo,
        total: invoice.total,
        dibayar: dibayar,
        sisa: sisa,
        hariTerlambat: hari,
        bucket: bucket
      });
    });

    rows.sort(function (a, b) { return String(a.jatuhTempo).localeCompare(String(b.jatuhTempo)); });

    var total = rows.reduce(function (sum, row) { return sum + row.sisa; }, 0);

    return {
      sampai: per,
      rows: rows,
      buckets: buckets,
      total: total
    };
  }

  function jurnalAkun(state, accountId, dari, sampai) {
    var rows = [];
    state.journals.forEach(function (journal) {
      if (!inRange(journal.tanggal, dari, sampai)) return;
      var lines = state.journalLines.filter(function (line) {
        return line.journalId === journal.id && line.accountId === accountId;
      });
      lines.forEach(function (line) {
        rows.push({
          journal: journal,
          debit: Number(line.debit) || 0,
          kredit: Number(line.kredit) || 0,
          partyId: line.partyId || null
        });
      });
    });
    rows.sort(function (a, b) {
      if (a.journal.tanggal !== b.journal.tanggal) return a.journal.tanggal < b.journal.tanggal ? 1 : -1;
      return String(b.journal.nomor).localeCompare(String(a.journal.nomor));
    });
    return rows;
  }

  function referensiTanggal(state) {
    var dates = state.journals.map(function (journal) { return journal.tanggal; }).sort();
    return dates.length ? dates[dates.length - 1] : Format.todayISO();
  }

  function tooltipSisaPiutang(invoice, dibayar, sisa, retur) {
    var text = 'Tagihan ' + Format.num(invoice.total);
    if (Number(retur) > 0) text += ' dikurangi retur ' + Format.num(retur);
    text += ' dikurangi pembayaran ' + Format.num(dibayar) + ' = sisa ' + Format.num(sisa);
    return text;
  }

  global.Report = {
    inRange: inRange,
    jumlahAkun: jumlahAkun,
    saldoAkun: saldoAkun,
    nilaiAkun: nilaiAkun,
    neracaSaldo: neracaSaldo,
    labaRugi: labaRugi,
    labaBersih: labaBersih,
    neraca: neraca,
    dibayarTagihan: dibayarTagihan,
    totalReturPotong: totalReturPotong,
    sisaTagihan: sisaTagihan,
    statusTagihan: statusTagihan,
    umurPiutang: umurPiutang,
    jurnalAkun: jurnalAkun,
    referensiTanggal: referensiTanggal,
    isHppAccount: isHppAccount,
    tooltipSisaPiutang: tooltipSisaPiutang
  };
})(typeof window !== 'undefined' ? window : globalThis);
