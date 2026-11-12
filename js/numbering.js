(function (global) {
  'use strict';

  function yearOf(tanggal) {
    var text = String(tanggal || '');
    if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return text.slice(0, 4);
    return String(new Date().getFullYear());
  }

  function next(state, jenis, tanggal) {
    if (!state.settings) state.settings = global.Store.defaultSettings();
    if (!state.settings.counters) state.settings.counters = {};
    if (!state.settings.awalanNomor) state.settings.awalanNomor = {};
    var year = yearOf(tanggal);
    var counters = state.settings.counters[jenis] || (state.settings.counters[jenis] = {});
    var value = Number(counters[year] || 0) + 1;
    counters[year] = value;
    var prefix = state.settings.awalanNomor[jenis] || jenis;
    return prefix + '-' + year + '-' + String(value).padStart(4, '0');
  }

  global.Numbering = { next: next, yearOf: yearOf };
})(typeof window !== 'undefined' ? window : globalThis);
