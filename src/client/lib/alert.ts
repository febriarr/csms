export type ApiResult = {
  success?: boolean;
  message?: string;
  errors?: Record<string, string[]> | null;
};

type AlertParts = {
  container: HTMLElement;
  title: HTMLElement;
  list: HTMLElement;
};

function getAlertParts(): AlertParts | null {
  const container = document.querySelector<HTMLElement>('[data-slot="alert"]');
  const title = document.querySelector<HTMLElement>('[data-slot="alert-title"]');
  const list = document.querySelector<HTMLElement>('[data-slot="alert-list"]');

  if (!container || !title || !list) return null;

  return { container, title, list };
}

function normalize(input: unknown): ApiResult {
  if (typeof input === 'string') return { message: input };
  if (input instanceof Error) return { message: input.message };
  if (input && typeof input === 'object') return input as ApiResult;

  return {};
}

export function hideAlert(): void {
  const parts = getAlertParts();
  if (!parts) return;

  parts.container.classList.add('is-hidden');
  parts.title.textContent = '';
  parts.list.replaceChildren();
}

export function showAlert(input: unknown): void {
  const parts = getAlertParts();
  if (!parts) return;

  const result = normalize(input);

  parts.title.textContent = result.message || 'Terjadi kesalahan pada sistem.';
  parts.list.replaceChildren();

  if (result.errors && typeof result.errors === 'object') {
    const fragment = document.createDocumentFragment();

    Object.entries(result.errors).forEach(([field, messages]) => {
      if (!Array.isArray(messages)) return;

      messages.forEach(message => {
        const item = document.createElement('li');
        item.textContent = field !== '_root' ? `${field}: ${message}` : message;
        fragment.appendChild(item);
      });
    });

    parts.list.appendChild(fragment);
  }

  parts.container.classList.remove('is-hidden');
}

// ui5-message-strip fires `close` when the user dismisses it with the close button.
document.querySelector('[data-slot="alert"]')?.addEventListener('close', () => hideAlert());
