import { authorize } from '../modules/calendar/auth.js';
import { runCli } from './_runCli.js';

await runCli(async () => {
  await authorize({ forceReauth: true });
  console.log('Authorized. Refresh token saved to token.json.');
});
