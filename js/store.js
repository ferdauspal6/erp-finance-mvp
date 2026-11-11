(function (global) {
  'use strict';

  var KEY = 'akuntansi_mvp_v1';
  var VERSION = 1;

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
      meta: {
        createdAt: stamp,
        updatedAt: stamp,
        scenario: false
      }
    };
  }

  var COLLECTIONS = ['accounts', 'parties', 'journals', 'journalLines', 'invoices', 'payments'];

  function normalize(data) {
    var base = emptyState();
    if (!data || typeof data !== 'object') return base;
    var out = {
      version: VERSION,
      accounts: data.accounts,
      parties: data.parties,
      journals: data.journals,
      journalLines: data.journalLines,
      invoices: data.invoices,
      payments: data.payments,
      meta: {}
    };
    COLLECTIONS.forEach(function (key) {
      out[key] = Array.isArray(out[key]) ? out[key] : [];
    });
    var meta = data.meta && typeof data.meta === 'object' ? data.meta : {};
    out.meta = {
      createdAt: meta.createdAt || base.meta.createdAt,
      updatedAt: meta.updatedAt || base.meta.updatedAt,
      scenario: !!meta.scenario
    };
    return out;
  }

  var Store = {
    KEY: KEY,
    VERSION: VERSION,

    emptyState: emptyState,
    normalize: normalize,

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
