import type { UI5Dialog } from './ui5-types';

type ConfirmOptions = {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  destructive?: boolean;
};

/** Replacement for `window.confirm` built on `ui5-dialog`. Resolves `true` when confirmed. */
export function confirmDialog(options: ConfirmOptions): Promise<boolean> {
  return new Promise(resolve => {
    const dialog = document.createElement('ui5-dialog') as UI5Dialog;
    dialog.setAttribute('header-text', options.title);

    const message = document.createElement('ui5-text');
    message.textContent = options.message;
    dialog.appendChild(message);

    const footer = document.createElement('ui5-bar');
    footer.setAttribute('design', 'Footer');
    footer.slot = 'footer';

    const confirmButton = document.createElement('ui5-button');
    confirmButton.setAttribute('design', options.destructive ? 'Negative' : 'Emphasized');
    confirmButton.slot = 'endContent';
    confirmButton.textContent = options.confirmText ?? 'OK';

    const cancelButton = document.createElement('ui5-button');
    cancelButton.setAttribute('design', 'Transparent');
    cancelButton.slot = 'endContent';
    cancelButton.textContent = options.cancelText ?? 'Batal';

    footer.append(confirmButton, cancelButton);
    dialog.appendChild(footer);

    let result = false;

    confirmButton.addEventListener('click', () => {
      result = true;
      dialog.open = false;
    });

    cancelButton.addEventListener('click', () => {
      dialog.open = false;
    });

    dialog.addEventListener('close', () => {
      dialog.remove();
      resolve(result);
    });

    document.body.appendChild(dialog);
    dialog.open = true;
  });
}
