export const NOTE_ROWS = 3;
export const NOTE_COLS = 15;

const ALLOWED = /[A-Z0-9 !@#$()\-+&=;:'"%,./?]/g;

function sanitize(text) {
  return text.toUpperCase().replace(/&/g, 'AND').match(ALLOWED)?.join('') ?? '';
}

function formatTime(date) {
  const h = date.getHours();
  const m = date.getMinutes();
  const period = h >= 12 ? 'P' : 'A';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return m === 0 ? `${h12}${period}` : `${h12}:${String(m).padStart(2, '0')}${period}`;
}

function isAllDay(event) {
  return Boolean(event.start?.date) && !event.start?.dateTime;
}

function eventLine(event, cols) {
  const title = sanitize(event.summary || 'BUSY');
  if (isAllDay(event)) {
    return title.slice(0, cols);
  }
  const start = new Date(event.start.dateTime);
  const time = formatTime(start);
  const prefix = `${time} `;
  const room = cols - prefix.length;
  if (room <= 0) return time.slice(0, cols);
  return prefix + title.slice(0, room);
}

export function formatEventsForNote(events, { rows = NOTE_ROWS, cols = NOTE_COLS } = {}) {
  if (!events.length) {
    return ['NO EVENTS TODAY'.slice(0, cols)];
  }

  if (events.length <= rows) {
    return events.map((e) => eventLine(e, cols));
  }

  const shown = events.slice(0, rows - 1).map((e) => eventLine(e, cols));
  const remaining = events.length - (rows - 1);
  shown.push(`+${remaining} MORE`.slice(0, cols));
  return shown;
}
