(function (global) {
  'use strict';

  var Format = global.Format;

  function moneyShort(value) {
    var number = Number(value) || 0;
    if (number >= 1000000000) return (number / 1000000000).toFixed(1) + ' M';
    if (number >= 1000000) return (number / 1000000).toFixed(1) + ' jt';
    if (number >= 1000) return Math.round(number / 1000) + ' rb';
    return String(Math.round(number));
  }

  function dateLabel(timestamp, mode) {
    var date = new Date(timestamp);
    if (mode === 'bulanan') return Format.BULAN[date.getMonth()] + ' ' + date.getFullYear();
    return date.getDate() + ' ' + Format.BULAN[date.getMonth()];
  }

  function fullDate(timestamp, mode) {
    var date = new Date(timestamp);
    if (mode === 'bulanan') return Format.BULAN_PANJANG[date.getMonth()] + ' ' + date.getFullYear();
    return date.getDate() + ' ' + Format.BULAN_PANJANG[date.getMonth()] + ' ' + date.getFullYear();
  }

  function options(series, mode) {
    function data(key) {
      return series.points.map(function (point) {
        return [point.x, point[key]];
      });
    }

    return {
      chart: {
        type: 'line',
        height: 320,
        fontFamily: 'Inter, ui-sans-serif, system-ui, sans-serif',
        foreColor: '#71717a',
        background: 'transparent',
        toolbar: {
          show: true,
          tools: {
            download: false,
            selection: true,
            zoom: true,
            zoomin: true,
            zoomout: true,
            pan: true,
            reset: true
          }
        },
        zoom: {
          enabled: true,
          type: 'x',
          autoScaleYaxis: true
        },
        animations: {
          enabled: false
        }
      },
      series: [
        { name: 'Pendapatan', data: data('pendapatan') },
        { name: 'Pengeluaran', data: data('beban') }
      ],
      colors: ['#16a34a', '#dc2626'],
      stroke: {
        curve: 'smooth',
        width: 2
      },
      markers: {
        size: series.points.length === 1 ? 4 : 0,
        strokeWidth: 2,
        hover: {
          size: 5
        }
      },
      dataLabels: {
        enabled: false
      },
      legend: {
        show: false
      },
      grid: {
        borderColor: '#e4e4e7',
        strokeDashArray: 4,
        xaxis: {
          lines: { show: false }
        },
        yaxis: {
          lines: { show: true }
        },
        padding: {
          left: 8,
          right: 8
        }
      },
      xaxis: {
        type: 'datetime',
        axisBorder: { show: false },
        axisTicks: { show: false },
        tooltip: { enabled: false },
        labels: {
          datetimeUTC: false,
          style: { colors: '#71717a' },
          formatter: function (value) { return dateLabel(value, mode); }
        }
      },
      yaxis: {
        tickAmount: 4,
        labels: {
          style: { colors: '#71717a' },
          formatter: function (value) { return moneyShort(value); }
        }
      },
      tooltip: {
        shared: true,
        intersect: false,
        theme: 'light',
        x: {
          formatter: function (value) { return fullDate(value, mode); }
        },
        y: {
          formatter: function (value) { return Format.rupiah(value); }
        }
      },
      noData: {
        text: 'Belum ada pendapatan atau beban.'
      }
    };
  }

  global.Chart = {
    options: options,
    moneyShort: moneyShort,
    dateLabel: dateLabel,
    fullDate: fullDate
  };
})(typeof window !== 'undefined' ? window : globalThis);
