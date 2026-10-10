import { byId, navigate } from '../lib/dom';
import { hideAlert, showAlert } from '../lib/alert';
import { confirmDialog } from '../lib/confirm';
import { getSelectValue } from '../lib/form';
import { jsonRequest, requestJson } from '../lib/http';
import { hideLoading, showLoading } from '../lib/loading';
import type { UI5Button, UI5Input, UI5Select, UI5Switch } from '../lib/ui5-types';

const LIST_URL = '/dashboard/notifications-recipients';

function initForm(): void {
  const form = byId<HTMLFormElement>('form-create-notification-recipient') ??
    byId<HTMLFormElement>('form-update-notification-recipient');

  if (!form) return;

  const isUpdate = form.id === 'form-update-notification-recipient';
  const id = form.dataset.id;

  const nameInput = byId<UI5Input>('name');
  const channelInput = byId<UI5Select>('channel');
  const targetInput = byId<UI5Input>('target');
  const targetLabel = byId('target-label');
  const statusSwitch = byId<UI5Switch>('isActive');

  if (!nameInput || !channelInput || !targetInput || !targetLabel) return;

  function updateTargetField(): void {
    switch (getSelectValue(channelInput)) {
      case 'email':
        targetLabel!.textContent = 'Email Address';
        targetInput!.type = 'Email';
        targetInput!.placeholder = 'admin@example.com';
        break;

      case 'whatsapp':
        targetLabel!.textContent = 'WhatsApp Number';
        targetInput!.type = 'Text';
        targetInput!.placeholder = '628123456789';
        break;

      default:
        targetLabel!.textContent = 'Target';
        targetInput!.type = 'Text';
        targetInput!.placeholder = 'Select a channel first';
    }
  }

  updateTargetField();

  channelInput.addEventListener('change', updateTargetField);

  form.addEventListener('submit', async event => {
    event.preventDefault();

    hideAlert();
    showLoading();

    const payload = {
      name: nameInput.value.trim(),
      channel: getSelectValue(channelInput),
      target: targetInput.value.trim(),
      isActive: statusSwitch?.checked ?? false,
    };

    try {
      await requestJson(
        isUpdate ? `/api/notifications-recipients/${id}` : '/api/notifications-recipients',
        jsonRequest(isUpdate ? 'PUT' : 'POST', payload)
      );

      navigate(LIST_URL);
    } catch (error) {
      showAlert(error);
    } finally {
      hideLoading();
    }
  });
}

function initDelete(): void {
  const table = byId('table');

  if (!table) return;

  table.addEventListener('click', async event => {
    const target = event.target as Element | null;
    const deleteButton = target?.closest<UI5Button>('ui5-button[data-action="delete"]');

    if (!deleteButton) return;

    const { id, name } = deleteButton.dataset;

    const confirmed = await confirmDialog({
      title: 'Delete Recipient',
      message: `Are you sure you want to delete "${name}"?`,
      confirmText: 'Delete',
      destructive: true,
    });

    if (!confirmed) return;

    deleteButton.disabled = true;

    try {
      await requestJson(`/api/notifications-recipients/${id}`, { method: 'DELETE' }, true);

      window.location.reload();
    } catch (error) {
      showAlert(error);

      deleteButton.disabled = false;
    }
  });
}

function initSearch(): void {
  const inputName = byId<UI5Input>('search-name');
  const selectChannel = byId<UI5Select>('search-channel');
  const buttonSearch = byId('search-button-notification-recipient');

  function searchRecipients(): void {
    const url = new URL(window.location.href);

    const name = inputName?.value.trim();
    const channel = getSelectValue(selectChannel ?? null);

    if (name) {
      url.searchParams.set('name', name);
    } else {
      url.searchParams.delete('name');
    }

    if (channel) {
      url.searchParams.set('channel', channel);
    } else {
      url.searchParams.delete('channel');
    }

    navigate(url.toString());
  }

  buttonSearch?.addEventListener('click', searchRecipients);

  inputName?.addEventListener('keydown', event => {
    if ((event as KeyboardEvent).key === 'Enter') {
      event.preventDefault();
      searchRecipients();
    }
  });

  selectChannel?.addEventListener('change', searchRecipients);

  byId('clear-search')?.addEventListener('click', () => {
    const url = new URL(window.location.href);

    url.searchParams.delete('name');
    url.searchParams.delete('channel');

    navigate(url.toString());
  });
}

export default function init(): void {
  initForm();
  initDelete();
  initSearch();
}

