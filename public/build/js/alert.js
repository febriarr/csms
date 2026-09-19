const alertContainer = document.querySelector('[data-slot="alert"]');
const alertTitle = document.querySelector('[data-slot="alert-title"]');
const alertList = document.querySelector('[data-slot="alert-list"]');

export function hideAlert() {
  if (alertContainer) {
    alertContainer.style.setProperty('display', 'none', 'important');
    alertTitle.textContent = '';
    alertList.innerHTML = '';
  }
}

export function showAlert(result) {
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
