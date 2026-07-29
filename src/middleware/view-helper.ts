import type { Request, Response, NextFunction } from 'express';

export function viewHelpers(_req: Request, res: Response, next: NextFunction) {
  res.locals.formatDateTime = (date: Date | null) => {
    if (!date) return '-';
    return new Intl.DateTimeFormat('id-ID', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(new Date(date));
  };

  res.locals.formatLastSeen = (date: Date | null) => {
    if (!date) return 'Belum pernah online';

    const diffMs = Date.now() - new Date(date).getTime();
    const diffMinutes = Math.floor(diffMs / 60_000);

    if (diffMinutes < 1) return 'Baru saja';
    if (diffMinutes < 60) return `${diffMinutes} menit lalu`;

    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours < 24) return `${diffHours} jam lalu`;

    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays} hari lalu`;
  };

  res.locals.stateLabelMap = {
    NORMAL: 'Normal',
    DEFROST: 'Defrost',
    WARNING: 'Peringatan',
    CRITICAL: 'Kritis',
    OFFLINE: 'Offline',
  };

  next();
}
