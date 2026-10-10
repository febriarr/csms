function getOverlay(): HTMLElement | null {
  return document.querySelector<HTMLElement>('[data-slot="loading-overlay"]');
}

export function showLoading(): void {
  getOverlay()?.classList.remove('is-hidden');
}

export function hideLoading(): void {
  getOverlay()?.classList.add('is-hidden');
}
