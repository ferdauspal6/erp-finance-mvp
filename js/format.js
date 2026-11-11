(function (global) {
  'use strict';

  var BULAN = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
  var BULAN_PANJANG = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];

  function pad2(n) {
    return n < 10 ? '0' + n : String(n);
  }

  function toNumber(value) {
    if (typeof value === 'number') return isFinite(value) ? value : 0;
    if (value === null || value === undefined) return 0;
    var cleaned = String(value).replace(/[^0-9.-]/g, '');
    var n = parseFloat(cleaned);
    return isFinite(n) ? n : 0;
  }

  function group(n) {
    var s = String(Math.abs(Math.round(toNumber(n))));
    return s.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  }

  function num(n) {
    var value = Math.round(toNumber(n));
    return value < 0 ? '(' + group(value) + ')' : group(value);
  }

  function rupiah(n) {
    var value = Math.round(toNumber(n));
    return value < 0 ? '(Rp ' + group(value) + ')' : 'Rp ' + group(value);
  }

  function parseISO(iso) {
    if (!iso || typeof iso !== 'string') return null;
    var parts = iso.split('-');
    if (parts.length !== 3) return null;
    var y = Number(parts[0]);
    var m = Number(parts[1]);
    var d = Number(parts[2]);
    if (!y || !m || !d) return null;
    return new Date(y, m - 1, d);
  }

  function iso(date) {
    return date.getFullYear() + '-' + pad2(date.getMonth() + 1) + '-' + pad2(date.getDate());
  }

  function todayISO() {
    return iso(new Date());
  }

  function isValidDateISO(value) {
    if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
    var d = parseISO(value);
    return !!d && iso(d) === value;
  }

  function tanggal(isoValue) {
    var d = parseISO(isoValue);
    if (!d) return '—';
    return d.getDate() + ' ' + BULAN[d.getMonth()] + ' ' + d.getFullYear();
  }

  function tanggalPanjang(isoValue) {
    var d = parseISO(isoValue);
    if (!d) return '—';
    return d.getDate() + ' ' + BULAN_PANJANG[d.getMonth()] + ' ' + d.getFullYear();
  }

  function namaBulan(isoValue) {
    var d = parseISO(isoValue);
    if (!d) return '—';
    return BULAN_PANJANG[d.getMonth()] + ' ' + d.getFullYear();
  }

  function firstOfMonthISO(isoValue) {
    var base = isoValue && isValidDateISO(isoValue) ? isoValue : todayISO();
    return base.slice(0, 8) + '01';
  }

  function firstOfYearISO(isoValue) {
    var base = isoValue && isValidDateISO(isoValue) ? isoValue : todayISO();
    return base.slice(0, 4) + '-01-01';
  }

  function lastOfMonthISO(isoValue) {
    var base = isoValue && isValidDateISO(isoValue) ? isoValue : todayISO();
    var d = parseISO(base);
    return iso(new Date(d.getFullYear(), d.getMonth() + 1, 0));
  }

  function addDays(isoValue, days) {
    var d = parseISO(isoValue);
    if (!d) return todayISO();
    d.setDate(d.getDate() + Number(days || 0));
    return iso(d);
  }

  function daysBetween(fromISO, toISO) {
    var a = parseISO(fromISO);
    var b = parseISO(toISO);
    if (!a || !b) return 0;
    return Math.round((b.getTime() - a.getTime()) / 86400000);
  }

  var Format = {
    BULAN: BULAN,
    BULAN_PANJANG: BULAN_PANJANG,
    toNumber: toNumber,
    num: num,
    rupiah: rupiah,
    tanggal: tanggal,
    tanggalPanjang: tanggalPanjang,
    namaBulan: namaBulan,
    todayISO: todayISO,
    firstOfMonthISO: firstOfMonthISO,
    firstOfYearISO: firstOfYearISO,
    lastOfMonthISO: lastOfMonthISO,
    addDays: addDays,
    daysBetween: daysBetween,
    isValidDateISO: isValidDateISO,
    parseISO: parseISO,
    iso: iso
  };

  global.Format = Format;
})(typeof window !== 'undefined' ? window : globalThis);
