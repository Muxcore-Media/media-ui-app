# media-ui-app

Clean MuxCore **consumer** SPA (Vite + React). Shipable extract of the former `media-ui/ui/` surface.

Org repo: [`Muxcore-Media/media-ui-app`](https://github.com/Muxcore-Media/media-ui-app).  
The polluted dump [`Muxcore-Media/media-ui`](https://github.com/Muxcore-Media/media-ui) stays quarantined — do not treat that root as the product SPA.

## Features

- Browse movies / TV (via MVP BFF `mediauiprox` → `media-movies` / `media-tvshows`)
- Search + request (`/api/search`, `/api/request` → `request-media`)
- Playback when a movie has an attached file (`has_file` + `/stream/movies/{id}`)
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
npm run build   # → dist-app/
```

CI: [`.github/workflows/ci.yml`](.github/workflows/ci.yml) (`npm ci` + typecheck + build).

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
