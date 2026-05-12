import { VestaboardClient } from '../vestaboard/client.js';
import { getBaseUrl, requireApiKey } from '../config.js';
import { Scheduler } from './scheduler.js';
import { RateLimitedSender } from './sender.js';
import { jobFactories } from '../jobs/index.js';

async function main() {
  const apiKey = requireApiKey();
  const client = new VestaboardClient({ apiKey, baseUrl: getBaseUrl() });
  const sender = new RateLimitedSender(client);
  const scheduler = new Scheduler({ timezone: process.env.TZ });

  for (const factory of jobFactories) {
    scheduler.register(factory({ sender }));
  }

  console.log(`[server] running ${scheduler.jobNames().length} job(s). Ctrl+C to stop.`);

  const shutdown = (signal) => {
    console.log(`\n[server] received ${signal}, shutting down`);
    scheduler.stop();
    process.exit(0);
  };
  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

main().catch((err) => {
  console.error(`Error: ${err.message}`);
  if (process.env.DEBUG) console.error(err.stack);
  process.exit(1);
});
