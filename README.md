# vestaboard-automation

Personal automation for posting messages to a [Vestaboard](https://www.vestaboard.com/) Note (3 rows x 15 columns) via the [Read/Write API](https://docs.vestaboard.com/docs/read-write-api/endpoints). Built around small, pluggable content modules — the first one reads today's events from Google Calendar and formats them for the board.

## Prerequisites

- **Node.js 22+** (the `engines` floor). The repo is pinned to **Node 24** via `.nvmrc`.
    - `nvm` installed: run `scripts/bootstrap.sh`
- A Vestaboard Read/Write API key (Vestaboard web app → Settings → Enable Read/Write).
- For the calendar module: a Google Cloud project with the Calendar API enabled and an OAuth Desktop client.

## Quickstart

```bash
nvm use            # picks up Node 24 from .nvmrc
npm install
cp .env.example .env
# edit .env — set VESTABOARD_API_KEY (and GOOGLE_CALENDAR_ID if not 'primary')
npm start          # read and print the board's current message
```

## Available scripts

Runtime:

- `npm start` — one-shot: read the board and print the current message.
- `npm run read` — print the current message as JSON.
- `npm run send -- "your text here"` — send a plain-text message.
- `npm run calendar` — dry-run: fetch today's calendar events, format the 3x15 block, print it.
- `npm run calendar -- --send` — same, but push to the board.
- `npm run server` — long-running scheduler. Loads every job in `src/jobs/` and runs each on its cron schedule. Ctrl+C for graceful shutdown.

Lint / format (Biome):

- `npm run lint` — lint without writing (exits non-zero on issues).
- `npm run lint:fix` — lint and auto-fix.
- `npm run format` — format all files in place.
- `npm run format:check` — check formatting without writing (use in CI).
- `npm run check` — lint + format check in one pass.
- `npm run check:fix` — lint + format and apply all safe fixes.

## Google Calendar OAuth setup

The calendar module uses an OAuth Desktop flow (`@google-cloud/local-auth`). First run only:

1. In the Google Cloud Console, create a project and enable the **Google Calendar API**.
2. Create an OAuth 2.0 Client ID, application type **Desktop app**.
3. Download the credentials JSON to the repo root as `credentials.json` (gitignored).
4. Run `npm run calendar`. A browser window opens for consent; the refresh token is written to `token.json` (gitignored). Subsequent runs are unattended.

More detail on architecture and conventions lives in [`CLAUDE.md`](./CLAUDE.md).

## Layout

- `src/vestaboard/` — API client + VBML formatter.
- `src/cli/` — thin entry points wired into the npm scripts above.
- `src/modules/` — content sources. `calendar/` is the first; add more (clock, weather, etc.) here.
- `src/server/` — scheduler, rate-limited sender, entry point for `npm run server`.
- `src/jobs/` — job definitions registered by the server.

## Notes

- The Vestaboard API rate-limits to roughly 1 message / 15 seconds. The server routes all writes through a `RateLimitedSender` to stay honest.
- Never commit `.env`, `credentials.json`, or `token.json` — all three are gitignored.
