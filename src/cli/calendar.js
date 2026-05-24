import { getTodayNoteLines } from '../modules/calendar/index.js';
import { NOTE_ROWS } from '../modules/calendar/format.js';
import { VestaboardClient } from '../vestaboard/client.js';
import { config, getBaseUrl, requireApiKey } from '../config.js';
import { runCli } from './_runCli.js';

const PAGE_DELAY_MS = 20_000;

function chunk(arr, size) {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

await runCli(async () => {
  const shouldSend = process.argv.includes('--send');
  if (shouldSend) requireApiKey();

  const now = new Date();
  const dateLine = `${String(now.getMonth() + 1).padStart(2, '0')}/${String(now.getDate()).padStart(2, '0')}`;
  const eventLines = await getTodayNoteLines({
    calendarId: config.googleCalendarId,
    rows: Number.POSITIVE_INFINITY,
  });

  const eventRowsPerPage = NOTE_ROWS - 1;
  const pages = chunk(eventLines, eventRowsPerPage).map((events) => [dateLine, ...events]);

  console.log(`Calendar message (3x15) — ${pages.length} page${pages.length === 1 ? '' : 's'}:`);
  for (const [i, page] of pages.entries()) {
    if (pages.length > 1) console.log(`Page ${i + 1}:`);
    console.log('+---------------+');
    for (const line of page) {
      console.log(`|${line.padEnd(15, ' ')}|`);
    }
    console.log('+---------------+');
  }

  if (shouldSend) {
    const client = new VestaboardClient({ apiKey: requireApiKey(), baseUrl: getBaseUrl() });
    for (const [i, page] of pages.entries()) {
      const result = await client.sendText(page.join('\n'));
      console.log(`Sent page ${i + 1}/${pages.length}:`, JSON.stringify(result));
      if (i < pages.length - 1) {
        console.log(`Waiting ${PAGE_DELAY_MS / 1000}s before next page...`);
        await sleep(PAGE_DELAY_MS);
      }
    }
  } else {
    console.log('(dry run — pass --send to push to the board)');
  }
});
