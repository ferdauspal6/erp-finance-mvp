(function (global) {
  'use strict';

  var GLOSARIUM = {
    debit: 'Sisi kiri jurnal. Menambah aset dan beban; mengurangi kewajiban, ekuitas, dan pendapatan.',
    kredit: 'Sisi kanan jurnal. Menambah kewajiban, ekuitas, dan pendapatan; mengurangi aset dan beban.',
    saldoNormal: 'Sisi tempat saldo akun ini biasanya bertambah. Jika saldo muncul di sisi berlawanan, periksa kemungkinan salah catat.',
    tipeAkun: 'Kelompok akun: Aset, Kewajiban, Ekuitas, Pendapatan, atau Beban. Tipe menentukan di laporan mana akun tampil.',
    selisih: 'Total debit dikurangi total kredit. Jurnal hanya bisa disimpan jika selisihnya 0.',
    piutangUsaha: 'Uang yang masih akan diterima dari pelanggan atas penjualan kredit. Dihitung sebagai aset karena nantinya menjadi kas.',
    utangUsaha: 'Kewajiban membayar pemasok atas barang yang sudah diterima tetapi belum dibayar.',
    jatuhTempo: 'Batas tanggal pembayaran yang disepakati. Lewat dari tanggal ini, tagihan dianggap terlambat.',
    umurPiutang: 'Pengelompokan sisa tagihan menurut lama keterlambatan. Makin lama, makin besar risiko tidak tertagih.',
    prive: 'Uang usaha yang diambil pemilik untuk keperluan pribadi. Mengurangi ekuitas dan bukan merupakan beban usaha.',
    hpp: 'Modal dari barang yang terjual pada periode ini, bukan barang yang dibeli.',
    labaKotor: 'Penjualan dikurangi Harga Pokok Penjualan, sebelum dikurangi beban operasional.',
    labaBersih: 'Pendapatan dikurangi seluruh beban pada periode yang dipilih.',
    labaBerjalan: 'Laba bersih periode ini yang belum dipindahkan ke Laba Ditahan. Ditampilkan di Ekuitas agar Neraca seimbang.',
    barisPengecekan: 'Aset dikurangi (Kewajiban + Ekuitas). Harus bernilai 0; jika tidak, ada jurnal yang bermasalah.',
    transfer: 'Memindahkan uang antar Kas dan Bank. Tidak mengubah laba maupun total aset.',
    rekening: 'Akun Kas atau Bank tempat uang usaha disimpan. Saldonya sama dengan saldo akun tersebut di Buku Besar.',
    kas: 'Uang tunai dan saldo rekening bank yang dimiliki usaha. Termasuk aset lancar.',
    modal: 'Kekayaan pemilik yang disetorkan ke usaha. Termasuk ekuitas, bukan pendapatan.',
    neracaSaldo: 'Daftar saldo semua akun pada satu tanggal. Total kolom debit harus sama dengan total kolom kredit.',
    persamaan: 'Aset = Kewajiban + Ekuitas. Jika persamaan ini tidak seimbang, ada jurnal yang tidak benar.',
    akunLawan: 'Akun pasangan dalam jurnal otomatis. Misalnya penjualan kredit memasangkan Piutang Usaha dengan Penjualan.',
    nomorJurnal: 'Nomor urut jurnal per bulan, dipakai untuk menelusuri kembali ke sumber pencatatan.',
    saldoBerjalan: 'Saldo akun setelah setiap baris jurnal dihitung berurutan dari transaksi paling awal.',
    aging: 'Daftar sisa tagihan yang dikelompokkan menurut sudah berapa lama lewat jatuh tempo.'
  };

  global.GLOSARIUM = GLOSARIUM;
  global.Glosarium = {
    get: function (key) {
      return Object.prototype.hasOwnProperty.call(GLOSARIUM, key) ? GLOSARIUM[key] : '';
    }
  };
})(typeof window !== 'undefined' ? window : globalThis);
