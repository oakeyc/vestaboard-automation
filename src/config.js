import 'dotenv/config';

const DEFAULT_GOOGLE_REDIRECT_URI = 'http://127.0.0.1:53123/oauth/callback';

export const config = {
  vestaboardApiKey: process.env.VESTABOARD_API_KEY ?? '',
  vestaboardBaseUrl: process.env.VESTABOARD_BASE_URL || '',
  googleCalendarId: process.env.GOOGLE_CALENDAR_ID || 'primary',
  googleAppClientId: process.env.GOOGLE_APP_CLIENT_ID ?? '',
  googleAppClientSecret: process.env.GOOGLE_APP_CLIENT_SECRET ?? '',
  googleOauthRedirectUri: process.env.GOOGLE_OAUTH_REDIRECT_URI || DEFAULT_GOOGLE_REDIRECT_URI,
};

export function requireApiKey() {
  if (!config.vestaboardApiKey) {
    throw new Error(
      'VESTABOARD_API_KEY is not set.\n' +
        "  1. Copy .env.example to .env (if you haven't already)\n" +
        '  2. In the Vestaboard web app: Settings → Enable Read/Write → copy the key\n' +
        '  3. Paste it into .env as VESTABOARD_API_KEY=...',
    );
  }
  return config.vestaboardApiKey;
}

export function getBaseUrl() {
  return config.vestaboardBaseUrl || undefined;
}

export function requireGoogleOauthClient() {
  const missing = [];
  if (!config.googleAppClientId) missing.push('GOOGLE_APP_CLIENT_ID');
  if (!config.googleAppClientSecret) missing.push('GOOGLE_APP_CLIENT_SECRET');
  if (missing.length) {
    throw new Error(
      `${missing.join(' and ')} not set in .env.\n` +
        '  1. Google Cloud Console → APIs & Services → Credentials\n' +
        '  2. Create an OAuth 2.0 Client ID of type "Desktop app"\n' +
        '  3. Copy the Client ID and Client Secret into .env as\n' +
        '     GOOGLE_APP_CLIENT_ID=... and GOOGLE_APP_CLIENT_SECRET=...',
    );
  }
  return {
    clientId: config.googleAppClientId,
    clientSecret: config.googleAppClientSecret,
    redirectUri: config.googleOauthRedirectUri,
  };
}
