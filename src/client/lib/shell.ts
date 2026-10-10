import NavigationLayout from '@ui5/webcomponents-fiori/dist/NavigationLayout.js';
import NavigationLayoutMode from '@ui5/webcomponents-fiori/dist/types/NavigationLayoutMode.js';
import { byId } from './dom';
import { showAlert } from './alert';
import type { UI5Button } from './ui5-types';

/** Hides the full-page loader once UI5 components are defined and painted. */
export async function hidePageLoading(): Promise<void> {
  await customElements.whenDefined('ui5-busy-indicator');

  await new Promise<void>(resolve => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => resolve());
    });
  });

  byId('page-loading')?.classList.add('is-loaded');
}

function initNavigationToggle(): void {
  const layout = document.querySelector<NavigationLayout>('#dashboard-layout');

  byId('navigation-toggle')?.addEventListener('click', () => {
    if (!layout) return;

    layout.mode = layout.isSideCollapsed() ? NavigationLayoutMode.Expanded : NavigationLayoutMode.Collapsed;
  });
}

/**
 * Any element with `data-href` navigates on click, which lets views use
 * `ui5-button` / `ui5-link`-style actions without per-page handlers.
 * `data-target="_blank"` opens the URL in a new tab.
 */
function initLinkButtons(): void {
  document.addEventListener('click', event => {
    const target = event.target as Element | null;
    const element = target?.closest<HTMLElement>('[data-href]');

    if (!element || (element as Partial<UI5Button>).disabled) return;

    const url = element.dataset.href;

    if (!url) return;

    if (element.dataset.target === '_blank') {
      window.open(url, '_blank', 'noopener,noreferrer');
      return;
    }

    window.location.href = url;
  });
}

function initLogout(): void {
  const logoutButton = byId<UI5Button>('logout-button');

  logoutButton?.addEventListener('click', async () => {
    logoutButton.disabled = true;

    try {
      const response = await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) {
        throw new Error('Logout failed');
      }

      window.location.href = '/';
    } catch (error) {
      console.error(error);

      logoutButton.disabled = false;
      showAlert('Gagal melakukan logout');
    }
  });
}

export function initShell(): void {
  initNavigationToggle();
  initLinkButtons();
  initLogout();
}
