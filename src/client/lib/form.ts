import type { UI5Input, UI5Select } from './ui5-types';

const FIELD_SELECTOR = 'ui5-input[name], ui5-select[name], ui5-date-picker[name], ui5-text-area[name]';

/** Returns the value of the selected `ui5-option` (its `value` attribute, or its text). */
export function getSelectValue(select: UI5Select | null): string {
  if (!select) return '';

  const option = select.selectedOption;

  if (!option) return select.value ?? '';

  if (option.hasAttribute('value')) return option.getAttribute('value') ?? '';

  return (option.textContent ?? '').trim();
}

function readFieldValue(element: HTMLElement): string {
  if (element.tagName === 'UI5-SELECT') {
    return getSelectValue(element as UI5Select);
  }

  return (element as UI5Input).value ?? '';
}

/**
 * Collects the named UI5 fields of a form into a plain object.
 * Number inputs are converted to numbers (empty values stay as empty strings)
 * and disabled fields are skipped — the same rules `FormData` applied to the
 * native inputs before the UI5 migration.
 */
export function collectFormData(form: HTMLFormElement): Record<string, string | number> {
  const data: Record<string, string | number> = {};

  form.querySelectorAll<HTMLElement>(FIELD_SELECTOR).forEach(element => {
    const name = element.getAttribute('name');

    if (!name || (element as UI5Input).disabled) return;

    const value = readFieldValue(element);
    const isNumberInput = element.tagName === 'UI5-INPUT' && String((element as UI5Input).type).toLowerCase() === 'number';

    data[name] = isNumberInput && value !== '' ? Number(value) : value;
  });

  return data;
}

/** Submits a GET form manually, so it does not depend on form-associated custom elements. */
export function submitAsGet(form: HTMLFormElement): void {
  const params = new URLSearchParams();

  Object.entries(collectFormData(form)).forEach(([key, value]) => params.set(key, String(value)));

  form.querySelectorAll<HTMLInputElement>('input[type="hidden"][name]').forEach(input => {
    params.set(input.name, input.value);
  });

  const action = form.getAttribute('action') || window.location.pathname;

  window.location.href = `${action}?${params.toString()}`;
}
