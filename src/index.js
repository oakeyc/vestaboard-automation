import { VestaboardClient } from './vestaboard/client.js';
import { charactersToText } from './vestaboard/characters.js';
import { getBaseUrl, requireApiKey } from './config.js';
import { runCli } from './cli/_runCli.js';

await runCli(async () => {
  const client = new VestaboardClient({ apiKey: requireApiKey(), baseUrl: getBaseUrl() });
  const current = await client.read();
  const layout = current?.currentMessage?.layout ?? current?.layout ?? current?.characters;
  console.log('Current message:');
  console.log(charactersToText(layout));
});
