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
| Credentials (dev) | `admin` / `admin-dev-only` |
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

CI: [`.forgejo/workflows/ci.yml`](.forgejo/workflows/ci.yml) (`npm ci` + typecheck + test + build).

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
