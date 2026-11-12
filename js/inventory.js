(function (global) {
  'use strict';

  var Ledger = global.Ledger;

  function movementsFor(state, barangId, gudangId) {
    return state.stockMovements.filter(function (movement) {
      if (movement.barangId !== barangId) return false;
      if (gudangId && movement.gudangId !== gudangId) return false;
      return true;
    });
  }

  function qty(state, barangId, gudangId) {
    return movementsFor(state, barangId, gudangId).reduce(function (sum, movement) {
      return sum + (Number(movement.qty) || 0);
    }, 0);
  }

  function nilai(state, barangId, gudangId) {
    return movementsFor(state, barangId, gudangId).reduce(function (sum, movement) {
      return sum + (Number(movement.nilai) || 0);
    }, 0);
  }

  function hargaRataRata(state, barangId, gudangId) {
    var jumlah = qty(state, barangId, gudangId);
    if (!jumlah) return 0;
    return Math.round(nilai(state, barangId, gudangId) / jumlah);
  }

  function totalNilai(state) {
    return state.stockMovements.reduce(function (sum, movement) {
      return sum + (Number(movement.nilai) || 0);
    }, 0);
  }

  function ringkasan(state, includeInactive) {
    return state.barang.filter(function (barang) {
      return includeInactive || barang.aktif !== false;
    }).map(function (barang) {
      var jumlah = qty(state, barang.id);
      var total = nilai(state, barang.id);
      return {
        barang: barang,
        kategori: state.kategoris.find(function (item) { return item.id === barang.kategoriId; }) || null,
        satuan: state.satuans.find(function (item) { return item.id === barang.satuanId; }) || null,
        qty: jumlah,
        nilai: total,
        rataRata: jumlah ? Math.round(total / jumlah) : 0,
        diBawahMinimum: barang.kelolaStok !== false && jumlah < (Number(barang.stokMinimum) || 0)
      };
    });
  }

  function addMovement(state, movement) {
    var row = {
      id: movement.id || Ledger.uid('mov'),
      tanggal: movement.tanggal,
      barangId: movement.barangId,
      gudangId: movement.gudangId,
      jenis: movement.jenis,
      qty: Number(movement.qty) || 0,
      nilai: Ledger.round(movement.nilai),
      harga: Ledger.round(movement.harga),
      refTipe: movement.refTipe || null,
      refId: movement.refId || null,
      refNomor: movement.refNomor || null,
      dibuatPada: new Date().toISOString()
    };
    state.stockMovements.push(row);
    return row;
  }

  function movementLabel(jenis) {
    if (jenis === 'masuk') return 'Masuk';
    if (jenis === 'retur') return 'Retur';
    if (jenis === 'keluar') return 'Keluar';
    if (jenis === 'opname_lebih') return 'Opname lebih';
    if (jenis === 'opname_kurang') return 'Opname kurang';
    return jenis || '-';
  }

  global.Inventory = {
    movementsFor: movementsFor,
    qty: qty,
    nilai: nilai,
    hargaRataRata: hargaRataRata,
    totalNilai: totalNilai,
    ringkasan: ringkasan,
    addMovement: addMovement,
    movementLabel: movementLabel
  };
})(typeof window !== 'undefined' ? window : globalThis);
