import { byId } from '../lib/dom';
import type { UI5Dialog, UI5Tag } from '../lib/ui5-types';

/**
 * Mirrors `stateLabelMap` / `formatLastSeen` from `src/middleware/view-helper.ts`
 * (the server-rendered page and the live SSE updates must show the same wording).
 */
const stateLabelMap: Record<string, string> = {
  NORMAL: 'Active Stable',
  DEFROST: 'Defrost Cycle',
  WARNING: 'Temp High',
  CRITICAL: 'Critical Alert',
  OFFLINE: 'No Signal',
};

const stateTagDesign: Record<string, string> = {
  NORMAL: 'Positive',
  WARNING: 'Critical',
  CRITICAL: 'Negative',
  DEFROST: 'Information',
};

type DeviceUpdate = {
  id: string;
  state: string;
  lastTemperature?: number | string | null;
  lastSeenAt?: string | null;
};

function formatLastSeen(dateStr?: string | null): string {
  if (!dateStr) return 'Never seen';

  const diffMinutes = Math.floor((Date.now() - new Date(dateStr).getTime()) / 60000);
  if (diffMinutes < 1) return 'Just now';
  if (diffMinutes < 60) return `${diffMinutes} min ago`;

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours} hr ago`;

  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
}

function applyDeviceUpdate(device: DeviceUpdate): void {
  const card = byId(`device-${device.id}`);

  if (!card) return;

  const stateClass = `status-${device.state.toLowerCase()}`;

  const badge = card.querySelector<UI5Tag>('.status-badge');
  if (badge) {
    badge.className = `status-badge ${stateClass}`;
    badge.design = stateTagDesign[device.state] ?? 'Neutral';
    badge.textContent = device.state;
  }

  const gaugeBox = card.querySelector<HTMLElement>('.gauge-box');
  if (gaugeBox) gaugeBox.className = `gauge-box ${stateClass}`;

  // temperature — omitted on events that don't carry a fresh reading (e.g. offline detection)
  if (device.lastTemperature !== undefined && device.lastTemperature !== null) {
    const temperature = card.querySelector('.temp-value');
    if (temperature) temperature.textContent = `${device.lastTemperature} °C`;
  }

  const stateLabel = card.querySelector('.state-label');
  if (stateLabel) stateLabel.textContent = stateLabelMap[device.state] ?? '-';

  const lastSeen = card.querySelector('.last-seen-label');
  if (lastSeen) lastSeen.textContent = formatLastSeen(device.lastSeenAt);
}

function initAlertHistoryDialog(): void {
  const dialog = byId<UI5Dialog>('log-history-dialog');

  if (!dialog) return;

  document.addEventListener('click', event => {
    const target = event.target as Element | null;

    if (target?.closest('.btn-view-alerts')) {
      // Drop the previous device's history so it is not shown while the new one loads.
      byId('alert-modal-body')?.replaceChildren();
      dialog.open = true;
    }
  });

  byId('log-history-close')?.addEventListener('click', () => {
    dialog.open = false;
  });
}

export default function init(): void {
  initAlertHistoryDialog();

  const source = new EventSource('/events/device-status');

  source.addEventListener('device-update', event => {
    applyDeviceUpdate(JSON.parse((event as MessageEvent<string>).data) as DeviceUpdate);
  });

  source.onerror = () => console.warn('SSE disconnected, browser will reconnect automatically...');
}
