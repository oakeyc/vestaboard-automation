const DEFAULT_BASE_URL = 'https://cloud.vestaboard.com';

export class VestaboardError extends Error {
  constructor(message, { status, body } = {}) {
    super(message);
    this.name = 'VestaboardError';
    this.status = status;
    this.body = body;
  }
}

export class VestaboardClient {
  constructor({ apiKey, baseUrl = DEFAULT_BASE_URL, fetch: fetchImpl = globalThis.fetch } = {}) {
    if (!apiKey) throw new Error('VestaboardClient requires an apiKey');
    if (!fetchImpl) throw new Error('No fetch implementation available (Node 18+ required)');
    this.apiKey = apiKey;
    this.baseUrl = baseUrl;
    this.fetch = fetchImpl;
  }

  async #request(path, { method = 'GET', body } = {}) {
    const res = await this.fetch(`${this.baseUrl}${path}`, {
      method,
      headers: {
        'X-Vestaboard-Token': this.apiKey,
        'Content-Type': 'application/json',
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const text = await res.text();
    let parsed;
    try {
      parsed = text ? JSON.parse(text) : null;
    } catch {
      parsed = text;
    }
    if (!res.ok) {
      throw new VestaboardError(`Vestaboard ${method} ${path} failed: ${res.status}`, {
        status: res.status,
        body: parsed,
      });
    }
    return parsed;
  }

  read() {
    return this.#request('/');
  }

  sendText(text, { forced = false } = {}) {
    return this.#request('/', { method: 'POST', body: { text, forced } });
  }

  sendCharacters(characters, { forced = false } = {}) {
    return this.#request('/', { method: 'POST', body: { characters, forced } });
  }

  getTransition() {
    return this.#request('/transition');
  }

  setTransition({ transition, transitionSpeed } = {}) {
    return this.#request('/transition', {
      method: 'PUT',
      body: { transition, transitionSpeed },
    });
  }
}
