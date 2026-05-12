const DEFAULT_MIN_INTERVAL_MS = 15_000;

export class RateLimitedSender {
  #client;
  #minIntervalMs;
  #queue = Promise.resolve();
  #lastSendAt = 0;

  constructor(client, { minIntervalMs = DEFAULT_MIN_INTERVAL_MS } = {}) {
    this.#client = client;
    this.#minIntervalMs = minIntervalMs;
  }

  sendText(text, options) {
    return this.#enqueue(() => this.#client.sendText(text, options));
  }

  sendCharacters(characters, options) {
    return this.#enqueue(() => this.#client.sendCharacters(characters, options));
  }

  #enqueue(work) {
    const next = this.#queue.then(async () => {
      const sinceLast = Date.now() - this.#lastSendAt;
      const wait = Math.max(0, this.#minIntervalMs - sinceLast);
      if (wait > 0) {
        console.log(`[sender] throttling ${wait}ms (rate limit)`);
        await new Promise((r) => setTimeout(r, wait));
      }
      const result = await work();
      this.#lastSendAt = Date.now();
      return result;
    });
    this.#queue = next.then(
      () => undefined,
      () => undefined,
    );
    return next;
  }
}
