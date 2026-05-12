import { VestaboardClient } from './vestaboard/client.js';
import { requireApiKey } from './config.js';
import { runCli } from './cli/_runCli.js';

await runCli(async () => {
  const client = new VestaboardClient({ apiKey: requireApiKey() });
  const current = await client.read();
  console.log('Current message:', JSON.stringify(current, null, 2));
});
