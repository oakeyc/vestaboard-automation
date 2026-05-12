import { VestaboardClient } from '../vestaboard/client.js';
import { getBaseUrl, requireApiKey } from '../config.js';
import { runCli } from './_runCli.js';

await runCli(async () => {
  const client = new VestaboardClient({ apiKey: requireApiKey(), baseUrl: getBaseUrl() });
  const current = await client.read();
  console.log(JSON.stringify(current, null, 2));
});
