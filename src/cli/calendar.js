import { getTodayNoteLines } from '../modules/calendar/index.js';
import { VestaboardClient } from '../vestaboard/client.js';
import { config, getBaseUrl, requireApiKey } from '../config.js';
import { runCli } from './_runCli.js';

await runCli(async () => {
  const shouldSend = process.argv.includes('--send');
  if (shouldSend) requireApiKey();

  const lines = await getTodayNoteLines({ calendarId: config.googleCalendarId });
  const text = lines.join('\n');

  console.log('Calendar message (3x15):');
  console.log('+---------------+');
  for (const line of lines) {
    console.log(`|${line.padEnd(15, ' ')}|`);
  }
  console.log('+---------------+');

  if (shouldSend) {
    const client = new VestaboardClient({ apiKey: requireApiKey(), baseUrl: getBaseUrl() });
    const result = await client.sendText(text);
    console.log('Sent:', JSON.stringify(result));
  } else {
    console.log('(dry run — pass --send to push to the board)');
  }
});
