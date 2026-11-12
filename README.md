# ERP Finance MVP — Prototype Akuntansi dan Purchasing

Prototype satu halaman untuk mempelajari alur akuntansi dan pembelian: dari transaksi menjadi jurnal, Buku Besar, Neraca Saldo, Laba Rugi, dan Neraca; serta dari Purchase Request menjadi Purchase Order, penerimaan barang, stok, dan utang. Dibuat sebagai alat belajar, bukan software produksi.

## Role

Aplikasi punya dua role yang bisa diganti lewat dropdown di menu kiri:

- **Finance** — Chart of Accounts, Jurnal Umum, Transaksi Cepat, Piutang, Utang, Buku Besar, Laporan, Rekening, dan Persetujuan PR/PO.
- **Logistik** — Master Barang, Master Supplier, Kategori/Satuan/Gudang, Purchase Request, Purchase Order, Penerimaan Barang, Retur Pembelian, dan Stok.

Pilihan role disimpan di localStorage. Pemisahan menu bersifat ketat: Finance tidak membuka menu operasional Logistik, dan Logistik tidak membuka menu akuntansi. Ini pembatas tampilan untuk prototype, bukan sistem keamanan/login.

## Fitur

### Finance

- **Chart of Accounts** — 24 akun awal; akun sistem `1-1300` Persediaan dan `2-1100` Utang Usaha dikunci dari jurnal manual.
- **Jurnal Umum** — jurnal double-entry dengan validasi debit = kredit.
- **Transaksi Cepat** — setor modal, jual tunai, bayar beban, prive, dan transfer. HPP penjualan ditunda ke fase Pengeluaran Barang.
- **Piutang** — tagihan per pelanggan, pembayaran sebagian, status otomatis, dan aging.
- **Utang** — tagihan otomatis dari Penerimaan Barang, pembayaran, retur, dan Piutang Supplier.
- **Buku Besar, Laporan, Rekening, Dashboard, Informasi** — sama seperti sebelumnya.
- **Persetujuan** — menyetujui atau menolak PR/PO, termasuk ambang persetujuan PO.

### Logistik

- **Master Barang** — 10 barang dummy skenario, SKU, kategori, satuan, harga beli standar, stok minimum, dan akun persediaan.
- **Master Supplier** — 4 supplier dummy skenario, termin bayar, dan harga khusus per barang.
- **Master Pendukung** — kategori, satuan, dan gudang.
- **Purchase Request** — buat, ajukan, lihat status, dan rincian.
- **Purchase Order** — buat dari PR atau manual, harga supplier, ambang persetujuan, kirim, batalkan, dan tutup.
- **Penerimaan Barang** — terima sebagian atau penuh, pratinjau jurnal, posting stok dan utang.
- **Retur Pembelian** — retur dari penerimaan, potong invoice atau ganti barang, stok keluar, dan Piutang Supplier.
- **Stok** — posisi qty, nilai persediaan, harga rata-rata, dan rekonsiliasi stok vs Buku Besar.
- **Informasi** — panduan purchasing untuk Logistik: PR, PO, approval, penerimaan, short receipt, retur, Piutang Supplier, ganti barang, stok, dan rekonsiliasi.

### Alur integrasi

```text
PR (Logistik) -> disetujui Finance -> PO (Logistik)
PO disetujui Finance -> barang datang -> Penerimaan (Logistik)
Penerimaan diposting:
  Debit  Persediaan Barang (1-1300)
  Kredit Utang Usaha (2-1100)
  + stock movement
  + tagihan utang untuk Finance

Retur dari penerimaan:
  Potong invoice: Debit Utang Usaha / Kredit Persediaan
  Setelah dibayar: Debit Piutang Supplier / Kredit Persediaan
  Ganti barang:   Debit Piutang Supplier / Kredit Persediaan
  Barang pengganti: Debit Persediaan / Kredit Piutang Supplier
```

PO tidak membuat jurnal atau utang karena masih berupa komitmen. Utang baru diakui saat barang diterima. Retur potong invoice mengurangi sisa tagihan; jika tagihan sudah dibayar, nilainya menjadi Piutang Supplier (akun 1-1500).

## Interaksi form

- Form pendek (master, rekening, transfer, pembayaran, COA) memakai **modal**.
- Form transaksi panjang (Jurnal, PR, PO, Penerimaan, Retur) memakai **drawer** dari kanan; di mobile menjadi full-screen.
- Form yang sudah diisi akan meminta konfirmasi sebelum ditutup.
- Fokus terkurung di overlay, `Escape` menutup, dan fokus kembali ke tombol pemicu.

## Teknologi

- HTML statis tanpa build step.
- [Tailwind CSS Play CDN](https://tailwindcss.com/) untuk styling.
- [Alpine.js CDN](https://alpinejs.dev/) untuk interaktivitas dan state global.
- `localStorage` sebagai penyimpanan, diakses lewat `js/store.js`.
- Font Inter via Google Fonts.

Tailwind, Alpine, dan font dimuat dari CDN sehingga **butuh koneksi internet** saat aplikasi dibuka.

## Menjalankan

Buka `index.html` langsung, atau jalankan server lokal:

```bash
python -m http.server 8000
```

Lalu buka `http://localhost:8000`. Untuk memilih role lewat URL (berguna saat demo):

```text
http://localhost:8000/?role=logistik
http://localhost:8000/?role=finance
```

## Data dan reset

- Data disimpan di localStorage dengan kunci `akuntansi_mvp_v1`.
- Role disimpan di `akuntansi_mvp_role_v1`.
- **Muat skenario akuntansi** memuat 10 transaksi contoh November 2026 untuk Finance.
- **Muat skenario purchasing** memuat 10 barang, 4 supplier, 6 kategori, 8 satuan, 2 gudang, serta alur PR, PO, dan dua penerimaan untuk Logistik. Retur dibuat manual dari penerimaan.
- **Clear data** mengembalikan 24 akun bawaan dan menghapus seluruh data purchasing.
- Master purchasing hanya terisi setelah **Muat skenario purchasing**; data dummy tidak dimuat di bootstrap default.
- **Ekspor JSON / Impor JSON** untuk cadangan data.

### Angka acuan skenario akuntansi

- Laba Bersih: **Rp 1.800.000**
- Total Aset: **Rp 57.800.000**
- Total Kewajiban + Ekuitas: **Rp 57.800.000**
- Selisih baris pengecekan Neraca: **0**

### Angka acuan skenario purchasing P0–P5

- Stok Semen: **100 sak**
- Stok Cat: **20 kaleng**
- Nilai persediaan: **Rp 9.500.000**
- Saldo akun 1-1300: **Rp 9.500.000**
- Saldo akun 2-1100: **Rp 9.500.000**
- Saldo Bank BCA: **Rp 50.000.000**
- Selisih rekonsiliasi stok dan utang: **0**

Latihan retur (dibuat manual dari penerimaan):

- Setelah retur 5 kaleng Cat (Rp 750.000): stok Cat **15**, nilai persediaan **Rp 8.750.000**, utang **Rp 8.750.000**
- Retur setelah tagihan lunas menjadi **Piutang Supplier Rp 750.000**
- Retur ganti barang: stok keluar lalu kembali setelah penerimaan pengganti; utang tidak berubah

## Uji regresi

Buka **Dashboard → Uji regresi**, tombol sidebar, atau tambahkan `?test=1` pada URL. Hasil juga dicetak ke console browser.

Pengujian mencakup:

- 29 pemeriksaan akuntansi dasar (jurnal, laporan, aging, transfer).
- 67 pemeriksaan purchasing (role, PR/PO, penerimaan, retur, pengganti, stok, utang, piutang supplier, rekonsiliasi, migrasi).

Uji tanpa browser:

```bash
node tests/run.js
node tests/smoke.js
node tests/actions.js
```

## Struktur

```text
.
├── index.html               # shell, halaman Finance dan Logistik
├── plan.md                  # spesifikasi akuntansi dasar
├── plan-purchasing.md       # spesifikasi purchasing
├── tests/
│   ├── run.js               # uji selftest akuntansi + purchasing
│   ├── smoke.js             # smoke test komponen Alpine
│   └── actions.js           # uji alur PR -> PO -> penerimaan -> retur
└── js/
    ├── app.js               # state Alpine, routing, role guard, aksi akuntansi
    ├── auth.js              # Alpine.store('auth'), role aktif
    ├── format.js            # format rupiah dan tanggal
    ├── glosarium.js         # kamus tooltip
    ├── inventory.js         # stock movements, posisi stok, nilai persediaan
    ├── ledger.js            # validasi dan pembuatan jurnal
    ├── master.js            # CRUD barang, supplier, kategori, satuan, gudang
    ├── numbering.js         # nomor PR, PO, GR, RTN
    ├── overlays.js          # modal/drawer, focus trap, scroll lock, dirty form
    ├── pages-purchasing.js  # komponen Alpine halaman purchasing
    ├── purchasing.js        # PR, PO, approval, status
    ├── receiving.js         # penerimaan, stok masuk, invoice utang, jurnal
    ├── returns.js           # retur, potong invoice, ganti barang, Piutang Supplier
    ├── reconcile.js         # stok vs Buku Besar, utang vs tagihan
    ├── report.js            # Neraca Saldo, Laba Rugi, Neraca, aging
    ├── roles.js             # matriks role, menu, dan aksi
    ├── seed.js              # 24 akun dan skenario akuntansi
    ├── seed-purchasing.js   # master data dan skenario purchasing
    ├── selftest.js          # uji akuntansi dasar
    ├── selftest-purchasing.js
    └── store.js             # schema localStorage v2, ekspor/impor
```

## Batasan MVP

Sengaja belum memuat login sungguhan, Super Admin/override, refund supplier otomatis, kartu stok, opname, pengeluaran barang dan HPP dari stok, transfer antar gudang, RFQ, PPN, faktur supplier, penyusutan, multi-mata uang, rekonsiliasi bank, penutupan periode, dan audit trail penuh. Role switch hanya pembatas UI di sisi browser.
