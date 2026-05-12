import { promises as fs } from 'node:fs';
import path from 'node:path';
import { authenticate } from '@google-cloud/local-auth';
import { google } from 'googleapis';

const SCOPES = ['https://www.googleapis.com/auth/calendar.readonly'];
const CREDENTIALS_PATH = path.resolve('credentials.json');
const TOKEN_PATH = path.resolve('token.json');

const SETUP_HINT = 'See CLAUDE.md "Google Calendar setup" for how to create credentials.json.';

async function fileExists(p) {
  try {
    await fs.access(p);
    return true;
  } catch {
    return false;
  }
}

async function readJsonFile(filepath, label) {
  const content = await fs.readFile(filepath, 'utf8');
  try {
    return JSON.parse(content);
  } catch (err) {
    throw new Error(
      `${label} at ${filepath} is not valid JSON: ${err.message}. ` +
        'Re-download the file or delete it and re-run.',
    );
  }
}

async function loadCredentials() {
  if (!(await fileExists(CREDENTIALS_PATH))) {
    throw new Error(`Missing credentials.json at ${CREDENTIALS_PATH}.\n${SETUP_HINT}`);
  }
  const data = await readJsonFile(CREDENTIALS_PATH, 'credentials.json');
  const key = data.installed || data.web;
  if (!key?.client_id || !key?.client_secret) {
    throw new Error(
      `credentials.json at ${CREDENTIALS_PATH} is missing client_id or client_secret. ` +
        `Expected an OAuth 2.0 "Desktop app" credential from Google Cloud Console.\n${SETUP_HINT}`,
    );
  }
  return key;
}

async function loadSavedToken() {
  if (!(await fileExists(TOKEN_PATH))) return null;

  const data = await readJsonFile(TOKEN_PATH, 'token.json');
  const missing = ['client_id', 'client_secret', 'refresh_token'].filter((k) => !data[k]);
  if (missing.length) {
    throw new Error(
      `token.json at ${TOKEN_PATH} is incomplete (missing: ${missing.join(', ')}). ` +
        'Delete the file and re-run to re-authorize.',
    );
  }
  try {
    return google.auth.fromJSON(data);
  } catch (err) {
    throw new Error(
      `Failed to load saved token from ${TOKEN_PATH}: ${err.message}. ` +
        'Delete the file and re-run to re-authorize.',
    );
  }
}

async function persistToken(client, credKey) {
  const payload = JSON.stringify({
    type: 'authorized_user',
    client_id: credKey.client_id,
    client_secret: credKey.client_secret,
    refresh_token: client.credentials.refresh_token,
  });
  await fs.writeFile(TOKEN_PATH, payload);
}

export async function authorize() {
  const saved = await loadSavedToken();
  if (saved) return saved;

  const credKey = await loadCredentials();
  const client = await authenticate({ scopes: SCOPES, keyfilePath: CREDENTIALS_PATH });

  if (!client.credentials?.refresh_token) {
    console.warn(
      'Warning: Google did not return a refresh_token, so token.json was not written. ' +
        'This usually means this client has already been authorized for your account. ' +
        'Revoke access at https://myaccount.google.com/permissions and re-run to get a fresh refresh token.',
    );
    return client;
  }

  await persistToken(client, credKey);
  return client;
}
