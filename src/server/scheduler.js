import cron from 'node-cron';

export class Scheduler {
  #defaultTimezone;
  #tasks = new Map();

  constructor({ timezone } = {}) {
    this.#defaultTimezone = timezone;
  }

  register(job) {
    const { name, schedule, run, timezone = this.#defaultTimezone } = job;
    if (!name) throw new Error('Job is missing "name"');
    if (typeof run !== 'function') throw new Error(`Job "${name}" is missing "run" function`);
    if (this.#tasks.has(name)) throw new Error(`Duplicate job name: ${name}`);
    if (!cron.validate(schedule)) {
      throw new Error(`Invalid cron expression for job "${name}": "${schedule}"`);
    }

    let inFlight = false;
    const task = cron.schedule(
      schedule,
      async () => {
        if (inFlight) {
          console.log(`[${name}] previous run still in progress, skipping`);
          return;
        }
        inFlight = true;
        const startedAt = Date.now();
        console.log(`[${name}] start`);
        try {
          await run();
          console.log(`[${name}] ok in ${Date.now() - startedAt}ms`);
        } catch (err) {
          console.error(`[${name}] failed: ${err.message}`);
          if (process.env.DEBUG) console.error(err.stack);
        } finally {
          inFlight = false;
        }
      },
      { timezone },
    );

    this.#tasks.set(name, task);
    const tz = timezone ? ` tz=${timezone}` : '';
    console.log(`[scheduler] registered "${name}" schedule="${schedule}"${tz}`);
  }

  stop() {
    for (const [name, task] of this.#tasks) {
      task.stop();
      console.log(`[scheduler] stopped "${name}"`);
    }
  }

  jobNames() {
    return [...this.#tasks.keys()];
  }
}
