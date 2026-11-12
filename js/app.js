(function (global) {
  'use strict';

  var Format = global.Format;
  var Ledger = global.Ledger;
  var Overlays = global.Overlays;
  var Report = global.Report;
  var Store = global.Store;
  var Seed = global.Seed;
  var GLOSARIUM = global.GLOSARIUM;
  var Auth = global.Auth;
  var Purchasing = global.Purchasing;
  var Inventory = global.Inventory;
  var Reconcile = global.Reconcile;
  var Returns = global.Returns;

  var TIPE_AKUN = ['Aset', 'Kewajiban', 'Ekuitas', 'Pendapatan', 'Beban'];

  function icon(paths) {
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" class="h-4 w-4">' + paths + '</svg>';
  }

  var ICONS = {
    dashboard: icon('<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>'),
    coa: icon('<path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2"/><rect x="9" y="3" width="6" height="4" rx="1"/><path d="M9 12h6M9 16h4"/>'),
    journal: icon('<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>'),
    quick: icon('<path d="M13 2 3 14h7l-1 8 10-12h-7l1-8z"/>'),
    receivable: icon('<path d="M4 4h16v16H4z"/><path d="M8 12h8M12 8v8"/>'),
    payable: icon('<path d="M4 4h16v16H4z"/><path d="M8 12h8"/>'),
    ledger: icon('<path d="M2 4h6a4 4 0 0 1 4 4v12a3 3 0 0 0-3-3H2z"/><path d="M22 4h-6a4 4 0 0 0-4 4v12a3 3 0 0 1 3-3h7z"/>'),
    report: icon('<path d="M3 3v18h18"/><path d="M7 15l4-4 3 3 5-6"/>'),
    bank: icon('<path d="M3 7h18v13H3z"/><path d="M3 11h18"/><path d="M16 15h2"/>'),
    approval: icon('<path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>'),
    box: icon('<path d="M21 8l-9-5-9 5v8l9 5 9-5z"/><path d="M3 8l9 5 9-5"/><path d="M12 13v8"/>'),
    truck: icon('<path d="M1 3h15v13H1z"/><path d="M16 8h4l3 3v5h-7z"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/>'),
    clipboard: icon('<path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2"/><rect x="9" y="3" width="6" height="4" rx="1"/><path d="M9 12h6M9 16h4"/>'),
    warehouse: icon('<path d="M3 21V9l9-6 9 6v12"/><path d="M7 21v-8h10v8"/><path d="M7 17h10"/>'),
    returnbox: icon('<path d="M3 7h18v13H3z"/><path d="M8 7V4h8v3"/><path d="M9 12h6"/><path d="M9 16h4"/><path d="M17 12l2 2-2 2"/>'),
    tag: icon('<path d="M20.59 13.41 13.42 20.58a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><circle cx="7" cy="7" r="1.5"/>'),
    info: icon('<circle cx="12" cy="12" r="9"/><path d="M12 11v5"/><path d="M12 8h.01"/>')
  };

  var MENU = [
    { id: 'dashboard', label: 'Dashboard', icon: ICONS.dashboard },
    { id: 'persetujuan', label: 'Persetujuan', icon: ICONS.approval },
    { id: 'coa', label: 'Chart of Accounts', icon: ICONS.coa },
    { id: 'jurnal', label: 'Jurnal Umum', icon: ICONS.journal },
    { id: 'cepat', label: 'Transaksi Cepat', icon: ICONS.quick },
    { id: 'piutang', label: 'Piutang', icon: ICONS.receivable },
    { id: 'utang', label: 'Utang', icon: ICONS.payable },
    { id: 'bukuBesar', label: 'Buku Besar', icon: ICONS.ledger },
    { id: 'laporan', label: 'Laporan', icon: ICONS.report },
    { id: 'rekening', label: 'Rekening', icon: ICONS.bank },
    { id: 'masterBarang', label: 'Master Barang', icon: ICONS.box },
    { id: 'masterSupplier', label: 'Master Supplier', icon: ICONS.tag },
    { id: 'masterPendukung', label: 'Kategori, Satuan, Gudang', icon: ICONS.clipboard },
    { id: 'purchaseRequest', label: 'Purchase Request', icon: ICONS.clipboard },
    { id: 'purchaseOrder', label: 'Purchase Order', icon: ICONS.truck },
    { id: 'penerimaan', label: 'Penerimaan Barang', icon: ICONS.warehouse },
    { id: 'returPembelian', label: 'Retur Pembelian', icon: ICONS.returnbox },
    { id: 'stok', label: 'Stok', icon: ICONS.box },
    { id: 'informasi', label: 'Informasi', icon: ICONS.info }
  ];

  function byKode(a, b) {
    return String(a.kode).localeCompare(String(b.kode));
  }

  function journalsDesc(a, b) {
    if (a.tanggal !== b.tanggal) return a.tanggal < b.tanggal ? 1 : -1;
    return String(b.nomor).localeCompare(String(a.nomor));
  }

  function journalsAsc(a, b) {
    if (a.tanggal !== b.tanggal) return a.tanggal < b.tanggal ? -1 : 1;
    return String(a.nomor).localeCompare(String(b.nomor));
  }

  function blankLine() {
    return { accountId: '', debit: '', kredit: '' };
  }

  function blankJournalForm() {
    return {
      tanggal: Format.todayISO(),
      keterangan: '',
      lines: [blankLine(), blankLine()]
    };
  }

  function createAppStore() {
    var db = Store.load();
    if (!db || db.accounts.length === 0) db = Seed.bootstrap();
    Store.save(db);

    var authStore = global.Alpine && global.Alpine.store ? global.Alpine.store('auth') : null;
    var initialPage = 'dashboard';
    try {
      var hash = String(global.location.hash || '').replace('#', '');
      if (MENU.some(function (item) { return item.id === hash; })) {
        initialPage = !authStore || authStore.canView(hash) ? hash : 'denied';
      }
    } catch (e) {
      // ignore malformed location
    }

    return {
      db: db,
      page: initialPage,
      dataVersion: 0,
      menu: MENU,
      pendingLedgerAccount: null,
      pendingPRId: null,
      pendingReturnId: null,
      get visibleMenu() {
        var auth = global.Alpine && global.Alpine.store ? global.Alpine.store('auth') : null;
        if (!auth) return MENU;
        return MENU.filter(function (item) { return auth.canView(item.id); });
      },
      dialog: {
        open: false,
        title: '',
        message: '',
        details: [],
        confirmLabel: 'Ya, lanjutkan',
        onConfirm: null
      },

      notify: function (message, type) {
        global.Alpine.store('toast').push(message, type || 'ok');
      },

      fail: function (message) {
        this.notify(message, 'err');
        return { ok: false, errors: [message] };
      },

      persist: function () {
        Store.save(this.db);
      },

      touch: function () {
        this.dataVersion = (this.dataVersion || 0) + 1;
      },

      replaceData: function (next) {
        this.db = Store.normalize(next);
        this.pendingPRId = null;
        this.pendingReturnId = null;
        this.dataVersion = (this.dataVersion || 0) + 1;
        this.persist();
      },

      ensurePageAllowed: function () {
        var auth = global.Alpine && global.Alpine.store ? global.Alpine.store('auth') : null;
        if (auth && this.page !== 'denied' && !auth.canView(this.page)) {
          this.page = 'dashboard';
          try {
            global.history.replaceState(null, '', '#dashboard');
          } catch (e) {
            // ignore
          }
        }
      },

      go: function (page) {
        var auth = global.Alpine && global.Alpine.store ? global.Alpine.store('auth') : null;
        var target = page;
        if (auth && page !== 'denied' && !auth.canView(page)) target = 'denied';
        this.page = target;
        try {
          global.history.replaceState(null, '', '#' + target);
        } catch (e) {
          // ignore
        }
      },

      resetView: function () {
        this.page = 'dashboard';
        try {
          global.history.replaceState(null, '', '#dashboard');
        } catch (e) {
          // ignore
        }
        try {
          global.location.reload();
        } catch (e) {
          // ignore
        }
      },

      openLedger: function (accountId) {
        this.pendingLedgerAccount = accountId;
        this.go('bukuBesar');
      },

      openPurchaseOrder: function (prId) {
        this.pendingPRId = prId;
        this.go('purchaseOrder');
      },

      openReturn: function (receiptId) {
        this.pendingReturnId = receiptId;
        this.go('returPembelian');
      },

      accountById: function (id) {
        return this.db.accounts.find(function (account) { return account.id === id; }) || null;
      },

      accountByKode: function (kode) {
        return this.db.accounts.find(function (account) { return account.kode === kode; }) || null;
      },

      partyById: function (id) {
        return this.db.parties.find(function (party) { return party.id === id; }) || null;
      },

      partyName: function (id) {
        var party = this.partyById(id);
        return party ? party.nama : '-';
      },

      accName: function (id) {
        var account = this.accountById(id);
        return account ? account.kode + ' ' + account.nama : '-';
      },

      accShort: function (id) {
        var account = this.accountById(id);
        return account ? account.nama : '-';
      },

      balance: function (accountId, sampai) {
        return Report.saldoAkun(this.db, accountId, null, sampai || null);
      },

      balanceByKode: function (kode, sampai) {
        var account = this.accountByKode(kode);
        return account ? this.balance(account.id, sampai) : 0;
      },

      paymentsOf: function (invoiceId) {
        return this.db.payments.filter(function (payment) { return payment.invoiceId === invoiceId; });
      },

      // ---------- dialog ----------
      ask: function (options) {
        var opts = options || {};
        this.dialog = {
          open: true,
          title: opts.title || 'Konfirmasi',
          message: opts.message || '',
          details: opts.details || [],
          confirmLabel: opts.confirmLabel || 'Ya, lanjutkan',
          onConfirm: typeof opts.onConfirm === 'function' ? opts.onConfirm : null
        };
      },

      closeDialog: function () {
        this.dialog.open = false;
        this.dialog.onConfirm = null;
      },

      confirmDialog: function () {
        var callback = this.dialog.onConfirm;
        this.dialog.open = false;
        this.dialog.onConfirm = null;
        if (typeof callback === 'function') callback();
      },

      // ---------- Chart of Accounts ----------
      addAccount: function (form) {
        var kode = String(form.kode || '').trim();
        var nama = String(form.nama || '').trim();
        var tipe = TIPE_AKUN.indexOf(form.tipe) >= 0 ? form.tipe : 'Aset';
        if (!/^[1-5]-\d{4}$/.test(kode)) {
          return this.fail('Kode akun harus berbentuk seperti 1-1100.');
        }
        if (this.db.accounts.some(function (account) { return account.kode === kode; })) {
          return this.fail('Kode akun ' + kode + ' sudah dipakai.');
        }
        if (!nama) return this.fail('Nama akun wajib diisi.');
        var saldoNormal = form.saldoNormal || ((tipe === 'Aset' || tipe === 'Beban') ? 'Debit' : 'Kredit');
        this.db.accounts.push({
          id: Ledger.uid('acc'),
          kode: kode,
          nama: nama,
          tipe: tipe,
          saldoNormal: saldoNormal,
          aktif: true,
          rekening: tipe === 'Aset' ? !!form.rekening : false,
          noRekening: form.noRekening || '',
          hpp: false
        });
        this.persist();
        this.notify('Akun ' + kode + ' ' + nama + ' ditambahkan.');
        return { ok: true };
      },

      updateAccount: function (id, form) {
        var account = this.accountById(id);
        if (!account) return this.fail('Akun tidak ditemukan.');
        var nama = String(form.nama || '').trim();
        if (!nama) return this.fail('Nama akun wajib diisi.');
        account.nama = nama;
        if (Object.prototype.hasOwnProperty.call(form, 'noRekening')) {
          account.noRekening = form.noRekening || '';
        }
        this.persist();
        this.notify('Akun diperbarui.');
        return { ok: true };
      },

      toggleAccount: function (id) {
        var account = this.accountById(id);
        if (!account) return;
        if (account.dikunci) {
          this.notify('Akun sistem ' + account.kode + ' tidak bisa dinonaktifkan.', 'err');
          return;
        }
        account.aktif = account.aktif === false;
        this.persist();
        this.notify('Akun ' + account.kode + ' ' + (account.aktif ? 'diaktifkan' : 'dinonaktifkan') + '.');
      },

      requestDeleteAccount: function (account) {
        if (account.dikunci) {
          this.notify('Akun sistem ' + account.kode + ' tidak bisa dihapus.', 'err');
          return;
        }
        if (Ledger.accountUsed(this.db, account.id)) {
          this.notify('Akun sudah dipakai di jurnal, tagihan, atau pembayaran. Nonaktifkan saja agar riwayat tetap utuh.', 'err');
          return;
        }
        var self = this;
        this.ask({
          title: 'Hapus akun?',
          message: 'Akun ' + account.kode + ' ' + account.nama + ' belum dipakai. Akun akan dihapus permanen.',
          confirmLabel: 'Hapus akun',
          onConfirm: function () {
            self.db.accounts = self.db.accounts.filter(function (item) { return item.id !== account.id; });
            self.persist();
            self.notify('Akun dihapus.');
          }
        });
      },

      addRekening: function (form) {
        var nama = String(form.nama || '').trim();
        if (!nama) return this.fail('Nama rekening wajib diisi.');
        var kode = Ledger.nextRekeningKode(this.db);
        this.db.accounts.push({
          id: Ledger.uid('acc'),
          kode: kode,
          nama: nama,
          tipe: 'Aset',
          saldoNormal: 'Debit',
          aktif: true,
          rekening: true,
          noRekening: form.noRekening || '',
          hpp: false
        });
        this.persist();
        this.notify('Rekening ' + nama + ' (' + kode + ') ditambahkan.');
        return { ok: true };
      },

      // ---------- Jurnal ----------
      saveJournal: function (draft) {
        var auth = global.Alpine && global.Alpine.store ? global.Alpine.store('auth') : null;
        if (auth && !auth.can('journal.manual')) {
          return this.fail('Hanya role Finance yang dapat mencatat jurnal.');
        }
        var self = this;
        var locked = (draft.lines || []).map(function (line) {
          return line.accountId ? self.accountById(line.accountId) : null;
        }).filter(function (account) {
          return account && account.dikunci;
        });
        if (locked.length) {
          return this.fail('Akun ' + locked[0].kode + ' ' + locked[0].nama +
            ' dikunci. Perubahan Persediaan dan Utang Usaha hanya lewat modul purchasing.');
        }
        var normalized = {
          tanggal: draft.tanggal,
          keterangan: draft.keterangan,
          sumber: draft.sumber || 'manual',
          refId: draft.refId || null,
          lines: (draft.lines || []).map(function (line) {
            return {
              accountId: line.accountId,
              debit: Ledger.round(line.debit),
              kredit: Ledger.round(line.kredit),
              partyId: line.partyId || null
            };
          })
        };
        var result = Ledger.createJournal(this.db, normalized);
        if (!result.ok) {
          return this.fail(result.errors[0] || 'Jurnal belum bisa disimpan.');
        }
        this.persist();
        this.notify('Jurnal ' + result.journal.nomor + ' disimpan.');
        return result;
      },

      requestDeleteJournal: function (id) {
        var journal = this.db.journals.find(function (item) { return item.id === id; });
        if (!journal) return;
        if (journal.sumber !== 'manual') {
          this.notify('Jurnal ini berasal dari ' + journal.sumber + '. Hapus lewat dokumen sumbernya.', 'err');
          return;
        }
        var self = this;
        this.ask({
          title: 'Hapus jurnal?',
          message: 'Jurnal ' + journal.nomor + ' - ' + journal.keterangan + ' akan dihapus. Tindakan ini tidak bisa dibatalkan.',
          confirmLabel: 'Hapus jurnal',
          onConfirm: function () {
            var result = Ledger.deleteJournal(self.db, id);
            if (!result.ok) {
              self.notify(result.error, 'err');
              return;
            }
            self.persist();
            self.notify('Jurnal dihapus.');
          }
        });
      },

      // ---------- Tagihan & pembayaran ----------
      saveInvoice: function (form) {
        var auth = global.Alpine && global.Alpine.store ? global.Alpine.store('auth') : null;
        if (auth && !auth.can('journal.manual')) {
          return this.fail('Hanya role Finance yang dapat membuat tagihan penjualan.');
        }
        var jenis = form.jenis === 'utang' ? 'utang' : 'piutang';
        var party = this.partyById(form.partyId);
        var tanggal = form.tanggal || '';
        var jatuhTempo = form.jatuhTempo || '';
        var total = Ledger.round(form.total);
        var hpp = jenis === 'piutang' ? Ledger.round(form.hpp) : 0;
        var akunLawan = this.accountById(form.akunLawanId);
        var akunHpp = this.accountById(form.akunHppId);

        if (jenis === 'utang') {
          return this.fail('Tagihan utang dibuat otomatis dari Penerimaan Barang. Buat penerimaan di menu Logistik.');
        }
        if (jenis === 'piutang' && hpp > 0) {
          return this.fail('HPP penjualan dicatat lewat Pengeluaran Barang pada fase P6, bukan dari tagihan piutang.');
        }
        if (!party) return this.fail('Pilih pihak terlebih dahulu.');
        if (party.jenis !== (jenis === 'piutang' ? 'pelanggan' : 'pemasok')) {
          return this.fail('Jenis pihak tidak cocok dengan jenis tagihan.');
        }
        if (!Format.isValidDateISO(tanggal)) return this.fail('Tanggal tagihan tidak valid.');
        if (!Format.isValidDateISO(jatuhTempo)) return this.fail('Jatuh tempo tidak valid.');
        if (jatuhTempo < tanggal) return this.fail('Jatuh tempo tidak boleh sebelum tanggal tagihan.');
        if (total <= 0) return this.fail('Jumlah tagihan harus lebih dari 0.');
        if (!akunLawan) return this.fail('Pilih akun lawan terlebih dahulu.');
        if (akunLawan.aktif === false) return this.fail('Akun lawan sudah nonaktif.');

        var piutangAkun = this.accountByKode('1-1200');
        var utangAkun = this.accountByKode('2-1100');
        var persediaanAkun = this.accountByKode('1-1300');
        var lines;

        if (jenis === 'piutang') {
          if (!piutangAkun) return this.fail('Akun Piutang Usaha (1-1200) tidak ditemukan.');
          lines = [
            { accountId: piutangAkun.id, debit: total, kredit: 0, partyId: party.id },
            { accountId: akunLawan.id, debit: 0, kredit: total }
          ];
          if (hpp > 0) {
            if (!akunHpp) return this.fail('Pilih akun HPP untuk mencatat modal barang.');
            if (!persediaanAkun) return this.fail('Akun Persediaan Barang (1-1300) tidak ditemukan.');
            lines.push({ accountId: akunHpp.id, debit: hpp, kredit: 0 });
            lines.push({ accountId: persediaanAkun.id, debit: 0, kredit: hpp });
          }
        } else {
          if (!utangAkun) return this.fail('Akun Utang Usaha (2-1100) tidak ditemukan.');
          lines = [
            { accountId: akunLawan.id, debit: total, kredit: 0 },
            { accountId: utangAkun.id, debit: 0, kredit: total, partyId: party.id }
          ];
        }

        var invoice = {
          id: Ledger.uid('inv'),
          jenis: jenis,
          partyId: party.id,
          tanggal: tanggal,
          jatuhTempo: jatuhTempo,
          total: total,
          keterangan: (form.keterangan || '').trim() || (jenis === 'piutang' ? 'Penjualan kredit' : 'Pembelian kredit'),
          akunLawanId: akunLawan.id,
          akunHppId: hpp > 0 && akunHpp ? akunHpp.id : null,
          hpp: hpp,
          sumber: 'manual',
          refId: null
        };

        var result = Ledger.createJournal(this.db, {
          tanggal: tanggal,
          keterangan: (jenis === 'piutang' ? 'Penjualan kredit - ' : 'Pembelian kredit - ') + party.nama,
          sumber: 'tagihan',
          refId: invoice.id,
          lines: lines
        });
        if (!result.ok) return this.fail(result.errors[0] || 'Jurnal tagihan gagal dibuat.');

        this.db.invoices.push(invoice);
        this.persist();
        this.notify('Tagihan ' + jenis + ' ' + party.nama + ' disimpan.');
        return { ok: true, invoice: invoice };
      },

      savePayment: function (form) {
        var auth = global.Alpine && global.Alpine.store ? global.Alpine.store('auth') : null;
        if (auth && !auth.can('ap.pay')) {
          return this.fail('Hanya role Finance yang dapat membayar utang.');
        }
        var invoice = this.db.invoices.find(function (item) { return item.id === form.invoiceId; });
        if (!invoice) return this.fail('Tagihan tidak ditemukan.');
        var jumlah = Ledger.round(form.jumlah);
        var sisa = Report.sisaTagihan(this.db, invoice.id);
        var akunKas = this.accountById(form.akunKasId);
        if (!Format.isValidDateISO(form.tanggal)) return this.fail('Tanggal pembayaran tidak valid.');
        if (jumlah <= 0) return this.fail('Jumlah pembayaran harus lebih dari 0.');
        if (sisa <= 0) return this.fail('Tagihan ini sudah lunas.');
        if (jumlah > sisa) return this.fail('Pembayaran melebihi sisa tagihan (' + Format.rupiah(sisa) + ').');
        if (!akunKas || akunKas.aktif === false || !akunKas.rekening) {
          return this.fail('Pilih rekening kas atau bank yang aktif.');
        }

        var isPiutang = invoice.jenis === 'piutang';
        var piutangAkun = this.accountByKode('1-1200');
        var utangAkun = this.accountByKode('2-1100');
        var lines;
        if (isPiutang) {
          if (!piutangAkun) return this.fail('Akun Piutang Usaha (1-1200) tidak ditemukan.');
          lines = [
            { accountId: akunKas.id, debit: jumlah, kredit: 0 },
            { accountId: piutangAkun.id, debit: 0, kredit: jumlah, partyId: invoice.partyId }
          ];
        } else {
          if (!utangAkun) return this.fail('Akun Utang Usaha (2-1100) tidak ditemukan.');
          lines = [
            { accountId: utangAkun.id, debit: jumlah, kredit: 0, partyId: invoice.partyId },
            { accountId: akunKas.id, debit: 0, kredit: jumlah }
          ];
        }

        var payment = {
          id: Ledger.uid('pay'),
          invoiceId: invoice.id,
          tanggal: form.tanggal,
          jumlah: jumlah,
          akunKasId: akunKas.id,
          jenis: 'bayar'
        };

        var result = Ledger.createJournal(this.db, {
          tanggal: form.tanggal,
          keterangan: (isPiutang ? 'Penerimaan pembayaran - ' : 'Pembayaran utang - ') + this.partyName(invoice.partyId),
          sumber: 'pembayaran',
          refId: payment.id,
          lines: lines
        });
        if (!result.ok) return this.fail(result.errors[0] || 'Jurnal pembayaran gagal dibuat.');

        this.db.payments.push(payment);
        this.persist();
        this.notify('Pembayaran ' + Format.rupiah(jumlah) + ' dicatat.');
        return { ok: true, payment: payment };
      },

      requestDeleteInvoice: function (id) {
        var invoice = this.db.invoices.find(function (item) { return item.id === id; });
        if (!invoice) return;
        if (invoice.sumber === 'penerimaan') {
          this.notify('Tagihan dari penerimaan tidak bisa dihapus. Koreksi lewat retur pada fase P5.', 'err');
          return;
        }
        if (this.paymentsOf(id).length) {
          this.notify('Tagihan sudah memiliki pembayaran. Hapus pembayarannya terlebih dahulu.', 'err');
          return;
        }
        var self = this;
        this.ask({
          title: 'Hapus tagihan?',
          message: 'Tagihan untuk ' + this.partyName(invoice.partyId) + ' sebesar ' + Format.rupiah(invoice.total) + ' dan jurnal otomatisnya akan dihapus.',
          confirmLabel: 'Hapus tagihan',
          onConfirm: function () {
            var journal = self.db.journals.find(function (item) {
              return item.sumber === 'tagihan' && item.refId === invoice.id;
            });
            if (journal) Ledger.removeJournalUnsafe(self.db, journal.id);
            self.db.invoices = self.db.invoices.filter(function (item) { return item.id !== invoice.id; });
            self.persist();
            self.notify('Tagihan dihapus.');
          }
        });
      },

      requestDeletePayment: function (id) {
        var payment = this.db.payments.find(function (item) { return item.id === id; });
        if (!payment) return;
        var self = this;
        this.ask({
          title: 'Hapus pembayaran?',
          message: 'Pembayaran ' + Format.rupiah(payment.jumlah) + ' pada ' + Format.tanggal(payment.tanggal) + ' dan jurnal otomatisnya akan dihapus.',
          confirmLabel: 'Hapus pembayaran',
          onConfirm: function () {
            var journal = self.db.journals.find(function (item) {
              return item.sumber === 'pembayaran' && item.refId === payment.id;
            });
            if (journal) Ledger.removeJournalUnsafe(self.db, journal.id);
            self.db.payments = self.db.payments.filter(function (item) { return item.id !== payment.id; });
            self.persist();
            self.notify('Pembayaran dihapus.');
          }
        });
      },

      transfer: function (form) {
        var jumlah = Ledger.round(form.jumlah);
        var dari = this.accountById(form.dariId);
        var tujuan = this.accountById(form.tujuanId);
        if (!Format.isValidDateISO(form.tanggal)) return this.fail('Tanggal transfer tidak valid.');
        if (!dari || !tujuan) return this.fail('Pilih rekening asal dan tujuan.');
        if (dari.id === tujuan.id) return this.fail('Rekening asal dan tujuan harus berbeda.');
        if (!dari.rekening || !tujuan.rekening) return this.fail('Hanya akun rekening yang bisa ditransfer.');
        if (jumlah <= 0) return this.fail('Jumlah transfer harus lebih dari 0.');
        return this.saveJournal({
          tanggal: form.tanggal,
          keterangan: (form.keterangan || '').trim() || ('Transfer ' + dari.nama + ' ke ' + tujuan.nama),
          lines: [
            { accountId: tujuan.id, debit: jumlah, kredit: 0 },
            { accountId: dari.id, debit: 0, kredit: jumlah }
          ]
        });
      },

      // ---------- alat belajar ----------
      requestLoadScenario: function () {
        this.requestRestartScenario();
      },

      requestLoadPurchasingScenario: function () {
        if (!global.SeedPurchasing) {
          this.notify('Modul purchasing belum tersedia.', 'err');
          return;
        }
        var self = this;
        this.ask({
          title: 'Muat skenario purchasing?',
          message: 'Data saat ini diganti dengan master barang dan skenario PR, PO, serta penerimaan. Modal awal Rp 50.000.000 masuk ke Bank BCA. Ekspor JSON dulu jika perlu.',
          confirmLabel: 'Muat skenario',
          onConfirm: function () {
            self.replaceData(global.SeedPurchasing.scenario());
            self.resetView();
          }
        });
      },

      requestClearData: function () {
        var self = this;
        this.ask({
          title: 'Clear data?',
          message: 'Semua jurnal, tagihan, pembayaran, master purchasing, PR, PO, penerimaan, retur, dan stok akan dihapus. Aplikasi kembali ke 24 akun contoh dan 2 pihak. Ekspor JSON dulu jika ingin menyimpan data lama.',
          confirmLabel: 'Clear data',
          onConfirm: function () {
            self.replaceData(Seed.bootstrap());
            self.resetView();
          }
        });
      },

      requestRestartScenario: function () {
        var self = this;
        this.ask({
          title: 'Ulangi skenario belajar?',
          message: 'Data saat ini diganti dengan 10 transaksi contoh November 2026. Akun dan pihak kembali ke data contoh; akun tambahan akan hilang. Ekspor JSON dulu jika perlu.',
          confirmLabel: 'Ulangi skenario',
          onConfirm: function () {
            self.replaceData(Seed.scenario());
            self.resetView();
          }
        });
      },

      exportData: function () {
        var blob = new Blob([Store.exportJSON(this.db)], { type: 'application/json' });
        var url = URL.createObjectURL(blob);
        var link = document.createElement('a');
        link.href = url;
        link.download = 'akuntansi-mvp-' + Format.todayISO() + '.json';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        this.notify('Cadangan JSON diunduh.');
      },

      importData: function (file) {
        var self = this;
        return file.text().then(function (text) {
          try {
            var next = Store.importJSON(text);
            self.replaceData(next);
            self.notify('Data berhasil diimpor.');
            return { ok: true };
          } catch (e) {
            self.notify('Impor gagal: ' + e.message, 'err');
            return { ok: false, error: e.message };
          }
        });
      },

      runTests: function () {
        var accounting = global.SelfTest
          ? global.SelfTest.run()
          : { ok: false, results: [], passed: 0, failed: 0 };
        var purchasing = global.SelfTestPurchasing
          ? global.SelfTestPurchasing.run()
          : { ok: true, results: [], passed: 0, failed: 0 };
        var results = accounting.results.concat(purchasing.results);
        var passed = accounting.passed + purchasing.passed;
        var failed = accounting.failed + purchasing.failed;
        var ok = accounting.ok && purchasing.ok;
        var details = results.map(function (row) {
          return (row.ok ? 'LULUS' : 'GAGAL') + ' | ' + row.name + ': ' + row.actual + (row.ok ? '' : ' (harus ' + row.expected + ')');
        });
        this.ask({
          title: ok ? 'Uji regresi lulus' : 'Uji regresi gagal',
          message: ok
            ? passed + ' pemeriksaan lulus: akuntansi dasar dan purchasing.'
            : failed + ' pemeriksaan tidak sesuai. Periksa modul akuntansi atau purchasing.',
          details: details,
          confirmLabel: 'Tutup',
          onConfirm: null
        });
      }
    };
  }

  function registerAlpine() {
    var Alpine = global.Alpine;
    if (!Alpine) return;

    Alpine.store('auth', Auth.createStore());

    Alpine.store('toast', {
      items: [],
      push: function (message, type) {
        var id = Math.random().toString(36).slice(2);
        this.items.push({ id: id, message: message, type: type || 'ok' });
        var self = this;
        setTimeout(function () {
          self.items = self.items.filter(function (item) { return item.id !== id; });
        }, 4200);
      }
    });

    Alpine.store('tooltip', {
      open: false,
      text: '',
      x: 0,
      y: 0,
      placement: 'top',
      show: function (text, el) {
        if (!text) return;
        var rect = el.getBoundingClientRect();
        var width = 280;
        var pad = 8;
        var left = rect.left + rect.width / 2 - width / 2;
        left = Math.max(pad, Math.min(left, global.innerWidth - width - pad));
        var top = rect.top - 8;
        var placement = 'top';
        if (top < 80) {
          top = rect.bottom + 8;
          placement = 'bottom';
        }
        this.text = text;
        this.x = left;
        this.y = top;
        this.placement = placement;
        this.open = true;
      },
      hide: function () {
        this.open = false;
      }
    });

    Alpine.store('app', createAppStore());
    if (global.PurchasingPages) global.PurchasingPages.register(Alpine);

    Alpine.directive('tooltip', function (el, directive, utilities) {
      el.classList.add('tip');
      var later = directive.expression ? utilities.evaluateLater(directive.expression) : null;
      var timer = null;

      function resolveText() {
        if (!later) return '';
        var value = '';
        later(function (result) { value = result; });
        if (typeof value === 'string' && Object.prototype.hasOwnProperty.call(GLOSARIUM, value)) {
          return GLOSARIUM[value];
        }
        if (value === null || value === undefined) return '';
        return String(value);
      }

      function open() {
        var text = resolveText();
        if (text) Alpine.store('tooltip').show(text, el);
      }

      el.addEventListener('mouseenter', function () {
        clearTimeout(timer);
        timer = setTimeout(open, 200);
      });
      el.addEventListener('mouseleave', function () {
        clearTimeout(timer);
        Alpine.store('tooltip').hide();
      });
      el.addEventListener('focus', open);
      el.addEventListener('blur', function () {
        Alpine.store('tooltip').hide();
      });
      el.addEventListener('click', function () {
        if (global.matchMedia && global.matchMedia('(hover: none)').matches) open();
      });
    });

    Alpine.data('dashboardPage', function () {
      return {
        get db() { return this.$store.app.db; },
        get per() { return Report.referensiTanggal(this.db); },
        get kas() {
          var app = this.$store.app;
          var per = this.per;
          return this.db.accounts.filter(function (account) { return account.rekening; })
            .reduce(function (sum, account) { return sum + app.balance(account.id, per); }, 0);
        },
        get piutang() { return this.$store.app.balanceByKode('1-1200', this.per); },
        get utang() { return this.$store.app.balanceByKode('2-1100', this.per); },
        get labaBulan() { return Report.labaRugi(this.db, Format.firstOfMonthISO(this.per), this.per); },
        get nc() { return Report.neraca(this.db, this.per); },
        get recent() { return this.db.journals.slice().sort(journalsDesc).slice(0, 6); },
        get jumlahJurnal() { return this.db.journals.length; },
        get role() { return this.$store.auth.role; },
        get pendingPR() { return Purchasing.pendingPR(this.db).length; },
        get pendingPO() { return Purchasing.pendingPO(this.db).length; },
        get openPO() { return Purchasing.openPOs(this.db).length; },
        get lowStock() {
          return Inventory.ringkasan(this.db).filter(function (row) { return row.diBawahMinimum; });
        },
        get reconcile() { return Reconcile.ringkasan(this.db); },
        get piutangSupplier() { return Returns.piutangSupplierBalance(this.db); },
        totalOf: function (journal) {
          return this.db.journalLines.filter(function (line) { return line.journalId === journal.id; })
            .reduce(function (sum, line) { return sum + line.debit; }, 0);
        },
        pickFile: function () { this.$refs.file.click(); },
        onFile: function (event) {
          var app = this.$store.app;
          var file = event.target.files && event.target.files[0];
          if (!file) return;
          app.importData(file);
          event.target.value = '';
        }
      };
    });

    Alpine.data('coaPage', function () {
      return {
        adding: false,
        editing: null,
        editForm: { nama: '', noRekening: '' },
        draft: { kode: '', nama: '', tipe: 'Aset', saldoNormal: 'Debit', rekening: false, noRekening: '' },
        types: TIPE_AKUN,
        get accounts() { return this.$store.app.db.accounts.slice().sort(byKode); },
        group: function (tipe) {
          return this.accounts.filter(function (account) { return account.tipe === tipe; });
        },
        balance: function (account) { return this.$store.app.balance(account.id); },
        openAdd: function () {
          this.draft = { kode: '', nama: '', tipe: 'Aset', saldoNormal: 'Debit', rekening: false, noRekening: '' };
          this.adding = true;
          this.editing = null;
          Overlays.mark(this, this.draft);
        },
        forceClose: function () {
          this.adding = false;
          this.editing = null;
          this.__overlaySnapshot = null;
        },
        requestClose: function () {
          var self = this;
          var form = this.editing ? this.editForm : this.draft;
          Overlays.requestClose(this, form, function () { self.forceClose(); });
        },
        syncNormal: function () {
          this.draft.saldoNormal = (this.draft.tipe === 'Aset' || this.draft.tipe === 'Beban') ? 'Debit' : 'Kredit';
          if (this.draft.tipe !== 'Aset') this.draft.rekening = false;
        },
        saveAdd: function () {
          if (this.$store.app.addAccount(this.draft).ok) {
            this.forceClose();
            this.draft = { kode: '', nama: '', tipe: 'Aset', saldoNormal: 'Debit', rekening: false, noRekening: '' };
          }
        },
        startEdit: function (account) {
          this.adding = false;
          this.editing = account.id;
          this.editForm = { nama: account.nama, noRekening: account.noRekening || '' };
          Overlays.mark(this, this.editForm);
        },
        cancelEdit: function () { this.requestClose(); },
        saveEdit: function () {
          if (this.$store.app.updateAccount(this.editing, this.editForm).ok) this.forceClose();
        },
        toggle: function (account) { this.$store.app.toggleAccount(account.id); },
        remove: function (account) { this.$store.app.requestDeleteAccount(account); }
      };
    });

    Alpine.data('journalPage', function () {
      return {
        showForm: false,
        detailId: null,
        form: blankJournalForm(),
        get db() { return this.$store.app.db; },
        get journals() { return this.db.journals.slice().sort(journalsDesc); },
        get activeAccounts() { return this.db.accounts.filter(function (a) { return a.aktif !== false && !a.dikunci; }).sort(byKode); },
        get totals() { return Ledger.totals(this.form.lines); },
        get validation() {
          return Ledger.validateJournal(this.db, {
            tanggal: this.form.tanggal,
            keterangan: this.form.keterangan,
            lines: this.form.lines
          });
        },
        get detail() { return this.detailId ? Ledger.journalDetails(this.db, this.detailId) : null; },
        openForm: function () {
          this.form = blankJournalForm();
          this.showForm = true;
          Overlays.mark(this, this.form);
        },
        forceClose: function () {
          this.form = blankJournalForm();
          this.showForm = false;
          this.__overlaySnapshot = null;
        },
        requestClose: function () {
          var self = this;
          Overlays.requestClose(this, this.form, function () { self.forceClose(); });
        },
        cancel: function () {
          this.requestClose();
        },
        addLine: function () { this.form.lines.push(blankLine()); },
        removeLine: function (index) {
          if (this.form.lines.length > 2) this.form.lines.splice(index, 1);
        },
        onDebit: function (index) { this.form.lines[index].kredit = ''; },
        onKredit: function (index) { this.form.lines[index].debit = ''; },
        save: function () {
          var result = this.$store.app.saveJournal({
            tanggal: this.form.tanggal,
            keterangan: this.form.keterangan,
            lines: this.form.lines.map(function (line) {
              return { accountId: line.accountId, debit: line.debit, kredit: line.kredit };
            })
          });
          if (result.ok) {
            this.forceClose();
          }
        },
        totalOf: function (journal) {
          return this.db.journalLines.filter(function (line) { return line.journalId === journal.id; })
            .reduce(function (sum, line) { return sum + line.debit; }, 0);
        },
        sourceLabel: function (journal) {
          if (journal.sumber === 'tagihan') return 'Tagihan';
          if (journal.sumber === 'pembayaran') return 'Pembayaran';
          if (journal.sumber === 'penerimaan') return 'Penerimaan';
          if (journal.sumber === 'retur') return 'Retur';
          if (journal.sumber === 'pengganti') return 'Penerimaan Pengganti';
          return 'Manual';
        },
        remove: function (journal) { this.$store.app.requestDeleteJournal(journal.id); }
      };
    });

    Alpine.data('ledgerPage', function () {
      return {
        accountId: '',
        dari: '',
        sampai: '',
        detailId: null,
        init: function () {
          var app = this.$store.app;
          if (app.pendingLedgerAccount) {
            this.accountId = app.pendingLedgerAccount;
            app.pendingLedgerAccount = null;
          }
          if (!this.accountId) {
            var first = app.db.accounts.slice().sort(byKode)[0];
            this.accountId = first ? first.id : '';
          }
        },
        get db() { return this.$store.app.db; },
        get accounts() { return this.db.accounts.slice().sort(byKode); },
        get account() {
          var id = this.accountId;
          return this.db.accounts.find(function (account) { return account.id === id; }) || null;
        },
        get movement() {
          var account = this.account;
          if (!account) return { opening: 0, rows: [], totalDebit: 0, totalKredit: 0, akhir: 0 };
          var pairs = [];
          this.db.journals.slice().sort(journalsAsc).forEach(function (journal) {
            this.db.journalLines.forEach(function (line) {
              if (line.journalId === journal.id && line.accountId === account.id) {
                pairs.push({ journal: journal, line: line });
              }
            });
          }.bind(this));

          var saldo = 0;
          var opening = 0;
          var totalDebit = 0;
          var totalKredit = 0;
          var rows = [];
          var dari = this.dari;
          var sampai = this.sampai;

          pairs.forEach(function (pair) {
            var move = account.saldoNormal === 'Debit'
              ? pair.line.debit - pair.line.kredit
              : pair.line.kredit - pair.line.debit;
            saldo += move;
            if (dari && pair.journal.tanggal < dari) {
              opening = saldo;
              return;
            }
            if (sampai && pair.journal.tanggal > sampai) return;
            totalDebit += pair.line.debit;
            totalKredit += pair.line.kredit;
            rows.push({
              journal: pair.journal,
              line: pair.line,
              debit: pair.line.debit,
              kredit: pair.line.kredit,
              saldo: saldo
            });
          });

          return {
            opening: opening,
            rows: rows,
            totalDebit: totalDebit,
            totalKredit: totalKredit,
            akhir: rows.length ? rows[rows.length - 1].saldo : opening
          };
        },
        get detail() { return this.detailId ? Ledger.journalDetails(this.db, this.detailId) : null; },
        openDetail: function (journalId) { this.detailId = journalId; },
        partyLabel: function (line) { return line.party ? line.party.nama : ''; }
      };
    });

    Alpine.data('reportPage', function () {
      return {
        tab: 'neracaSaldo',
        dari: '',
        sampai: '',
        drill: { open: false, mode: 'akun', title: '', rows: [], total: 0 },
        init: function () {
          this.resetDates();
          this.$watch('$store.app.dataVersion', () => { this.resetDates(); });
        },
        resetDates: function () {
          var dates = this.$store.app.db.journals.map(function (journal) { return journal.tanggal; }).sort();
          this.dari = dates.length ? dates[0] : Format.firstOfMonthISO(Format.todayISO());
          this.sampai = dates.length ? dates[dates.length - 1] : Format.todayISO();
        },
        get db() { return this.$store.app.db; },
        get ns() { return Report.neracaSaldo(this.db, this.sampai); },
        get lr() { return Report.labaRugi(this.db, this.dari, this.sampai); },
        get nc() { return Report.neraca(this.db, this.sampai); },
        openAccounts: function (title, items, total) {
          this.drill = {
            open: true,
            mode: 'akun',
            title: title,
            total: total,
            rows: items.map(function (row) {
              return {
                label: row.akun ? row.akun.kode + ' ' + row.akun.nama : row.label,
                jumlah: row.jumlah,
                akun: row.akun || null
              };
            })
          };
        },
        openJournals: function (account) {
          if (!account) return;
          var rows = Report.jurnalAkun(this.db, account.id, this.dari, this.sampai);
          this.drill = {
            open: true,
            mode: 'jurnal',
            title: 'Jurnal ' + account.kode + ' ' + account.nama,
            total: rows.reduce(function (sum, row) { return sum + row.debit; }, 0),
            rows: rows
          };
        },
        drillLabaBersih: function () {
          this.openAccounts('Penyusun laba bersih', this.lr.pendapatan.concat(this.lr.hpp, this.lr.beban), this.lr.labaBersih);
        },
        drillTotalAset: function () {
          this.openAccounts('Penyusun total aset', this.nc.aset, this.nc.totalAset);
        },
        drillTotalKewajiban: function () {
          this.openAccounts('Penyusun total kewajiban', this.nc.kewajiban, this.nc.totalKewajiban);
        },
        drillTotalEkuitas: function () {
          var items = this.nc.ekuitas.slice();
          items.push({ akun: null, label: 'Laba berjalan (belum ditutup)', jumlah: this.nc.labaBerjalan });
          this.openAccounts('Penyusun total ekuitas', items, this.nc.totalEkuitas);
        },
        closeDrill: function () { this.drill.open = false; },
        printPage: function () { global.print(); }
      };
    });

    Alpine.data('invoicePage', function (jenis) {
      var isPiutang = jenis === 'piutang';
      return {
        jenis: jenis,
        isPiutang: isPiutang,
        adding: false,
        payingId: null,
        historyId: null,
        perTanggal: Format.todayISO(),
        form: {
          partyId: '',
          tanggal: Format.todayISO(),
          jatuhTempo: Format.addDays(Format.todayISO(), 30),
          total: '',
          akunLawanId: '',
          akunHppId: '',
          hpp: '',
          keterangan: ''
        },
        payForm: { tanggal: Format.todayISO(), jumlah: '', akunKasId: '' },
        get db() { return this.$store.app.db; },
        get parties() {
          var target = isPiutang ? 'pelanggan' : 'pemasok';
          return this.db.parties.filter(function (party) { return party.jenis === target; });
        },
        get invoices() {
          var app = this.$store.app;
          return this.db.invoices.filter(function (invoice) { return invoice.jenis === jenis; })
            .map(function (invoice) {
              var dibayar = Report.dibayarTagihan(app.db, invoice.id);
              var retur = Report.totalReturPotong(app.db, invoice.id);
              var sisa = Report.sisaTagihan(app.db, invoice.id);
              return {
                id: invoice.id,
                partyId: invoice.partyId,
                party: app.partyById(invoice.partyId),
                tanggal: invoice.tanggal,
                jatuhTempo: invoice.jatuhTempo,
                total: invoice.total,
                keterangan: invoice.keterangan,
                nomor: invoice.nomor || '',
                sumber: invoice.sumber || 'manual',
                refId: invoice.refId || null,
                dibayar: dibayar,
                retur: retur,
                sisa: sisa,
                status: Report.statusTagihan(invoice.total, dibayar, retur),
                tooltip: Report.tooltipSisaPiutang(invoice, dibayar, sisa, retur)
              };
            })
            .sort(function (a, b) { return String(a.tanggal).localeCompare(String(b.tanggal)); });
        },
        get aging() { return Report.umurPiutang(this.db, this.perTanggal); },
        get piutangSupplier() { return Returns.piutangSupplierBalance(this.db); },
        get rekening() {
          return this.db.accounts.filter(function (account) {
            return account.rekening && account.aktif !== false;
          }).sort(byKode);
        },
        get revenueAccounts() {
          return this.db.accounts.filter(function (account) {
            return account.tipe === 'Pendapatan' && account.aktif !== false;
          }).sort(byKode);
        },
        get expenseAccounts() {
          return this.db.accounts.filter(function (account) {
            return account.tipe === 'Beban' && account.aktif !== false;
          }).sort(byKode);
        },
        get utangLawanOptions() {
          return this.db.accounts.filter(function (account) {
            return (account.tipe === 'Aset' || account.tipe === 'Beban') &&
              !account.rekening && account.aktif !== false;
          }).sort(byKode);
        },
        get hppAccount() {
          return this.db.accounts.find(function (account) { return account.hpp; }) || null;
        },
        get paying() {
          var id = this.payingId;
          return this.invoices.find(function (invoice) { return invoice.id === id; }) || null;
        },
        get historyInvoice() {
          var id = this.historyId;
          return this.invoices.find(function (invoice) { return invoice.id === id; }) || null;
        },
        openAdd: function () {
          var lawan = isPiutang
            ? this.revenueAccounts.find(function (account) { return account.kode === '4-1100'; }) || this.revenueAccounts[0]
            : this.db.accounts.find(function (account) { return account.kode === '1-1300'; });
          var hpp = this.hppAccount;
          this.form = {
            partyId: (this.parties[0] || {}).id || '',
            tanggal: Format.todayISO(),
            jatuhTempo: Format.addDays(Format.todayISO(), 30),
            total: '',
            akunLawanId: lawan ? lawan.id : '',
            akunHppId: hpp ? hpp.id : '',
            hpp: '',
            keterangan: ''
          };
          this.adding = true;
          this.payingId = null;
          this.historyId = null;
          Overlays.mark(this, this.form);
        },
        forceClose: function () {
          this.adding = false;
          this.payingId = null;
          this.__overlaySnapshot = null;
        },
        requestClose: function () {
          var self = this;
          Overlays.requestClose(this, this.form, function () { self.forceClose(); });
        },
        requestClosePay: function () {
          var self = this;
          Overlays.requestClose(this, this.payForm, function () { self.forceClose(); });
        },
        cancelAdd: function () { this.requestClose(); },
        save: function () {
          var result = this.$store.app.saveInvoice({
            jenis: jenis,
            partyId: this.form.partyId,
            tanggal: this.form.tanggal,
            jatuhTempo: this.form.jatuhTempo,
            total: this.form.total,
            akunLawanId: this.form.akunLawanId,
            akunHppId: this.form.akunHppId,
            hpp: this.form.hpp,
            keterangan: this.form.keterangan
          });
          if (result.ok) this.forceClose();
        },
        openPay: function (invoice) {
          this.adding = false;
          this.payingId = invoice.id;
          this.payForm = {
            tanggal: Format.todayISO(),
            jumlah: invoice.sisa,
            akunKasId: (this.rekening[0] || {}).id || ''
          };
          Overlays.mark(this, this.payForm);
        },
        cancelPay: function () { this.requestClosePay(); },
        savePay: function () {
          var result = this.$store.app.savePayment({
            invoiceId: this.payingId,
            tanggal: this.payForm.tanggal,
            jumlah: this.payForm.jumlah,
            akunKasId: this.payForm.akunKasId
          });
          if (result.ok) this.forceClose();
        },
        toggleHistory: function (invoice) {
          this.historyId = this.historyId === invoice.id ? null : invoice.id;
        },
        paymentsOf: function (invoiceId) { return this.$store.app.paymentsOf(invoiceId); },
        remove: function (invoice) { this.$store.app.requestDeleteInvoice(invoice.id); },
        removePayment: function (payment) { this.$store.app.requestDeletePayment(payment.id); },
        statusLabel: function (status) {
          if (status === 'lunas') return 'Lunas';
          if (status === 'sebagian') return 'Sebagian';
          return 'Belum dibayar';
        }
      };
    });

    Alpine.data('quickPage', function () {
      var TEMPLATES = [
        { id: 'setorModal', nama: 'Setor modal', desc: 'Pemilik menambah modal ke rekening usaha.', lawanKode: '3-1100' },
        { id: 'jualTunai', nama: 'Jual tunai', desc: 'Mencatat pendapatan tunai. HPP dicatat lewat Pengeluaran Barang.', lawanKode: '4-1100' },
        { id: 'bayarBeban', nama: 'Bayar beban', desc: 'Membayar beban operasional seperti sewa atau listrik.', lawanKode: '5-2200' },
        { id: 'prive', nama: 'Prive', desc: 'Pemilik mengambil uang usaha untuk keperluan pribadi.', lawanKode: '3-1200' },
        { id: 'transfer', nama: 'Transfer antar rekening', desc: 'Memindahkan uang antara Kas dan Bank.', lawanKode: null }
      ];
      return {
        template: 'setorModal',
        templates: TEMPLATES,
        form: {
          tanggal: Format.todayISO(),
          jumlah: '',
          rekeningId: '',
          akunLawanId: '',
          rekeningTujuanId: '',
          akunHppId: '',
          hpp: '',
          keterangan: ''
        },
        init: function () {
          var first = this.rekening[0];
          this.form.rekeningId = first ? first.id : '';
          this.form.akunLawanId = this.defaultLawan();
          var hpp = this.hppAccount;
          this.form.akunHppId = hpp ? hpp.id : '';
        },
        get db() { return this.$store.app.db; },
        get cfg() {
          var id = this.template;
          return TEMPLATES.find(function (item) { return item.id === id; }) || TEMPLATES[0];
        },
        get rekening() {
          return this.db.accounts.filter(function (account) {
            return account.rekening && account.aktif !== false;
          }).sort(byKode);
        },
        get hppAccount() {
          return this.db.accounts.find(function (account) { return account.hpp; }) || null;
        },
        get lawanOptions() {
          var t = this.template;
          if (t === 'bayarBeban') {
            return this.db.accounts.filter(function (account) {
              return account.tipe === 'Beban' && account.aktif !== false && !account.hpp;
            }).sort(byKode);
          }
          if (t === 'beliTunai') {
            return this.db.accounts.filter(function (account) {
              return account.tipe === 'Aset' && !account.rekening && account.aktif !== false;
            }).sort(byKode);
          }
          if (t === 'jualTunai') {
            return this.db.accounts.filter(function (account) {
              return account.tipe === 'Pendapatan' && account.aktif !== false;
            }).sort(byKode);
          }
          return this.db.accounts.filter(function (account) { return account.aktif !== false; }).sort(byKode);
        },
        get hppOptions() {
          return this.db.accounts.filter(function (account) {
            return account.tipe === 'Beban' && account.aktif !== false;
          }).sort(byKode);
        },
        defaultLawan: function () {
          var kode = this.cfg.lawanKode;
          if (!kode) return '';
          var account = this.db.accounts.find(function (item) { return item.kode === kode; });
          return account ? account.id : '';
        },
        setTemplate: function (id) {
          this.template = id;
          this.form.jumlah = '';
          this.form.keterangan = '';
          this.form.akunLawanId = this.defaultLawan();
          this.form.rekeningTujuanId = '';
          if (this.template === 'transfer') {
            var tujuan = this.rekening.find(function (account) { return account.id !== this.form.rekeningId; }.bind(this));
            this.form.rekeningTujuanId = tujuan ? tujuan.id : '';
          }
        },
        get lines() {
          var app = this.$store.app;
          var jumlah = Ledger.round(this.form.jumlah);
          var kas = this.form.rekeningId;
          var lawan = this.form.akunLawanId;
          var tujuan = this.form.rekeningTujuanId;
          var t = this.template;
          if (jumlah <= 0) return [];
          if (t === 'setorModal') {
            return [
              { accountId: kas, debit: jumlah, kredit: 0 },
              { accountId: lawan, debit: 0, kredit: jumlah }
            ];
          }
          if (t === 'jualTunai') {
            return [
              { accountId: kas, debit: jumlah, kredit: 0 },
              { accountId: lawan, debit: 0, kredit: jumlah }
            ];
          }
          if (t === 'beliTunai' || t === 'bayarBeban') {
            return [
              { accountId: lawan, debit: jumlah, kredit: 0 },
              { accountId: kas, debit: 0, kredit: jumlah }
            ];
          }
          if (t === 'prive') {
            return [
              { accountId: lawan, debit: jumlah, kredit: 0 },
              { accountId: kas, debit: 0, kredit: jumlah }
            ];
          }
          if (t === 'transfer') {
            return [
              { accountId: tujuan, debit: jumlah, kredit: 0 },
              { accountId: kas, debit: 0, kredit: jumlah }
            ];
          }
          return [];
        },
        get totals() { return Ledger.totals(this.lines); },
        get validation() {
          return Ledger.validateJournal(this.db, {
            tanggal: this.form.tanggal,
            keterangan: this.form.keterangan || this.cfg.nama,
            lines: this.lines
          });
        },
        save: function () {
          var result = this.$store.app.saveJournal({
            tanggal: this.form.tanggal,
            keterangan: this.form.keterangan || this.cfg.nama,
            lines: this.lines
          });
          if (result.ok) {
            this.form.jumlah = '';
            this.form.hpp = '';
            this.form.keterangan = '';
          }
        },
        accName: function (id) { return this.$store.app.accName(id); }
      };
    });

    Alpine.data('bankPage', function () {
      return {
        adding: false,
        transferOpen: false,
        addForm: { nama: '', noRekening: '' },
        transferForm: { tanggal: Format.todayISO(), jumlah: '', dariId: '', tujuanId: '', keterangan: '' },
        get db() { return this.$store.app.db; },
        get rekening() {
          return this.db.accounts.filter(function (account) { return account.rekening; }).sort(byKode);
        },
        balance: function (account) { return this.$store.app.balance(account.id); },
        countLines: function (account) {
          return this.db.journalLines.filter(function (line) { return line.accountId === account.id; }).length;
        },
        openLedger: function (account) { this.$store.app.openLedger(account.id); },
        openAdd: function () {
          this.addForm = { nama: '', noRekening: '' };
          this.adding = true;
          this.transferOpen = false;
          Overlays.mark(this, this.addForm);
        },
        requestClose: function () {
          var self = this;
          Overlays.requestClose(this, this.addForm, function () { self.forceClose(); });
        },
        cancelAdd: function () { this.requestClose(); },
        forceClose: function () {
          this.adding = false;
          this.transferOpen = false;
          this.__overlaySnapshot = null;
        },
        saveAdd: function () {
          if (this.$store.app.addRekening(this.addForm).ok) {
            this.forceClose();
            this.addForm = { nama: '', noRekening: '' };
          }
        },
        openTransfer: function () {
          this.adding = false;
          this.transferOpen = true;
          this.transferForm = {
            tanggal: Format.todayISO(),
            jumlah: '',
            dariId: (this.rekening[0] || {}).id || '',
            tujuanId: (this.rekening[1] || {}).id || '',
            keterangan: ''
          };
          Overlays.mark(this, this.transferForm);
        },
        requestCloseTransfer: function () {
          var self = this;
          Overlays.requestClose(this, this.transferForm, function () { self.forceClose(); });
        },
        transfer: function () {
          var result = this.$store.app.transfer(this.transferForm);
          if (result.ok) {
            this.transferForm.jumlah = '';
            this.transferForm.keterangan = '';
            this.forceClose();
          }
        }
      };
    });
  }

  if (typeof document !== 'undefined') {
    document.addEventListener('alpine:init', registerAlpine);
    global.addEventListener('DOMContentLoaded', function () {
      if (global.location && /[?&]test=1/.test(global.location.search) && global.SelfTest) {
        var result = global.SelfTest.run();
        var purchasing = global.SelfTestPurchasing ? global.SelfTestPurchasing.run() : null;
        if (global.console) {
          global.console.log('Self-test akuntansi', result);
          if (purchasing) global.console.log('Self-test purchasing', purchasing);
        }
      }
    });
  }

  global.AkunApp = { registerAlpine: registerAlpine, MENU: MENU, ICONS: ICONS };
})(typeof window !== 'undefined' ? window : globalThis);
