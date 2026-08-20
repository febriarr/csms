import { hideAlert, showAlert } from './alert.js';
import { hideLoading, showLoading } from './loading.js';

const formUpdate = document.getElementById('form-update-device');

if (formUpdate) {
  formUpdate.addEventListener('submit', function (event) {
    event.preventDefault();
    hideAlert();
    showLoading();

    const id = formUpdate.dataset.id;
    const formData = new FormData(formUpdate);
    const data = {};

    formData.forEach((value, key) => {
      const inputElement = formUpdate.querySelector(`[name="${key}"]`);

      if (inputElement && inputElement.type === 'number' && value !== '') {
        data[key] = Number(value);
      } else {
        data[key] = value;
      }
    });

    fetch(`/api/devices/${id}`, {
      method: 'PUT',
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
        window.location.href = '/dashboard/devices';
      })
      .catch(err => {
        showAlert(err);
      })
      .finally(() => {
        hideLoading();
      });
  });
}
