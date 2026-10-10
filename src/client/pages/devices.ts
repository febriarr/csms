import { byId, navigate, query } from '../lib/dom';
import { hideAlert, showAlert } from '../lib/alert';
import { confirmDialog } from '../lib/confirm';
import { collectFormData } from '../lib/form';
import { jsonRequest, requestJson } from '../lib/http';
import { hideLoading, showLoading } from '../lib/loading';
import type { UI5Button, UI5Input } from '../lib/ui5-types';

function initCreateForm(): void {
  const form = byId<HTMLFormElement>('form-create-device');

  if (!form) return;

  form.addEventListener('submit', async event => {
    event.preventDefault();
    hideAlert();
    showLoading();

    try {
      await requestJson('/api/devices', jsonRequest('POST', collectFormData(form)));

      form.reset();
      navigate('/dashboard/devices');
    } catch (error) {
      showAlert(error);
    } finally {
      hideLoading();
    }
  });
}

function initDelete(): void {
  const table = query('ui5-table');

  if (!table) return;

  table.addEventListener('click', async event => {
    const target = event.target as Element | null;
    const deleteButton = target?.closest<UI5Button>('ui5-button[data-action="delete"]');

    if (!deleteButton) return;

    const { id, name } = deleteButton.dataset;

    const confirmed = await confirmDialog({
      title: 'Hapus Device',
      message: `Yakin mau hapus device "${name}"?`,
      confirmText: 'Hapus',
      destructive: true,
    });

    if (!confirmed) return;

    deleteButton.disabled = true;
    deleteButton.loading = true;

    try {
      await requestJson(`/api/devices/${id}`, { method: 'DELETE' }, true);

      deleteButton.closest('ui5-table-row')?.remove();
    } catch (error) {
      showAlert(error);
      deleteButton.disabled = false;
      deleteButton.loading = false;
    }
  });
}

function initSearch(): void {
  const inputSearch = byId<UI5Input>('search-input-device');
  const buttonSearch = byId('search-button-device');

  if (!inputSearch || !buttonSearch) return;

  const searchDevice = (): void => {
    const value = inputSearch.value.trim();
    const url = new URL(window.location.href);

    if (value) {
      url.searchParams.set('search', value);
    } else {
      url.searchParams.delete('search');
    }

    navigate(url.toString());
  };

  buttonSearch.addEventListener('click', searchDevice);

  inputSearch.addEventListener('keydown', event => {
    if ((event as KeyboardEvent).key === 'Enter') {
      event.preventDefault();
      searchDevice();
    }
  });

  byId('clear-search')?.addEventListener('click', () => {
    const url = new URL(window.location.href);

    url.searchParams.delete('search');

    navigate(url.toString());
  });
}

export default function init(): void {
  initCreateForm();
  initDelete();
  initSearch();
}
