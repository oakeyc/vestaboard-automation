import { getTodayNoteLines } from '../modules/calendar/index.js';
import { config } from '../config.js';

export function calendarJob({ sender }) {
  return {
    name: 'calendar',
    schedule: process.env.CALENDAR_CRON || '0 7 * * *',
    timezone: process.env.CALENDAR_TZ,
    async run() {
      const lines = await getTodayNoteLines({ calendarId: config.googleCalendarId });
      const text = lines.join('\n');
      for (const line of lines) console.log(`[calendar]   ${line}`);
      await sender.sendText(text);
    },
  };
}
