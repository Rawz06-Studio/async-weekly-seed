export function timeStringToSeconds(time: string): number | null {
  const lower = time.trim().toLowerCase();
  if (!lower || lower === 'ff' || lower === 'forfeit') return null;
  const parts = lower.split(':').map(Number);
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  return null;
}

export function secondsToTimeString(seconds: number | null): string {
  if (seconds === null) return 'Forfeit';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}
