function formatLastSeen(date: Date | string) {
  if (!date) return 'Belum pernah terlihat';
  const diffMs = Date.now() - new Date(date).getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return 'Baru saja';
  if (diffMin < 60) return `${diffMin} mnt lalu`;
  const diffHour = Math.floor(diffMin / 60);
  return `${diffHour} jam lalu`;
}

const stateLabelMap = {
  NORMAL: 'Active Stable',
  DEFROST: 'Defrost Cycle',
  WARNING: 'Temp High',
  CRITICAL: 'Critical Alert',
  OFFLINE: 'No Signal',
};

export { formatLastSeen, stateLabelMap };
