import { showLoading, hideLoading } from './loading.js';
import { showAlert, hideAlert } from './alert.js';

document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('temperature-report-form');
  const fromInput = document.getElementById('from');
  const toInput = document.getElementById('to');

  if (!form || !fromInput || !toInput) return;

  const today = new Date().toISOString().slice(0, 10);
  toInput.max = today;
  fromInput.max = today;

  function syncMinTo() {
    if (fromInput.value) {
      toInput.min = fromInput.value;
    }
  }

  fromInput.addEventListener('change', syncMinTo);
  syncMinTo();

  form.addEventListener('submit', event => {
    if (fromInput.value && toInput.value && fromInput.value > toInput.value) {
      event.preventDefault();
      showAlert({ message: 'Tanggal mulai harus sebelum atau sama dengan tanggal akhir.' });
    }
  });

  const exportXlsx = document.getElementById('export-xlsx-btn');
  const exportCsv = document.getElementById('export-csv-btn');
  const warning = document.getElementById('export-range-warning');

  if (!exportXlsx || !exportCsv || !warning) return;

  function isExportRangeValid() {
    if (!fromInput.value || !toInput.value) return false;

    const from = new Date(fromInput.value);
    const to = new Date(toInput.value);
    const maxTo = new Date(from);
    maxTo.setMonth(maxTo.getMonth() + 1);

    return to <= maxTo;
  }

  function updateExportState() {
    const isOutOfRange = !isExportRangeValid();

    [exportXlsx, exportCsv].forEach(el => {
      el.classList.toggle('disabled', isOutOfRange);
      el.setAttribute('aria-disabled', String(isOutOfRange));
    });

    warning.style.display = isOutOfRange ? 'block' : 'none';
  }

  function extractFilename(response, fallback) {
    const disposition = response.headers.get('Content-Disposition') || '';
    const match = disposition.match(/filename="?([^"]+)"?/);
    return match ? match[1] : fallback;
  }

  async function handleExportClick(event, url, fallbackFilename) {
    event.preventDefault();

    if (!isExportRangeValid()) return;

    hideAlert();
    showLoading();

    try {
      const response = await fetch(url);

      if (!response.ok) {
        const body = await response.json().catch(() => null);
        showAlert(body || { message: 'Gagal mengunduh laporan.' });
        return;
      }

      const blob = await response.blob();
      const filename = extractFilename(response, fallbackFilename);
      const objectUrl = URL.createObjectURL(blob);

      const tempLink = document.createElement('a');
      tempLink.href = objectUrl;
      tempLink.download = filename;
      document.body.appendChild(tempLink);
      tempLink.click();
      tempLink.remove();

      URL.revokeObjectURL(objectUrl);
    } catch (error) {
      showAlert({ message: 'Gagal mengunduh laporan. Silakan coba lagi.' });
    } finally {
      hideLoading();
    }
  }

  exportXlsx.addEventListener('click', event => handleExportClick(event, exportXlsx.href, 'laporan-suhu.xlsx'));
  exportCsv.addEventListener('click', event => handleExportClick(event, exportCsv.href, 'laporan-suhu.csv'));

  updateExportState();
});
