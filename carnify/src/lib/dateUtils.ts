// ART = America/Argentina/Buenos_Aires = UTC-3, no DST since 2000
const ART_OFFSET_MS = 3 * 60 * 60 * 1000;

function toART(date: Date): Date {
  return new Date(date.getTime() - ART_OFFSET_MS);
}

function fromART(artDate: Date): Date {
  return new Date(artDate.getTime() + ART_OFFSET_MS);
}

export function startOfDay(date: Date): Date {
  const art = toART(date);
  art.setUTCHours(0, 0, 0, 0);
  return fromART(art);
}

export function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * 86400000);
}

export function startOfMonth(date: Date): Date {
  const art = toART(date);
  art.setUTCDate(1);
  art.setUTCHours(0, 0, 0, 0);
  return fromART(art);
}

export function startOfNextMonth(date: Date): Date {
  const art = toART(date);
  art.setUTCMonth(art.getUTCMonth() + 1);
  art.setUTCDate(1);
  art.setUTCHours(0, 0, 0, 0);
  return fromART(art);
}

export function getARTHour(date: Date): number {
  return toART(date).getUTCHours();
}

export function getARTDayOfWeek(date: Date): number {
  return toART(date).getUTCDay();
}
