# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Personal automation that posts messages to a [Vestaboard](https://www.vestaboard.com/) via the [Read/Write API](https://docs.vestaboard.com/docs/read-write-api/endpoints). Designed to run locally — CLI commands invoked from system cron. Future work adds content modules — Google Calendar, time/date, etc. — that feed the board.

## Hardware

Target board is a **Vestaboard Note** (3 rows × 15 columns), not the flagship 6×22.

## Runtime

Pinned to **Node 24** via `.nvmrc`; `engines` declares `>=22` as the floor. ESM only (`"type": "module"`). Uses built-in `fetch`.

## Commands

- `npm install` — install deps
- `npm start` — runs `src/index.js` (one-shot: reads and prints the board's current message)
- `npm run read` — print the current message JSON
- `npm run send -- "your text here"` — send a plain-text message
- `npm run calendar` — dry-run: fetch today's Google Calendar events and print the formatted 3×15 block
- `npm run calendar -- --send` — same, but push to the board
- `npm run calendar:auth` — force a fresh Google consent flow (overwrites `token.json`). Use after revoking access or when the refresh token has expired.

Copy `.env.example` → `.env` and set `VESTABOARD_API_KEY` (from the Vestaboard web app: Settings → Enable Read/Write) and `GOOGLE_CALENDAR_ID` (defaults to `primary`). Optionally set `VESTABOARD_BASE_URL` to override the default API base URL (`https://cloud.vestaboard.com`).

Google OAuth credentials also come from `.env`: `GOOGLE_APP_CLIENT_ID` and `GOOGLE_APP_CLIENT_SECRET` (from the OAuth 2.0 Client ID you create in Google Cloud Console). Optionally override `GOOGLE_OAUTH_REDIRECT_URI` (defaults to `http://127.0.0.1:53123/oauth/callback`).

### Google Calendar setup (first run)

1. Google Cloud Console → create a project → enable the **Google Calendar API**.
2. Create an OAuth 2.0 Client ID, application type **Desktop app**.
3. Copy the Client ID and Client Secret into `.env` as `GOOGLE_APP_CLIENT_ID` and `GOOGLE_APP_CLIENT_SECRET`.
4. Run `npm run calendar:auth` (or just `npm run calendar` on first use). A browser opens for consent; the refresh token is saved to `token.json` (gitignored). Subsequent runs are unattended.
5. If the refresh token is ever revoked or expires (e.g., the OAuth consent screen is still in "Testing" mode — 7-day expiry), re-run `npm run calendar:auth`.

## Architecture

- `src/vestaboard/client.js` — `VestaboardClient` wrapping the Read/Write API at `https://cloud.vestaboard.com`. Methods: `read()`, `sendText()`, `sendCharacters()`, `getTransition()`, `setTransition()`. Throws `VestaboardError` with `status` + `body` on non-2xx.
- `src/vestaboard/vbml.js` — `formatVBML()` calls `https://vbml.vestaboard.com/format` to convert a string into the 6×22 character-code layout.
- `src/config.js` — loads `.env` via `dotenv` and exposes `requireApiKey()`.
- `src/cli/` — thin CLI entry points (`read.js`, `send.js`) wired into `npm` scripts.
- `src/modules/calendar/` — Google Calendar module.
  - `auth.js` — OAuth desktop flow built on `googleapis` directly. Reads client id/secret from `.env`, runs a one-time consent flow via a loopback HTTP server (default `http://127.0.0.1:53123/oauth/callback`), and persists the refresh token to `token.json`. Exports `authorize({ forceReauth })` and `isAuthError(err)` / `describeAuthError()` so callers can translate `invalid_grant` failures into actionable messages.
  - `events.js` — fetches today's events from the configured calendar (`calendar.events.list` with `singleEvents` + `orderBy: startTime`).
  - `format.js` — converts events into a 3×15 array of lines. Sanitizes to Vestaboard-supported chars (uppercase A-Z, 0-9, basic punctuation; `&` → `AND`). Compact times like `9A`, `10:30A`, `3P`. Overflow collapses to `+N MORE`. Empty → `NO EVENTS TODAY`.
  - `index.js` — `getTodayNoteLines({ calendarId })` orchestrator.
- `src/modules/` — placeholder for future content-source modules (clock, weather, etc.). Each module should expose a function that returns either a string (let the API/VBML format it) or, for precise placement, an array of character codes.

Scheduling lives in system cron (`crontab -e`), not in-process. Anything sending frequently must space writes manually to respect the API rate limit.

## API notes (worth remembering)

- Auth: `X-Vestaboard-Token` header — **not** `Authorization`.
- Board layout is **6 rows × 22 cols** of character codes. `0` = blank. Sending `{ text }` lets the server lay it out; sending `{ characters }` gives full control.
- `{ forced: true }` bypasses quiet hours.
- The API rate-limits to roughly **1 message per 15 seconds**. Anything that sends frequently must throttle.
- Blank messages are rejected.
- Transitions: `classic | wave | drift | curtain`, speeds: `gentle | fast`.

## Conventions

- ESM only (`"type": "module"`). Use `.js` with `import`/`export`.
- Never commit `.env`. It's gitignored.
