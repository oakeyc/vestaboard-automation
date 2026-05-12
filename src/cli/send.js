import { VestaboardClient } from '../vestaboard/client.js';
import { requireApiKey } from '../config.js';
import { runCli } from './_runCli.js';

await runCli(async () => {
  const text = process.argv.slice(2).join(' ');
  if (!text) {
    throw new Error('Usage: npm run send -- "your message"');
  }
  const client = new VestaboardClient({ apiKey: requireApiKey() });
  const result = await client.sendText(text);
  console.log(JSON.stringify(result, null, 2));
});
