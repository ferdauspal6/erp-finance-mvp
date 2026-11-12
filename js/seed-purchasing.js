(function (global) {
  'use strict';

  var Seed = global.Seed;
  var Ledger = global.Ledger;
  var Purchasing = global.Purchasing;
  var Receiving = global.Receiving;

  var KAT_SEMEN = 'kat_semen';
  var KAT_CAT = 'kat_cat';
  var KAT_MATERIAL = 'kat_material';
  var KAT_BESI = 'kat_besi';
  var KAT_KAYU = 'kat_kayu';
  var KAT_UMUM = 'kat_umum';

  var SAT_SAK = 'sat_sak';
  var SAT_KALENG = 'sat_kaleng';
  var SAT_M3 = 'sat_m3';
  var SAT_PCS = 'sat_pcs';
  var SAT_BATANG = 'sat_batang';
  var SAT_KG = 'sat_kg';
  var SAT_LEMBAR = 'sat_lembar';
  var SAT_DUS = 'sat_dus';

  var GDG_UTAMA = 'gdg_utama';
  var GDG_CABANG = 'gdg_cabang';

  var BRG_SEMEN = 'brg_semen';
  var BRG_CAT = 'brg_cat';
  var BRG_PASIR = 'brg_pasir';
  var BRG_BATA = 'brg_bata';
  var BRG_CAT_KAYU = 'brg_cat_kayu';
  var BRG_BESI = 'brg_besi';
  var BRG_PAKU = 'brg_paku';
  var BRG_TRIPLEK = 'brg_triplek';
  var BRG_KERAMIK = 'brg_keramik';
  var BRG_ENGSEL = 'brg_engsel';

  var SUP_A = Seed.PARTY_PEMASOK;
  var SUP_B = 'party_pemasok_b';
  var SUP_C = 'party_pemasok_c';
  var SUP_D = 'party_pemasok_d';

  var USER_FINANCE = { id: 'user_finance', nama: 'Finance', role: 'finance' };
  var USER_LOGISTIK = { id: 'user_logistik', nama: 'Logistik', role: 'logistik' };

  function supplier(id, kode, nama, kontak, telepon, alamat, termin) {
    return {
      id: id,
      kode: kode,
      nama: nama,
      jenis: 'pemasok',
      kontak: kontak,
      telepon: telepon,
      alamat: alamat,
      terminBayar: termin,
      aktif: true
    };
  }

  function barang(id, kode, nama, kategoriId, satuanId, harga, minimum) {
    return {
      id: id,
      kode: kode,
      nama: nama,
      kategoriId: kategoriId,
      satuanId: satuanId,
      hargaBeliStandar: harga,
      stokMinimum: minimum,
      kelolaStok: true,
      akunPersediaanId: Seed.accountId('1-1300'),
      aktif: true,
      dibuatPada: '2026-11-01T00:00:00.000Z'
    };
  }

  function master() {
    var state = Seed.bootstrap();
    state.meta.scenario = false;
    state.meta.scenarioType = null;
    state.settings.ambangPersetujuanPO = 5000000;
    state.settings.toleransiPenerimaan = 0;
    state.users = [
      { id: USER_FINANCE.id, nama: USER_FINANCE.nama, role: USER_FINANCE.role },
      { id: USER_LOGISTIK.id, nama: USER_LOGISTIK.nama, role: USER_LOGISTIK.role }
    ];

    state.parties.push(
      supplier(SUP_B, 'SUP-002', 'Pemasok B', 'sales@pemasok-b.co.id', '021-555-0102', 'Jl. Cat Raya No. 2', 14),
      supplier(SUP_C, 'SUP-003', 'Pemasok C', 'sales@pemasok-c.co.id', '021-555-0103', 'Jl. Logam No. 3', 45),
      supplier(SUP_D, 'SUP-004', 'Pemasok D', 'sales@pemasok-d.co.id', '021-555-0104', 'Jl. Umum No. 4', 0)
    );

    state.kategoris = [
      { id: KAT_SEMEN, kode: 'SEM', nama: 'Semen', aktif: true },
      { id: KAT_CAT, kode: 'CAT', nama: 'Cat dan Finishing', aktif: true },
      { id: KAT_MATERIAL, kode: 'MAT', nama: 'Material Bangunan', aktif: true },
      { id: KAT_BESI, kode: 'BESI', nama: 'Besi dan Logam', aktif: true },
      { id: KAT_KAYU, kode: 'KAYU', nama: 'Kayu dan Papan', aktif: true },
      { id: KAT_UMUM, kode: 'UMUM', nama: 'Perlengkapan Umum', aktif: true }
    ];
    state.satuans = [
      { id: SAT_SAK, nama: 'Sak', singkatan: 'sak', aktif: true },
      { id: SAT_KALENG, nama: 'Kaleng', singkatan: 'klg', aktif: true },
      { id: SAT_M3, nama: 'Meter kubik', singkatan: 'm3', aktif: true },
      { id: SAT_PCS, nama: 'Pieces', singkatan: 'pcs', aktif: true },
      { id: SAT_BATANG, nama: 'Batang', singkatan: 'btg', aktif: true },
      { id: SAT_KG, nama: 'Kilogram', singkatan: 'kg', aktif: true },
      { id: SAT_LEMBAR, nama: 'Lembar', singkatan: 'lbr', aktif: true },
      { id: SAT_DUS, nama: 'Dus', singkatan: 'dus', aktif: true }
    ];
    state.gudangs = [
      { id: GDG_UTAMA, kode: 'GDG-01', nama: 'Gudang Utama', utama: true, aktif: true },
      { id: GDG_CABANG, kode: 'GDG-02', nama: 'Gudang Cabang', utama: false, aktif: true }
    ];
    state.barang = [
      barang(BRG_SEMEN, 'BRG-0001', 'Semen 50 kg', KAT_SEMEN, SAT_SAK, 65000, 20),
      barang(BRG_CAT, 'BRG-0002', 'Cat tembok 5 kg', KAT_CAT, SAT_KALENG, 150000, 5),
      barang(BRG_PASIR, 'BRG-0003', 'Pasir pasang', KAT_MATERIAL, SAT_M3, 250000, 2),
      barang(BRG_BATA, 'BRG-0004', 'Batu bata merah', KAT_MATERIAL, SAT_PCS, 900, 500),
      barang(BRG_CAT_KAYU, 'BRG-0005', 'Cat kayu 1 kg', KAT_CAT, SAT_KALENG, 85000, 3),
      barang(BRG_BESI, 'BRG-0006', 'Besi beton 10 mm', KAT_BESI, SAT_BATANG, 95000, 20),
      barang(BRG_PAKU, 'BRG-0007', 'Paku 5 cm', KAT_BESI, SAT_KG, 18000, 10),
      barang(BRG_TRIPLEK, 'BRG-0008', 'Triplek 3 mm', KAT_KAYU, SAT_LEMBAR, 120000, 10),
      barang(BRG_KERAMIK, 'BRG-0009', 'Keramik 40x40', KAT_MATERIAL, SAT_DUS, 75000, 5),
      barang(BRG_ENGSEL, 'BRG-0010', 'Engsel pintu', KAT_UMUM, SAT_PCS, 25000, 12)
    ];
    state.hargaSupplier = [
      { id: 'hgs_semen_a', supplierId: SUP_A, barangId: BRG_SEMEN, harga: 65000, berlakuMulai: '2026-11-01' },
      { id: 'hgs_cat_a', supplierId: SUP_A, barangId: BRG_CAT, harga: 150000, berlakuMulai: '2026-11-01' },
      { id: 'hgs_pasir_a', supplierId: SUP_A, barangId: BRG_PASIR, harga: 250000, berlakuMulai: '2026-11-01' },
      { id: 'hgs_bata_a', supplierId: SUP_A, barangId: BRG_BATA, harga: 900, berlakuMulai: '2026-11-01' },
      { id: 'hgs_keramik_a', supplierId: SUP_A, barangId: BRG_KERAMIK, harga: 75000, berlakuMulai: '2026-11-01' },
      { id: 'hgs_cat_b', supplierId: SUP_B, barangId: BRG_CAT, harga: 148000, berlakuMulai: '2026-11-01' },
      { id: 'hgs_cat_kayu_b', supplierId: SUP_B, barangId: BRG_CAT_KAYU, harga: 85000, berlakuMulai: '2026-11-01' },
      { id: 'hgs_besi_c', supplierId: SUP_C, barangId: BRG_BESI, harga: 95000, berlakuMulai: '2026-11-01' },
      { id: 'hgs_paku_c', supplierId: SUP_C, barangId: BRG_PAKU, harga: 18000, berlakuMulai: '2026-11-01' },
      { id: 'hgs_engsel_c', supplierId: SUP_C, barangId: BRG_ENGSEL, harga: 25000, berlakuMulai: '2026-11-01' },
      { id: 'hgs_triplek_d', supplierId: SUP_D, barangId: BRG_TRIPLEK, harga: 120000, berlakuMulai: '2026-11-01' },
      { id: 'hgs_engsel_d', supplierId: SUP_D, barangId: BRG_ENGSEL, harga: 26000, berlakuMulai: '2026-11-01' }
    ];
    return state;
  }

  function findPOLine(state, poId, barangId) {
    return state.poLines.find(function (line) {
      return line.poId === poId && line.barangId === barangId;
    });
  }

  function scenario() {
    var state = master();
    state.meta.scenario = true;
    state.meta.scenarioType = 'purchasing';

    var capital = Ledger.createJournal(state, {
      tanggal: '2026-11-01',
      keterangan: 'Setoran modal pemilik ke Bank BCA',
      sumber: 'manual',
      lines: [
        { accountId: Seed.accountId('1-1110'), debit: 50000000, kredit: 0 },
        { accountId: Seed.accountId('3-1100'), debit: 0, kredit: 50000000 }
      ]
    });
    if (!capital.ok) throw new Error('Gagal membuat modal awal: ' + capital.errors.join(' '));

    var prResult = Purchasing.createPR(state, {
      tanggal: '2026-11-02',
      keperluan: 'Restok semen dan cat untuk November',
      lines: [
        { barangId: BRG_SEMEN, qty: 100, catatan: 'Semen 50 kg' },
        { barangId: BRG_CAT, qty: 20, catatan: 'Cat tembok' }
      ]
    }, USER_LOGISTIK);
    if (!prResult.ok) throw new Error('Gagal membuat PR: ' + prResult.errors.join(' '));
    var pr = prResult.pr;

    var submit = Purchasing.submitPR(state, pr.id, USER_LOGISTIK);
    if (!submit.ok) throw new Error('Gagal mengajukan PR: ' + submit.errors.join(' '));

    var approvePR = Purchasing.approvePR(state, pr.id, USER_FINANCE);
    if (!approvePR.ok) throw new Error('Gagal menyetujui PR: ' + approvePR.errors.join(' '));

    var poResult = Purchasing.createPO(state, {
      tanggal: '2026-11-03',
      supplierId: SUP_A,
      prId: pr.id,
      terminBayar: 30,
      catatan: 'PO restok November',
      lines: [
        { barangId: BRG_SEMEN, qty: 100, harga: 65000 },
        { barangId: BRG_CAT, qty: 20, harga: 150000 }
      ]
    }, USER_LOGISTIK);
    if (!poResult.ok) throw new Error('Gagal membuat PO: ' + poResult.errors.join(' '));
    var po = poResult.po;

    var approvePO = Purchasing.approvePO(state, po.id, USER_FINANCE);
    if (!approvePO.ok) throw new Error('Gagal menyetujui PO: ' + approvePO.errors.join(' '));

    var semenLine = findPOLine(state, po.id, BRG_SEMEN);
    var catLine = findPOLine(state, po.id, BRG_CAT);

    var receiptOne = Receiving.createReceipt(state, {
      tanggal: '2026-11-05',
      poId: po.id,
      gudangId: GDG_UTAMA,
      suratJalan: 'SJ-001',
      lines: [
        { poLineId: semenLine.id, qty: 60 },
        { poLineId: catLine.id, qty: 20 }
      ]
    }, USER_LOGISTIK);
    if (!receiptOne.ok) throw new Error('Gagal membuat penerimaan 1: ' + receiptOne.errors.join(' '));
    var postOne = Receiving.postReceipt(state, receiptOne.receipt.id, USER_LOGISTIK);
    if (!postOne.ok) throw new Error('Gagal posting penerimaan 1: ' + postOne.errors.join(' '));

    var receiptTwo = Receiving.createReceipt(state, {
      tanggal: '2026-11-07',
      poId: po.id,
      gudangId: GDG_UTAMA,
      suratJalan: 'SJ-002',
      lines: [
        { poLineId: semenLine.id, qty: 40 }
      ]
    }, USER_LOGISTIK);
    if (!receiptTwo.ok) throw new Error('Gagal membuat penerimaan 2: ' + receiptTwo.errors.join(' '));
    var postTwo = Receiving.postReceipt(state, receiptTwo.receipt.id, USER_LOGISTIK);
    if (!postTwo.ok) throw new Error('Gagal posting penerimaan 2: ' + postTwo.errors.join(' '));

    return state;
  }

  global.SeedPurchasing = {
    master: master,
    scenario: scenario,
    KAT_SEMEN: KAT_SEMEN,
    KAT_CAT: KAT_CAT,
    KAT_MATERIAL: KAT_MATERIAL,
    KAT_BESI: KAT_BESI,
    KAT_KAYU: KAT_KAYU,
    KAT_UMUM: KAT_UMUM,
    SAT_SAK: SAT_SAK,
    SAT_KALENG: SAT_KALENG,
    SAT_M3: SAT_M3,
    SAT_PCS: SAT_PCS,
    SAT_BATANG: SAT_BATANG,
    SAT_KG: SAT_KG,
    SAT_LEMBAR: SAT_LEMBAR,
    SAT_DUS: SAT_DUS,
    GDG_UTAMA: GDG_UTAMA,
    GDG_CABANG: GDG_CABANG,
    BRG_SEMEN: BRG_SEMEN,
    BRG_CAT: BRG_CAT,
    BRG_PASIR: BRG_PASIR,
    BRG_BATA: BRG_BATA,
    BRG_CAT_KAYU: BRG_CAT_KAYU,
    BRG_BESI: BRG_BESI,
    BRG_PAKU: BRG_PAKU,
    BRG_TRIPLEK: BRG_TRIPLEK,
    BRG_KERAMIK: BRG_KERAMIK,
    BRG_ENGSEL: BRG_ENGSEL,
    SUP_A: SUP_A,
    SUP_B: SUP_B,
    SUP_C: SUP_C,
    SUP_D: SUP_D,
    USER_FINANCE: USER_FINANCE,
    USER_LOGISTIK: USER_LOGISTIK
  };
})(typeof window !== 'undefined' ? window : globalThis);
