const source = new EventSource('/events/device-status');

// Mirrors src/middleware/view-helper.ts — keep both in sync.
const stateLabelMap = {
  NORMAL: 'Active Stable',
  DEFROST: 'Defrost Cycle',
  WARNING: 'Temp High',
  CRITICAL: 'Critical Alert',
  OFFLINE: 'No Signal',
};

function formatLastSeen(dateStr) {
  if (!dateStr) return 'Never seen';

  const diffMinutes = Math.floor((Date.now() - new Date(dateStr).getTime()) / 60000);
  if (diffMinutes < 1) return 'Just now';
  if (diffMinutes < 60) return `${diffMinutes} min ago`;

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours} hr ago`;

  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
}

source.addEventListener('device-update', event => {
  const device = JSON.parse(event.data);
  const card = document.getElementById(`device-${device.id}`);
  if (!card) return;

  // badge status
  const badge = card.querySelector('.status-badge');
  badge.className = `status-badge status-${device.state.toLowerCase()}`;
  badge.textContent = device.state;

  // gauge box
  const gaugeBox = card.querySelector('.gauge-box');
  gaugeBox.className = `gauge-box status-${device.state.toLowerCase()}`;

  // temperature — omitted on events that don't carry a fresh reading (e.g. offline detection)
  if (device.lastTemperature !== undefined && device.lastTemperature !== null) {
    card.querySelector('.temp-value').textContent = `${device.lastTemperature} °C`;
  }

  // state label
  card.querySelector('.state-label').textContent = stateLabelMap[device.state] ?? '-';

  // last seen
  card.querySelector('.last-seen-label').textContent = formatLastSeen(device.lastSeenAt);
});

source.onerror = () => console.warn('SSE disconnected, browser will reconnect automatically...');
