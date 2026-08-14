export function formatSlot(slotStart: string, timeZone?: string): string {
  const date = new Date(slotStart);
  return new Intl.DateTimeFormat('en', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZone,
  }).format(date);
}
