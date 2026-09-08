import type { Request, Response, NextFunction } from 'express';

/**
 * Single source of truth for view helpers used across EJS templates.
 *
 * NOTE: `stateLabelMap` and `formatLastSeen` are intentionally mirrored in
 * `public/js/device-status.js`, because that script updates the DOM directly
 * from SSE events without a server round-trip. If you change the wording
 * here, update that file too so the initial server-rendered page and the
 * live SSE updates never drift apart.
 */
export const stateLabelMap = {
  NORMAL: 'Active Stable',
  DEFROST: 'Defrost Cycle',
  WARNING: 'Temp High',
  CRITICAL: 'Critical Alert',
  OFFLINE: 'No Signal',
} as const;

export function formatDateTime(date: Date | null): string {
  if (!date) return '-';
  return new Intl.DateTimeFormat('en-US', {
    dateStyle: 'medium',
    timeStyle: 'medium',
    timeZone: 'Asia/Jakarta',
  }).format(new Date(date));
}

export function formatLastSeen(date: Date | null): string {
  if (!date) return 'Never seen';

  const diffMs = Date.now() - new Date(date).getTime();
  const diffMinutes = Math.floor(diffMs / 60_000);

  if (diffMinutes < 1) return 'Just now';
  if (diffMinutes < 60) return `${diffMinutes} min ago`;

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours} hr ago`;

  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
}

export function viewHelpers(_req: Request, res: Response, next: NextFunction) {
  res.locals.formatDateTime = formatDateTime;
  res.locals.formatLastSeen = formatLastSeen;
  res.locals.stateLabelMap = stateLabelMap;
  next();
}
