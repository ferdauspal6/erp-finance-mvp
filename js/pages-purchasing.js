(function (global) {
  'use strict';

  var Format = global.Format;
  var Ledger = global.Ledger;
  var Overlays = global.Overlays;
  var Master = global.Master;
  var Purchasing = global.Purchasing;
  var Receiving = global.Receiving;
  var Returns = global.Returns;
  var Inventory = global.Inventory;
  var Reconcile = global.Reconcile;

  function today() { return Format.todayISO(); }

  function blankPRLine() {
    return { barangId: '', qty: '', catatan: '' };
  }

  function blankPOLine() {
    return { barangId: '', qty: '', harga: '' };
  }

  function finish(component, result, message) {
    var app = component.$store.app;
    if (!result || !result.ok) {
      app.fail((result && result.errors && result.errors[0]) || 'Aksi gagal.');
      return false;
    }
    app.persist();
    app.touch();
    if (message) app.notify(message);
    return true;
  }

  function requireAction(component, action, message) {
    var auth = component.$store.auth;
    if (auth && auth.can && !auth.can(action)) {
      component.$store.app.fail(message || 'Role aktif tidak memiliki aksi ini.');
      return false;
    }
    return true;
  }

  function statusClass(status) {
    if (status === 'ditolak' || status === 'dibatalkan') return 'badge-outline';
    if (status === 'selesai' || status === 'diterima_penuh' || status === 'disetujui' || status === 'posted') return 'badge-solid';
    return 'badge-outline';
  }

  function register(Alpine) {

    Alpine.data('persetujuanPage', function () {
      return {
        tab: 'pr',
        rejecting: { type: '', id: '', reason: '' },
        threshold: 5000000,
        tolerance: 0,
        init: function () {
          this.threshold = Number(this.db.settings.ambangPersetujuanPO) || 0;
          this.tolerance = Number(this.db.settings.toleransiPenerimaan) || 0;
        },
        get db() { return this.$store.app.db; },
        get prs() {
          return this.db.purchaseRequests.slice().sort(function (a, b) {
            return String(b.nomor).localeCompare(String(a.nomor));
          });
        },
        get pos() {
          return this.db.purchaseOrders.slice().sort(function (a, b) {
            return String(b.nomor).localeCompare(String(a.nomor));
          });
        },
        get pendingPR() { return Purchasing.pendingPR(this.db); },
        get pendingPO() { return Purchasing.pendingPO(this.db); },
        get activity() {
          return this.db.activityLog.slice().sort(function (a, b) {
            return String(b.waktu).localeCompare(String(a.waktu));
          }).slice(0, 12);
        },
        prLines: function (id) { return Purchasing.prLines(this.db, id); },
        poLines: function (id) { return Purchasing.poLines(this.db, id); },
        supplierName: function (id) {
          var party = Master.supplierById(this.db, id);
          return party ? party.nama : '-';
        },
        barangName: function (id) {
          var barang = Master.barangById(this.db, id);
          return barang ? barang.nama : '-';
        },
        statusLabel: function (status) {
          return Purchasing.prStatusLabel(status);
        },
        poStatusLabel: function (status) {
          return Purchasing.poStatusLabel(status);
        },
        statusClass: statusClass,
        approvePR: function (pr) {
          if (!requireAction(this, 'pr.approve', 'Hanya Finance yang dapat menyetujui PR.')) return;
          if (finish(this, Purchasing.approvePR(this.db, pr.id, this.$store.auth.user), 'PR ' + pr.nomor + ' disetujui.')) {
            this.rejecting = { type: '', id: '', reason: '' };
          }
        },
        startReject: function (type, id) {
          this.rejecting = { type: type, id: id, reason: '' };
        },
        cancelReject: function () {
          this.rejecting = { type: '', id: '', reason: '' };
        },
        confirmReject: function () {
          var action = this.rejecting.type === 'pr' ? 'pr.reject' : 'po.reject';
          if (!requireAction(this, action, 'Hanya Finance yang dapat menolak dokumen.')) return;
          var id = this.rejecting.id;
          var reason = this.rejecting.reason;
          var result;
          if (this.rejecting.type === 'pr') result = Purchasing.rejectPR(this.db, id, this.$store.auth.user, reason);
          else result = Purchasing.rejectPO(this.db, id, this.$store.auth.user, reason);
          if (finish(this, result, 'Dokumen ditolak.')) this.cancelReject();
        },
        approvePO: function (po) {
          if (!requireAction(this, 'po.approve', 'Hanya Finance yang dapat menyetujui PO.')) return;
          finish(this, Purchasing.approvePO(this.db, po.id, this.$store.auth.user), 'PO ' + po.nomor + ' disetujui.');
        },
        saveSettings: function () {
          if (!requireAction(this, 'settings.edit', 'Hanya Finance yang dapat mengubah pengaturan.')) return;
          var ambang = Ledger.round(this.threshold);
          var toleransi = Ledger.round(this.tolerance);
          if (ambang < 0 || toleransi < 0) return this.$store.app.fail('Nilai pengaturan tidak boleh negatif.');
          this.db.settings.ambangPersetujuanPO = ambang;
          this.db.settings.toleransiPenerimaan = toleransi;
          this.$store.app.persist();
          this.$store.app.touch();
          this.$store.app.notify('Pengaturan purchasing diperbarui.');
        }
      };
    });

    Alpine.data('masterBarangPage', function () {
      return {
        adding: false,
        editingId: null,
        search: '',
        kategoriFilter: '',
        form: {
          kode: '', nama: '', kategoriId: '', satuanId: '',
          hargaBeliStandar: '', stokMinimum: '', kelolaStok: true
        },
        get db() { return this.$store.app.db; },
        get categories() {
          return this.db.kategoris.filter(function (item) { return item.aktif !== false; });
        },
        get units() {
          return this.db.satuans.filter(function (item) { return item.aktif !== false; });
        },
        get rows() {
          var search = this.search.toLowerCase();
          var kategori = this.kategoriFilter;
          return Inventory.ringkasan(this.db, true).filter(function (row) {
            if (kategori && row.barang.kategoriId !== kategori) return false;
            if (!search) return true;
            return (row.barang.kode + ' ' + row.barang.nama).toLowerCase().indexOf(search) >= 0;
          });
        },
        openAdd: function () {
          this.adding = true;
          this.editingId = null;
          this.form = {
            kode: '', nama: '',
            kategoriId: (this.categories[0] || {}).id || '',
            satuanId: (this.units[0] || {}).id || '',
            hargaBeliStandar: '', stokMinimum: '', kelolaStok: true
          };
          Overlays.mark(this, this.form);
        },
        startEdit: function (row) {
          var barang = row.barang;
          this.adding = true;
          this.editingId = barang.id;
          this.form = {
            kode: barang.kode,
            nama: barang.nama,
            kategoriId: barang.kategoriId,
            satuanId: barang.satuanId,
            hargaBeliStandar: barang.hargaBeliStandar,
            stokMinimum: barang.stokMinimum,
            kelolaStok: barang.kelolaStok !== false
          };
          Overlays.mark(this, this.form);
        },
        forceClose: function () {
          this.adding = false;
          this.editingId = null;
          this.__overlaySnapshot = null;
        },
        requestClose: function () {
          var self = this;
          Overlays.requestClose(this, this.form, function () { self.forceClose(); });
        },
        cancel: function () {
          this.requestClose();
        },
        save: function () {
          var result = this.editingId
            ? Master.updateBarang(this.db, this.editingId, this.form)
            : Master.addBarang(this.db, this.form);
          if (finish(this, result, this.editingId ? 'Barang diperbarui.' : 'Barang ditambahkan.')) {
            this.forceClose();
          }
        },
        toggle: function (row) {
          finish(this, Master.toggleBarang(this.db, row.barang.id), 'Status barang diperbarui.');
        },
        remove: function (row) {
          var self = this;
          this.$store.app.ask({
            title: 'Hapus barang?',
            message: 'Barang ' + row.barang.nama + ' akan dihapus permanen.',
            confirmLabel: 'Hapus barang',
            onConfirm: function () {
              finish(self, Master.removeBarang(self.db, row.barang.id), 'Barang dihapus.');
            }
          });
        },
        kategoriName: function (id) {
          var item = Master.kategoriById(this.db, id);
          return item ? item.nama : '-';
        },
        satuanName: function (id) {
          var item = Master.satuanById(this.db, id);
          return item ? item.singkatan : '-';
        }
      };
    });

    Alpine.data('masterSupplierPage', function () {
      return {
        tab: 'supplier',
        adding: false,
        editingId: null,
        hargaModal: false,
        form: {
          kode: '', nama: '', kontak: '', telepon: '', alamat: '', terminBayar: 30
        },
        hargaForm: { supplierId: '', barangId: '', harga: '', berlakuMulai: '' },
        get db() { return this.$store.app.db; },
        get suppliers() {
          return Master.suppliers(this.db).slice().sort(function (a, b) {
            return String(a.kode).localeCompare(String(b.kode));
          });
        },
        get items() {
          return this.db.barang.filter(function (barang) { return barang.aktif !== false; });
        },
        openAdd: function () {
          this.adding = true;
          this.editingId = null;
          this.form = {
            kode: Master.nextSupplierKode(this.db),
            nama: '', kontak: '', telepon: '', alamat: '', terminBayar: 30
          };
          Overlays.mark(this, this.form);
        },
        startEdit: function (supplier) {
          this.adding = true;
          this.editingId = supplier.id;
          this.form = {
            kode: supplier.kode || '',
            nama: supplier.nama || '',
            kontak: supplier.kontak || '',
            telepon: supplier.telepon || '',
            alamat: supplier.alamat || '',
            terminBayar: supplier.terminBayar || 0
          };
          Overlays.mark(this, this.form);
        },
        forceClose: function () {
          this.adding = false;
          this.editingId = null;
          this.hargaModal = false;
          this.__overlaySnapshot = null;
        },
        requestClose: function () {
          var self = this;
          var form = this.hargaModal ? this.hargaForm : this.form;
          Overlays.requestClose(this, form, function () { self.forceClose(); });
        },
        cancel: function () {
          this.requestClose();
        },
        save: function () {
          var result = this.editingId
            ? Master.updateSupplier(this.db, this.editingId, this.form)
            : Master.addSupplier(this.db, this.form);
          if (finish(this, result, this.editingId ? 'Supplier diperbarui.' : 'Supplier ditambahkan.')) {
            this.forceClose();
          }
        },
        toggle: function (supplier) {
          finish(this, Master.toggleSupplier(this.db, supplier.id), 'Status supplier diperbarui.');
        },
        remove: function (supplier) {
          var self = this;
          this.$store.app.ask({
            title: 'Hapus supplier?',
            message: 'Supplier ' + supplier.nama + ' akan dihapus permanen.',
            confirmLabel: 'Hapus supplier',
            onConfirm: function () {
              finish(self, Master.removeSupplier(self.db, supplier.id), 'Supplier dihapus.');
            }
          });
        },
        openHarga: function (supplier) {
          this.tab = 'harga';
          this.hargaForm = {
            supplierId: supplier.id,
            barangId: (this.items[0] || {}).id || '',
            harga: '',
            berlakuMulai: today()
          };
          Overlays.mark(this, this.hargaForm);
          this.hargaModal = true;
        },
        openHargaModal: function () {
          this.hargaForm = {
            supplierId: (this.suppliers[0] || {}).id || '',
            barangId: (this.items[0] || {}).id || '',
            harga: '',
            berlakuMulai: today()
          };
          Overlays.mark(this, this.hargaForm);
          this.hargaModal = true;
        },
        get hargaRows() {
          var supplierId = this.hargaForm.supplierId;
          if (!supplierId) return [];
          var self = this;
          return this.db.hargaSupplier.filter(function (row) {
            return row.supplierId === supplierId;
          }).map(function (row) {
            var barang = Master.barangById(self.db, row.barangId);
            return {
              id: row.id,
              barang: barang,
              barangNama: barang ? barang.nama : '-',
              harga: row.harga,
              berlakuMulai: row.berlakuMulai
            };
          }).sort(function (a, b) {
            return String(a.barangNama).localeCompare(String(b.barangNama));
          });
        },
        saveHarga: function () {
          var result = Master.setHargaSupplier(this.db, this.hargaForm);
          if (finish(this, result, 'Harga supplier disimpan.')) {
            this.hargaForm.harga = '';
            this.forceClose();
          }
        },
        satuanName: function (barang) {
          if (!barang) return '-';
          var unit = Master.satuanById(this.db, barang.satuanId);
          return unit ? unit.singkatan : '-';
        }
      };
    });

    Alpine.data('masterPendukungPage', function () {
      return {
        tab: 'kategori',
        modal: '',
        kategoriForm: { kode: '', nama: '' },
        satuanForm: { nama: '', singkatan: '' },
        gudangForm: { kode: '', nama: '', utama: false },
        get db() { return this.$store.app.db; },
        get kategoris() { return this.db.kategoris.slice(); },
        get satuans() { return this.db.satuans.slice(); },
        get gudangs() { return this.db.gudangs.slice(); },
        openForm: function (type) {
          this.modal = type;
          if (type === 'kategori') this.kategoriForm = { kode: '', nama: '' };
          if (type === 'satuan') this.satuanForm = { nama: '', singkatan: '' };
          if (type === 'gudang') this.gudangForm = { kode: '', nama: '', utama: false };
          var form = type === 'kategori' ? this.kategoriForm : (type === 'satuan' ? this.satuanForm : this.gudangForm);
          Overlays.mark(this, form);
        },
        currentForm: function () {
          if (this.modal === 'kategori') return this.kategoriForm;
          if (this.modal === 'satuan') return this.satuanForm;
          return this.gudangForm;
        },
        forceClose: function () {
          this.modal = '';
          this.__overlaySnapshot = null;
        },
        requestClose: function () {
          var self = this;
          Overlays.requestClose(this, this.currentForm(), function () { self.forceClose(); });
        },
        addKategori: function () {
          if (finish(this, Master.addKategori(this.db, this.kategoriForm), 'Kategori ditambahkan.')) {
            this.kategoriForm = { kode: '', nama: '' };
            this.forceClose();
          }
        },
        toggleKategori: function (item) {
          finish(this, Master.toggleKategori(this.db, item.id), 'Status kategori diperbarui.');
        },
        addSatuan: function () {
          if (finish(this, Master.addSatuan(this.db, this.satuanForm), 'Satuan ditambahkan.')) {
            this.satuanForm = { nama: '', singkatan: '' };
            this.forceClose();
          }
        },
        toggleSatuan: function (item) {
          finish(this, Master.toggleSatuan(this.db, item.id), 'Status satuan diperbarui.');
        },
        addGudang: function () {
          if (finish(this, Master.addGudang(this.db, this.gudangForm), 'Gudang ditambahkan.')) {
            this.gudangForm = { kode: '', nama: '', utama: false };
            this.forceClose();
          }
        },
        setUtama: function (item) {
          finish(this, Master.setGudangUtama(this.db, item.id), 'Gudang utama diperbarui.');
        },
        toggleGudang: function (item) {
          finish(this, Master.toggleGudang(this.db, item.id), 'Status gudang diperbarui.');
        }
      };
    });

    Alpine.data('purchaseRequestPage', function () {
      return {
        adding: false,
        filter: '',
        detailId: null,
        form: { tanggal: today(), keperluan: '', lines: [blankPRLine()] },
        get db() { return this.$store.app.db; },
        get items() {
          return this.db.barang.filter(function (barang) { return barang.aktif !== false; });
        },
        get list() {
          var filter = this.filter;
          return this.db.purchaseRequests.slice().sort(function (a, b) {
            return String(b.nomor).localeCompare(String(a.nomor));
          }).filter(function (pr) {
            return !filter || pr.status === filter;
          });
        },
        get detailLines() {
          return this.detailId ? Purchasing.prLines(this.db, this.detailId) : [];
        },
        openAdd: function () {
          this.adding = true;
          this.detailId = null;
          this.form = {
            tanggal: today(),
            keperluan: '',
            lines: [blankPRLine()]
          };
          Overlays.mark(this, this.form);
        },
        forceClose: function () {
          this.adding = false;
          this.__overlaySnapshot = null;
        },
        requestClose: function () {
          var self = this;
          Overlays.requestClose(this, this.form, function () { self.forceClose(); });
        },
        cancel: function () { this.requestClose(); },
        addLine: function () { this.form.lines.push(blankPRLine()); },
        removeLine: function (index) {
          if (this.form.lines.length > 1) this.form.lines.splice(index, 1);
        },
        save: function () {
          if (!requireAction(this, 'pr.create', 'Hanya Logistik yang dapat membuat PR.')) return;
          var result = Purchasing.createPR(this.db, this.form, this.$store.auth.user);
          if (finish(this, result, 'PR ' + (result.pr ? result.pr.nomor : '') + ' disimpan sebagai draft.')) {
            this.forceClose();
            this.form = { tanggal: today(), keperluan: '', lines: [blankPRLine()] };
          }
        },
        submit: function (pr) {
          if (!requireAction(this, 'pr.submit', 'Hanya Logistik yang dapat mengajukan PR.')) return;
          finish(this, Purchasing.submitPR(this.db, pr.id, this.$store.auth.user), 'PR ' + pr.nomor + ' diajukan.');
        },
        toggleDetail: function (pr) {
          this.detailId = this.detailId === pr.id ? null : pr.id;
        },
        linesOf: function (pr) { return Purchasing.prLines(this.db, pr.id); },
        barangName: function (id) {
          var barang = Master.barangById(this.db, id);
          return barang ? barang.nama : '-';
        },
        satuanName: function (id) {
          var barang = Master.barangById(this.db, id);
          if (!barang) return '-';
          var unit = Master.satuanById(this.db, barang.satuanId);
          return unit ? unit.singkatan : '-';
        },
        statusLabel: function (status) { return Purchasing.prStatusLabel(status); },
        statusClass: statusClass
      };
    });

    Alpine.data('purchaseOrderPage', function () {
      return {
        adding: false,
        filter: '',
        detailId: null,
        form: {
          tanggal: today(),
          supplierId: '',
          prId: '',
          terminBayar: 30,
          catatan: '',
          lines: [blankPOLine()]
        },
        get db() { return this.$store.app.db; },
        get suppliers() {
          return Master.suppliers(this.db).filter(function (item) { return item.aktif !== false; });
        },
        get approvedPRs() {
          return this.db.purchaseRequests.filter(function (pr) {
            return pr.status === 'disetujui' || pr.status === 'diproses';
          });
        },
        get items() {
          return this.db.barang.filter(function (barang) { return barang.aktif !== false; });
        },
        get list() {
          var filter = this.filter;
          return this.db.purchaseOrders.slice().sort(function (a, b) {
            return String(b.nomor).localeCompare(String(a.nomor));
          }).filter(function (po) {
            return !filter || po.status === filter;
          });
        },
        get totalForm() {
          return this.form.lines.reduce(function (sum, line) {
            return sum + Ledger.round(line.qty) * Ledger.round(line.harga);
          }, 0);
        },
        get detailLines() {
          return this.detailId ? Purchasing.poLines(this.db, this.detailId) : [];
        },
        init: function () {
          var self = this;
          function loadPending() {
            var app = self.$store.app;
            if (!app.pendingPRId) return;
            var prId = app.pendingPRId;
            app.pendingPRId = null;
            self.openAdd();
            self.form.prId = prId;
            self.loadPR();
          }
          if (this.$watch) this.$watch('$store.app.pendingPRId', loadPending);
          loadPending();
        },
        openAdd: function () {
          this.adding = true;
          this.detailId = null;
          this.form = {
            tanggal: today(),
            supplierId: (this.suppliers[0] || {}).id || '',
            prId: '',
            terminBayar: (this.suppliers[0] || {}).terminBayar || 30,
            catatan: '',
            lines: [blankPOLine()]
          };
          Overlays.mark(this, this.form);
        },
        forceClose: function () {
          this.adding = false;
          this.__overlaySnapshot = null;
        },
        requestClose: function () {
          var self = this;
          Overlays.requestClose(this, this.form, function () { self.forceClose(); });
        },
        cancel: function () { this.requestClose(); },
        addLine: function () { this.form.lines.push(blankPOLine()); },
        removeLine: function (index) {
          if (this.form.lines.length > 1) this.form.lines.splice(index, 1);
        },
        supplier: function (id) { return Master.supplierById(this.db, id); },
        supplierName: function (id) {
          var supplier = Master.supplierById(this.db, id);
          return supplier ? supplier.nama : '-';
        },
        onSupplierChange: function () {
          var supplier = Master.supplierById(this.db, this.form.supplierId);
          if (supplier) this.form.terminBayar = supplier.terminBayar || 0;
          this.refreshPrices();
        },
        refreshPrices: function () {
          var self = this;
          this.form.lines.forEach(function (line) {
            if (!line.barangId) return;
            var barang = Master.barangById(self.db, line.barangId);
            var harga = Master.hargaFor(self.db, self.form.supplierId, line.barangId);
            line.harga = harga ? harga.harga : (barang ? barang.hargaBeliStandar : 0);
          });
        },
        loadPR: function () {
          var self = this;
          if (!this.form.prId) {
            this.form.lines = [blankPOLine()];
            return;
          }
          var lines = Purchasing.prLines(this.db, this.form.prId).filter(function (line) {
            return (Number(line.qtySudahDipesan) || 0) < (Number(line.qty) || 0);
          });
          this.form.lines = lines.map(function (line) {
            var remaining = (Number(line.qty) || 0) - (Number(line.qtySudahDipesan) || 0);
            var harga = Master.hargaFor(self.db, self.form.supplierId, line.barangId);
            var barang = Master.barangById(self.db, line.barangId);
            return {
              barangId: line.barangId,
              qty: remaining,
              harga: harga ? harga.harga : (barang ? barang.hargaBeliStandar : 0)
            };
          });
          if (!this.form.lines.length) this.form.lines = [blankPOLine()];
        },
        save: function () {
          if (!requireAction(this, 'po.create', 'Hanya Logistik yang dapat membuat PO.')) return;
          var result = Purchasing.createPO(this.db, this.form, this.$store.auth.user);
          if (finish(this, result, 'PO ' + (result.po ? result.po.nomor : '') + ' disimpan.')) {
            this.forceClose();
            this.form = {
              tanggal: today(), supplierId: '', prId: '', terminBayar: 30,
              catatan: '', lines: [blankPOLine()]
            };
          }
        },
        send: function (po) {
          if (!requireAction(this, 'po.send', 'Hanya Logistik yang dapat mengirim PO.')) return;
          finish(this, Purchasing.sendPO(this.db, po.id, this.$store.auth.user), 'PO ' + po.nomor + ' ditandai terkirim.');
        },
        cancel: function (po) {
          if (!requireAction(this, 'po.cancel', 'Hanya Logistik yang dapat membatalkan PO.')) return;
          var self = this;
          this.$store.app.ask({
            title: 'Batalkan PO?',
            message: 'PO ' + po.nomor + ' akan dibatalkan.',
            confirmLabel: 'Batalkan PO',
            onConfirm: function () {
              finish(self, Purchasing.cancelPO(self.db, po.id, self.$store.auth.user, 'Dibatalkan oleh Logistik'), 'PO dibatalkan.');
            }
          });
        },
        close: function (po) {
          if (!requireAction(this, 'po.close', 'Hanya Logistik yang dapat menutup PO.')) return;
          var self = this;
          this.$store.app.ask({
            title: 'Tutup PO?',
            message: 'Sisa PO ' + po.nomor + ' tidak akan dikirim supplier.',
            confirmLabel: 'Tutup PO',
            onConfirm: function () {
              finish(self, Purchasing.closePO(self.db, po.id, self.$store.auth.user), 'PO ditutup.');
            }
          });
        },
        toggleDetail: function (po) {
          this.detailId = this.detailId === po.id ? null : po.id;
        },
        linesOf: function (po) { return Purchasing.poLines(this.db, po.id); },
        receiptsOf: function (po) { return Receiving.receiptsForPO(this.db, po.id); },
        receiptNumbers: function (po) {
          var rows = Receiving.receiptsForPO(this.db, po.id);
          return rows.length ? rows.map(function (receipt) { return receipt.nomor; }).join(', ') : '-';
        },
        barangName: function (id) {
          var barang = Master.barangById(this.db, id);
          return barang ? barang.nama : '-';
        },
        statusLabel: function (status) { return Purchasing.poStatusLabel(status); },
        statusClass: statusClass
      };
    });

    Alpine.data('receivingPage', function () {
      return {
        adding: false,
        detailId: null,
        form: {
          tanggal: today(),
          poId: '',
          gudangId: '',
          suratJalan: '',
          lines: []
        },
        get db() { return this.$store.app.db; },
        get openPOs() {
          var db = this.db;
          return Purchasing.openPOs(db).filter(function (po) {
            return Receiving.remainingPO(db, po) > 0;
          });
        },
        get gudangs() {
          return this.db.gudangs.filter(function (item) { return item.aktif !== false; });
        },
        get receipts() {
          return this.db.receipts.filter(function (receipt) {
            return receipt.jenis !== 'pengganti';
          }).slice().sort(function (a, b) {
            return String(b.nomor).localeCompare(String(a.nomor));
          });
        },
        get selectedPO() {
          return Purchasing.poById(this.db, this.form.poId);
        },
        get preview() {
          if (!this.form.poId) return { ok: false, errors: ['Pilih PO terlebih dahulu.'], total: 0, journalLines: [] };
          return Receiving.buildJournal(this.db, this.form);
        },
        get detailLines() {
          return this.detailId ? Receiving.receiptLines(this.db, this.detailId) : [];
        },
        openAdd: function () {
          this.adding = true;
          this.detailId = null;
          this.form = {
            tanggal: today(),
            poId: (this.openPOs[0] || {}).id || '',
            gudangId: (this.gudangs[0] || {}).id || '',
            suratJalan: '',
            lines: []
          };
          this.loadPO();
          Overlays.mark(this, this.form);
        },
        forceClose: function () {
          this.adding = false;
          this.__overlaySnapshot = null;
        },
        requestClose: function () {
          var self = this;
          Overlays.requestClose(this, this.form, function () { self.forceClose(); });
        },
        cancel: function () { this.requestClose(); },
        loadPO: function () {
          var self = this;
          var po = Purchasing.poById(this.db, this.form.poId);
          if (!po) {
            this.form.lines = [];
            return;
          }
          this.form.lines = Purchasing.poLines(this.db, po.id).map(function (line) {
            var remaining = (Number(line.qty) || 0) - (Number(line.qtyDiterima) || 0);
            var barang = Master.barangById(self.db, line.barangId);
            return {
              poLineId: line.id,
              barangId: line.barangId,
              barangNama: barang ? barang.nama : '-',
              remaining: remaining,
              qty: remaining,
              harga: line.harga
            };
          }).filter(function (line) { return line.remaining > 0; });
        },
        saveDraft: function () {
          if (!requireAction(this, 'receipt.create', 'Hanya Logistik yang dapat membuat penerimaan.')) return;
          var result = Receiving.createReceipt(this.db, this.form, this.$store.auth.user);
          if (finish(this, result, 'Penerimaan ' + (result.receipt ? result.receipt.nomor : '') + ' disimpan sebagai draft.')) {
            this.forceClose();
          }
        },
        saveAndPost: function () {
          if (!requireAction(this, 'receipt.post', 'Hanya Logistik yang dapat memposting penerimaan.')) return;
          var result = Receiving.createReceipt(this.db, this.form, this.$store.auth.user);
          if (!finish(this, result, 'Penerimaan ' + (result.receipt ? result.receipt.nomor : '') + ' dibuat.')) return;
          var post = Receiving.postReceipt(this.db, result.receipt.id, this.$store.auth.user);
          if (finish(this, post, 'Penerimaan diposting. Stok dan utang diperbarui.')) {
            this.forceClose();
          }
        },
        post: function (receipt) {
          if (!requireAction(this, 'receipt.post', 'Hanya Logistik yang dapat memposting penerimaan.')) return;
          var self = this;
          this.$store.app.ask({
            title: 'Posting penerimaan?',
            message: 'Penerimaan ' + receipt.nomor + ' akan menambah stok dan membuat tagihan utang.',
            confirmLabel: 'Posting',
            onConfirm: function () {
              finish(self, Receiving.postReceipt(self.db, receipt.id, self.$store.auth.user), 'Penerimaan diposting.');
            }
          });
        },
        toggleDetail: function (receipt) {
          this.detailId = this.detailId === receipt.id ? null : receipt.id;
        },
        linesOf: function (receipt) { return Receiving.receiptLines(this.db, receipt.id); },
        poNumber: function (poId) {
          var po = Purchasing.poById(this.db, poId);
          return po ? po.nomor : '-';
        },
        supplierName: function (id) {
          var supplier = Master.supplierById(this.db, id);
          return supplier ? supplier.nama : '-';
        },
        barangName: function (id) {
          var barang = Master.barangById(this.db, id);
          return barang ? barang.nama : '-';
        },
        statusLabel: function (status) { return Receiving.receiptStatusLabel(status); },
        statusClass: statusClass,
        accName: function (id) { return this.$store.app.accName(id); }
      };
    });

    Alpine.data('returPage', function () {
      return {
        adding: false,
        detailId: null,
        filter: '',
        form: {
          tanggal: today(),
          receiptId: '',
          jenis: 'potong_invoice',
          alasan: '',
          lines: []
        },
        replacement: {
          returnId: '',
          tanggal: today(),
          gudangId: '',
          suratJalan: '',
          lines: []
        },
        get db() { return this.$store.app.db; },
        init: function () {
          var self = this;
          function loadPending() {
            var app = self.$store.app;
            if (!app.pendingReturnId) return;
            var receiptId = app.pendingReturnId;
            app.pendingReturnId = null;
            self.openAdd(receiptId);
          }
          if (this.$watch) this.$watch('$store.app.pendingReturnId', loadPending);
          loadPending();
        },
        get receipts() {
          var db = this.db;
          return db.receipts.filter(function (receipt) {
            if (receipt.jenis === 'pengganti' || receipt.status !== 'posted') return false;
            return Returns.returnableLines(db, receipt.id).some(function (row) { return row.max > 0; });
          }).slice().sort(function (a, b) {
            return String(b.nomor).localeCompare(String(a.nomor));
          });
        },
        get returns() {
          var filter = this.filter;
          return this.db.purchaseReturns.slice().sort(function (a, b) {
            return String(b.nomor).localeCompare(String(a.nomor));
          }).filter(function (retur) {
            return !filter || retur.status === filter;
          });
        },
        get gudangs() {
          return this.db.gudangs.filter(function (item) { return item.aktif !== false; });
        },
        get selectedReceipt() {
          return Receiving.receiptById(this.db, this.form.receiptId);
        },
        get preview() {
          return Returns.buildPreview(this.db, this.form);
        },
        get detail() {
          return this.detailId ? Returns.returnById(this.db, this.detailId) : null;
        },
        get detailLines() {
          return this.detailId ? Returns.returnLines(this.db, this.detailId) : [];
        },
        get replacementRows() {
          return this.replacement.returnId
            ? Returns.replacementLines(this.db, this.replacement.returnId)
            : [];
        },
        openAdd: function (receiptId) {
          this.adding = true;
          this.detailId = null;
          var selected = receiptId || (this.receipts[0] || {}).id || '';
          this.form = {
            tanggal: today(),
            receiptId: selected,
            jenis: 'potong_invoice',
            alasan: '',
            lines: []
          };
          this.loadReceipt();
          Overlays.mark(this, this.form);
        },
        forceClose: function () {
          this.adding = false;
          this.__overlaySnapshot = null;
        },
        requestClose: function () {
          var self = this;
          Overlays.requestClose(this, this.form, function () { self.forceClose(); });
        },
        cancel: function () { this.requestClose(); },
        loadReceipt: function () {
          var rows = Returns.returnableLines(this.db, this.form.receiptId);
          this.form.lines = rows.map(function (row) {
            return {
              receiptLineId: row.line.id,
              barangId: row.line.barangId,
              barangNama: row.barang ? row.barang.nama : '-',
              received: row.received,
              returned: row.returned,
              stock: row.stock,
              max: row.max,
              harga: row.line.harga,
              qty: 0
            };
          });
        },
        saveDraft: function () {
          if (!requireAction(this, 'retur.create', 'Hanya Logistik yang dapat membuat retur.')) return;
          var result = Returns.createReturn(this.db, this.form, this.$store.auth.user);
          if (finish(this, result, 'Retur ' + (result.retur ? result.retur.nomor : '') + ' disimpan sebagai draft.')) {
            this.forceClose();
          }
        },
        confirm: function (retur) {
          if (!requireAction(this, 'retur.confirm', 'Hanya Logistik yang dapat mengonfirmasi retur.')) return;
          var self = this;
          this.$store.app.ask({
            title: 'Konfirmasi retur?',
            message: 'Retur ' + retur.nomor + ' akan mengurangi stok dan memposting jurnal.',
            confirmLabel: 'Konfirmasi retur',
            onConfirm: function () {
              finish(self, Returns.confirmReturn(self.db, retur.id, self.$store.auth.user), 'Retur dikonfirmasi.');
            }
          });
        },
        openReplacement: function (retur) {
          this.detailId = retur.id;
          this.replacement = {
            returnId: retur.id,
            tanggal: today(),
            gudangId: (this.gudangs[0] || {}).id || '',
            suratJalan: '',
            lines: Returns.replacementLines(this.db, retur.id).map(function (line) {
              return {
                returnLineId: line.id,
                barangId: line.barangId,
                barangNama: (Master.barangById(this.db, line.barangId) || {}).nama || '-',
                remaining: (Number(line.qty) || 0) - (Number(line.qtyDiganti) || 0),
                harga: line.harga,
                qty: (Number(line.qty) || 0) - (Number(line.qtyDiganti) || 0)
              };
            }.bind(this))
          };
          Overlays.mark(this, this.replacement);
        },
        forceCloseReplacement: function () {
          this.replacement = { returnId: '', tanggal: today(), gudangId: '', suratJalan: '', lines: [] };
          this.__overlaySnapshot = null;
        },
        requestCloseReplacement: function () {
          var self = this;
          Overlays.requestClose(this, this.replacement, function () { self.forceCloseReplacement(); });
        },
        postReplacement: function () {
          if (!requireAction(this, 'retur.replacement', 'Hanya Logistik yang dapat menerima barang pengganti.')) return;
          var result = Returns.createReplacementReceipt(this.db, this.replacement, this.$store.auth.user);
          if (finish(this, result, 'Penerimaan pengganti ' + (result.receipt ? result.receipt.nomor : '') + ' diposting.')) {
            this.forceCloseReplacement();
          }
        },
        cancelReplacement: function () {
          this.requestCloseReplacement();
        },
        toggleDetail: function (retur) {
          this.detailId = this.detailId === retur.id ? null : retur.id;
        },
        receiptNumber: function (id) {
          var receipt = Receiving.receiptById(this.db, id);
          return receipt ? receipt.nomor : '-';
        },
        poNumber: function (id) {
          var po = Purchasing.poById(this.db, id);
          return po ? po.nomor : '-';
        },
        supplierName: function (id) {
          var supplier = Master.supplierById(this.db, id);
          return supplier ? supplier.nama : '-';
        },
        barangName: function (id) {
          var barang = Master.barangById(this.db, id);
          return barang ? barang.nama : '-';
        },
        statusLabel: function (status) { return Returns.returnStatusLabel(status); },
        jenisLabel: function (jenis) { return Returns.jenisLabel(jenis); },
        replacementStatusLabel: function (status) { return Returns.replacementStatusLabel(status); },
        statusClass: statusClass,
        accName: function (id) { return this.$store.app.accName(id); }
      };
    });

    Alpine.data('stockPage', function () {
      return {
        get db() { return this.$store.app.db; },
        get rows() { return Inventory.ringkasan(this.db, true); },
        get totalNilai() { return Inventory.totalNilai(this.db); },
        get reconcile() { return Reconcile.ringkasan(this.db); },
        kategoriName: function (row) {
          return row.kategori ? row.kategori.nama : '-';
        },
        satuanName: function (row) {
          return row.satuan ? row.satuan.singkatan : '-';
        }
      };
    });
  }

  global.PurchasingPages = { register: register };
})(typeof window !== 'undefined' ? window : globalThis);
