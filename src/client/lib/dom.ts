export function byId<T extends HTMLElement = HTMLElement>(id: string): T | null {
  return document.getElementById(id) as T | null;
}

export function query<T extends Element = HTMLElement>(selector: string, root: ParentNode = document): T | null {
  return root.querySelector<T>(selector);
}

/** Reads a CSS custom property (e.g. a UI5 theme parameter) from :root. */
export function cssVar(name: string, fallback: string): string {
  const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return value || fallback;
}

export function navigate(url: string): void {
  window.location.href = url;
}
