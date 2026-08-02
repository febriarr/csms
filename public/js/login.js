document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('loginForm');
  const loadingOverlay = document.querySelector('[data-slot="loading-overlay"]');
  const alertContainer = document.querySelector('[data-slot="alert"]');

  // utils
  function hideAlert() {
    if (alertContainer) {
      alertContainer.style.setProperty('display', 'none', 'important');
    }
  }

  function showAlert(message) {
    if (!alertContainer) return;

    alertContainer.textContent = message || 'Terjadi kesalahan pada sistem.';
    alertContainer.style.setProperty('display', 'block', 'important');
  }

  // Post login

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
        data[key] = value;
      });

      fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      })
        .then(response => response.json())
        .then(result => {
          if (result.success) {
            window.location.href = '/dashboard';
          } else {
            showAlert(result.message || 'Terjadi kesalahan pada sistem.');
          }
        })
        .catch(error => {
          console.error('Error:', error);
          showAlert('Terjadi kesalahan pada sistem.');
        })
        .finally(() => {
          if (loadingOverlay) {
            loadingOverlay.style.setProperty('display', 'none', 'important');
          }
        });
    });
  }
});
