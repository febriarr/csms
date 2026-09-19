const loadingOverlay = document.querySelector('[data-slot="loading-overlay"]');

export function showLoading() {
  if (loadingOverlay) {
    loadingOverlay.style.setProperty('display', 'flex', 'important');
  }
}

export function hideLoading() {
  if (loadingOverlay) {
    loadingOverlay.style.setProperty('display', 'none', 'important');
  }
}
