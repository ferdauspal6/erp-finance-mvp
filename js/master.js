(function (global) {
  'use strict';

  var Ledger = global.Ledger;
  var Format = global.Format;

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

  function findById(list, id) {
    return (list || []).find(function (item) { return item.id === id; }) || null;
  }

  function barangById(state, id) { return findById(state.barang, id); }
  function kategoriById(state, id) { return findById(state.kategoris, id); }
  function satuanById(state, id) { return findById(state.satuans, id); }
  function gudangById(state, id) { return findById(state.gudangs, id); }
  function supplierById(state, id) {
    var party = findById(state.parties, id);
    return party && party.jenis === 'pemasok' ? party : null;
  }

  function nextSupplierKode(state) {
    var max = 0;
    state.parties.forEach(function (party) {
      var match = String(party.kode || '').match(/^SUP-(\d+)$/);
      if (match) {
        var value = parseInt(match[1], 10);
        if (isFinite(value) && value > max) max = value;
      }
    });
    return 'SUP-' + String(max + 1).padStart(3, '0');
  }

  function addBarang(state, form) {
    var kode = String(form.kode || '').trim().toUpperCase();
    var nama = String(form.nama || '').trim();
    var kategori = kategoriById(state, form.kategoriId);
    var satuan = satuanById(state, form.satuanId);
    var harga = Ledger.round(form.hargaBeliStandar);
    var minimum = Ledger.round(form.stokMinimum);
    var akun = findById(state.accounts, form.akunPersediaanId) ||
      Ledger.accountByKode(state, '1-1300');

    if (!kode) return fail('Kode barang wajib diisi.');
    if (state.barang.some(function (item) { return String(item.kode).toUpperCase() === kode; })) {
      return fail('Kode barang ' + kode + ' sudah dipakai.');
    }
    if (!nama) return fail('Nama barang wajib diisi.');
    if (!kategori) return fail('Pilih kategori barang.');
    if (!satuan) return fail('Pilih satuan barang.');
    if (harga < 0) return fail('Harga beli standar tidak boleh negatif.');
    if (minimum < 0) return fail('Stok minimum tidak boleh negatif.');
    if (!akun) return fail('Akun Persediaan Barang tidak ditemukan.');

    var barang = {
      id: Ledger.uid('brg'),
      kode: kode,
      nama: nama,
      kategoriId: kategori.id,
      satuanId: satuan.id,
      hargaBeliStandar: harga,
      stokMinimum: minimum,
      kelolaStok: form.kelolaStok !== false,
      akunPersediaanId: akun.id,
      aktif: true,
      dibuatPada: now()
    };
    state.barang.push(barang);
    return ok({ barang: barang });
  }

  function barangUsed(state, barangId) {
    return state.prLines.some(function (line) { return line.barangId === barangId; }) ||
      state.poLines.some(function (line) { return line.barangId === barangId; }) ||
      state.receiptLines.some(function (line) { return line.barangId === barangId; }) ||
      state.returnLines.some(function (line) { return line.barangId === barangId; }) ||
      state.stockMovements.some(function (line) { return line.barangId === barangId; });
  }

  function updateBarang(state, id, form) {
    var barang = barangById(state, id);
    if (!barang) return fail('Barang tidak ditemukan.');
    var kode = String(form.kode || '').trim().toUpperCase();
    var nama = String(form.nama || '').trim();
    var kategori = kategoriById(state, form.kategoriId);
    var satuan = satuanById(state, form.satuanId);
    var harga = Ledger.round(form.hargaBeliStandar);
    var minimum = Ledger.round(form.stokMinimum);

    if (!kode) return fail('Kode barang wajib diisi.');
    if (state.barang.some(function (item) {
      return item.id !== id && String(item.kode).toUpperCase() === kode;
    })) return fail('Kode barang ' + kode + ' sudah dipakai.');
    if (!nama) return fail('Nama barang wajib diisi.');
    if (!kategori) return fail('Pilih kategori barang.');
    if (!satuan) return fail('Pilih satuan barang.');
    if (harga < 0 || minimum < 0) return fail('Harga dan stok minimum tidak boleh negatif.');
    if (satuan.id !== barang.satuanId && barangUsed(state, id)) {
      return fail('Satuan tidak boleh diganti karena barang sudah dipakai transaksi.');
    }

    barang.kode = kode;
    barang.nama = nama;
    barang.kategoriId = kategori.id;
    barang.satuanId = satuan.id;
    barang.hargaBeliStandar = harga;
    barang.stokMinimum = minimum;
    barang.kelolaStok = form.kelolaStok !== false;
    return ok({ barang: barang });
  }

  function toggleBarang(state, id) {
    var barang = barangById(state, id);
    if (!barang) return fail('Barang tidak ditemukan.');
    barang.aktif = barang.aktif === false;
    return ok({ barang: barang });
  }

  function removeBarang(state, id) {
    var barang = barangById(state, id);
    if (!barang) return fail('Barang tidak ditemukan.');
    if (barangUsed(state, id)) return fail('Barang sudah dipakai transaksi. Nonaktifkan saja.');
    state.barang = state.barang.filter(function (item) { return item.id !== id; });
    state.hargaSupplier = state.hargaSupplier.filter(function (item) { return item.barangId !== id; });
    return ok();
  }

  function addKategori(state, form) {
    var kode = String(form.kode || '').trim().toUpperCase();
    var nama = String(form.nama || '').trim();
    if (!kode || !nama) return fail('Kode dan nama kategori wajib diisi.');
    if (state.kategoris.some(function (item) { return String(item.kode).toUpperCase() === kode; })) {
      return fail('Kode kategori sudah dipakai.');
    }
    var item = { id: Ledger.uid('kat'), kode: kode, nama: nama, aktif: true };
    state.kategoris.push(item);
    return ok({ kategori: item });
  }

  function toggleKategori(state, id) {
    var item = kategoriById(state, id);
    if (!item) return fail('Kategori tidak ditemukan.');
    item.aktif = item.aktif === false;
    return ok({ kategori: item });
  }

  function addSatuan(state, form) {
    var nama = String(form.nama || '').trim();
    var singkatan = String(form.singkatan || '').trim();
    if (!nama || !singkatan) return fail('Nama dan singkatan satuan wajib diisi.');
    if (state.satuans.some(function (item) {
      return String(item.singkatan).toLowerCase() === singkatan.toLowerCase();
    })) return fail('Singkatan satuan sudah dipakai.');
    var item = { id: Ledger.uid('sat'), nama: nama, singkatan: singkatan, aktif: true };
    state.satuans.push(item);
    return ok({ satuan: item });
  }

  function toggleSatuan(state, id) {
    var item = satuanById(state, id);
    if (!item) return fail('Satuan tidak ditemukan.');
    item.aktif = item.aktif === false;
    return ok({ satuan: item });
  }

  function addGudang(state, form) {
    var kode = String(form.kode || '').trim().toUpperCase();
    var nama = String(form.nama || '').trim();
    if (!kode || !nama) return fail('Kode dan nama gudang wajib diisi.');
    if (state.gudangs.some(function (item) { return String(item.kode).toUpperCase() === kode; })) {
      return fail('Kode gudang sudah dipakai.');
    }
    if (form.utama) {
      state.gudangs.forEach(function (item) { item.utama = false; });
    }
    var item = { id: Ledger.uid('gdg'), kode: kode, nama: nama, utama: !!form.utama, aktif: true };
    state.gudangs.push(item);
    return ok({ gudang: item });
  }

  function setGudangUtama(state, id) {
    var item = gudangById(state, id);
    if (!item) return fail('Gudang tidak ditemukan.');
    state.gudangs.forEach(function (row) { row.utama = row.id === id; });
    return ok({ gudang: item });
  }

  function toggleGudang(state, id) {
    var item = gudangById(state, id);
    if (!item) return fail('Gudang tidak ditemukan.');
    if (item.utama && item.aktif !== false) return fail('Gudang utama tidak bisa dinonaktifkan.');
    item.aktif = item.aktif === false;
    return ok({ gudang: item });
  }

  function addSupplier(state, form) {
    var nama = String(form.nama || '').trim();
    var kode = String(form.kode || '').trim().toUpperCase() || nextSupplierKode(state);
    var termin = Ledger.round(form.terminBayar);
    if (!nama) return fail('Nama supplier wajib diisi.');
    if (state.parties.some(function (party) {
      return String(party.kode || '').toUpperCase() === kode;
    })) return fail('Kode supplier ' + kode + ' sudah dipakai.');
    if (termin < 0) return fail('Termin bayar tidak boleh negatif.');
    var party = {
      id: Ledger.uid('party'),
      kode: kode,
      nama: nama,
      jenis: 'pemasok',
      kontak: String(form.kontak || '').trim(),
      telepon: String(form.telepon || '').trim(),
      alamat: String(form.alamat || '').trim(),
      terminBayar: termin,
      aktif: true
    };
    state.parties.push(party);
    return ok({ supplier: party });
  }

  function updateSupplier(state, id, form) {
    var party = supplierById(state, id);
    if (!party) return fail('Supplier tidak ditemukan.');
    var nama = String(form.nama || '').trim();
    var kode = String(form.kode || '').trim().toUpperCase();
    var termin = Ledger.round(form.terminBayar);
    if (!nama) return fail('Nama supplier wajib diisi.');
    if (!kode) return fail('Kode supplier wajib diisi.');
    if (state.parties.some(function (item) {
      return item.id !== id && String(item.kode || '').toUpperCase() === kode;
    })) return fail('Kode supplier ' + kode + ' sudah dipakai.');
    if (termin < 0) return fail('Termin bayar tidak boleh negatif.');
    party.kode = kode;
    party.nama = nama;
    party.kontak = String(form.kontak || '').trim();
    party.telepon = String(form.telepon || '').trim();
    party.alamat = String(form.alamat || '').trim();
    party.terminBayar = termin;
    return ok({ supplier: party });
  }

  function toggleSupplier(state, id) {
    var party = supplierById(state, id);
    if (!party) return fail('Supplier tidak ditemukan.');
    party.aktif = party.aktif === false;
    return ok({ supplier: party });
  }

  function removeSupplier(state, id) {
    var party = supplierById(state, id);
    if (!party) return fail('Supplier tidak ditemukan.');
    var used = state.invoices.some(function (invoice) { return invoice.partyId === id; }) ||
      state.purchaseOrders.some(function (po) { return po.supplierId === id; }) ||
      state.receipts.some(function (receipt) { return receipt.supplierId === id; }) ||
      state.purchaseReturns.some(function (retur) { return retur.supplierId === id; });
    if (used) return fail('Supplier sudah dipakai transaksi. Nonaktifkan saja.');
    state.parties = state.parties.filter(function (item) { return item.id !== id; });
    state.hargaSupplier = state.hargaSupplier.filter(function (item) { return item.supplierId !== id; });
    return ok();
  }

  function hargaFor(state, supplierId, barangId) {
    var rows = state.hargaSupplier.filter(function (row) {
      return row.supplierId === supplierId && row.barangId === barangId;
    }).slice().sort(function (a, b) {
      var byDate = String(b.berlakuMulai).localeCompare(String(a.berlakuMulai));
      if (byDate !== 0) return byDate;
      return String(b.id).localeCompare(String(a.id));
    });
    return rows.length ? rows[0] : null;
  }

  function setHargaSupplier(state, form) {
    var supplier = supplierById(state, form.supplierId);
    var barang = barangById(state, form.barangId);
    var harga = Ledger.round(form.harga);
    var tanggal = form.berlakuMulai || Format.todayISO();
    if (!supplier) return fail('Pilih supplier.');
    if (!barang) return fail('Pilih barang.');
    if (!Format.isValidDateISO(tanggal)) return fail('Tanggal berlaku tidak valid.');
    if (harga < 0) return fail('Harga tidak boleh negatif.');
    var row = {
      id: Ledger.uid('hgs'),
      supplierId: supplier.id,
      barangId: barang.id,
      harga: harga,
      berlakuMulai: tanggal
    };
    state.hargaSupplier.push(row);
    return ok({ harga: row });
  }

  function suppliers(state) {
    return state.parties.filter(function (party) { return party.jenis === 'pemasok'; });
  }

  global.Master = {
    fail: fail,
    ok: ok,
    barangById: barangById,
    kategoriById: kategoriById,
    satuanById: satuanById,
    gudangById: gudangById,
    supplierById: supplierById,
    suppliers: suppliers,
    nextSupplierKode: nextSupplierKode,
    addBarang: addBarang,
    updateBarang: updateBarang,
    toggleBarang: toggleBarang,
    removeBarang: removeBarang,
    addKategori: addKategori,
    toggleKategori: toggleKategori,
    addSatuan: addSatuan,
    toggleSatuan: toggleSatuan,
    addGudang: addGudang,
    setGudangUtama: setGudangUtama,
    toggleGudang: toggleGudang,
    addSupplier: addSupplier,
    updateSupplier: updateSupplier,
    toggleSupplier: toggleSupplier,
    removeSupplier: removeSupplier,
    hargaFor: hargaFor,
    setHargaSupplier: setHargaSupplier
  };
})(typeof window !== 'undefined' ? window : globalThis);
