document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('form-create-device');
  const loadingOverlay = document.querySelector('[data-slot="loading-overlay"]');
  const alertContainer = document.querySelector('[data-slot="alert"]');
  const alertTitle = document.querySelector('[data-slot="alert-title"]');
  const alertList = document.querySelector('[data-slot="alert-list"]');

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

    // Handle Validation Errors dari ZodError
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
});
