export const zone = 'America/Santo_Domingo';
export const date = (
  value: string,
  options: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'long' },
) => new Intl.DateTimeFormat('es-DO', { timeZone: zone, ...options }).format(new Date(value));
export const time = (value: string) => date(value, { hour: 'numeric', minute: '2-digit' });
export const uid = () => crypto.randomUUID();
export const initials = (s: string) =>
  s
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0])
    .join('')
    .toUpperCase();
export function localInput(value: string) {
  const parts = new Intl.DateTimeFormat('sv-SE', {
    timeZone: zone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).format(new Date(value));
  return parts.replace(' ', 'T');
}
export const fromLocalInput = (value: string) => new Date(`${value}:00-04:00`).toISOString();
export function safeUrl(value: string) {
  try {
    const u = new URL(value);
    return ['https:', 'http:'].includes(u.protocol) ? u.href : '';
  } catch {
    return value.startsWith('/') && !value.startsWith('//') ? value : '';
  }
}
export function youtubeId(value: string) {
  try {
    const u = new URL(value);
    if (u.hostname === 'youtu.be')
      return /^[\w-]{11}$/.test(u.pathname.slice(1)) ? u.pathname.slice(1) : null;
    if (['www.youtube.com', 'youtube.com', 'www.youtube-nocookie.com'].includes(u.hostname)) {
      const id = u.searchParams.get('v') || u.pathname.split('/').pop() || '';
      return /^[\w-]{11}$/.test(id) ? id : null;
    }
  } catch {
    /* Invalid URL */
  }
  return null;
}
export function download(name: string, contents: string, type = 'text/plain') {
  const url = URL.createObjectURL(new Blob([contents], { type }));
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export function csv(rows: string[][]) {
  return (
    '\ufeff' +
    rows
      .map((row) =>
        row
          .map(
            (value) =>
              '"' + (/^[=+@\-\t\r]/.test(value) ? "'" + value : value).replaceAll('"', '""') + '"',
          )
          .join(','),
      )
      .join('\r\n')
  );
}
export function calendarFile(event: {
  id: string;
  title: string;
  description: string;
  starts_at: string;
  ends_at: string;
  location: string;
}) {
  const stamp = (v: string) =>
    new Date(v)
      .toISOString()
      .replace(/[-:]/g, '')
      .replace(/\.\d{3}/, '');
  const escape = (v: string) =>
    v
      .replaceAll('\\', '\\\\')
      .replaceAll('\n', '\\n')
      .replaceAll(',', '\\,')
      .replaceAll(';', '\\;')
      .replaceAll('\r', '');
  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Shakers//Comunidad//ES',
    'BEGIN:VEVENT',
    `UID:${event.id}@shakers`,
    `DTSTAMP:${stamp(new Date().toISOString())}`,
    `DTSTART:${stamp(event.starts_at)}`,
    `DTEND:${stamp(event.ends_at)}`,
    `SUMMARY:${escape(event.title)}`,
    `DESCRIPTION:${escape(event.description)}`,
    `LOCATION:${escape(event.location)}`,
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n');
}

export function safeNext(value: string | null) {
  return value &&
    /^\/(?:app(?:\/(?:agenda|comunidad|recursos|mi-espacio))?|admin|eventos\/[a-zA-Z0-9-]+)$/.test(
      value,
    )
    ? value
    : '/app';
}
