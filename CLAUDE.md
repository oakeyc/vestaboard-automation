# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Personal automation that posts messages to a [Vestaboard](https://www.vestaboard.com/) via the [Read/Write API](https://docs.vestaboard.com/docs/read-write-api/endpoints). Designed to run locally (e.g., from cron or a long-running Node process). Future work adds content modules — Google Calendar, time/date, etc. — that feed the board.

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
- `npm run server` — long-running scheduler process. Loads every job in `src/jobs/` and runs them on their cron schedules. Ctrl+C for graceful shutdown.

Copy `.env.example` → `.env` and set `VESTABOARD_API_KEY` (from the Vestaboard web app: Settings → Enable Read/Write) and `GOOGLE_CALENDAR_ID` (defaults to `primary`). Optionally set `VESTABOARD_BASE_URL` to override the default API base URL (`https://cloud.vestaboard.com`). Job schedules can be overridden via env (`CALENDAR_CRON`, `CALENDAR_TZ`).

### Google Calendar setup (first run)

1. Google Cloud Console → create a project → enable the **Google Calendar API**.
2. Create an OAuth 2.0 Client ID, application type **Desktop app**.
3. Download the JSON to the repo root as `credentials.json` (gitignored).
4. First `npm run calendar` opens a browser for consent; the refresh token is saved to `token.json` (gitignored). Subsequent runs are unattended.

## Architecture

- `src/vestaboard/client.js` — `VestaboardClient` wrapping the Read/Write API at `https://cloud.vestaboard.com`. Methods: `read()`, `sendText()`, `sendCharacters()`, `getTransition()`, `setTransition()`. Throws `VestaboardError` with `status` + `body` on non-2xx.
- `src/vestaboard/vbml.js` — `formatVBML()` calls `https://vbml.vestaboard.com/format` to convert a string into the 6×22 character-code layout.
- `src/config.js` — loads `.env` via `dotenv` and exposes `requireApiKey()`.
- `src/cli/` — thin CLI entry points (`read.js`, `send.js`) wired into `npm` scripts.
- `src/modules/calendar/` — Google Calendar module.
  - `auth.js` — OAuth desktop flow (`@google-cloud/local-auth`); reads `credentials.json`, persists refresh token to `token.json`.
  - `events.js` — fetches today's events from the configured calendar (`calendar.events.list` with `singleEvents` + `orderBy: startTime`).
  - `format.js` — converts events into a 3×15 array of lines. Sanitizes to Vestaboard-supported chars (uppercase A-Z, 0-9, basic punctuation; `&` → `AND`). Compact times like `9A`, `10:30A`, `3P`. Overflow collapses to `+N MORE`. Empty → `NO EVENTS TODAY`.
  - `index.js` — `getTodayNoteLines({ calendarId })` orchestrator.
- `src/modules/` — placeholder for future content-source modules (clock, weather, etc.). Each module should expose a function that returns either a string (let the API/VBML format it) or, for precise placement, an array of character codes.
- `src/server/` — long-running scheduler process.
  - `index.js` — entry point. Builds a single `VestaboardClient`, wraps it in a `RateLimitedSender`, instantiates each job via its factory, registers them with the `Scheduler`, handles SIGINT/SIGTERM.
  - `scheduler.js` — `node-cron` v4 wrapper. Validates cron expressions, prevents overlapping runs of the same job, logs start/ok/fail.
  - `sender.js` — `RateLimitedSender` serializes all board writes through a promise queue with a configurable minimum interval (default **15s**) — this is the chokepoint that keeps every job honest about Vestaboard's rate limit.
- `src/jobs/` — job definitions. Each file exports a factory `({ sender }) => { name, schedule, timezone?, run }`. `src/jobs/index.js` aggregates them into `jobFactories`. To add a new scheduled task, write a file here and append it to the array.

## API notes (worth remembering)

- Auth: `X-Vestaboard-Token` header — **not** `Authorization`.
- Board layout is **6 rows × 22 cols** of character codes. `0` = blank. Sending `{ text }` lets the server lay it out; sending `{ characters }` gives full control.
- `{ forced: true }` bypasses quiet hours.
- The API rate-limits to roughly **1 message per 15 seconds**. Any scheduler/loop that sends frequently must throttle.
- Blank messages are rejected.
- Transitions: `classic | wave | drift | curtain`, speeds: `gentle | fast`.

## Conventions

- ESM only (`"type": "module"`). Use `.js` with `import`/`export`.
- Never commit `.env`. It's gitignored.
