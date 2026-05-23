export function formatTime(seconds: number | null): string {
  if (seconds === null) return 'Forfeit'
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

export function formatDate(iso: string, opts: Intl.DateTimeFormatOptions = {}): string {
  return new Date(iso).toLocaleString('en-GB', { timeZone: 'Europe/Paris', ...opts })
}
