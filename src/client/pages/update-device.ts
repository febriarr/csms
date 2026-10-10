import { byId, navigate } from '../lib/dom';
import { hideAlert, showAlert } from '../lib/alert';
import { collectFormData } from '../lib/form';
import { jsonRequest, requestJson } from '../lib/http';
import { hideLoading, showLoading } from '../lib/loading';

export default function init(): void {
  const form = byId<HTMLFormElement>('form-update-device');

  if (!form) return;

  form.addEventListener('submit', async event => {
    event.preventDefault();
    hideAlert();
    showLoading();

    try {
      await requestJson(`/api/devices/${form.dataset.id}`, jsonRequest('PUT', collectFormData(form)));

      navigate('/dashboard/devices');
    } catch (error) {
      showAlert(error);
    } finally {
      hideLoading();
    }
  });
}
