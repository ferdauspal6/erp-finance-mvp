(function (global) {
  'use strict';

  var Ledger = global.Ledger;

  var PARTY_PEMASOK = 'party_pemasok_a';
  var PARTY_PELANGGAN = 'party_pelanggan_b';

  var RAW_ACCOUNTS = [
    ['1-1100', 'Kas', 'Aset', 'Debit', true, false, ''],
    ['1-1110', 'Bank BCA', 'Aset', 'Debit', true, false, '123-456-7890'],
    ['1-1200', 'Piutang Usaha', 'Aset', 'Debit', false, false, ''],
    ['1-1300', 'Persediaan Barang', 'Aset', 'Debit', false, false, ''],
    ['1-1400', 'Perlengkapan', 'Aset', 'Debit', false, false, ''],
    ['1-1500', 'Piutang Supplier', 'Aset', 'Debit', false, false, ''],
    ['1-2100', 'Peralatan', 'Aset', 'Debit', false, false, ''],
    ['2-1100', 'Utang Usaha', 'Kewajiban', 'Kredit', false, false, ''],
    ['2-1200', 'Utang Gaji', 'Kewajiban', 'Kredit', false, false, ''],
    ['2-2100', 'Utang Bank', 'Kewajiban', 'Kredit', false, false, ''],
    ['3-1100', 'Modal Pemilik', 'Ekuitas', 'Kredit', false, false, ''],
    ['3-1200', 'Prive', 'Ekuitas', 'Debit', false, false, ''],
    ['3-1300', 'Laba Ditahan', 'Ekuitas', 'Kredit', false, false, ''],
    ['4-1100', 'Penjualan', 'Pendapatan', 'Kredit', false, false, ''],
    ['4-1200', 'Pendapatan Jasa', 'Pendapatan', 'Kredit', false, false, ''],
    ['4-2100', 'Pendapatan Lain', 'Pendapatan', 'Kredit', false, false, ''],
    ['5-1100', 'Harga Pokok Penjualan', 'Beban', 'Debit', false, true, ''],
    ['5-2100', 'Beban Gaji', 'Beban', 'Debit', false, false, ''],
    ['5-2200', 'Beban Sewa', 'Beban', 'Debit', false, false, ''],
    ['5-2300', 'Beban Listrik dan Air', 'Beban', 'Debit', false, false, ''],
    ['5-2400', 'Beban Perlengkapan', 'Beban', 'Debit', false, false, ''],
    ['5-2500', 'Beban Transportasi', 'Beban', 'Debit', false, false, ''],
    ['5-2600', 'Beban Lain-lain', 'Beban', 'Debit', false, false, ''],
    ['5-3100', 'Beban Bunga', 'Beban', 'Debit', false, false, '']
  ];

  function accountId(kode) {
    return 'acc_' + kode.replace('-', '');
  }

  function accounts() {
    return RAW_ACCOUNTS.map(function (row) {
      return {
        id: accountId(row[0]),
        kode: row[0],
        nama: row[1],
        tipe: row[2],
        saldoNormal: row[3],
        aktif: true,
        rekening: !!row[4],
        noRekening: row[6],
        hpp: !!row[5],
        dikunci: row[0] === '1-1300' || row[0] === '2-1100'
      };
    });
  }

  function parties() {
    return [
      {
        id: PARTY_PEMASOK,
        kode: 'SUP-001',
        nama: 'Pemasok A',
        jenis: 'pemasok',
        kontak: 'sales@pemasok-a.co.id',
        telepon: '021-555-0101',
        alamat: 'Jl. Pemasok No. 1',
        terminBayar: 30,
        aktif: true
      },
      {
        id: PARTY_PELANGGAN,
        kode: 'CUS-001',
        nama: 'Pelanggan B',
        jenis: 'pelanggan',
        kontak: 'b@pelanggan-b.co.id',
        telepon: '',
        alamat: '',
        terminBayar: 30,
        aktif: true
      }
    ];
  }

  function stamp(scenario) {
    var now = new Date().toISOString();
    return {
      createdAt: now,
      updatedAt: now,
      scenario: !!scenario,
      scenarioType: scenario ? 'legacy' : null
    };
  }

  function bootstrap() {
    var state = global.Store ? global.Store.emptyState() : { version: 1 };
    state.accounts = accounts();
    state.parties = parties();
    state.meta = stamp(false);
    return state;
  }

  function scenario() {
    var state = bootstrap();
    state.meta = stamp(true);

    function id(kode) {
      return accountId(kode);
    }

    function addJournal(tanggal, keterangan, lines, meta) {
      var draft = {
        tanggal: tanggal,
        keterangan: keterangan,
        sumber: (meta && meta.sumber) || 'manual',
        refId: meta && meta.refId ? meta.refId : null,
        lines: lines.map(function (line) {
          return {
            accountId: id(line[0]),
            debit: line[1] || 0,
            kredit: line[2] || 0,
            partyId: line[3] || null
          };
        })
      };
      var result = Ledger.createJournal(state, draft);
      if (!result.ok) {
        throw new Error('Skenario gagal: ' + keterangan + ' - ' + result.errors.join(' '));
      }
      return result.journal;
    }

    // 1. Setor modal
    addJournal('2026-11-01', 'Setoran modal pemilik', [
      ['1-1100', 50000000, 0],
      ['3-1100', 0, 50000000]
    ]);

    // 2. Beli peralatan tunai
    addJournal('2026-11-02', 'Beli peralatan tunai', [
      ['1-2100', 5000000, 0],
      ['1-1100', 0, 5000000]
    ]);

    // 3. Beli barang dagang kredit dari Pemasok A
    var invoiceUtang = {
      id: Ledger.uid('inv'),
      jenis: 'utang',
      partyId: PARTY_PEMASOK,
      tanggal: '2026-11-03',
      jatuhTempo: '2026-12-03',
      total: 12000000,
      keterangan: 'Beli barang dagang kredit',
      akunLawanId: id('1-1300'),
      akunHppId: null,
      hpp: 0
    };
    state.invoices.push(invoiceUtang);
    addJournal('2026-11-03', 'Tagihan pembelian - Pemasok A', [
      ['1-1300', 12000000, 0, PARTY_PEMASOK],
      ['2-1100', 0, 12000000, PARTY_PEMASOK]
    ], { sumber: 'tagihan', refId: invoiceUtang.id });

    // 4. Jual tunai beserta HPP
    addJournal('2026-11-04', 'Jual tunai dan harga pokok penjualan', [
      ['1-1100', 4000000, 0],
      ['5-1100', 2400000, 0],
      ['4-1100', 0, 4000000],
      ['1-1300', 0, 2400000]
    ]);

    // 5. Jual kredit ke Pelanggan B beserta HPP
    var invoicePiutang = {
      id: Ledger.uid('inv'),
      jenis: 'piutang',
      partyId: PARTY_PELANGGAN,
      tanggal: '2026-11-05',
      jatuhTempo: '2026-12-05',
      total: 10000000,
      keterangan: 'Penjualan kredit ke Pelanggan B',
      akunLawanId: id('4-1100'),
      akunHppId: id('5-1100'),
      hpp: 6000000
    };
    state.invoices.push(invoicePiutang);
    addJournal('2026-11-05', 'Penjualan kredit - Pelanggan B', [
      ['1-1200', 10000000, 0, PARTY_PELANGGAN],
      ['5-1100', 6000000, 0],
      ['4-1100', 0, 10000000],
      ['1-1300', 0, 6000000]
    ], { sumber: 'tagihan', refId: invoicePiutang.id });

    // 6. Bayar sewa
    addJournal('2026-11-06', 'Bayar sewa tunai', [
      ['5-2200', 3000000, 0],
      ['1-1100', 0, 3000000]
    ]);

    // 7. Bayar listrik dan air
    addJournal('2026-11-07', 'Bayar listrik dan air', [
      ['5-2300', 800000, 0],
      ['1-1100', 0, 800000]
    ]);

    // 8. Pelanggan B membayar sebagian
    var paymentPiutang = {
      id: Ledger.uid('pay'),
      invoiceId: invoicePiutang.id,
      tanggal: '2026-11-08',
      jumlah: 6000000,
      akunKasId: id('1-1100')
    };
    state.payments.push(paymentPiutang);
    addJournal('2026-11-08', 'Penerimaan pembayaran - Pelanggan B', [
      ['1-1100', 6000000, 0],
      ['1-1200', 0, 6000000, PARTY_PELANGGAN]
    ], { sumber: 'pembayaran', refId: paymentPiutang.id });

    // 9. Bayar sebagian utang ke Pemasok A
    var paymentUtang = {
      id: Ledger.uid('pay'),
      invoiceId: invoiceUtang.id,
      tanggal: '2026-11-09',
      jumlah: 5000000,
      akunKasId: id('1-1100')
    };
    state.payments.push(paymentUtang);
    addJournal('2026-11-09', 'Pembayaran utang - Pemasok A', [
      ['2-1100', 5000000, 0, PARTY_PEMASOK],
      ['1-1100', 0, 5000000]
    ], { sumber: 'pembayaran', refId: paymentUtang.id });

    // 10. Prive pemilik
    addJournal('2026-11-10', 'Prive pemilik tunai', [
      ['3-1200', 1000000, 0],
      ['1-1100', 0, 1000000]
    ]);

    return state;
  }

  global.Seed = {
    accounts: accounts,
    parties: parties,
    bootstrap: bootstrap,
    scenario: scenario,
    accountId: accountId,
    PARTY_PEMASOK: PARTY_PEMASOK,
    PARTY_PELANGGAN: PARTY_PELANGGAN
  };
})(typeof window !== 'undefined' ? window : globalThis);
