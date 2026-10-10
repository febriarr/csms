import { byId } from '../lib/dom';
import { hideAlert, showAlert, type ApiResult } from '../lib/alert';
import { collectFormData } from '../lib/form';
import { hideLoading, showLoading } from '../lib/loading';
import { jsonRequest } from '../lib/http';

export default function init(): void {
  const form = byId<HTMLFormElement>('loginForm');

  if (!form) return;

  form.addEventListener('submit', async event => {
    event.preventDefault();
    hideAlert();
    showLoading();

    try {
      const response = await fetch('/api/auth/login', jsonRequest('POST', collectFormData(form)));
      const result = (await response.json()) as ApiResult;

      if (result.success) {
        window.location.href = '/dashboard';
      } else {
        showAlert(result.message || 'Terjadi kesalahan pada sistem.');
      }
    } catch (error) {
      console.error('Error:', error);
      showAlert('Terjadi kesalahan pada sistem.');
    } finally {
      hideLoading();
    }
  });
}
