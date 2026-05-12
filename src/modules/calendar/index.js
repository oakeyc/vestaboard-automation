import { authorize } from './auth.js';
import { getTodayEvents } from './events.js';
import { formatEventsForNote } from './format.js';

export async function getTodayNoteLines({ calendarId = 'primary', rows } = {}) {
  const auth = await authorize();
  const events = await getTodayEvents(auth, { calendarId });
  const timed = events.filter((e) => e.start?.dateTime);
  return formatEventsForNote(timed, rows === undefined ? {} : { rows });
}

export { formatEventsForNote } from './format.js';
