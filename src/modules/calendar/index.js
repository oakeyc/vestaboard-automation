import { authorize } from './auth.js';
import { getTodayEvents } from './events.js';
import { formatEventsForNote } from './format.js';

export async function getTodayNoteLines({ calendarId = 'primary' } = {}) {
  const auth = await authorize();
  const events = await getTodayEvents(auth, { calendarId });
  return formatEventsForNote(events);
}

export { formatEventsForNote } from './format.js';
