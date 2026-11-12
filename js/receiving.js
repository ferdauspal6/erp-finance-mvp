(function (global) {
  'use strict';

  var Ledger = global.Ledger;
  var Format = global.Format;
  var Numbering = global.Numbering;
  var Master = global.Master;
  var Inventory = global.Inventory;
  var Purchasing = global.Purchasing;

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

  function receiptById(state, id) {
    return state.receipts.find(function (item) { return item.id === id; }) || null;
  }

  function receiptLines(state, receiptId) {
    return state.receiptLines.filter(function (line) { return line.receiptId === receiptId; });
  }

  function receiptsForPO(state, poId) {
    return state.receipts.filter(function (receipt) { return receipt.poId === poId; });
  }

  function receiptStatusLabel(status) {
    if (status === 'draft') return 'Draft';
    if (status === 'posted') return 'Diposting';
    return status || '-';
  }

  function remainingPO(state, po) {
    return Purchasing.poLines(state, po.id).reduce(function (sum, line) {
      return sum + Math.max(0, (Number(line.qty) || 0) - (Number(line.qtyDiterima) || 0));
    }, 0);
  }

  function validateLines(state, poId, lines) {
    var errors = [];
    var po = Purchasing.poById(state, poId);
    if (!po) return { ok: false, errors: ['PO tidak ditemukan.'], po: null, rows: [] };
    if (['disetujui', 'dikirim', 'diterima_sebagian'].indexOf(po.status) < 0) {
      errors.push('PO ini tidak menerima barang pada status ' + Purchasing.poStatusLabel(po.status) + '.');
    }
    var tolerance = Number(state.settings && state.settings.toleransiPenerimaan) || 0;
    var rows = [];
    (lines || []).forEach(function (line, index) {
      var qty = Ledger.round(line.qty);
      if (qty <= 0) return;
      var poLine = state.poLines.find(function (item) {
        return item.id === line.poLineId && item.poId === poId;
      });
      if (!poLine) {
        errors.push('Baris ' + (index + 1) + ': baris PO tidak ditemukan.');
        return;
      }
      var remaining = (Number(poLine.qty) || 0) - (Number(poLine.qtyDiterima) || 0);
      if (qty > remaining + tolerance) {
        errors.push('Baris ' + (index + 1) + ': qty melebihi sisa PO (' + remaining + ').');
      }
      var barang = Master.barangById(state, poLine.barangId);
      if (!barang) errors.push('Baris ' + (index + 1) + ': barang tidak ditemukan.');
      else if (barang.aktif === false) errors.push('Baris ' + (index + 1) + ': barang ' + barang.nama + ' nonaktif.');
      else if (barang.kelolaStok === false) errors.push('Baris ' + (index + 1) + ': barang ' + barang.nama + ' tidak dikelola stok.');
      rows.push({
        poLine: poLine,
        barang: barang,
        qty: qty,
        harga: Number(poLine.harga) || 0,
        subtotal: qty * (Number(poLine.harga) || 0)
      });
    });
    if (!rows.length) errors.push('Penerimaan minimal memiliki satu baris dengan qty lebih dari 0.');
    return { ok: errors.length === 0, errors: errors, po: po, rows: rows, tolerance: tolerance };
  }

  function buildJournal(state, form) {
    var validation = validateLines(state, form.poId, form.lines);
    if (!validation.ok) return validation;
    var debitByAccount = {};
    var total = 0;
    var persediaanFallback = Ledger.accountByKode(state, '1-1300');
    validation.rows.forEach(function (row) {
      var accountId = row.barang.akunPersediaanId ||
        (persediaanFallback ? persediaanFallback.id : null);
      if (!accountId) return;
      debitByAccount[accountId] = (debitByAccount[accountId] || 0) + row.subtotal;
      total += row.subtotal;
    });
    var utang = Ledger.accountByKode(state, '2-1100');
    if (!utang) return { ok: false, errors: ['Akun Utang Usaha (2-1100) tidak ditemukan.'], rows: validation.rows, total: total };
    var journalLines = Object.keys(debitByAccount).map(function (accountId) {
      return { accountId: accountId, debit: debitByAccount[accountId], kredit: 0 };
    });
    journalLines.push({
      accountId: utang.id,
      debit: 0,
      kredit: total,
      partyId: validation.po.supplierId
    });
    var check = Ledger.totals(journalLines);
    if (check.selisih !== 0) {
      return { ok: false, errors: ['Jurnal penerimaan tidak seimbang.'], rows: validation.rows, total: total, journalLines: journalLines };
    }
    return {
      ok: true,
      errors: [],
      po: validation.po,
      rows: validation.rows,
      total: total,
      journalLines: journalLines,
      journalDraft: {
        tanggal: form.tanggal,
        keterangan: 'Penerimaan ' + (validation.po.nomor || ''),
        lines: journalLines
      }
    };
  }

  function createReceipt(state, form, user) {
    if (!Format.isValidDateISO(form.tanggal)) return fail('Tanggal penerimaan tidak valid.');
    var gudang = Master.gudangById(state, form.gudangId);
    if (!gudang) return fail('Pilih gudang penerimaan.');
    if (gudang.aktif === false) return fail('Gudang nonaktif.');
    var built = buildJournal(state, form);
    if (!built.ok) return { ok: false, errors: built.errors };
    var who = actor(user);
    var receipt = {
      id: Ledger.uid('gr'),
      nomor: Numbering.next(state, 'GR', form.tanggal),
      tanggal: form.tanggal,
      poId: built.po.id,
      supplierId: built.po.supplierId,
      gudangId: gudang.id,
      suratJalan: String(form.suratJalan || '').trim(),
      status: 'draft',
      total: built.total,
      dibuatOleh: who.id,
      dibuatNama: who.nama,
      dibuatPada: now(),
      postedOleh: null,
      postedNama: null,
      postedPada: null,
      riwayat: []
    };
    state.receipts.push(receipt);
    built.rows.forEach(function (row) {
      state.receiptLines.push({
        id: Ledger.uid('grl'),
        receiptId: receipt.id,
        poLineId: row.poLine.id,
        barangId: row.barang.id,
        qty: row.qty,
        harga: row.harga,
        qtyDiretur: 0
      });
    });
    Purchasing.addHistory(receipt, user, 'dibuat', 'Penerimaan dibuat sebagai draft');
    Purchasing.log(state, user, 'Penerimaan dibuat', receipt.nomor, 'Draft');
    return ok({ receipt: receipt });
  }

  function postReceipt(state, receiptId, user) {
    var receipt = receiptById(state, receiptId);
    if (!receipt) return fail('Penerimaan tidak ditemukan.');
    if (receipt.status !== 'draft') return fail('Hanya penerimaan draft yang bisa diposting.');
    var po = Purchasing.poById(state, receipt.poId);
    if (!po) return fail('PO asal tidak ditemukan.');
    var lines = receiptLines(state, receipt.id).map(function (line) {
      return { poLineId: line.poLineId, qty: line.qty };
    });
    var built = buildJournal(state, { tanggal: receipt.tanggal, poId: receipt.poId, lines: lines });
    if (!built.ok) return { ok: false, errors: built.errors };

    var journalDraft = {
      tanggal: receipt.tanggal,
      keterangan: 'Penerimaan ' + receipt.nomor + ' - ' + po.nomor,
      sumber: 'penerimaan',
      refId: receipt.id,
      lines: built.journalLines
    };
    var journalResult = Ledger.createJournal(state, journalDraft);
    if (!journalResult.ok) return { ok: false, errors: journalResult.errors };

    var supplier = Master.supplierById(state, receipt.supplierId);
    var term = po.terminBayar !== undefined && po.terminBayar !== null
      ? (Number(po.terminBayar) || 0)
      : (supplier ? (Number(supplier.terminBayar) || 0) : 0);
    var persediaan = Ledger.accountByKode(state, '1-1300');
    var invoice = {
      id: Ledger.uid('inv'),
      nomor: receipt.nomor,
      jenis: 'utang',
      partyId: receipt.supplierId,
      tanggal: receipt.tanggal,
      jatuhTempo: Format.addDays(receipt.tanggal, term),
      total: built.total,
      keterangan: 'Penerimaan ' + receipt.nomor + ' - ' + po.nomor,
      akunLawanId: persediaan ? persediaan.id : null,
      akunHppId: null,
      hpp: 0,
      sumber: 'penerimaan',
      refId: receipt.id
    };
    state.invoices.push(invoice);

    built.rows.forEach(function (row) {
      row.poLine.qtyDiterima = (Number(row.poLine.qtyDiterima) || 0) + row.qty;
      Inventory.addMovement(state, {
        tanggal: receipt.tanggal,
        barangId: row.barang.id,
        gudangId: receipt.gudangId,
        jenis: 'masuk',
        qty: row.qty,
        nilai: row.subtotal,
        harga: row.harga,
        refTipe: 'penerimaan',
        refId: receipt.id,
        refNomor: receipt.nomor
      });
    });

    var allReceived = Purchasing.poLines(state, po.id).every(function (line) {
      return (Number(line.qtyDiterima) || 0) >= (Number(line.qty) || 0);
    });
    po.status = allReceived ? 'diterima_penuh' : 'diterima_sebagian';
    po.diterimaPada = now();

    receipt.status = 'posted';
    receipt.total = built.total;
    receipt.postedOleh = actor(user).id;
    receipt.postedNama = actor(user).nama;
    receipt.postedPada = now();
    receipt.journalId = journalResult.journal.id;
    receipt.invoiceId = invoice.id;
    Purchasing.addHistory(receipt, user, 'diposting', 'Stok masuk dan tagihan utang dibuat');
    Purchasing.log(state, user, 'Penerimaan diposting', receipt.nomor, 'Jurnal ' + journalResult.journal.nomor);
    return ok({ receipt: receipt, invoice: invoice, journal: journalResult.journal });
  }

  global.Receiving = {
    receiptById: receiptById,
    receiptLines: receiptLines,
    receiptsForPO: receiptsForPO,
    receiptStatusLabel: receiptStatusLabel,
    remainingPO: remainingPO,
    validateLines: validateLines,
    buildJournal: buildJournal,
    createReceipt: createReceipt,
    postReceipt: postReceipt
  };
})(typeof window !== 'undefined' ? window : globalThis);
