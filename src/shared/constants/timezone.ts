/**
 * Single source of truth for the app's operating timezone.
 *
 * WIB (Asia/Jakarta, UTC+7) has no DST, so a fixed offset string is safe
 * here — no timezone library needed. If devices ever run in WITA (UTC+8)
 * or WIT (UTC+9), update both constants together.
 */
export const APP_TIMEZONE = 'Asia/Jakarta';
export const APP_UTC_OFFSET = '+07:00';

export function getTodayDateStringInAppTimezone(): string {
  const nowWib = new Date(new Date().toLocaleString('en-US', { timeZone: APP_TIMEZONE }));
  const y = nowWib.getFullYear();
  const m = String(nowWib.getMonth() + 1).padStart(2, '0');
  const d = String(nowWib.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function getTodayRangeInAppTimezone(): { from: Date; to: Date } {
  const dateStr = getTodayDateStringInAppTimezone();

  const from = new Date(`${dateStr}T00:00:00.000${APP_UTC_OFFSET}`);
  const to = new Date(from);
  to.setUTCDate(to.getUTCDate() + 1);

  return { from, to };
}
