import { promises as fs } from 'node:fs';
import http from 'node:http';
import { spawn } from 'node:child_process';
import crypto from 'node:crypto';
import path from 'node:path';
import { URL } from 'node:url';
import { google } from 'googleapis';
import { requireGoogleOauthClient } from '../../config.js';

const SCOPES = ['https://www.googleapis.com/auth/calendar.readonly'];
const TOKEN_PATH = path.resolve('token.json');

const REAUTH_HINT = 'Run `npm run calendar:auth` to re-authorize.';

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
        'Delete the file and re-run to re-authorize.',
    );
  }
}

function buildOauthClient({ clientId, clientSecret, redirectUri }) {
  return new google.auth.OAuth2(clientId, clientSecret, redirectUri);
}

async function loadSavedToken(creds) {
  if (!(await fileExists(TOKEN_PATH))) return null;

  const data = await readJsonFile(TOKEN_PATH, 'token.json');
  if (!data.refresh_token) {
    throw new Error(
      `token.json at ${TOKEN_PATH} is missing refresh_token. Delete the file and ${REAUTH_HINT}`,
    );
  }
  const client = buildOauthClient(creds);
  client.setCredentials({ refresh_token: data.refresh_token });
  return client;
}

async function persistToken(client) {
  const payload = JSON.stringify({ refresh_token: client.credentials.refresh_token });
  // 0600: token is owner-readable only. Use a stable mode regardless of umask.
  await fs.writeFile(TOKEN_PATH, payload, { mode: 0o600 });
  try {
    await fs.chmod(TOKEN_PATH, 0o600);
  } catch {
    // chmod can fail on some filesystems (e.g. mounted shares). Best-effort.
  }
}

function tryOpenBrowser(url) {
  const opener =
    process.platform === 'darwin' ? 'open' : process.platform === 'win32' ? 'start' : 'xdg-open';
  try {
    const child = spawn(opener, [url], { stdio: 'ignore', detached: true });
    child.unref();
    return true;
  } catch {
    return false;
  }
}

function isLoopbackHostHeader(host) {
  if (!host) return false;
  // Strip the optional :port and surrounding brackets for IPv6.
  // Examples: "127.0.0.1:53123", "[::1]:53123", "localhost:53123".
  const hostname = host
    .replace(/:\d+$/, '')
    .replace(/^\[|\]$/g, '')
    .toLowerCase();
  return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1';
}

async function captureAuthCode(redirectUri, expectedState) {
  const parsed = new URL(redirectUri);
  const port = Number(parsed.port);
  const expectedPath = parsed.pathname;

  return new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => {
      // Reject non-loopback Host headers to mitigate DNS-rebinding attacks
      // where a malicious page resolves its hostname to 127.0.0.1 and POSTs
      // here from the user's browser.
      if (!isLoopbackHostHeader(req.headers.host)) {
        res.statusCode = 400;
        res.end('Bad host');
        return;
      }

      // req.url is typically an origin-form path (e.g. "/oauth/callback?...").
      // If a client sends absolute-form, refuse it rather than letting URL
      // resolution silently change the base.
      if (!req.url?.startsWith('/')) {
        res.statusCode = 400;
        res.end('Bad request');
        return;
      }

      const url = new URL(req.url, redirectUri);
      if (url.pathname !== expectedPath) {
        res.statusCode = 404;
        res.end('Not found');
        return;
      }
      const error = url.searchParams.get('error');
      const code = url.searchParams.get('code');
      const state = url.searchParams.get('state');
      res.statusCode = 200;
      res.setHeader('Content-Type', 'text/plain');
      if (error) {
        res.end(`Authorization failed: ${error}. You can close this window.`);
        server.close();
        reject(new Error(`Google returned error: ${error}`));
        return;
      }
      // Validate state with a constant-time comparison to prevent CSRF where
      // a third party tricks the browser into delivering their auth code to
      // our loopback server.
      if (!state || !expectedState || state.length !== expectedState.length) {
        res.statusCode = 400;
        res.end('Invalid state. You can close this window.');
        server.close();
        reject(new Error('OAuth state mismatch (possible CSRF). Re-run authorization.'));
        return;
      }
      const stateOk = crypto.timingSafeEqual(Buffer.from(state), Buffer.from(expectedState));
      if (!stateOk) {
        res.statusCode = 400;
        res.end('Invalid state. You can close this window.');
        server.close();
        reject(new Error('OAuth state mismatch (possible CSRF). Re-run authorization.'));
        return;
      }
      if (!code) {
        res.end('Missing authorization code. You can close this window.');
        server.close();
        reject(new Error('Google redirect did not include an authorization code.'));
        return;
      }
      res.end('Authorized. You can close this window.');
      server.close();
      resolve(code);
    });

    server.on('error', (err) => reject(err));
    server.listen(port, parsed.hostname);
  });
}

async function runConsentFlow(creds) {
  const client = buildOauthClient(creds);
  const state = crypto.randomBytes(32).toString('base64url');
  const authUrl = client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
    prompt: 'consent',
    state,
  });

  console.log('Opening browser to authorize Google Calendar access.');
  console.log(`If it does not open, visit:\n  ${authUrl}`);
  tryOpenBrowser(authUrl);

  const code = await captureAuthCode(creds.redirectUri, state);
  const { tokens } = await client.getToken(code);
  client.setCredentials(tokens);

  if (!tokens.refresh_token) {
    console.warn(
      'Warning: Google did not return a refresh_token. This usually means this client has ' +
        'already been authorized for your account. Revoke access at ' +
        'https://myaccount.google.com/permissions and re-run to get a fresh refresh token.',
    );
    return client;
  }

  await persistToken(client);
  return client;
}

export function isAuthError(err) {
  const data = err?.response?.data;
  if (data?.error === 'invalid_grant') return true;
  if (err?.code === 401 || err?.response?.status === 401) return true;
  return false;
}

export function describeAuthError() {
  return `Google Calendar credentials are no longer valid. ${REAUTH_HINT}`;
}

export async function authorize({ forceReauth = false } = {}) {
  const creds = requireGoogleOauthClient();

  if (!forceReauth) {
    const saved = await loadSavedToken(creds);
    if (saved) return saved;
  }

  return runConsentFlow(creds);
}
