(function (global) {
  'use strict';

  var ROLES = {
    finance: {
      id: 'finance',
      label: 'Finance',
      badge: 'Finance',
      user: { id: 'user_finance', nama: 'Finance', role: 'finance' }
    },
    logistik: {
      id: 'logistik',
      label: 'Logistik',
      badge: 'Logistik',
      user: { id: 'user_logistik', nama: 'Logistik', role: 'logistik' }
    }
  };

  var MENU_ACCESS = {
    dashboard: ['finance', 'logistik'],
    informasi: ['finance', 'logistik'],
    persetujuan: ['finance'],
    coa: ['finance'],
    jurnal: ['finance'],
    cepat: ['finance'],
    piutang: ['finance'],
    utang: ['finance'],
    bukuBesar: ['finance'],
    laporan: ['finance'],
    rekening: ['finance'],
    masterBarang: ['logistik'],
    masterSupplier: ['logistik'],
    masterPendukung: ['logistik'],
    purchaseRequest: ['logistik'],
    purchaseOrder: ['logistik'],
    penerimaan: ['logistik'],
    returPembelian: ['logistik'],
    stok: ['logistik']
  };

  var ACTIONS = {
    'pr.create': ['logistik'],
    'pr.submit': ['logistik'],
    'pr.approve': ['finance'],
    'pr.reject': ['finance'],
    'po.create': ['logistik'],
    'po.approve': ['finance'],
    'po.reject': ['finance'],
    'po.send': ['logistik'],
    'po.cancel': ['logistik'],
    'po.close': ['logistik'],
    'receipt.create': ['logistik'],
    'receipt.post': ['logistik'],
    'retur.create': ['logistik'],
    'retur.confirm': ['logistik'],
    'retur.replacement': ['logistik'],
    'ap.pay': ['finance'],
    'journal.manual': ['finance'],
    'settings.edit': ['finance']
  };

  function list(value) {
    return Object.prototype.toString.call(value) === '[object Array]' ? value : [];
  }

  function hasRole(role, allowed) {
    return list(allowed).indexOf(role) >= 0;
  }

  function can(role, action) {
    return hasRole(role, ACTIONS[action]);
  }

  function canView(role, page) {
    if (!page) return false;
    if (page === 'denied') return true;
    return hasRole(role, MENU_ACCESS[page]);
  }

  function roleList() {
    return [ROLES.finance, ROLES.logistik];
  }

  function userFor(role) {
    var item = ROLES[role] || ROLES.finance;
    return item.user;
  }

  function menuFor(role, menu) {
    return list(menu).filter(function (item) {
      return canView(role, item.id);
    });
  }

  global.Roles = {
    ROLES: ROLES,
    MENU_ACCESS: MENU_ACCESS,
    ACTIONS: ACTIONS,
    can: can,
    canView: canView,
    menuFor: menuFor,
    roleList: roleList,
    userFor: userFor
  };
})(typeof window !== 'undefined' ? window : globalThis);
