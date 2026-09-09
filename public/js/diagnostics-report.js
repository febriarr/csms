document.addEventListener('DOMContentLoaded', () => {
  const el = document.getElementById('diagnostics-trend-chart');
  if (!el || !window.ApexCharts) return;

  const data = JSON.parse(el.dataset.chart);

  const options = {
    chart: { type: 'bar', height: 350, stacked: true, toolbar: { show: false } },
    plotOptions: { bar: { horizontal: false, columnWidth: '55%' } },
    series: [
      { name: 'WiFi', data: data.wifi },
      { name: 'HTTP', data: data.http },
      { name: 'Sensor', data: data.sensor },
    ],
    colors: ['#f59e0b', '#ef4444', '#6366f1'],
    xaxis: { categories: data.days },
    yaxis: { title: { text: 'Jumlah Kejadian' }, forceNiceScale: true },
    legend: { position: 'top' },
    dataLabels: { enabled: false },
  };

  new window.ApexCharts(el, options).render();
});
