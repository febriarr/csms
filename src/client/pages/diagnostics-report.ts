import { byId, cssVar } from '../lib/dom';
import { submitAsGet } from '../lib/form';

type TrendChartData = {
  days: string[];
  sensor: number[];
  wifi: number[];
  http: number[];
  rssi: Array<number | null>;
};

function initFilterForm(): void {
  const form = byId<HTMLFormElement>('diagnostics-report-form');

  form?.addEventListener('submit', event => {
    event.preventDefault();
    submitAsGet(form);
  });
}

function initTrendChart(): void {
  const element = byId('diagnostics-trend-chart');

  if (!element || !window.ApexCharts || !element.dataset.chart) return;

  const data = JSON.parse(element.dataset.chart) as TrendChartData;

  const options = {
    chart: {
      type: 'bar',
      height: 350,
      stacked: true,
      toolbar: { show: false },
      fontFamily: cssVar('--sapFontFamily', 'inherit'),
      foreColor: cssVar('--sapTextColor', '#1d2d3e'),
    },
    plotOptions: { bar: { horizontal: false, columnWidth: '55%' } },
    series: [
      { name: 'WiFi', data: data.wifi },
      { name: 'HTTP', data: data.http },
      { name: 'Sensor', data: data.sensor },
    ],
    colors: [
      cssVar('--sapCriticalColor', '#e9730c'),
      cssVar('--sapNegativeColor', '#bb0000'),
      cssVar('--sapInformationColor', '#0070f2'),
    ],
    xaxis: { categories: data.days },
    yaxis: { title: { text: 'Jumlah Kejadian' }, forceNiceScale: true },
    legend: { position: 'top' },
    dataLabels: { enabled: false },
  };

  void new window.ApexCharts(element, options).render();
}

export default function init(): void {
  initFilterForm();
  initTrendChart();
}
