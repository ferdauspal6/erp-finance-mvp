(function (global) {
  'use strict';

  var Ledger = global.Ledger;
  var Format = global.Format;
  var Numbering = global.Numbering;
  var Master = global.Master;
  var Inventory = global.Inventory;
  var Report = global.Report;
  var Purchasing = global.Purchasing;
  var Receiving = global.Receiving;

  function fail(message) {
    return { ok: false, errors: [message] };
  }

  function ok(extra) {
    var result = { ok: true, errors: [] };
    if (extra) {
      Object.keys(extra).forEach(function (key) { result[key] = extra[key]; });
    }
    return result;
  }

  function now() {
    return new Date().toISOString();
  }

  function actor(user) {
    return user && user.id ? user : { id: 'user_unknown', nama: 'Pengguna', role: 'logistik' };
  }

  function returnById(state, id) {
    return state.purchaseReturns.find(function (item) { return item.id === id; }) || null;
  }

  function returnLines(state, returnId) {
    return state.returnLines.filter(function (line) { return line.returnId === returnId; });
  }

  function invoiceForReceipt(state, receipt) {
    if (!receipt) return null;
    if (receipt.invoiceId) {
      var byId = state.invoices.find(function (invoice) { return invoice.id === receipt.invoiceId; });
      if (byId) return byId;
    }
    return state.invoices.find(function (invoice) {
      return invoice.jenis === 'utang' && invoice.refId === receipt.id;
    }) || null;
  }

  function piutangSupplierAccount(state) {
    return Ledger.accountByKode(state, '1-1500');
  }

  function piutangSupplierBalance(state) {
    var account = piutangSupplierAccount(state);
    return account ? Report.saldoAkun(state, account.id, null, null) : 0;
  }

  function returnableLines(state, receiptId) {
    var receipt = Receiving.receiptById(state, receiptId);
    if (!receipt || receipt.status !== 'posted') return [];
    return Receiving.receiptLines(state, receiptId).map(function (line) {
      var barang = Master.barangById(state, line.barangId);
      var received = Number(line.qty) || 0;
      var returned = Number(line.qtyDiretur) || 0;
      var stock = Inventory.qty(state, line.barangId);
      var max = Math.min(Math.max(0, received - returned), Math.max(0, stock));
      return {
        line: line,
        barang: barang,
        received: received,
        returned: returned,
        stock: stock,
        max: max
      };
    });
  }

  function returnStatusLabel(status) {
    if (status === 'draft') return 'Draft';
    if (status === 'confirmed') return 'Dikonfirmasi';
    return status || '-';
  }

  function jenisLabel(jenis) {
    if (jenis === 'ganti_barang') return 'Ganti barang';
    return 'Potong invoice';
  }

  function replacementStatusLabel(status) {
    if (status === 'menunggu') return 'Menunggu pengganti';
    if (status === 'sebagian') return 'Pengganti sebagian';
    if (status === 'selesai') return 'Pengganti selesai';
    return '-';
  }

  function validateReturnForm(state, form) {
    var errors = [];
    var receipt = Receiving.receiptById(state, form.receiptId);
    if (!Format.isValidDateISO(form.tanggal)) errors.push('Tanggal retur tidak valid.');
    if (!receipt) errors.push('Penerimaan tidak ditemukan.');
    else if (receipt.status !== 'posted') errors.push('Retur hanya dari penerimaan yang sudah diposting.');
    if (!String(form.alasan || '').trim()) errors.push('Alasan retur wajib diisi.');
    if (['potong_invoice', 'ganti_barang'].indexOf(form.jenis) < 0) errors.push('Jenis retur tidak valid.');
    var invoice = receipt ? invoiceForReceipt(state, receipt) : null;
    if (receipt && !invoice) errors.push('Tagihan utang dari penerimaan tidak ditemukan.');

    var rows = [];
    (form.lines || []).forEach(function (line, index) {
      var qty = Ledger.round(line.qty);
      if (qty <= 0) return;
      var receiptLine = state.receiptLines.find(function (item) {
        return item.id === line.receiptLineId && item.receiptId === form.receiptId;
      });
      if (!receiptLine) {
        errors.push('Baris ' + (index + 1) + ': baris penerimaan tidak ditemukan.');
        return;
      }
      var barang = Master.barangById(state, receiptLine.barangId);
      if (!barang) {
        errors.push('Baris ' + (index + 1) + ': barang tidak ditemukan.');
        return;
      }
      var received = Number(receiptLine.qty) || 0;
      var returned = Number(receiptLine.qtyDiretur) || 0;
      var stock = Inventory.qty(state, receiptLine.barangId);
      if (qty > received - returned) {
        errors.push('Baris ' + (index + 1) + ': qty retur melebihi sisa yang bisa diretur (' + Math.max(0, received - returned) + ').');
      }
      if (qty > stock) {
        errors.push('Baris ' + (index + 1) + ': qty retur melebihi stok tersedia (' + stock + ').');
      }
      var harga = Number(receiptLine.harga) || 0;
      rows.push({
        receiptLine: receiptLine,
        barang: barang,
        qty: qty,
        harga: harga,
        subtotal: qty * harga
      });
    });
    if (!rows.length) errors.push('Retur minimal memiliki satu baris dengan qty lebih dari 0.');

    var total = rows.reduce(function (sum, row) { return sum + row.subtotal; }, 0);
    return {
      ok: errors.length === 0,
      errors: errors,
      receipt: receipt,
      invoice: invoice,
      rows: rows,
      total: total
    };
  }

  function buildPreview(state, form) {
    var validation = validateReturnForm(state, form);
    if (!validation.ok) return validation;
    var total = validation.total;
    var potongAP = 0;
    var piutang = 0;
    if (form.jenis === 'potong_invoice') {
      var sisa = Report.sisaTagihan(state, validation.invoice.id);
      potongAP = Math.min(total, sisa);
      piutang = total - potongAP;
    } else {
      piutang = total;
    }
    var utang = Ledger.accountByKode(state, '2-1100');
    var piutangAkun = piutangSupplierAccount(state);
    var creditByAccount = {};
    validation.rows.forEach(function (row) {
      var accountId = row.barang.akunPersediaanId || (Ledger.accountByKode(state, '1-1300') || {}).id;
      if (!accountId) return;
      creditByAccount[accountId] = (creditByAccount[accountId] || 0) + row.subtotal;
    });
    var journalLines = [];
    if (potongAP > 0) {
      if (!utang) return { ok: false, errors: ['Akun Utang Usaha (2-1100) tidak ditemukan.'], rows: validation.rows, total: total };
      journalLines.push({ accountId: utang.id, debit: potongAP, kredit: 0 });
    }
    if (piutang > 0) {
      if (!piutangAkun) return { ok: false, errors: ['Akun Piutang Supplier (1-1500) tidak ditemukan.'], rows: validation.rows, total: total };
      journalLines.push({ accountId: piutangAkun.id, debit: piutang, kredit: 0 });
    }
    Object.keys(creditByAccount).forEach(function (accountId) {
      journalLines.push({ accountId: accountId, debit: 0, kredit: creditByAccount[accountId] });
    });
    if (!journalLines.length) return { ok: false, errors: ['Jurnal retur tidak memiliki nilai.'], rows: validation.rows, total: total };
    var totals = Ledger.totals(journalLines);
    if (totals.selisih !== 0) {
      return { ok: false, errors: ['Jurnal retur tidak seimbang.'], rows: validation.rows, total: total, journalLines: journalLines };
    }
    return {
      ok: true,
      errors: [],
      receipt: validation.receipt,
      invoice: validation.invoice,
      rows: validation.rows,
      total: total,
      potongAP: potongAP,
      piutangSupplier: piutang,
      journalLines: journalLines
    };
  }

  function createReturn(state, form, user) {
    var preview = buildPreview(state, form);
    if (!preview.ok) return { ok: false, errors: preview.errors };
    var who = actor(user);
    var retur = {
      id: Ledger.uid('rtn'),
      nomor: Numbering.next(state, 'RTN', form.tanggal),
      tanggal: form.tanggal,
      receiptId: preview.receipt.id,
      poId: preview.receipt.poId,
      invoiceId: preview.invoice.id,
      supplierId: preview.receipt.supplierId,
      jenis: form.jenis,
      alasan: String(form.alasan || '').trim(),
      status: 'draft',
      total: preview.total,
      potongAP: 0,
      piutangSupplier: 0,
      replacementStatus: null,
      dibuatOleh: who.id,
      dibuatNama: who.nama,
      dibuatPada: now(),
      dikonfirmasiOleh: null,
      dikonfirmasiNama: null,
      dikonfirmasiPada: null,
      riwayat: []
    };
    state.purchaseReturns.push(retur);
    preview.rows.forEach(function (row) {
      state.returnLines.push({
        id: Ledger.uid('rtl'),
        returnId: retur.id,
        receiptLineId: row.receiptLine.id,
        barangId: row.barang.id,
        qty: row.qty,
        harga: row.harga,
        subtotal: row.subtotal,
        qtyDiganti: 0
      });
    });
    Purchasing.addHistory(retur, user, 'dibuat', 'Retur ' + jenisLabel(form.jenis) + ' dibuat sebagai draft');
    Purchasing.log(state, user, 'Retur dibuat', retur.nomor, retur.alasan);
    return ok({ retur: retur });
  }

  function confirmReturn(state, returnId, user) {
    var retur = returnById(state, returnId);
    if (!retur) return fail('Retur tidak ditemukan.');
    if (retur.status !== 'draft') return fail('Hanya retur draft yang bisa dikonfirmasi.');
    var form = {
      tanggal: retur.tanggal,
      receiptId: retur.receiptId,
      jenis: retur.jenis,
      alasan: retur.alasan,
      lines: returnLines(state, retur.id).map(function (line) {
        return { receiptLineId: line.receiptLineId, qty: line.qty };
      })
    };
    var preview = buildPreview(state, form);
    if (!preview.ok) return { ok: false, errors: preview.errors };

    var po = Purchasing.poById(state, retur.poId);
    var journal = Ledger.createJournal(state, {
      tanggal: retur.tanggal,
      keterangan: 'Retur ' + retur.nomor + (po ? ' - ' + po.nomor : ''),
      sumber: 'retur',
      refId: retur.id,
      lines: preview.journalLines
    });
    if (!journal.ok) return { ok: false, errors: journal.errors };

    preview.rows.forEach(function (row) {
      row.receiptLine.qtyDiretur = (Number(row.receiptLine.qtyDiretur) || 0) + row.qty;
      Inventory.addMovement(state, {
        tanggal: retur.tanggal,
        barangId: row.barang.id,
        gudangId: preview.receipt.gudangId,
        jenis: 'retur',
        qty: -row.qty,
        nilai: -row.subtotal,
        harga: row.harga,
        refTipe: 'retur',
        refId: retur.id,
        refNomor: retur.nomor
      });
    });

    retur.status = 'confirmed';
    retur.total = preview.total;
    retur.potongAP = preview.potongAP;
    retur.piutangSupplier = preview.piutangSupplier;
    retur.replacementStatus = retur.jenis === 'ganti_barang' ? 'menunggu' : null;
    retur.dikonfirmasiOleh = actor(user).id;
    retur.dikonfirmasiNama = actor(user).nama;
    retur.dikonfirmasiPada = now();
    retur.journalId = journal.journal.id;
    Purchasing.addHistory(retur, user, 'dikonfirmasi', 'Stok keluar dan jurnal retur diposting');
    Purchasing.log(state, user, 'Retur dikonfirmasi', retur.nomor, 'Jurnal ' + journal.journal.nomor);
    return ok({ retur: retur, journal: journal.journal, preview: preview });
  }

  function replacementLines(state, returnId) {
    return returnLines(state, returnId).filter(function (line) {
      return (Number(line.qty) || 0) - (Number(line.qtyDiganti) || 0) > 0;
    });
  }

  function validateReplacement(state, form) {
    var errors = [];
    var retur = returnById(state, form.returnId);
    if (!retur) errors.push('Retur tidak ditemukan.');
    else if (retur.status !== 'confirmed') errors.push('Retur belum dikonfirmasi.');
    else if (retur.jenis !== 'ganti_barang') errors.push('Penerimaan pengganti hanya untuk retur ganti barang.');
    if (!Format.isValidDateISO(form.tanggal)) errors.push('Tanggal penerimaan pengganti tidak valid.');
    var gudang = Master.gudangById(state, form.gudangId);
    if (!gudang) errors.push('Pilih gudang penerimaan pengganti.');
    else if (gudang.aktif === false) errors.push('Gudang nonaktif.');
    var rows = [];
    (form.lines || []).forEach(function (line, index) {
      var qty = Ledger.round(line.qty);
      if (qty <= 0) return;
      var returnLine = state.returnLines.find(function (item) {
        return item.id === line.returnLineId && item.returnId === form.returnId;
      });
      if (!returnLine) {
        errors.push('Baris ' + (index + 1) + ': baris retur tidak ditemukan.');
        return;
      }
      var remaining = (Number(returnLine.qty) || 0) - (Number(returnLine.qtyDiganti) || 0);
      if (qty > remaining) {
        errors.push('Baris ' + (index + 1) + ': qty pengganti melebihi sisa retur (' + remaining + ').');
      }
      var barang = Master.barangById(state, returnLine.barangId);
      if (!barang) errors.push('Baris ' + (index + 1) + ': barang tidak ditemukan.');
      rows.push({
        returnLine: returnLine,
        barang: barang,
        qty: qty,
        harga: Number(returnLine.harga) || 0,
        subtotal: qty * (Number(returnLine.harga) || 0)
      });
    });
    if (!rows.length) errors.push('Penerimaan pengganti minimal memiliki satu baris dengan qty lebih dari 0.');
    return { ok: errors.length === 0, errors: errors, retur: retur, gudang: gudang, rows: rows, total: rows.reduce(function (sum, row) { return sum + row.subtotal; }, 0) };
  }

  function createReplacementReceipt(state, form, user) {
    var validation = validateReplacement(state, form);
    if (!validation.ok) return { ok: false, errors: validation.errors };
    var piutangAkun = piutangSupplierAccount(state);
    if (!piutangAkun) return fail('Akun Piutang Supplier (1-1500) tidak ditemukan.');
    var debitByAccount = {};
    validation.rows.forEach(function (row) {
      var accountId = row.barang.akunPersediaanId || (Ledger.accountByKode(state, '1-1300') || {}).id;
      if (!accountId) return;
      debitByAccount[accountId] = (debitByAccount[accountId] || 0) + row.subtotal;
    });
    var journalLines = Object.keys(debitByAccount).map(function (accountId) {
      return { accountId: accountId, debit: debitByAccount[accountId], kredit: 0 };
    });
    journalLines.push({ accountId: piutangAkun.id, debit: 0, kredit: validation.total });
    var totals = Ledger.totals(journalLines);
    if (totals.selisih !== 0) return fail('Jurnal penerimaan pengganti tidak seimbang.');

    var who = actor(user);
    var receipt = {
      id: Ledger.uid('gr'),
      nomor: Numbering.next(state, 'GR', form.tanggal),
      tanggal: form.tanggal,
      poId: null,
      supplierId: validation.retur.supplierId,
      gudangId: validation.gudang.id,
      suratJalan: String(form.suratJalan || '').trim(),
      status: 'posted',
      jenis: 'pengganti',
      returnId: validation.retur.id,
      total: validation.total,
      dibuatOleh: who.id,
      dibuatNama: who.nama,
      dibuatPada: now(),
      postedOleh: who.id,
      postedNama: who.nama,
      postedPada: now(),
      riwayat: []
    };
    var journal = Ledger.createJournal(state, {
      tanggal: form.tanggal,
      keterangan: 'Penerimaan pengganti ' + receipt.nomor + ' - Retur ' + validation.retur.nomor,
      sumber: 'pengganti',
      refId: receipt.id,
      lines: journalLines
    });
    if (!journal.ok) return { ok: false, errors: journal.errors };
    state.receipts.push(receipt);
    validation.rows.forEach(function (row) {
      state.receiptLines.push({
        id: Ledger.uid('grl'),
        receiptId: receipt.id,
        poLineId: null,
        returnLineId: row.returnLine.id,
        barangId: row.barang.id,
        qty: row.qty,
        harga: row.harga,
        qtyDiretur: 0
      });
      row.returnLine.qtyDiganti = (Number(row.returnLine.qtyDiganti) || 0) + row.qty;
      Inventory.addMovement(state, {
        tanggal: form.tanggal,
        barangId: row.barang.id,
        gudangId: validation.gudang.id,
        jenis: 'pengganti',
        qty: row.qty,
        nilai: row.subtotal,
        harga: row.harga,
        refTipe: 'pengganti',
        refId: receipt.id,
        refNomor: receipt.nomor
      });
    });
    var allReplaced = returnLines(state, validation.retur.id).every(function (line) {
      return (Number(line.qtyDiganti) || 0) >= (Number(line.qty) || 0);
    });
    validation.retur.replacementStatus = allReplaced ? 'selesai' : 'sebagian';
    receipt.journalId = journal.journal.id;
    Purchasing.addHistory(receipt, user, 'posted', 'Penerimaan pengganti diposting');
    Purchasing.addHistory(validation.retur, user, 'pengganti', 'Penerimaan pengganti ' + receipt.nomor);
    Purchasing.log(state, user, 'Penerimaan pengganti', receipt.nomor, 'Retur ' + validation.retur.nomor);
    return ok({ receipt: receipt, retur: validation.retur, journal: journal.journal });
  }

  global.Returns = {
    fail: fail,
    ok: ok,
    returnById: returnById,
    returnLines: returnLines,
    returnableLines: returnableLines,
    invoiceForReceipt: invoiceForReceipt,
    piutangSupplierBalance: piutangSupplierBalance,
    returnStatusLabel: returnStatusLabel,
    jenisLabel: jenisLabel,
    replacementStatusLabel: replacementStatusLabel,
    buildPreview: buildPreview,
    createReturn: createReturn,
    confirmReturn: confirmReturn,
    replacementLines: replacementLines,
    createReplacementReceipt: createReplacementReceipt
  };
})(typeof window !== 'undefined' ? window : globalThis);
