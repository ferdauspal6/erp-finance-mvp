(function (global) {
  'use strict';

  var Ledger = global.Ledger;
  var Format = global.Format;
  var Numbering = global.Numbering;
  var Master = global.Master;

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

  function addHistory(document, user, aksi, catatan) {
    var who = actor(user);
    if (!document.riwayat) document.riwayat = [];
    document.riwayat.push({
      waktu: now(),
      userId: who.id,
      nama: who.nama,
      role: who.role,
      aksi: aksi,
      catatan: catatan || ''
    });
  }

  function log(state, user, aksi, dokumen, catatan) {
    var who = actor(user);
    if (!state.activityLog) state.activityLog = [];
    state.activityLog.push({
      waktu: now(),
      userId: who.id,
      nama: who.nama,
      role: who.role,
      aksi: aksi,
      dokumen: dokumen || '',
      catatan: catatan || ''
    });
  }

  function prById(state, id) {
    return state.purchaseRequests.find(function (item) { return item.id === id; }) || null;
  }

  function prLines(state, prId) {
    return state.prLines.filter(function (line) { return line.prId === prId; });
  }

  function poById(state, id) {
    return state.purchaseOrders.find(function (item) { return item.id === id; }) || null;
  }

  function poLines(state, poId) {
    return state.poLines.filter(function (line) { return line.poId === poId; });
  }

  function totalPO(state, poId) {
    return poLines(state, poId).reduce(function (sum, line) {
      return sum + (Number(line.qty) || 0) * (Number(line.harga) || 0);
    }, 0);
  }

  function prStatusLabel(status) {
    if (status === 'draft') return 'Draft';
    if (status === 'diajukan') return 'Diajukan';
    if (status === 'disetujui') return 'Disetujui';
    if (status === 'ditolak') return 'Ditolak';
    if (status === 'diproses') return 'Diproses';
    if (status === 'selesai') return 'Selesai';
    return status || '-';
  }

  function poStatusLabel(status) {
    if (status === 'draft') return 'Draft';
    if (status === 'menunggu_persetujuan') return 'Menunggu Persetujuan';
    if (status === 'disetujui') return 'Disetujui';
    if (status === 'ditolak') return 'Ditolak';
    if (status === 'dikirim') return 'Dikirim';
    if (status === 'diterima_sebagian') return 'Diterima Sebagian';
    if (status === 'diterima_penuh') return 'Diterima Penuh';
    if (status === 'ditutup') return 'Ditutup';
    if (status === 'dibatalkan') return 'Dibatalkan';
    return status || '-';
  }

  function validatePRForm(state, form) {
    var errors = [];
    if (!Format.isValidDateISO(form.tanggal)) errors.push('Tanggal PR tidak valid.');
    if (!String(form.keperluan || '').trim()) errors.push('Keperluan wajib diisi.');
    var lines = (form.lines || []).filter(function (line) {
      return line && line.barangId && Ledger.round(line.qty) > 0;
    });
    if (lines.length === 0) errors.push('PR minimal memiliki satu barang dengan qty lebih dari 0.');
    var seen = {};
    lines.forEach(function (line, index) {
      var barang = Master.barangById(state, line.barangId);
      if (!barang) errors.push('Baris ' + (index + 1) + ': barang tidak ditemukan.');
      else if (barang.aktif === false) errors.push('Baris ' + (index + 1) + ': barang ' + barang.nama + ' nonaktif.');
      if (seen[line.barangId]) errors.push('Baris ' + (index + 1) + ': barang tidak boleh duplikat.');
      seen[line.barangId] = true;
    });
    return { ok: errors.length === 0, errors: errors, lines: lines };
  }

  function createPR(state, form, user) {
    var validation = validatePRForm(state, form);
    if (!validation.ok) return { ok: false, errors: validation.errors };
    var pr = {
      id: Ledger.uid('pr'),
      nomor: Numbering.next(state, 'PR', form.tanggal),
      tanggal: form.tanggal,
      pemohonId: actor(user).id,
      pemohonNama: actor(user).nama,
      keperluan: String(form.keperluan || '').trim(),
      status: 'draft',
      disetujuiOleh: null,
      disetujuiNama: null,
      disetujuiPada: null,
      alasanTolak: '',
      dibuatOleh: actor(user).id,
      dibuatNama: actor(user).nama,
      dibuatPada: now(),
      riwayat: []
    };
    state.purchaseRequests.push(pr);
    validation.lines.forEach(function (line) {
      state.prLines.push({
        id: Ledger.uid('prl'),
        prId: pr.id,
        barangId: line.barangId,
        qty: Ledger.round(line.qty),
        catatan: String(line.catatan || '').trim(),
        qtySudahDipesan: 0
      });
    });
    addHistory(pr, user, 'dibuat', 'PR dibuat');
    log(state, user, 'PR dibuat', pr.nomor, pr.keperluan);
    return ok({ pr: pr });
  }

  function updatePR(state, prId, form, user) {
    var pr = prById(state, prId);
    if (!pr) return fail('PR tidak ditemukan.');
    if (pr.status !== 'draft') return fail('PR hanya bisa diubah saat berstatus draft.');
    var validation = validatePRForm(state, form);
    if (!validation.ok) return { ok: false, errors: validation.errors };
    pr.tanggal = form.tanggal;
    pr.keperluan = String(form.keperluan || '').trim();
    state.prLines = state.prLines.filter(function (line) { return line.prId !== prId; });
    validation.lines.forEach(function (line) {
      state.prLines.push({
        id: Ledger.uid('prl'),
        prId: pr.id,
        barangId: line.barangId,
        qty: Ledger.round(line.qty),
        catatan: String(line.catatan || '').trim(),
        qtySudahDipesan: 0
      });
    });
    addHistory(pr, user, 'diubah', 'PR diperbarui');
    log(state, user, 'PR diperbarui', pr.nomor, '');
    return ok({ pr: pr });
  }

  function submitPR(state, prId, user) {
    var pr = prById(state, prId);
    if (!pr) return fail('PR tidak ditemukan.');
    if (pr.status !== 'draft') return fail('Hanya PR draft yang bisa diajukan.');
    pr.status = 'diajukan';
    addHistory(pr, user, 'diajukan', 'PR diajukan untuk persetujuan');
    log(state, user, 'PR diajukan', pr.nomor, '');
    return ok({ pr: pr });
  }

  function approvePR(state, prId, user) {
    var pr = prById(state, prId);
    if (!pr) return fail('PR tidak ditemukan.');
    if (pr.status !== 'diajukan') return fail('Hanya PR yang diajukan yang bisa disetujui.');
    var who = actor(user);
    pr.status = 'disetujui';
    pr.disetujuiOleh = who.id;
    pr.disetujuiNama = who.nama;
    pr.disetujuiPada = now();
    addHistory(pr, user, 'disetujui', 'PR disetujui');
    log(state, user, 'PR disetujui', pr.nomor, '');
    return ok({ pr: pr });
  }

  function rejectPR(state, prId, user, alasan) {
    var pr = prById(state, prId);
    if (!pr) return fail('PR tidak ditemukan.');
    if (pr.status !== 'diajukan') return fail('Hanya PR yang diajukan yang bisa ditolak.');
    var reason = String(alasan || '').trim();
    if (!reason) return fail('Alasan penolakan wajib diisi.');
    var who = actor(user);
    pr.status = 'ditolak';
    pr.disetujuiOleh = who.id;
    pr.disetujuiNama = who.nama;
    pr.disetujuiPada = now();
    pr.alasanTolak = reason;
    addHistory(pr, user, 'ditolak', reason);
    log(state, user, 'PR ditolak', pr.nomor, reason);
    return ok({ pr: pr });
  }

  function refreshPRStatus(state, prId) {
    var pr = prById(state, prId);
    if (!pr || pr.status === 'ditolak') return;
    var lines = prLines(state, prId);
    if (!lines.length) return;
    var allOrdered = lines.every(function (line) {
      return (Number(line.qtySudahDipesan) || 0) >= (Number(line.qty) || 0);
    });
    var anyOrdered = lines.some(function (line) {
      return (Number(line.qtySudahDipesan) || 0) > 0;
    });
    if (allOrdered) pr.status = 'selesai';
    else if (anyOrdered) pr.status = 'diproses';
    else if (pr.status === 'diproses' || pr.status === 'selesai') pr.status = 'disetujui';
  }

  function releasePRQuantities(state, po) {
    if (!po || !po.prId) return;
    poLines(state, po.id).forEach(function (poLine) {
      var prLine = state.prLines.find(function (line) {
        return line.prId === po.prId && line.barangId === poLine.barangId;
      });
      if (!prLine) return;
      prLine.qtySudahDipesan = Math.max(0, (Number(prLine.qtySudahDipesan) || 0) - (Number(poLine.qty) || 0));
    });
    refreshPRStatus(state, po.prId);
  }

  function releasePRRemaining(state, po) {
    if (!po || !po.prId) return;
    poLines(state, po.id).forEach(function (poLine) {
      var remaining = Math.max(0, (Number(poLine.qty) || 0) - (Number(poLine.qtyDiterima) || 0));
      var prLine = state.prLines.find(function (line) {
        return line.prId === po.prId && line.barangId === poLine.barangId;
      });
      if (!prLine) return;
      prLine.qtySudahDipesan = Math.max(0, (Number(prLine.qtySudahDipesan) || 0) - remaining);
    });
    refreshPRStatus(state, po.prId);
  }

  function validatePOForm(state, form) {
    var errors = [];
    var supplier = Master.supplierById(state, form.supplierId);
    if (!Format.isValidDateISO(form.tanggal)) errors.push('Tanggal PO tidak valid.');
    if (form.terminBayar !== '' && form.terminBayar !== undefined && Ledger.round(form.terminBayar) < 0) {
      errors.push('Termin bayar tidak boleh negatif.');
    }
    if (!supplier) errors.push('Pilih supplier.');
    else if (supplier.aktif === false) errors.push('Supplier nonaktif.');
    var lines = (form.lines || []).filter(function (line) {
      return line && line.barangId && Ledger.round(line.qty) > 0;
    });
    if (lines.length === 0) errors.push('PO minimal memiliki satu barang dengan qty lebih dari 0.');
    var seen = {};
    lines.forEach(function (line, index) {
      var barang = Master.barangById(state, line.barangId);
      if (!barang) errors.push('Baris ' + (index + 1) + ': barang tidak ditemukan.');
      else if (barang.aktif === false) errors.push('Baris ' + (index + 1) + ': barang ' + barang.nama + ' nonaktif.');
      if (seen[line.barangId]) errors.push('Baris ' + (index + 1) + ': barang tidak boleh duplikat.');
      seen[line.barangId] = true;
      if (Ledger.round(line.harga) < 0) errors.push('Baris ' + (index + 1) + ': harga tidak boleh negatif.');
    });

    if (form.prId) {
      var pr = prById(state, form.prId);
      if (!pr) errors.push('PR tidak ditemukan.');
      else if (pr.status !== 'disetujui' && pr.status !== 'diproses') {
        errors.push('PO hanya bisa dibuat dari PR yang sudah disetujui.');
      } else {
        lines.forEach(function (line, index) {
          var prLine = state.prLines.find(function (row) {
            return row.prId === pr.id && row.barangId === line.barangId;
          });
          if (!prLine) {
            errors.push('Baris ' + (index + 1) + ': barang tidak ada di PR.');
            return;
          }
          var remaining = (Number(prLine.qty) || 0) - (Number(prLine.qtySudahDipesan) || 0);
          if (Ledger.round(line.qty) > remaining) {
            errors.push('Baris ' + (index + 1) + ': qty melebihi sisa PR (' + remaining + ').');
          }
        });
      }
    }

    return { ok: errors.length === 0, errors: errors, lines: lines, supplier: supplier };
  }

  function createPO(state, form, user) {
    var validation = validatePOForm(state, form);
    if (!validation.ok) return { ok: false, errors: validation.errors };
    var total = validation.lines.reduce(function (sum, line) {
      return sum + Ledger.round(line.qty) * Ledger.round(line.harga);
    }, 0);
    var threshold = Number(state.settings && state.settings.ambangPersetujuanPO);
    if (!isFinite(threshold)) threshold = 5000000;
    var needApproval = total >= threshold;
    var who = actor(user);
    var po = {
      id: Ledger.uid('po'),
      nomor: Numbering.next(state, 'PO', form.tanggal),
      tanggal: form.tanggal,
      supplierId: validation.supplier.id,
      prId: form.prId || null,
      terminBayar: form.terminBayar !== undefined && form.terminBayar !== ''
        ? Ledger.round(form.terminBayar)
        : (Number(validation.supplier.terminBayar) || 0),
      status: needApproval ? 'menunggu_persetujuan' : 'disetujui',
      total: total,
      catatan: String(form.catatan || '').trim(),
      dibuatOleh: who.id,
      dibuatNama: who.nama,
      dibuatPada: now(),
      disetujuiOleh: needApproval ? null : 'sistem',
      disetujuiNama: needApproval ? null : 'Otomatis (di bawah ambang)',
      disetujuiPada: needApproval ? null : now(),
      alasanTolak: '',
      riwayat: []
    };
    state.purchaseOrders.push(po);
    validation.lines.forEach(function (line) {
      state.poLines.push({
        id: Ledger.uid('pol'),
        poId: po.id,
        barangId: line.barangId,
        qty: Ledger.round(line.qty),
        harga: Ledger.round(line.harga),
        qtyDiterima: 0,
        qtyDiretur: 0
      });
    });
    if (po.prId) {
      validation.lines.forEach(function (line) {
        var prLine = state.prLines.find(function (row) {
          return row.prId === po.prId && row.barangId === line.barangId;
        });
        if (prLine) {
          prLine.qtySudahDipesan = (Number(prLine.qtySudahDipesan) || 0) + Ledger.round(line.qty);
        }
      });
      refreshPRStatus(state, po.prId);
    }
    addHistory(po, user, 'dibuat', needApproval ? 'PO menunggu persetujuan' : 'PO otomatis disetujui');
    log(state, user, 'PO dibuat', po.nomor, needApproval ? 'Menunggu persetujuan' : 'Di bawah ambang');
    return ok({ po: po });
  }

  function approvePO(state, poId, user) {
    var po = poById(state, poId);
    if (!po) return fail('PO tidak ditemukan.');
    if (po.status !== 'menunggu_persetujuan') return fail('Hanya PO yang menunggu persetujuan yang bisa disetujui.');
    var who = actor(user);
    po.status = 'disetujui';
    po.disetujuiOleh = who.id;
    po.disetujuiNama = who.nama;
    po.disetujuiPada = now();
    addHistory(po, user, 'disetujui', 'PO disetujui');
    log(state, user, 'PO disetujui', po.nomor, '');
    return ok({ po: po });
  }

  function rejectPO(state, poId, user, alasan) {
    var po = poById(state, poId);
    if (!po) return fail('PO tidak ditemukan.');
    if (po.status !== 'menunggu_persetujuan') return fail('Hanya PO yang menunggu persetujuan yang bisa ditolak.');
    var reason = String(alasan || '').trim();
    if (!reason) return fail('Alasan penolakan wajib diisi.');
    var who = actor(user);
    po.status = 'ditolak';
    po.disetujuiOleh = who.id;
    po.disetujuiNama = who.nama;
    po.disetujuiPada = now();
    po.alasanTolak = reason;
    releasePRQuantities(state, po);
    addHistory(po, user, 'ditolak', reason);
    log(state, user, 'PO ditolak', po.nomor, reason);
    return ok({ po: po });
  }

  function sendPO(state, poId, user) {
    var po = poById(state, poId);
    if (!po) return fail('PO tidak ditemukan.');
    if (po.status !== 'disetujui') return fail('Hanya PO disetujui yang bisa ditandai terkirim.');
    po.status = 'dikirim';
    po.dikirimPada = now();
    addHistory(po, user, 'dikirim', 'PO ditandai terkirim ke supplier');
    log(state, user, 'PO dikirim', po.nomor, '');
    return ok({ po: po });
  }

  function cancelPO(state, poId, user, alasan) {
    var po = poById(state, poId);
    if (!po) return fail('PO tidak ditemukan.');
    if (['draft', 'menunggu_persetujuan', 'disetujui'].indexOf(po.status) < 0) {
      return fail('PO yang sudah memiliki penerimaan tidak bisa dibatalkan.');
    }
    if (state.receipts.some(function (receipt) { return receipt.poId === po.id; })) {
      return fail('PO sudah memiliki penerimaan. Gunakan penutupan PO.');
    }
    po.status = 'dibatalkan';
    po.alasanTolak = String(alasan || '').trim();
    releasePRQuantities(state, po);
    addHistory(po, user, 'dibatalkan', po.alasanTolak);
    log(state, user, 'PO dibatalkan', po.nomor, po.alasanTolak);
    return ok({ po: po });
  }

  function closePO(state, poId, user) {
    var po = poById(state, poId);
    if (!po) return fail('PO tidak ditemukan.');
    if (['disetujui', 'dikirim', 'diterima_sebagian'].indexOf(po.status) < 0) {
      return fail('PO ini tidak bisa ditutup.');
    }
    po.status = 'ditutup';
    po.ditutupPada = now();
    releasePRRemaining(state, po);
    addHistory(po, user, 'ditutup', 'Sisa PO tidak akan dikirim');
    log(state, user, 'PO ditutup', po.nomor, '');
    return ok({ po: po });
  }

  function openPOs(state) {
    return state.purchaseOrders.filter(function (po) {
      return ['disetujui', 'dikirim', 'diterima_sebagian'].indexOf(po.status) >= 0;
    });
  }

  function pendingPR(state) {
    return state.purchaseRequests.filter(function (pr) { return pr.status === 'diajukan'; });
  }

  function pendingPO(state) {
    return state.purchaseOrders.filter(function (po) { return po.status === 'menunggu_persetujuan'; });
  }

  global.Purchasing = {
    fail: fail,
    ok: ok,
    log: log,
    addHistory: addHistory,
    prById: prById,
    prLines: prLines,
    poById: poById,
    poLines: poLines,
    totalPO: totalPO,
    prStatusLabel: prStatusLabel,
    poStatusLabel: poStatusLabel,
    createPR: createPR,
    updatePR: updatePR,
    submitPR: submitPR,
    approvePR: approvePR,
    rejectPR: rejectPR,
    createPO: createPO,
    approvePO: approvePO,
    rejectPO: rejectPO,
    sendPO: sendPO,
    cancelPO: cancelPO,
    closePO: closePO,
    openPOs: openPOs,
    pendingPR: pendingPR,
    pendingPO: pendingPO,
    refreshPRStatus: refreshPRStatus
  };
})(typeof window !== 'undefined' ? window : globalThis);
