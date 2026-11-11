# ERP Finance MVP — Prototype Akuntansi

Prototype satu halaman untuk mempelajari alur dasar akuntansi: dari transaksi menjadi jurnal, Buku Besar, Neraca Saldo, Laba Rugi, dan Neraca. Dibuat sebagai alat belajar, bukan software akuntansi produksi.

## Fitur

- **Chart of Accounts** — 23 akun awal, tambah/ubah/nonaktifkan akun, saldo berjalan.
- **Jurnal Umum** — jurnal double-entry dengan baris dinamis, validasi debit = kredit, dan riwayat jurnal.
- **Transaksi Cepat** — template setor modal, jual tunai, beli tunai, bayar beban, prive, dan transfer antar rekening dengan pratinjau jurnal.
- **Piutang dan Utang** — tagihan per pihak, pembayaran sebagian, status otomatis, dan umur piutang.
- **Buku Besar** — mutasi per akun, saldo berjalan, klik baris untuk membuka jurnal asal.
- **Laporan** — Neraca Saldo, Laba Rugi, dan Neraca dengan filter tanggal, drill-down, dan tooltip rumus.
- **Rekening** — kartu saldo Kas/Bank dan transfer antar rekening tanpa mengubah laba.
- **Dashboard** — ringkasan Kas, Piutang, Utang, Laba bulan ini, dan pengecekan persamaan akuntansi.
- **Informasi** — materi belajar untuk orang awam: debit/kredit, jurnal, Buku Besar, laporan, HPP, Prive, kesalahan umum, dan panduan latihan.
- **Alat belajar** — muat/ulangi skenario 10 transaksi, ekspor/impor JSON, Clear data, dan uji regresi.

## Teknologi

- HTML statis tanpa build step.
- [Tailwind CSS Play CDN](https://tailwindcss.com/) untuk styling.
- [Alpine.js CDN](https://alpinejs.dev/) untuk interaktivitas.
- `localStorage` sebagai penyimpanan, diakses lewat `js/store.js`.
- Font Inter via Google Fonts.

Tailwind, Alpine, dan font dimuat dari CDN sehingga **butuh koneksi internet** saat aplikasi dibuka.

## Menjalankan

Buka `index.html` langsung, atau jalankan server lokal:

```powershell
python -m http.server 8000
```

Lalu buka `http://localhost:8000`.

## Data dan reset

- Data disimpan di `localStorage` dengan kunci `akuntansi_mvp_v1`.
- **Ulangi skenario** memuat 10 transaksi contoh November 2026.
- **Clear data** menghapus semua transaksi dan akun tambahan, lalu mengembalikan 23 akun bawaan.
- **Ekspor JSON / Impor JSON** untuk cadangan data.

Setelah skenario dimuat, angka acuan yang benar:

- Laba Bersih: **Rp 1.800.000**
- Total Aset: **Rp 57.800.000**
- Total Kewajiban + Ekuitas: **Rp 57.800.000**
- Selisih baris pengecekan Neraca: **0**

## Uji regresi

Buka **Dashboard → Jalankan uji regresi** atau tambahkan `?test=1` pada URL. Hasil juga dicetak ke console browser. Pengujian mencakup 29 pemeriksaan angka skenario, keseimbangan jurnal, aging, dan transfer.

## Struktur

```text
.
├── index.html          # shell, 10 halaman, komponen UI
├── plan.md             # spesifikasi dan rencana proyek
└── js/
    ├── app.js          # state Alpine, routing, aksi CRUD
    ├── format.js       # format rupiah dan tanggal
    ├── glosarium.js    # kamus tooltip
    ├── ledger.js       # validasi dan pembuatan jurnal
    ├── report.js       # saldo, Neraca Saldo, Laba Rugi, Neraca, aging
    ├── seed.js         # 23 akun dan skenario 10 transaksi
    ├── selftest.js     # uji regresi
    └── store.js        # akses localStorage, ekspor/impor
```

## Batasan MVP

Sengaja belum memuat multi-user/login, pajak (PPN/PPh), stok dan HPP perpetual otomatis, penyusutan aset, multi-mata uang, rekonsiliasi bank, penutupan periode, dan audit trail. Semua angka laporan dihitung dari jurnal; tidak ada angka laporan yang diketik langsung.
