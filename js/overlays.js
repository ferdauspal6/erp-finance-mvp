(function (global) {
  'use strict';

  var lockCount = 0;

  function lockScroll() {
    if (typeof document === 'undefined') return;
    if (lockCount === 0) {
      document.body.dataset.overlayOverflow = document.body.style.overflow || '';
      document.body.style.overflow = 'hidden';
    }
    lockCount++;
  }

  function unlockScroll() {
    if (typeof document === 'undefined') return;
    lockCount = Math.max(0, lockCount - 1);
    if (lockCount === 0) {
      document.body.style.overflow = document.body.dataset.overlayOverflow || '';
      delete document.body.dataset.overlayOverflow;
    }
  }

  function snapshot(value) {
    try {
      return JSON.stringify(value);
    } catch (e) {
      return '';
    }
  }

  function isDirty(mark, value) {
    if (typeof mark !== 'string') return false;
    return mark !== snapshot(value);
  }

  function focusable(panel) {
    if (!panel) return [];
    var nodes = panel.querySelectorAll('input:not([type="hidden"]), select, textarea, button:not([disabled]), [href], [tabindex]:not([tabindex="-1"])');
    return Array.prototype.filter.call(nodes, function (node) {
      return node.offsetParent !== null;
    });
  }

  function sync(open, panel) {
    if (!panel) return;
    var state = panel.__overlayState;
    if (open && !state) {
      state = {
        lastFocus: document.activeElement,
        keydown: null
      };
      panel.__overlayState = state;
      panel.setAttribute('role', 'dialog');
      panel.setAttribute('aria-modal', 'true');
      lockScroll();
      state.keydown = function (event) {
        if (event.key !== 'Tab') return;
        var nodes = focusable(panel);
        if (!nodes.length) return;
        var first = nodes[0];
        var last = nodes[nodes.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      };
      panel.addEventListener('keydown', state.keydown);
      setTimeout(function () {
        var nodes = focusable(panel);
        var target = panel.querySelector('[autofocus], input:not([type="hidden"]), select, textarea') || nodes[0];
        if (target) target.focus();
      }, 0);
    } else if (!open && state) {
      unlockScroll();
      if (state.keydown) panel.removeEventListener('keydown', state.keydown);
      if (state.lastFocus && state.lastFocus.focus && document.contains(state.lastFocus)) {
        state.lastFocus.focus();
      }
      panel.__overlayState = null;
    }
  }

  function mark(component, form) {
    component.__overlaySnapshot = snapshot(form);
  }

  function requestClose(component, form, onClose) {
    var app = component.$store.app;
    if (app.dialog.open) return;
    if (isDirty(component.__overlaySnapshot, form)) {
      app.ask({
        title: 'Buang perubahan?',
        message: 'Ada isian yang belum disimpan. Menutup form akan membuang perubahan tersebut.',
        confirmLabel: 'Buang perubahan',
        onConfirm: function () {
          component.__overlaySnapshot = null;
          onClose();
        }
      });
      return;
    }
    component.__overlaySnapshot = null;
    onClose();
  }

  global.Overlays = {
    lockScroll: lockScroll,
    unlockScroll: unlockScroll,
    snapshot: snapshot,
    isDirty: isDirty,
    sync: sync,
    mark: mark,
    requestClose: requestClose
  };
})(typeof window !== 'undefined' ? window : globalThis);
