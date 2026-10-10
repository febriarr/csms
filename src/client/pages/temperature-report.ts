import { byId } from '../lib/dom';
import { hideAlert, showAlert } from '../lib/alert';
import { submitAsGet } from '../lib/form';
import { hideLoading, showLoading } from '../lib/loading';
import type { UI5Button, UI5DatePicker } from '../lib/ui5-types';

function extractFilename(response: Response, fallback: string): string {
  const disposition = response.headers.get('Content-Disposition') || '';
  const match = disposition.match(/filename="?([^"]+)"?/);

  return match?.[1] ?? fallback;
}

export default function init(): void {
  const form = byId<HTMLFormElement>('temperature-report-form');
  const fromInput = byId<UI5DatePicker>('from');
  const toInput = byId<UI5DatePicker>('to');

  if (!form || !fromInput || !toInput) return;

  const today = new Date().toISOString().slice(0, 10);
  toInput.maxDate = today;
  fromInput.maxDate = today;

  function syncMinTo(): void {
    if (fromInput!.value) {
      toInput!.minDate = fromInput!.value;
    }
  }

  fromInput.addEventListener('change', syncMinTo);
  syncMinTo();

  form.addEventListener('submit', event => {
    event.preventDefault();

    if (fromInput.value && toInput.value && fromInput.value > toInput.value) {
      showAlert({ message: 'Tanggal mulai harus sebelum atau sama dengan tanggal akhir.' });
      return;
    }

    submitAsGet(form);
  });

  const exportXlsx = byId<UI5Button>('export-xlsx-btn');
  const exportCsv = byId<UI5Button>('export-csv-btn');
  const warning = byId('export-range-warning');

  if (!exportXlsx || !exportCsv || !warning) return;

  function isExportRangeValid(): boolean {
    if (!fromInput!.value || !toInput!.value) return false;

    const from = new Date(fromInput!.value);
    const to = new Date(toInput!.value);
    const maxTo = new Date(from);
    maxTo.setMonth(maxTo.getMonth() + 1);

    return to <= maxTo;
  }

  function updateExportState(): void {
    const isOutOfRange = !isExportRangeValid();

    [exportXlsx!, exportCsv!].forEach(button => {
      button.disabled = isOutOfRange;
    });

    warning!.classList.toggle('is-hidden', !isOutOfRange);
  }

  async function handleExportClick(button: UI5Button, fallbackFilename: string): Promise<void> {
    const url = button.dataset.exportUrl;

    if (!url || !isExportRangeValid()) return;

    hideAlert();
    showLoading();

    try {
      const response = await fetch(url);

      if (!response.ok) {
        const body: unknown = await response.json().catch(() => null);
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
    } catch {
      showAlert({ message: 'Gagal mengunduh laporan. Silakan coba lagi.' });
    } finally {
      hideLoading();
    }
  }

  exportXlsx.addEventListener('click', () => void handleExportClick(exportXlsx, 'laporan-suhu.xlsx'));
  exportCsv.addEventListener('click', () => void handleExportClick(exportCsv, 'laporan-suhu.csv'));

  updateExportState();
}
