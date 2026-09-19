import { hideAlert, showAlert } from './alert.js';
import { hideLoading, showLoading } from './loading.js';

document.addEventListener('DOMContentLoaded', () => {
  const createForm = document.getElementById('form-create-notification-recipient');
  const updateForm = document.getElementById('form-update-notification-recipient');

  const form = createForm || updateForm;

  if (form) {
    const isUpdate = form.id === 'form-update-notification-recipient';
    const id = form.dataset.id;

    const channelInput = document.getElementById('channel');
    const targetInput = document.getElementById('target');
    const targetLabel = document.getElementById('target-label');

    function updateTargetField() {
      switch (channelInput.value) {
        case 'email':
          targetLabel.textContent = 'Email Address';
          targetInput.type = 'email';
          targetInput.placeholder = 'admin@example.com';
          break;

        case 'whatsapp':
          targetLabel.textContent = 'WhatsApp Number';
          targetInput.type = 'text';
          targetInput.placeholder = '628123456789';
          break;

        default:
          targetLabel.textContent = 'Target';
          targetInput.type = 'text';
          targetInput.placeholder = 'Select a channel first';
      }
    }

    updateTargetField();

    channelInput.addEventListener('change', updateTargetField);

    form.addEventListener('submit', async event => {
      event.preventDefault();

      hideAlert();
      showLoading();

      const payload = {
        name: form.name.value.trim(),
        channel: form.channel.value,
        target: form.target.value.trim(),
        isActive: form.isActive.checked,
      };

      try {
        const response = await fetch(
          isUpdate ? `/api/notifications-recipients/${id}` : '/api/notifications-recipients',
          {
            method: isUpdate ? 'PUT' : 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload),
          }
        );

        const result = await response.json();

        if (!response.ok || result.success === false) {
          throw result;
        }

        window.location.href = '/dashboard/notifications-recipients';
      } catch (error) {
        showAlert(error);
      } finally {
        hideLoading();
      }
    });
  }

  const tableBody = document.querySelector('.dashboard-table tbody');

  if (tableBody) {
    tableBody.addEventListener('click', async event => {
      const deleteButton = event.target.closest('.btn-delete-notification-recipient');

      if (!deleteButton) return;

      const id = deleteButton.dataset.id;
      const name = deleteButton.dataset.name;

      if (!confirm(`Are you sure you want to delete "${name}"?`)) {
        return;
      }

      deleteButton.disabled = true;
      deleteButton.innerHTML = '<i class="ph ph-spinner-gap ph-spin"></i>';

      try {
        const response = await fetch(`/api/notifications-recipients/${id}`, {
          method: 'DELETE',
        });

        const result = await response.json().catch(() => ({}));

        if (!response.ok || result.success === false) {
          throw result;
        }

        deleteButton.closest('tr')?.remove();
        window.location.reload();
      } catch (error) {
        showAlert(error);

        deleteButton.disabled = false;
        deleteButton.innerHTML = '<i class="ph ph-trash"></i>';
      }
    });
  }

  // Search

  const inputName = document.getElementById('search-name');
  const selectChannel = document.getElementById('search-channel');
  const buttonSearch = document.getElementById('search-button-notification-recipient');

  function searchRecipients() {
    const url = new URL(window.location.href);

    const name = inputName?.value.trim();
    const channel = selectChannel?.value;

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

    window.location.href = url.toString();
  }

  buttonSearch?.addEventListener('click', searchRecipients);

  inputName?.addEventListener('keydown', event => {
    if (event.key === 'Enter') {
      event.preventDefault();
      searchRecipients();
    }
  });

  selectChannel?.addEventListener('change', searchRecipients);

  // Clear Filter

  const clearSearch = document.getElementById('clear-search');

  clearSearch?.addEventListener('click', () => {
    const url = new URL(window.location.href);

    url.searchParams.delete('name');
    url.searchParams.delete('channel');

    window.location.href = url.toString();
  });
});
