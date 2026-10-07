# media-ui-app

Clean MuxCore **consumer** SPA (Vite + React). Shipable extract of the former `media-ui/ui/` surface.

Org repo: [`Muxcore-Media/media-ui-app`](https://github.com/Muxcore-Media/media-ui-app).  
The polluted dump [`Muxcore-Media/media-ui`](https://github.com/Muxcore-Media/media-ui) stays quarantined — do not treat that root as the product SPA.

## Product role

**End state:** this app **replaces** Jellyfin’s consumer web client (browse **and** playback). See workspace [`MASTER-ROADMAP.md`](../MASTER-ROADMAP.md) §1 Playback.

**Near-term:** installs may hand off play to the `jellyfin` bridge so households work before native OSD/transcode parity is done. Agents must keep improving `/player` toward replacement — do not treat JF handoff as the final architecture.

## Features

- Home with continue watching, favorites, ready-to-play, and recent requests
- Global search (library + TMDB request)
- Browse movies / TV with genre filter, sort, ready-only
- Collections, upcoming air dates, playlists, queue
- Favorites, mark watched, playback resume (browser userdata)
- User settings: display / home / playback / subtitles / controls
- Music / books / comics / audiobooks library lists (via mediauiprox)
- Live TV + Quick Connect
- Playback via `/player` (keyboard shortcuts, resume, skip-intro preference, PiP; Chromecast/AirPlay UI stubs)
- Auth via auth-local (login redirect + session cookie on the BFF)
- **Logout** header link → `/logout`

## Auth + stream (MVP host)

On the MuxCore reference stack (`_mvp` in a sibling workspace checkout):

| Piece | Detail |
|-------|--------|
| Listen | `mediauiprox` on `:5173` serves `dist-app` |
| Login | Unauthenticated pages redirect to auth-local (`:9401`); callback `/auth/callback` |
| Credentials (dev) | user `admin`; the password is generated on first `run-host.sh up` (printed once, stored 0600 in `data/auth/admin.password`); set `MVP_ADMIN_PASSWORD` to override |
| Logout | `GET /logout` clears the session cookie |
| Stream | Browser `<video>` → `/stream/movies/{id}` → media-movies HTTP (range requests) |
| Disable auth | `MEDIA_UI_REQUIRE_AUTH=0` (not for production) |

Offline metadata: `TMDB_FIXTURE=1` on `metadata-tmdb`. Live search: `TMDB_API_KEY`.

## Develop

```bash
npm ci
npm run dev
```

Point Vite proxies (see `vite.config.ts`) or run against `_mvp` mediauiprox.

## Build

```bash
npm ci
npm run typecheck
npm test
npm run build   # → dist-app/
```

The `Dockerfile` + `nginx.conf` in this repo are a dev-only static preview (standalone nginx proxying `/api` to request-media), not the production image; the product image is `_mvp/dockerfiles/media-ui.Dockerfile` with the BFF (umbrella `docs/architecture/SDD.md` §5).

CI: [`.github/workflows/ci.yml`](.github/workflows/ci.yml) (`npm ci` + typecheck + test + build).

## Browser fixtures

```bash
npm ci
npx playwright install --with-deps chromium
npm run test:e2e
```

Playwright builds and serves the production SPA on loopback, then checks Home,
movie browse/detail keyboard navigation, personal settings, and valid/invalid
invite forms at 375, 768, 1280, and 1920 px. Each page gets a layout check and a
screenshot attachment in `playwright-report/`. The tests in `e2e/` intercept BFF
HTTP calls with local fixtures; unexpected API calls and external requests fail.
No live indexers, media sources, credentials, or backend services are used.

An existing Chromium binary can be selected with
`PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/path/to/chromium npm run test:e2e`.
[Browser fixtures CI](.github/workflows/browser.yml) uses Playwright's pinned
Chromium and uploads reports, screenshots, and failure traces.

This is partial T-M4-06 / NFR-A11Y-002 evidence. It verifies consumer rendering
and interactions, including the invite form's sign-in handoff. Full J-02 still
requires real invite creation, redemption, login, and session establishment;
J-03 requires fixture acquisition/import, notification, playback, and resume;
J-08 requires server-enforced parental restrictions. Those integrated journeys
must run against the household backend stack. These fixtures do not prove them.

## MVP wiring

| Piece | Location |
|-------|----------|
| This repo | `Muxcore-Media/media-ui-app` |
| Production build | `dist-app/` (gitignored; build in CI or locally) |
| Host BFF | `_mvp/cmd/mediauiprox` (workspace) |
| Operator browse URLs | `_mvp/run/VIEW-ME.txt` |

```bash
# from a MuxCore workspace with siblings
cd ../_mvp && ./run-host.sh up
# Consumer UI: http://127.0.0.1:5173
```
