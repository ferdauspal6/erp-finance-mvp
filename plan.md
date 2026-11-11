# Perencanaan Prototype Sistem Keuangan Dasar (MVP)

Nov 10, 2026 · @Firdaus

## 1. Tujuan dan ruang lingkup

Prototype ini adalah alat belajar, bukan software akuntansi produksi: satu halaman web tanpa backend yang membuat Anda melihat langsung bagaimana satu transaksi mengalir menjadi jurnal, Buku Besar, Neraca, dan Laba Rugi.

**Yang dipelajari (empat inti):**

- Chart of Accounts (CoA): daftar akun beserta tipe dan saldo normalnya
- Jurnal double-entry: setiap transaksi wajib seimbang (debit = kredit)
- Utang dan piutang: tagihan, pembayaran, dan umur saldo
- Laporan: Neraca dan Laba Rugi yang dihitung otomatis dari jurnal

**Sengaja tidak dibuat di MVP:** multi-user dan login, pajak (PPN/PPh), stok dan HPP perpetual, penyusutan aset, multi-mata uang, rekonsiliasi bank, dan penutupan periode. Semua itu bisa jadi fase lanjutan setelah konsep dasarnya paham.

**Prinsip desain:** angka tidak pernah diketik langsung ke laporan. Laporan hanya hasil hitung dari jurnal. Dengan begitu, jika laporan salah, Anda belajar menelusuri jurnal mana yang menyebabkannya.

## 2. Konsep akuntansi yang akan terlihat di aplikasi

Semua fitur bertumpu pada satu persamaan: aset sama dengan kewajiban ditambah ekuitas. Laba Rugi menjelaskan perubahan ekuitas dalam satu periode.

```latex
Aset = Kewajiban + Ekuitas

Laba Bersih = Pendapatan - Beban

Ekuitas Akhir = Modal + Laba Ditahan + Laba Berjalan
```

Aturan debit dan kredit berikut menjadi dasar validasi jurnal. Aplikasi menampilkannya sebagai panduan di form transaksi.

| Tipe akun | Saldo normal | Bertambah di | Berkurang di | Muncul di |
| --- | --- | --- | --- | --- |
| Aset | Debit | Debit | Kredit | Neraca |
| Kewajiban | Kredit | Kredit | Debit | Neraca |
| Ekuitas | Kredit | Kredit | Debit | Neraca |
| Pendapatan | Kredit | Kredit | Debit | Laba Rugi |
| Beban | Debit | Debit | Kredit | Laba Rugi |

**Alur data dari transaksi sampai laporan:**

1. Anda mencatat transaksi lewat form sederhana (misalnya "Jual kredit" atau "Bayar listrik")
2. Aplikasi membuat jurnal dengan minimal dua baris, satu debit dan satu kredit
3. Jurnal disimpan dan divalidasi: total debit harus sama dengan total kredit
4. Buku Besar dihitung per akun dari semua baris jurnal
5. Neraca dan Laba Rugi dihitung dari saldo Buku Besar pada rentang tanggal yang dipilih

Utang dan piutang bukan modul terpisah dari jurnal. Piutang adalah akun aset (1-1200) dan utang adalah akun kewajiban (2-1100); tagihan dan pembayaran hanya memberi rincian per pihak (pelanggan atau pemasok) di atas saldo akun itu.

## 3. Pilihan penyimpanan: pakai localStorage

Untuk tujuan belajar, localStorage lebih mudah: tanpa instalasi, tanpa library tambahan, dan datanya bisa dilihat langsung di DevTools. SQLite di browser (sql.js atau WASM) tetap layak jika nanti ingin berlatih query SQL.

| Aspek | localStorage (disarankan) | SQLite (sql.js / WASM) |
| --- | --- | --- |
| Setup | Nol, cukup JSON | Perlu library dan memuat file WASM |
| Cara menghitung laporan | Fungsi JavaScript (reduce/filter) | Query SQL (SUM, GROUP BY) |
| Persisten | Otomatis di browser | Harus diekspor ke file atau disimpan manual ke localStorage/IndexedDB |
| Debug | Lihat langsung di DevTools | Perlu tool tambahan |
| Batas data | Sekitar 5 MB, cukup untuk ratusan jurnal | Lebih besar |
| Cocok untuk | Memahami konsep akuntansi | Latihan SQL dan persiapan ke backend sungguhan |

**Rekomendasi:** mulai dengan localStorage, tetapi pisahkan semua akses data di satu file `store.js`. Jika kelak berpindah ke SQLite, Supabase, atau Google Sheets, hanya file itu yang diganti.

Tambahkan dua tombol bantu sejak awal: **Ekspor JSON / Impor JSON** untuk cadangan, dan **Reset ke data contoh** agar Anda bisa mengulang belajar dari nol.

## 4. Tech stack dan arahan UI

Aplikasi berupa satu folder statis yang bisa dibuka lewat `index.html` atau server lokal sederhana, tanpa build step.

| Komponen | Pilihan | Catatan |
| --- | --- | --- |
| Styling | Tailwind CSS via CDN | Cukup untuk prototype; tidak perlu build |
| Interaktivitas | Alpine.js via CDN | `x-data`, `x-for`, `x-model`, `x-show`, plus `Alpine.store` untuk state global |
| Penyimpanan | localStorage | Dibungkus modul `store.js` |
| Ikon | Lucide (SVG inline) | Garis tipis, cocok dengan gaya shadcn |
| Font | Inter atau font sistem | Angka memakai `tabular-nums` agar kolom rapi |

**Gaya visual (shadcn-like, light mode, hitam putih):**

- Warna hanya putih, abu-abu sangat muda, abu-abu garis, dan hitam. Tidak ada warna aksen; status dibedakan lewat bentuk dan teks (badge outline vs badge solid hitam)
- Latar `bg-white`, teks `text-zinc-950`, teks sekunder `text-zinc-500`, border `border-zinc-200`
- Radius `rounded-md`, bayangan sangat tipis atau tanpa bayangan, border 1px di semua kartu
- Tombol utama hitam (`bg-zinc-950 text-white`), tombol sekunder outline putih, tombol bahaya outline dengan teks hitam
- Komponen yang dibuat sendiri dengan class Tailwind: Button, Input, Select, Card, Table, Badge, Dialog (modal), Tabs, dan Toast
- Layout: sidebar kiri sempit dengan menu, area konten di kanan dengan judul halaman dan tombol aksi di sudut kanan atas
- Angka rupiah rata kanan, format `Rp 1.250.000`; angka negatif dalam kurung `(500.000)`; kolom Debit dan Kredit selalu bersebelahan

Blok kecil di setiap halaman bernama **"Cara membaca"** (kartu abu-abu muda, bisa dilipat) menjelaskan konsep halaman itu dalam dua atau tiga kalimat. Ini yang membuat prototype terasa seperti alat belajar.

## 5. Struktur data

Enam koleksi disimpan sebagai satu objek JSON di localStorage dengan kunci `akuntansi_mvp_v1`. Jurnal adalah satu-satunya sumber kebenaran; tagihan dan pembayaran hanya membuat jurnal otomatis.

| Koleksi | Field utama | Fungsi |
| --- | --- | --- |
| accounts | id, kode, nama, tipe, saldoNormal, aktif, rekening (true untuk akun Kas atau Bank), noRekening (opsional) | Chart of Accounts |
| parties | id, nama, jenis (pelanggan / pemasok), kontak | Pihak untuk utang dan piutang |
| journals | id, tanggal, nomor, keterangan, sumber (manual / tagihan / pembayaran), refId | Kepala jurnal |
| journalLines | id, journalId, accountId, debit, kredit, partyId (opsional) | Baris jurnal; minimal dua baris per jurnal |
| invoices | id, jenis (piutang / utang), partyId, tanggal, jatuhTempo, total, keterangan | Tagihan jual atau beli kredit |
| payments | id, invoiceId, tanggal, jumlah, akunKasId | Pembayaran atau penerimaan atas tagihan |

**Aturan validasi yang wajib ada:**

- Total debit sama dengan total kredit dalam satu jurnal, selisihnya tampil real time di form
- Satu baris hanya boleh punya debit atau kredit, tidak keduanya
- Akun yang sudah dipakai di jurnal tidak boleh dihapus, hanya dinonaktifkan
- Jurnal dari tagihan atau pembayaran tidak diedit langsung; ubah lewat dokumen sumbernya
- Pembayaran tidak boleh melebihi sisa tagihan

Status tagihan (belum dibayar, sebagian, lunas) tidak disimpan, tetapi dihitung dari total tagihan dikurangi jumlah pembayaran, sehingga tidak bisa tidak sinkron.

## 6. Chart of Accounts awal

Seed berisi 23 akun untuk usaha dagang kecil. Kode memakai pola angka pertama sebagai tipe (1 aset, 2 kewajiban, 3 ekuitas, 4 pendapatan, 5 beban), sehingga urutan dan pengelompokan di laporan otomatis rapi. Pengguna bisa menambah, mengubah nama, dan menonaktifkan akun.

| Kode | Nama akun | Tipe | Saldo normal |
| --- | --- | --- | --- |
| 1-1100 | Kas | Aset | Debit |
| 1-1110 | Bank BCA (contoh rekening) | Aset | Debit |
| 1-1200 | Piutang Usaha | Aset | Debit |
| 1-1300 | Persediaan Barang | Aset | Debit |
| 1-1400 | Perlengkapan | Aset | Debit |
| 1-2100 | Peralatan | Aset | Debit |
| 2-1100 | Utang Usaha | Kewajiban | Kredit |
| 2-1200 | Utang Gaji | Kewajiban | Kredit |
| 2-2100 | Utang Bank | Kewajiban | Kredit |
| 3-1100 | Modal Pemilik | Ekuitas | Kredit |
| 3-1200 | Prive | Ekuitas | Debit |
| 3-1300 | Laba Ditahan | Ekuitas | Kredit |
| 4-1100 | Penjualan | Pendapatan | Kredit |
| 4-1200 | Pendapatan Jasa | Pendapatan | Kredit |
| 4-2100 | Pendapatan Lain | Pendapatan | Kredit |
| 5-1100 | Harga Pokok Penjualan | Beban | Debit |
| 5-2100 | Beban Gaji | Beban | Debit |
| 5-2200 | Beban Sewa | Beban | Debit |
| 5-2300 | Beban Listrik dan Air | Beban | Debit |
| 5-2400 | Beban Perlengkapan | Beban | Debit |
| 5-2500 | Beban Transportasi | Beban | Debit |
| 5-2600 | Beban Lain-lain | Beban | Debit |
| 5-3100 | Beban Bunga | Beban | Debit |

Prive memiliki tipe Ekuitas tetapi saldo normal debit. Ini sengaja dimasukkan sebagai contoh akun kontra: ia mengurangi ekuitas, jadi di Neraca tampil sebagai pengurang modal.

## 7. Halaman dan fitur

Sembilan halaman di sidebar, diurutkan mengikuti urutan belajar: dari daftar akun, mencatat transaksi, sampai membaca laporan.

| # | Halaman | Isi dan fitur | Konsep yang dipelajari |
| --- | --- | --- | --- |
| 1 | Dashboard | Kartu ringkas: Kas, Total Piutang, Total Utang, Laba Bulan Ini; indikator persamaan akuntansi seimbang atau tidak | Gambaran besar |
| 2 | Chart of Accounts | Tabel akun dikelompokkan per tipe; tambah, ubah, nonaktifkan; kolom saldo berjalan | Struktur akun dan saldo normal |
| 3 | Jurnal Umum | Daftar jurnal; form jurnal manual dengan baris dinamis, selisih debit-kredit real time; tombol Simpan aktif hanya jika seimbang | Double-entry |
| 4 | Transaksi Cepat | Template: Setor modal, Jual tunai, Beli tunai, Bayar beban, Prive, Transfer antar rekening. Pengguna isi tanggal, jumlah, akun; jurnal terbentuk otomatis dan ditampilkan sebelum disimpan | Cara transaksi sehari-hari menjadi debit dan kredit |
| 5 | Piutang | Daftar tagihan jual kredit per pelanggan, sisa, jatuh tempo, status; tombol Terima Pembayaran; umur piutang (belum jatuh tempo, 1-30, 31-60, lebih dari 60 hari) | Piutang sebagai aset, aging |
| 6 | Utang | Sama dengan Piutang, tetapi untuk pemasok dan tombol Bayar Utang | Utang sebagai kewajiban |
| 7 | Buku Besar | Pilih akun, lihat semua baris jurnal, saldo berjalan; klik baris untuk loncat ke jurnal asal | Hubungan jurnal dan saldo akun |
| 8 | Laporan | Tab Neraca Saldo, Laba Rugi, Neraca; filter tanggal; tombol cetak; klik angka untuk melihat akun penyusunnya | Membaca laporan keuangan |
| 9 | Rekening (Kas dan Bank) | Kartu per rekening dengan saldo; tambah rekening baru; tombol Transfer antar rekening; klik rekening untuk membuka Buku Besarnya | Kas dan bank sebagai akun aset; transfer bukan pendapatan atau beban |

**Dua fitur belajar yang disarankan:**

- **Mode telusur:** di setiap angka laporan, klik untuk membuka daftar jurnal penyusunnya (drill-down)
- **Data contoh:** tombol "Muat skenario belajar" yang mengisi 10 transaksi dari bagian 9, lalu Anda bisa membuka laporan dan mencocokkannya dengan perhitungan manual

**Alur Piutang dan Utang di sisi pengguna:**

1. Buat tagihan: pilih pihak, tanggal, jatuh tempo, jumlah, dan akun pendapatan atau beban
2. Sistem membuat jurnal otomatis (lihat bagian 9)
3. Catat pembayaran: pilih tagihan, jumlah, akun kas; boleh sebagian
4. Sistem membuat jurnal pelunasan dan memperbarui sisa serta status

**Perlukah manajemen rekening di MVP?** Perlu, tetapi versi ringan. Rekening bukan tabel baru, melainkan akun CoA yang ditandai sebagai rekening (Kas, Bank BCA, dan seterusnya), sehingga saldo rekening otomatis sama dengan saldo Buku Besar akunnya dan tidak ada data ganda.

- Halaman Rekening menampilkan kartu per rekening beserta saldo, tombol tambah rekening (otomatis membuat akun 1-11xx), dan tombol Transfer
- Pilihan rekening muncul di form Terima Pembayaran, Bayar Utang, dan template Transaksi Cepat, menggantikan satu akun kas tunggal
- Transfer antar rekening menjadi jurnal: debit rekening tujuan, kredit rekening asal. Laba Rugi dan total aset tidak berubah, sehingga Anda melihat bahwa memindahkan uang bukan pendapatan atau beban
- Sengaja dilewati: rekonsiliasi bank, impor mutasi, dan saldo awal lewat form khusus (cukup pakai jurnal setor modal)

Skenario di bagian 9 tetap memakai satu rekening Kas agar angkanya sederhana; sebagai latihan, tambahkan transaksi ke-11 secara manual: transfer 10.000.000 dari Kas ke Bank BCA, lalu cek bahwa Laba Bersih (1.800.000) dan Total Aset (57.800.000) tidak berubah.

## 8. Logika perhitungan laporan

Semua laporan memakai satu fungsi dasar: saldo akun pada rentang tanggal. Fungsi lain hanya mengelompokkan hasilnya.

```latex
Saldo akun (saldo normal debit) = total debit - total kredit

Saldo akun (saldo normal kredit) = total kredit - total debit
```

**Fungsi inti di `report.js`:**

| Fungsi | Masukan | Hasil |
| --- | --- | --- |
| `saldoAkun(accountId, dari, sampai)` | akun, rentang tanggal | saldo sesuai saldo normal |
| `neracaSaldo(sampai)` | tanggal | daftar semua akun dengan kolom Debit dan Kredit; total keduanya harus sama |
| `labaRugi(dari, sampai)` | rentang tanggal | pendapatan, beban, laba bersih |
| `neraca(sampai)` | tanggal | aset, kewajiban, ekuitas (termasuk laba berjalan), status seimbang |
| `umurPiutang(sampai)` | tanggal | sisa tagihan dikelompokkan per umur |

**Aturan penting yang sering membingungkan pemula:**

- **Laba Rugi** memakai rentang tanggal (misalnya 1 sampai 30 November) karena mengukur kinerja satu periode. **Neraca** memakai satu tanggal posisi karena mengukur kondisi pada saat itu, dihitung dari awal pencatatan sampai tanggal tersebut
- **Laba berjalan** di Neraca dihitung dari pendapatan dikurangi beban sejak awal tahun buku, lalu ditampilkan sebagai baris di bagian Ekuitas. Tanpa baris ini Neraca tidak akan seimbang
- **Prive** dikurangkan dari ekuitas, bukan dicatat sebagai beban, karena bukan biaya usaha
- **Neraca seimbang** berarti total aset sama dengan total kewajiban ditambah ekuitas. Jika tidak, aplikasi menampilkan peringatan dan selisihnya; ini hanya mungkin terjadi jika data jurnal rusak, sehingga berguna sebagai uji

**Bentuk tampilan laporan:**

| Laba Rugi | Neraca |
| --- | --- |
| Pendapatan (daftar akun, subtotal) | Aset (lancar, tetap, total) |
| Harga Pokok Penjualan | Kewajiban (jangka pendek, panjang, total) |
| Laba Kotor | Ekuitas (modal, prive, laba ditahan, laba berjalan, total) |
| Beban operasional (daftar akun, subtotal) | Total Kewajiban + Ekuitas |
| Laba Bersih | Baris pengecekan: Aset - (Kewajiban + Ekuitas) = 0 |

## 9. Skenario belajar: 10 transaksi bulan November

Sepuluh transaksi ini menjadi data contoh bawaan. Hitung sendiri dulu di kertas, lalu cocokkan dengan Neraca dan Laba Rugi di aplikasi. Semua angka dalam rupiah.

| # | Transaksi | Debit | Kredit |
| --- | --- | --- | --- |
| 1 | Pemilik menyetor modal 50.000.000 | Kas 50.000.000 | Modal Pemilik 50.000.000 |
| 2 | Beli peralatan tunai 5.000.000 | Peralatan 5.000.000 | Kas 5.000.000 |
| 3 | Beli barang dagang kredit dari Pemasok A 12.000.000 | Persediaan 12.000.000 | Utang Usaha 12.000.000 |
| 4 | Jual tunai 4.000.000, modal barang 2.400.000 | Kas 4.000.000; HPP 2.400.000 | Penjualan 4.000.000; Persediaan 2.400.000 |
| 5 | Jual kredit ke Pelanggan B 10.000.000, modal barang 6.000.000 | Piutang Usaha 10.000.000; HPP 6.000.000 | Penjualan 10.000.000; Persediaan 6.000.000 |
| 6 | Bayar sewa tunai 3.000.000 | Beban Sewa 3.000.000 | Kas 3.000.000 |
| 7 | Bayar listrik tunai 800.000 | Beban Listrik dan Air 800.000 | Kas 800.000 |
| 8 | Pelanggan B membayar sebagian 6.000.000 | Kas 6.000.000 | Piutang Usaha 6.000.000 |
| 9 | Bayar sebagian utang ke Pemasok A 5.000.000 | Utang Usaha 5.000.000 | Kas 5.000.000 |
| 10 | Pemilik mengambil prive tunai 1.000.000 | Prive 1.000.000 | Kas 1.000.000 |

**Hasil yang harus muncul di aplikasi:**

| Laba Rugi (November) | Rp | Neraca (30 November) | Rp |
| --- | --- | --- | --- |
| Penjualan | 14.000.000 | Kas | 45.200.000 |
| Harga Pokok Penjualan | (8.400.000) | Piutang Usaha | 4.000.000 |
| Laba Kotor | 5.600.000 | Persediaan Barang | 3.600.000 |
| Beban Sewa | (3.000.000) | Peralatan | 5.000.000 |
| Beban Listrik dan Air | (800.000) | **Total Aset** | **57.800.000** |
| **Laba Bersih** | **1.800.000** | Utang Usaha | 7.000.000 |
|  |  | Modal Pemilik | 50.000.000 |
|  |  | Prive | (1.000.000) |
|  |  | Laba Berjalan | 1.800.000 |
|  |  | **Total Kewajiban + Ekuitas** | **57.800.000** |

Pertanyaan latihan setelah data termuat:

- Mengapa Prive tidak mengurangi Laba Bersih, tetapi Kas tetap berkurang?
- Apa yang berubah di Neraca jika Pelanggan B melunasi sisa piutang 4.000.000? Apakah Laba Rugi ikut berubah?
- Jika transaksi 3 dibayar tunai, akun mana yang berganti dan apakah total aset berubah?
- Mengapa Laba Rugi hanya terpengaruh transaksi 4, 5, 6, dan 7, padahal semua transaksi tercatat di jurnal?

## 10. Struktur folder dan tahapan pengerjaan

Satu folder statis dengan file kecil per tanggung jawab, agar mudah diminta ke AI agent satu per satu.

```text
akuntansi-mvp/
  index.html          shell: sidebar, area konten, memuat CDN Tailwind dan Alpine
  js/
    store.js          satu-satunya akses localStorage: load, save, export, import, reset
    seed.js           CoA awal dan skenario 10 transaksi
    ledger.js         buat jurnal, validasi seimbang, saldo akun
    report.js         neracaSaldo, labaRugi, neraca, umurPiutang
    format.js         format rupiah, tanggal
    glosarium.js      teks penjelasan hover (Bahasa Indonesia) + direktif x-tooltip
    app.js            Alpine.store dan routing sederhana (x-show per halaman)
  pages/              potongan HTML per halaman (atau section di index.html)
```

**Tahapan (urut, masing-masing bisa dites sebelum lanjut):**

- [ ] **Tahap 1, fondasi:** shell UI hitam putih, sidebar, komponen dasar (Button, Input, Card, Table, Badge, Dialog), `store.js` dan `format.js`
- [ ] **Tahap 2, Chart of Accounts:** seed 23 akun, halaman daftar, tambah, ubah, nonaktifkan
- [ ] **Tahap 3, Jurnal Umum:** form baris dinamis, validasi seimbang, daftar jurnal, hapus dengan konfirmasi
- [ ] **Tahap 4, Buku Besar dan Neraca Saldo:** saldo akun, saldo berjalan, total debit sama dengan total kredit
- [ ] **Tahap 5, Laba Rugi dan Neraca:** laporan dengan filter tanggal, baris pengecekan, drill-down ke jurnal
- [ ] **Tahap 6, Piutang dan Utang:** pihak, tagihan, pembayaran, jurnal otomatis, aging
- [ ] **Tahap 7, Transaksi Cepat dan Dashboard:** halaman Rekening (saldo dan transfer), template transaksi, pratinjau jurnal, kartu ringkasan
- [ ] **Tahap 8, alat belajar:** tombol muat skenario, ekspor dan impor JSON, blok "Cara membaca", tooltip penjelasan di seluruh halaman (bagian 11), reset

**Kriteria selesai:** skenario di bagian 9 dimuat, lalu Laba Bersih menunjukkan 1.800.000, Total Aset 57.800.000, dan baris pengecekan Neraca bernilai 0. Setiap tahap menambah satu halaman yang bisa dites mandiri.

**Saran cara mengerjakan dengan AI agent:** berikan dokumen ini sebagai spesifikasi, minta satu tahap per sesi, dan setiap akhir tahap jalankan skenario bagian 9 sebagai uji regresi. Jika angka berbeda, penyebabnya hampir selalu ada di `ledger.js` atau `report.js`.

**Fase lanjutan setelah paham dasar:** periode dan penutupan buku, penyusutan aset, PPN, stok dengan HPP rata-rata, arus kas, lalu pindah penyimpanan ke SQLite atau Supabase.

## 11. Penjelasan saat hover (tooltip berbahasa Indonesia)

Setiap istilah akuntansi, judul kolom, dan angka laporan punya penjelasan singkat yang muncul saat kursor diarahkan ke sana. Semua teks disimpan di satu file `glosarium.js`, sehingga mudah dibaca, diedit, dan diterjemahkan tanpa menyentuh halaman.

**Cara kerja teknis:**

- Direktif Alpine buatan sendiri `x-tooltip="'debit'"` mengambil teks dari `glosarium.js` berdasarkan kuncinya
- Posisi tooltip memakai plugin Alpine Anchor via CDN, otomatis pindah sisi jika tidak muat di layar
- Muncul setelah jeda 200 ms agar tidak berkedip saat kursor lewat; hilang saat kursor keluar
- Di layar sentuh, ketuk sekali untuk membuka dan ketuk di luar untuk menutup; dengan keyboard, muncul saat elemen fokus
- Elemen yang punya penjelasan diberi ikon kecil (i) berwarna abu-abu atau garis bawah putus-putus, agar pengguna tahu ada penjelasan
- Gaya mengikuti tema hitam putih: kotak hitam (`bg-zinc-950`), teks putih `text-xs`, lebar maksimum sekitar 280 px, `rounded-md`

**Daftar istilah awal dan teksnya:**

| Istilah | Muncul di | Teks penjelasan |
| --- | --- | --- |
| Debit | Jurnal, Buku Besar, Neraca Saldo | Sisi kiri jurnal. Menambah aset dan beban; mengurangi kewajiban, ekuitas, dan pendapatan. |
| Kredit | Jurnal, Buku Besar, Neraca Saldo | Sisi kanan jurnal. Menambah kewajiban, ekuitas, dan pendapatan; mengurangi aset dan beban. |
| Saldo normal | Chart of Accounts | Sisi tempat saldo akun ini biasanya bertambah. Jika saldo muncul di sisi berlawanan, periksa kemungkinan salah catat. |
| Tipe akun | Chart of Accounts | Kelompok akun: Aset, Kewajiban, Ekuitas, Pendapatan, atau Beban. Tipe menentukan di laporan mana akun tampil. |
| Selisih | Form jurnal | Total debit dikurangi total kredit. Jurnal hanya bisa disimpan jika selisihnya 0. |
| Piutang Usaha | CoA, Dashboard, Piutang | Uang yang masih akan diterima dari pelanggan atas penjualan kredit. Dihitung sebagai aset karena nantinya menjadi kas. |
| Utang Usaha | CoA, Dashboard, Utang | Kewajiban membayar pemasok atas barang yang sudah diterima tetapi belum dibayar. |
| Jatuh tempo | Piutang, Utang | Batas tanggal pembayaran yang disepakati. Lewat dari tanggal ini, tagihan dianggap terlambat. |
| Umur piutang | Piutang | Pengelompokan sisa tagihan menurut lama keterlambatan. Makin lama, makin besar risiko tidak tertagih. |
| Prive | CoA, Neraca | Uang usaha yang diambil pemilik untuk keperluan pribadi. Mengurangi ekuitas dan bukan merupakan beban usaha. |
| Harga Pokok Penjualan | Laba Rugi | Modal dari barang yang terjual pada periode ini, bukan barang yang dibeli. |
| Laba Kotor | Laba Rugi | Penjualan dikurangi Harga Pokok Penjualan, sebelum dikurangi beban operasional. |
| Laba Bersih | Laba Rugi, Dashboard | Pendapatan dikurangi seluruh beban pada periode yang dipilih. |
| Laba Berjalan | Neraca | Laba bersih periode ini yang belum dipindahkan ke Laba Ditahan. Ditampilkan di Ekuitas agar Neraca seimbang. |
| Baris pengecekan | Neraca | Aset dikurangi (Kewajiban + Ekuitas). Harus bernilai 0; jika tidak, ada jurnal yang bermasalah. |
| Transfer antar rekening | Rekening | Memindahkan uang antar Kas dan Bank. Tidak mengubah laba maupun total aset. |
| Rekening | Rekening | Akun Kas atau Bank tempat uang usaha disimpan. Saldonya sama dengan saldo akun tersebut di Buku Besar. |

**Tooltip dinamis pada angka laporan:** selain istilah tetap, hover pada angka total menampilkan rumus dengan nilai sebenarnya, sehingga pengguna melihat dari mana angka itu berasal. Contoh dengan data skenario bagian 9:

- Laba Bersih: "Pendapatan 14.000.000 dikurangi HPP 8.400.000 dan beban 3.800.000 = 1.800.000"
- Total Aset: "Kas 45.200.000 + Piutang 4.000.000 + Persediaan 3.600.000 + Peralatan 5.000.000 = 57.800.000"
- Sisa piutang satu pelanggan: "Tagihan 10.000.000 dikurangi pembayaran 6.000.000 = sisa 4.000.000"

Isi tooltip dinamis dihitung oleh `report.js` bersama angkanya, jadi tidak mungkin berbeda dari nilai yang tampil. Daftar istilah di atas hanya titik awal: tambahkan baris baru di `glosarium.js` setiap menemukan istilah yang membingungkan saat belajar.
