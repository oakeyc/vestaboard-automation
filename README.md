# vestaboard-automation

Personal automation that posts messages to a [Vestaboard Note](https://www.vestaboard.com/) (3 rows x 15 columns, not the flagship 6x22) via the [Read/Write API](https://docs.vestaboard.com/docs/read-write-api/endpoints). Runs locally — a handful of CLI commands wired up via system cron. The first content module reads today's Google Calendar events and formats them for the board.

## Requirements

- Node 24 (pinned via `.nvmrc`; `engines` declares `>=22` as the floor). `nvm use` picks it up. If you don't have `nvm`, `scripts/bootstrap.sh` installs it.
- A Vestaboard Read/Write API key — Vestaboard web app → Settings → Enable Read/Write.
- A Google Cloud project with the **Google Calendar API** enabled and an **OAuth 2.0 Client ID** of type **Desktop app** (only needed for the calendar module).

## Setup

```bash
nvm use
npm install
cp .env.example .env
# fill in the values below, then:
npm start          # sanity check — reads and prints the current board
```

`.env` keys:

- `VESTABOARD_API_KEY` — required.
- `GOOGLE_APP_CLIENT_ID`, `GOOGLE_APP_CLIENT_SECRET` — required for the calendar module. From the OAuth 2.0 Client ID in Google Cloud Console.
- Optional: `VESTABOARD_BASE_URL` (defaults to `https://cloud.vestaboard.com`), `GOOGLE_CALENDAR_ID` (defaults to `primary`), `GOOGLE_OAUTH_REDIRECT_URI` (defaults to `http://127.0.0.1:53123/oauth/callback`).

### Google OAuth (one-time)

1. Google Cloud Console → create or pick a project → enable the **Google Calendar API**.
2. Create an OAuth 2.0 Client ID, application type **Desktop app**.
3. Copy the Client ID and Client Secret into `.env`.
4. **Publish the OAuth consent screen** (or add yourself as a test user, but note that Testing mode expires refresh tokens every 7 days — you'll have to re-auth weekly). For a personal app, publishing is the painless option.
5. Run `npm run calendar:auth`. A browser window opens for consent; the refresh token is saved to `token.json` (gitignored). After that the calendar runs unattended.

If the refresh token ever gets revoked or expires, re-run `npm run calendar:auth`.

## Commands

- `npm start` — one-shot: read the board and print the current message.
- `npm run read` — print the current message as JSON.
- `npm run send -- "your text here"` — send a plain-text message.
- `npm run calendar` — dry-run: fetch today's events, print the formatted 3x15 block.
- `npm run calendar -- --send` — same, but push it to the board.
- `npm run calendar:auth` — force a fresh Google consent flow (overwrites `token.json`).

Biome:

- `npm run lint` / `npm run lint:fix`
- `npm run format` / `npm run format:check`
- `npm run check` — lint + format check
- `npm run check:fix` — lint + format with safe fixes applied

## Notes worth knowing

- The Vestaboard API rate-limits to roughly **1 message per 15 seconds**. Anything sending frequently must space out writes.
- The board is a **Note (3x15)**, not the flagship **6x22**. The API still speaks in the 6x22 character grid — formatting code targets the Note's usable area.
- Auth header is `X-Vestaboard-Token`, not `Authorization`.
- `{ forced: true }` bypasses quiet hours.
- Blank messages are rejected by the API.
- The Google OAuth flow uses a loopback HTTP server on port **53123** with a state-token CSRF check. The port is hardcoded in the default redirect URI; if you need to change it, set `GOOGLE_OAUTH_REDIRECT_URI` and add the same URI to your OAuth client's authorized redirect URIs.
- `.env`, `credentials.json`, and `token.json` are all gitignored. Don't commit them.
