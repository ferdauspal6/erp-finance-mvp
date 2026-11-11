(function (global) {
  'use strict';

  var Format = global.Format;

  function uid(prefix) {
    return (prefix || 'id') + '_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 9);
  }

  function round(value) {
    var n = typeof value === 'number' ? value : parseFloat(String(value === null || value === undefined ? '' : value).replace(/[^0-9.-]/g, ''));
    return isFinite(n) ? Math.round(n) : 0;
  }

  function accountOf(state, accountId) {
    for (var i = 0; i < state.accounts.length; i++) {
      if (state.accounts[i].id === accountId) return state.accounts[i];
    }
    return null;
  }

  function accountByKode(state, kode) {
    for (var i = 0; i < state.accounts.length; i++) {
      if (state.accounts[i].kode === kode) return state.accounts[i];
    }
    return null;
  }

  function totals(lines) {
    var totalDebit = 0;
    var totalKredit = 0;
    (lines || []).forEach(function (line) {
      totalDebit += round(line.debit);
      totalKredit += round(line.kredit);
    });
    return {
      totalDebit: totalDebit,
      totalKredit: totalKredit,
      selisih: totalDebit - totalKredit
    };
  }

  function cleanLines(lines) {
    return (lines || []).filter(function (line) {
      return line && (line.accountId || round(line.debit) !== 0 || round(line.kredit) !== 0);
    });
  }

  function validateJournal(state, draft) {
    var errors = [];
    var tanggal = draft.tanggal || '';
    var keterangan = (draft.keterangan || '').trim();
    var lines = cleanLines(draft.lines);

    if (!Format.isValidDateISO(tanggal)) errors.push('Tanggal jurnal tidak valid.');
    if (!keterangan) errors.push('Keterangan wajib diisi.');
    if (lines.length < 2) errors.push('Jurnal minimal dua baris.');

    var sum = totals(lines);
    lines.forEach(function (line, index) {
      var debit = round(line.debit);
      var kredit = round(line.kredit);
      var label = 'Baris ' + (index + 1);
      var account = line.accountId ? accountOf(state, line.accountId) : null;

      if (!line.accountId) {
        errors.push(label + ': pilih akun.');
      } else if (!account) {
        errors.push(label + ': akun tidak ditemukan.');
      } else if (account.aktif === false) {
        errors.push(label + ': akun ' + account.nama + ' sudah nonaktif.');
      }

      if (debit < 0 || kredit < 0) errors.push(label + ': nilai tidak boleh negatif.');
      if (debit > 0 && kredit > 0) errors.push(label + ': isi debit atau kredit, tidak keduanya.');
      if (debit === 0 && kredit === 0) errors.push(label + ': isi nilai debit atau kredit.');
    });

    if (sum.totalDebit > 0 && sum.totalDebit !== sum.totalKredit) {
      errors.push('Total debit dan kredit belum seimbang (selisih ' + Format.rupiah(sum.selisih) + ').');
    }
    if (sum.totalDebit === 0 && sum.totalKredit === 0) {
      errors.push('Jurnal belum memiliki nilai.');
    }

    return {
      ok: errors.length === 0,
      errors: errors,
      lines: lines,
      totalDebit: sum.totalDebit,
      totalKredit: sum.totalKredit,
      selisih: sum.selisih
    };
  }

  function journalNomor(state, tanggal) {
    var prefix = 'JU-' + tanggal.slice(0, 7) + '-';
    var max = 0;
    state.journals.forEach(function (journal) {
      if (journal.nomor && journal.nomor.indexOf(prefix) === 0) {
        var n = parseInt(journal.nomor.slice(prefix.length), 10);
        if (isFinite(n) && n > max) max = n;
      }
    });
    return prefix + String(max + 1).padStart(3, '0');
  }

  function createJournal(state, draft) {
    var validation = validateJournal(state, draft);
    if (!validation.ok) {
      return { ok: false, errors: validation.errors, selisih: validation.selisih };
    }

    var journal = {
      id: uid('jrn'),
      tanggal: draft.tanggal,
      nomor: journalNomor(state, draft.tanggal),
      keterangan: (draft.keterangan || '').trim(),
      sumber: draft.sumber || 'manual',
      refId: draft.refId || null
    };
    state.journals.push(journal);

    validation.lines.forEach(function (line) {
      state.journalLines.push({
        id: uid('ln'),
        journalId: journal.id,
        accountId: line.accountId,
        debit: round(line.debit),
        kredit: round(line.kredit),
        partyId: line.partyId || null
      });
    });

    return { ok: true, journal: journal, errors: [] };
  }

  function deleteJournal(state, journalId) {
    var journal = state.journals.find(function (item) { return item.id === journalId; });
    if (!journal) return { ok: false, error: 'Jurnal tidak ditemukan.' };
    if (journal.sumber !== 'manual') {
      return {
        ok: false,
        error: 'Jurnal dari tagihan atau pembayaran tidak bisa dihapus langsung. Hapus dokumen sumbernya.'
      };
    }
    removeJournalUnsafe(state, journalId);
    return { ok: true };
  }

  function removeJournalUnsafe(state, journalId) {
    state.journals = state.journals.filter(function (item) { return item.id !== journalId; });
    state.journalLines = state.journalLines.filter(function (line) { return line.journalId !== journalId; });
  }

  function journalDetails(state, journalId) {
    var journal = state.journals.find(function (item) { return item.id === journalId; });
    if (!journal) return null;
    var lines = state.journalLines
      .filter(function (line) { return line.journalId === journalId; })
      .map(function (line) {
        return {
          id: line.id,
          accountId: line.accountId,
          debit: line.debit,
          kredit: line.kredit,
          partyId: line.partyId,
          akun: accountOf(state, line.accountId),
          party: line.partyId ? state.parties.find(function (p) { return p.id === line.partyId; }) : null
        };
      });
    return {
      id: journal.id,
      tanggal: journal.tanggal,
      nomor: journal.nomor,
      keterangan: journal.keterangan,
      sumber: journal.sumber,
      refId: journal.refId,
      lines: lines
    };
  }

  function accountUsed(state, accountId) {
    if (state.journalLines.some(function (line) { return line.accountId === accountId; })) return true;
    if (state.invoices.some(function (inv) { return inv.akunLawanId === accountId || inv.akunHppId === accountId; })) return true;
    if (state.payments.some(function (pay) { return pay.akunKasId === accountId; })) return true;
    return false;
  }

  function nextRekeningKode(state) {
    var max = 1100;
    state.accounts.forEach(function (account) {
      if (/^1-11\d{2}$/.test(account.kode)) {
        var n = parseInt(account.kode.slice(2), 10);
        if (isFinite(n) && n > max) max = n;
      }
    });
    return '1-' + String(max + 10).padStart(4, '0');
  }

  global.Ledger = {
    uid: uid,
    round: round,
    accountOf: accountOf,
    accountByKode: accountByKode,
    totals: totals,
    cleanLines: cleanLines,
    validateJournal: validateJournal,
    journalNomor: journalNomor,
    createJournal: createJournal,
    deleteJournal: deleteJournal,
    removeJournalUnsafe: removeJournalUnsafe,
    journalDetails: journalDetails,
    accountUsed: accountUsed,
    nextRekeningKode: nextRekeningKode
  };
})(typeof window !== 'undefined' ? window : globalThis);
