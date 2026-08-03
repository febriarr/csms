/**
 * Random delay dalam rentang tertentu, biar pattern kirim gak seragam.
 * Severity tinggi -> rentang lebih pendek (alert harus cepat sampai),
 *
 */
export function getDynamicDelay(severity: 'WARNING' | 'CRITICAL' | 'OFFLINE'): number {
  const ranges: Record<typeof severity, [number, number]> = {
    CRITICAL: [1500, 3500], // 1.5s - 3.5s
    OFFLINE: [2000, 4500],
    WARNING: [3000, 6000], // 3s - 6s, lebih santai
  };

  const [min, max] = ranges[severity];
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export function toWhatsAppJid(target: string): string {
  // handle jika target udah ada @s.whatsapp.net atau belum
  if (target.includes('@')) return target;

  let normalized = target.replace(/\D/g, ''); // buang non-digit

  // handle 08xxx -> 628xxx
  if (normalized.startsWith('0')) {
    normalized = '62' + normalized.slice(1);
  }

  return `${normalized}@s.whatsapp.net`;
}
