const source = new EventSource('/events/device-status');

const stateLabelMap = {
  NORMAL: 'Active Stable',
  DEFROST: 'Defrost Cycle',
  WARNING: 'Temp High',
  CRITICAL: 'Critical Alert',
  OFFLINE: 'No Signal',
};

function formatLastSeen(dateStr) {
  const diffMin = Math.floor((Date.now() - new Date(dateStr).getTime()) / 60000);
  if (diffMin < 1) return 'Baru saja';
  if (diffMin < 60) return `${diffMin} mnt lalu`;
  return `${Math.floor(diffMin / 60)} jam lalu`;
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

  // temperature
  card.querySelector('.temp-value').textContent = `${device.lastTemperature} °C`;

  // state label
  card.querySelector('.state-label').textContent = stateLabelMap[device.state] ?? '-';

  // last seen
  card.querySelector('.last-seen-label').textContent = formatLastSeen(device.lastSeenAt);
});

source.onerror = () => console.warn('SSE terputus, browser akan reconnect otomatis...');
