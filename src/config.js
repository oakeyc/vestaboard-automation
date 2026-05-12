import 'dotenv/config';

export const config = {
  vestaboardApiKey: process.env.VESTABOARD_API_KEY ?? '',
  googleCalendarId: process.env.GOOGLE_CALENDAR_ID || 'primary',
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
