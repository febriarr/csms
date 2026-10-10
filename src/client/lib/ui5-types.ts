/**
 * Minimal structural types for the UI5 elements we touch from TypeScript.
 * They intentionally describe only the members used by this app so that the
 * client code does not depend on every property of the full component class.
 */
export type UI5Input = HTMLElement & {
  value: string;
  type: string;
  placeholder: string;
  disabled: boolean;
};

export type UI5Select = HTMLElement & {
  value?: string;
  selectedOption?: HTMLElement | null;
};

export type UI5Switch = HTMLElement & { checked: boolean };

export type UI5DatePicker = HTMLElement & {
  value: string;
  minDate: string;
  maxDate: string;
};

export type UI5Button = HTMLElement & {
  disabled: boolean;
  loading: boolean;
};

export type UI5Dialog = HTMLElement & { open: boolean };

export type UI5Tag = HTMLElement & { design: string };
