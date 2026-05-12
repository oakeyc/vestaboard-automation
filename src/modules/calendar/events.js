import { google } from 'googleapis';
import { describeAuthError, isAuthError } from './auth.js';

export async function getTodayEvents(auth, { calendarId = 'primary', now = new Date() } = {}) {
  const calendar = google.calendar({ version: 'v3', auth });
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);

  try {
    const res = await calendar.events.list({
      calendarId,
      timeMin: startOfDay.toISOString(),
      timeMax: endOfDay.toISOString(),
      singleEvents: true,
      orderBy: 'startTime',
    });
    return res.data.items ?? [];
  } catch (err) {
    if (isAuthError(err)) throw new Error(describeAuthError(), { cause: err });
    throw err;
  }
}
