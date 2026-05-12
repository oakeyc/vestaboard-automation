const VBML_FORMAT_URL = 'https://vbml.vestaboard.com/format';

export async function formatVBML(message, { fetch: fetchImpl = globalThis.fetch } = {}) {
  const res = await fetchImpl(VBML_FORMAT_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message }),
  });
  if (!res.ok) {
    throw new Error(`VBML format failed: ${res.status}`);
  }
  return res.json();
}
