(function (global) {
  'use strict';

  var KEY = 'akuntansi_mvp_v1';
  var VERSION = 2;

  function defaultSettings() {
    return {
      ambangPersetujuanPO: 5000000,
      toleransiPenerimaan: 0,
      awalanNomor: { PR: 'PR', PO: 'PO', GR: 'GR', RTN: 'RTN' },
      counters: {}
    };
  }

  function nowISO() {
    return new Date().toISOString();
  }

  function memoryStorage() {
    var data = {};
    return {
      getItem: function (k) { return Object.prototype.hasOwnProperty.call(data, k) ? data[k] : null; },
      setItem: function (k, v) { data[k] = String(v); },
      removeItem: function (k) { delete data[k]; }
    };
  }

  var memory = null;

  function storage() {
    try {
      if (global.localStorage) {
        var probe = '__akuntansi_probe__';
        global.localStorage.setItem(probe, '1');
        global.localStorage.removeItem(probe);
        return global.localStorage;
      }
    } catch (e) {
      // localStorage can throw in private mode or sandboxed file:// contexts
    }
    if (!memory) memory = memoryStorage();
    return memory;
  }

  function emptyState() {
    var stamp = nowISO();
    return {
      version: VERSION,
      accounts: [],
      parties: [],
      journals: [],
      journalLines: [],
      invoices: [],
      payments: [],
      barang: [],
      kategoris: [],
      satuans: [],
      gudangs: [],
      hargaSupplier: [],
      purchaseRequests: [],
      prLines: [],
      purchaseOrders: [],
      poLines: [],
      receipts: [],
      receiptLines: [],
      purchaseReturns: [],
      returnLines: [],
      stockMovements: [],
      stockAdjustments: [],
      stockAdjustmentLines: [],
      activityLog: [],
      users: [],
      settings: defaultSettings(),
      meta: {
        createdAt: stamp,
        updatedAt: stamp,
        scenario: false,
        scenarioType: null
      }
    };
  }

  var COLLECTIONS = [
    'accounts', 'parties', 'journals', 'journalLines', 'invoices', 'payments',
    'barang', 'kategoris', 'satuans', 'gudangs', 'hargaSupplier',
    'purchaseRequests', 'prLines', 'purchaseOrders', 'poLines', 'receipts', 'receiptLines',
    'purchaseReturns', 'returnLines', 'stockMovements', 'stockAdjustments',
    'stockAdjustmentLines', 'activityLog', 'users'
  ];

  function mergeSettings(base, value) {
    var source = value && typeof value === 'object' ? value : {};
    var awalan = source.awalanNomor && typeof source.awalanNomor === 'object' ? source.awalanNomor : {};
    var counters = source.counters && typeof source.counters === 'object' ? source.counters : {};
    return {
      ambangPersetujuanPO: Number(source.ambangPersetujuanPO) >= 0 ? Number(source.ambangPersetujuanPO) : base.ambangPersetujuanPO,
      toleransiPenerimaan: Number(source.toleransiPenerimaan) >= 0 ? Number(source.toleransiPenerimaan) : base.toleransiPenerimaan,
      awalanNomor: {
        PR: awalan.PR || base.awalanNomor.PR,
        PO: awalan.PO || base.awalanNomor.PO,
        GR: awalan.GR || base.awalanNomor.GR,
        RTN: awalan.RTN || base.awalanNomor.RTN
      },
      counters: counters
    };
  }

  function cleanLegacyNames(data) {
    function genericName(userId) {
      if (userId === 'user_sari') return 'Finance';
      if (userId === 'user_dewi') return 'Logistik';
      return null;
    }
    function fixByUser(object, idKey, nameKey) {
      if (!object) return;
      var name = genericName(object[idKey]);
      if (name) object[nameKey] = name;
    }
    function fixHistory(list) {
      if (!Array.isArray(list)) return;
      list.forEach(function (item) {
        var name = genericName(item.userId);
        if (name) item.nama = name;
      });
    }
    (data.users || []).forEach(function (user) { fixByUser(user, 'id', 'nama'); });
    (data.activityLog || []).forEach(function (row) { fixByUser(row, 'userId', 'nama'); });
    (data.purchaseRequests || []).forEach(function (doc) {
      fixByUser(doc, 'pemohonId', 'pemohonNama');
      fixByUser(doc, 'dibuatOleh', 'dibuatNama');
      fixByUser(doc, 'disetujuiOleh', 'disetujuiNama');
      fixHistory(doc.riwayat);
    });
    (data.purchaseOrders || []).forEach(function (doc) {
      fixByUser(doc, 'dibuatOleh', 'dibuatNama');
      fixByUser(doc, 'disetujuiOleh', 'disetujuiNama');
      fixHistory(doc.riwayat);
    });
    (data.receipts || []).forEach(function (doc) {
      fixByUser(doc, 'dibuatOleh', 'dibuatNama');
      fixByUser(doc, 'postedOleh', 'postedNama');
      fixHistory(doc.riwayat);
    });
    (data.purchaseReturns || []).forEach(function (doc) {
      fixByUser(doc, 'dibuatOleh', 'dibuatNama');
      fixByUser(doc, 'dikonfirmasiOleh', 'dikonfirmasiNama');
      fixHistory(doc.riwayat);
    });
  }

  function normalize(data) {
    var base = emptyState();
    if (!data || typeof data !== 'object') return base;
    var out = { version: VERSION, meta: {} };
    COLLECTIONS.forEach(function (key) {
      out[key] = Array.isArray(data[key]) ? data[key] : [];
    });
    out.settings = mergeSettings(base.settings, data.settings);
    cleanLegacyNames(out);
    out.accounts.forEach(function (account) {
      if (account.kode === '1-1300' || account.kode === '2-1100') account.dikunci = true;
      else if (typeof account.dikunci === 'undefined') account.dikunci = false;
    });
    out.parties.forEach(function (party, index) {
      if (party.jenis !== 'pemasok') return;
      if (!party.kode) party.kode = 'SUP-' + String(index + 1).padStart(3, '0');
      if (typeof party.terminBayar === 'undefined') party.terminBayar = 30;
      if (typeof party.aktif === 'undefined') party.aktif = true;
    });
    out.invoices.forEach(function (invoice) {
      if (!invoice.sumber) invoice.sumber = 'manual';
      if (typeof invoice.refId === 'undefined') invoice.refId = null;
    });
    out.payments.forEach(function (payment) {
      if (!payment.jenis) payment.jenis = 'bayar';
    });
    out.receipts.forEach(function (receipt) {
      if (!receipt.jenis) receipt.jenis = 'normal';
      if (typeof receipt.returnId === 'undefined') receipt.returnId = null;
    });
    out.receiptLines.forEach(function (line) {
      if (typeof line.qtyDiretur === 'undefined') line.qtyDiretur = 0;
    });
    out.purchaseReturns.forEach(function (retur) {
      if (!retur.status) retur.status = 'draft';
      if (!retur.jenis) retur.jenis = 'potong_invoice';
      if (!retur.riwayat) retur.riwayat = [];
      if (typeof retur.potongAP === 'undefined') retur.potongAP = 0;
      if (typeof retur.piutangSupplier === 'undefined') retur.piutangSupplier = 0;
      if (typeof retur.replacementStatus === 'undefined') retur.replacementStatus = null;
    });
    out.returnLines.forEach(function (line) {
      if (typeof line.qtyDiganti === 'undefined') line.qtyDiganti = 0;
    });
    var meta = data.meta && typeof data.meta === 'object' ? data.meta : {};
    out.meta = {
      createdAt: meta.createdAt || base.meta.createdAt,
      updatedAt: meta.updatedAt || base.meta.updatedAt,
      scenario: !!meta.scenario,
      scenarioType: meta.scenarioType || (meta.scenario ? 'legacy' : null)
    };
    return out;
  }

  var Store = {
    KEY: KEY,
    VERSION: VERSION,

    emptyState: emptyState,
    normalize: normalize,
    defaultSettings: defaultSettings,

    load: function () {
      try {
        var raw = storage().getItem(KEY);
        if (!raw) return null;
        var data = JSON.parse(raw);
        if (!data || typeof data !== 'object') return null;
        return normalize(data);
      } catch (e) {
        return null;
      }
    },

    save: function (state) {
      var next = normalize(state);
      next.meta.updatedAt = nowISO();
      state.meta = next.meta;
      try {
        storage().setItem(KEY, JSON.stringify(next));
      } catch (e) {
        // Quota exceeded: keep working in memory for this session.
      }
      return state;
    },

    clear: function () {
      try {
        storage().removeItem(KEY);
      } catch (e) {
        // ignore
      }
    },

    exportJSON: function (state) {
      return JSON.stringify(normalize(state), null, 2);
    },

    importJSON: function (text) {
      var data;
      try {
        data = JSON.parse(text);
      } catch (e) {
        throw new Error('File bukan JSON yang valid.');
      }
      if (!data || typeof data !== 'object' || !Array.isArray(data.accounts) || !Array.isArray(data.journals)) {
        throw new Error('Struktur data tidak dikenali. Pastikan file diekspor dari aplikasi ini.');
      }
      var next = normalize(data);
      Store.save(next);
      return next;
    },

    isEmpty: function (state) {
      return !state || !Array.isArray(state.accounts) || state.accounts.length === 0;
    }
  };

  global.Store = Store;
})(typeof window !== 'undefined' ? window : globalThis);
