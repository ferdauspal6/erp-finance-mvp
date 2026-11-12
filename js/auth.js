(function (global) {
  'use strict';

  var KEY = 'akuntansi_mvp_role_v1';

  function readRole() {
    try {
      if (global.location && global.URLSearchParams) {
        var queryRole = new global.URLSearchParams(global.location.search).get('role');
        if (queryRole && global.Roles && global.Roles.ROLES[queryRole]) return queryRole;
      }
    } catch (e) {
      // ignore malformed query strings
    }
    try {
      var value = global.localStorage ? global.localStorage.getItem(KEY) : null;
      if (value && global.Roles && global.Roles.ROLES[value]) return value;
    } catch (e) {
      // localStorage can be unavailable in private or file:// contexts
    }
    return 'finance';
  }

  function writeRole(role) {
    try {
      if (global.localStorage) global.localStorage.setItem(KEY, role);
    } catch (e) {
      // ignore storage quota or sandbox errors
    }
  }

  function createStore() {
    var role = readRole();
    var user = global.Roles.userFor(role);
    return {
      role: role,
      user: user,
      roles: global.Roles.roleList(),
      setRole: function (next) {
        var value = next && global.Roles.ROLES[next] ? next : 'finance';
        this.role = value;
        this.user = global.Roles.userFor(value);
        writeRole(value);
        return value;
      },
      can: function (action) {
        return global.Roles.can(this.role, action);
      },
      canView: function (page) {
        return global.Roles.canView(this.role, page);
      }
    };
  }

  global.Auth = {
    KEY: KEY,
    readRole: readRole,
    writeRole: writeRole,
    createStore: createStore
  };
})(typeof window !== 'undefined' ? window : globalThis);
