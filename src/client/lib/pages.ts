type PageModule = { default: () => void };

/**
 * Page scripts are code-split by Vite. The controllers pass the page id through
 * `pageScripts`; the layouts expose it as `data-page-scripts` on <body>.
 */
const pages: Record<string, () => Promise<PageModule>> = {
  login: () => import('../pages/login'),
  devices: () => import('../pages/devices'),
  'update-device': () => import('../pages/update-device'),
  'device-status': () => import('../pages/device-status'),
  'diagnostics-report': () => import('../pages/diagnostics-report'),
  'notifications-recipients': () => import('../pages/notifications-recipients'),
  'temperature-report': () => import('../pages/temperature-report'),
  'whatsapp-status': () => import('../pages/whatsapp-status'),
};

function readPageIds(): string[] {
  const raw = document.body.dataset.pageScripts;

  if (!raw) return [];

  try {
    const parsed: unknown = JSON.parse(raw);

    return Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === 'string') : [];
  } catch {
    return [];
  }
}

export async function loadPageScripts(): Promise<void> {
  await Promise.all(
    readPageIds().map(async id => {
      const loader = pages[id];

      if (!loader) {
        console.warn(`Unknown page script "${id}"`);
        return;
      }

      const module = await loader();
      module.default();
    })
  );
}
