document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('form-create-device');
  const loadingOverlay = document.querySelector('[data-slot="loading-overlay"]');
  const alertContainer = document.querySelector('[data-slot="alert"]');
  const alertTitle = document.querySelector('[data-slot="alert-title"]');
  const alertList = document.querySelector('[data-slot="alert-list"]');

  // utils
  function hideAlert() {
    if (alertContainer) {
      alertContainer.style.setProperty('display', 'none', 'important');
      alertTitle.textContent = '';
      alertList.innerHTML = '';
    }
  }

  function showAlert(result) {
    if (!alertContainer) return;

    alertTitle.textContent = result.message || 'Terjadi kesalahan pada sistem.';
    alertList.innerHTML = '';

    if (result.errors && typeof result.errors === 'object') {
      const fragment = document.createDocumentFragment();

      Object.entries(result.errors).forEach(([field, messages]) => {
        messages.forEach(msg => {
          const li = document.createElement('li');
          li.textContent = field !== '_root' ? `${field}: ${msg}` : msg;
          fragment.appendChild(li);
        });
      });

      alertList.appendChild(fragment);
    }

    alertContainer.style.setProperty('display', 'block', 'important');
  }

  // Post device

  if (form) {
    form.addEventListener('submit', function (event) {
      event.preventDefault();
      hideAlert();

      if (loadingOverlay) {
        loadingOverlay.style.setProperty('display', 'flex', 'important');
      }

      const formData = new FormData(form);
      const data = {};

      formData.forEach((value, key) => {
        const inputElement = form.querySelector(`[name="${key}"]`);

        if (inputElement && inputElement.type === 'number' && value !== '') {
          data[key] = Number(value);
        } else {
          data[key] = value;
        }
      });

      fetch('/api/devices', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      })
        .then(async res => {
          const result = await res.json();

          if (!res.ok || result.success === false) {
            throw result;
          }

          return result;
        })
        .then(result => {
          form.reset();
          window.location.href = '/dashboard/devices';
        })
        .catch(err => {
          showAlert(err);
        })
        .finally(() => {
          if (loadingOverlay) {
            loadingOverlay.style.setProperty('display', 'none', 'important');
          }
        });
    });
  }

  // Delete device

  const tableBody = document.querySelector('.dashboard-table tbody');

  if (tableBody) {
    tableBody.addEventListener('click', async event => {
      const deleteBtn = event.target.closest('.btn-delete-device');
      if (!deleteBtn) return;

      const id = deleteBtn.dataset.id;
      const name = deleteBtn.dataset.name;

      if (!confirm(`Yakin mau hapus device "${name}"?`)) return;

      deleteBtn.disabled = true;
      deleteBtn.textContent = 'Menghapus...';

      try {
        const res = await fetch(`/api/devices/${id}`, {
          method: 'DELETE',
        });

        const result = await res.json().catch(() => ({}));

        if (!res.ok || result.success === false) {
          throw result;
        }

        const row = deleteBtn.closest('tr');
        row?.remove();
      } catch (err) {
        showAlert(err);
        deleteBtn.disabled = false;
        deleteBtn.textContent = 'Hapus';
      }
    });
  }

  // Search device
  const inputSearch = document.getElementById('search-input-device');
  const buttonSearch = document.getElementById('search-button-device');

  function searchDevice() {
    const value = inputSearch.value.trim();

    const url = new URL(window.location.href);

    if (value) {
      url.searchParams.set('search', value);
    } else {
      url.searchParams.delete('search');
    }

    window.location.href = url.toString();
  }

  buttonSearch.addEventListener('click', searchDevice);

  inputSearch.addEventListener('keydown', event => {
    if (event.key === 'Enter') {
      event.preventDefault();
      searchDevice();
    }
  });

  const clearSearch = document.getElementById('clear-search');

  clearSearch?.addEventListener('click', () => {
    const url = new URL(window.location.href);

    url.searchParams.delete('search');

    window.location.href = url.toString();
  });
});
