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

## Operator settings

Acquisition, Quality, Delay, and request-policy Settings links and direct routes
require an `admin` or `manager` role and the matching feature capability. An
`approver` can still approve or deny individual requests, but cannot edit shared
request quotas or auto-approval policy. Household members retain acquisition
readiness messages and request-quota information on consumer pages; the readiness
banner's settings link follows the Acquisition role and capability gate.
Within Acquisition, adding, enabling/disabling, and removing indexers requires
`admin`, matching the BFF's indexer mutation rules. Managers retain readiness and
catalog reads without those controls.

These are UI presentation and routing guards. Server authorization is unchanged
and remains authoritative, including stricter permissions on some mutations.
FR-ADM-010 remains partial until operator controls migrate to admin-ui.

## Operator-only controls (T-M5-12)

The BFF answers `403 operator.forbidden` to any session without the `admin` or `manager`
role on 43 state-changing routes, and `403 operator.admin_required` when a manager names
`root_folder_path` in a library PATCH (BFF-API.md "Operator route roles"). The SPA no longer
offers those controls to other roles. Roles come from the cached session identity
(`useOperatorAccess`, built on `src/lib/session.ts`), so a member, a viewer, an approver and
a session whose roles are not cached yet see none of them.

| Control | Needs |
|---------|-------|
| Remove from library, delete file(s), refresh metadata (movies, TV, music, books, comics, audiobooks; episode file delete) | `admin` or `manager` |
| Monitor toggles, quality-profile picker | `admin` or `manager` |
| Root-folder picker (library item pages) | `admin` only |
| Series override save / clear | `admin` or `manager` |
| Interactive search: Grab and Block (the scored list stays readable) | `admin` or `manager` |
| Add to wanted; Search now on Activity, Missing, Upcoming, In Progress; wanted remove; retry import; block; manual import | `admin` or `manager` |
| Blocklist Unblock / Clear all | `admin` or `manager` |
| Settings > Debrid add (the cloud library stays readable) | `admin` or `manager` |
| Rename apply (the preview stays readable) | `admin` or `manager` |
| Subtitle download in the player ("Find online") | `admin` or `manager` |
| Live TV timer form (timers stay readable) | `admin` or `manager` |
| Stop on `/sessions` | `admin` or `manager`; there is no "stop my own stream" control |

Delay-profile and TRaSH-sync controls were already hidden from members and are unchanged.
Formats score/parse, GET reads, media issues, watch together, userdata, telemetry, watchlist,
requests and playback session telemetry are open on the server and stay visible to members.

This is presentation only. **The BFF is authoritative**: the cached role can be stale, so a
refused action is handled too. A `403 operator.*` becomes a typed `OperatorError` with calm
copy ("You don't have permission for this action."), is shown as a status rather than an
error, is never retried, and re-reads `/api/session` once so a control that should be gone
disappears. Nothing here grants access.

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

## Parental controls (server-enforced)

The consumer BFF is the **only** enforcement point for parental restrictions
(umbrella ADR-0031, FR-PLAY-007; contract in the BFF's `BFF-API.md`, "Parental enforcement").
This SPA reports the server's decision; it never makes one. Every response is
`Cache-Control: no-store` with a JSON `{ error, code }` body, and a failure to evaluate the
policy is a denial, never "allowed".

| Response | State shown |
|----------|-------------|
| `403 parental.blocked` (resolve also carries `code: playback.parental_blocked`) | "Not available for this profile"; the player never mounts |
| `403 parental.restricted_route` | Calm "not available for restricted accounts" status; the matching nav/search entry point is hidden for the rest of the page session |
| `403 parental.policy_unconfigured` | "Ask an administrator to set parental controls" |
| `403 parental.policy_unverifiable` | "Sign in with your password instead of Quick Connect" |
| `401 parental.session_invalid` | "Sign in again" with a link; cached identity is cleared |
| `503 parental.policy_unavailable` / `parental.classification_unavailable` | Retryable alert; nothing plays or retries on its own |

`src/api/errors.ts` maps these codes to `ParentalError` (an `ApiError`); `getJSON` in
`src/api/client.ts` throws it, so a page that prints `err.message` shows the right copy.
`ErrorBanner` recognises that copy and renders the calm or retryable state, the player uses
`ErrorScreen`, and both announce through `role="status"` (decisions) or `role="alert"`
(could not check). List routes omit denied items on the server.

What is still client-side, and why it is not enforcement: `src/lib/parental.ts` and the
Settings > Parental pane read and write `prefs.parental` in the user's own userdata blob.
That blob is user-writable, so it is only a display hint (kids-mode look, early hiding in
rails built from userdata such as continue watching, the PIN prompt on the player). It can
hide more than the server allows; it cannot reveal anything, and no PIN can lift a server
denial. Profiles and PIN grants are FR-AUTH-010 and are unchanged here. Offline-saved
downloads play from the device without asking the BFF (existing behaviour, not changed).

## Browser fixtures

```bash
npm ci
npx playwright install --with-deps chromium
npm run test:e2e
```

Playwright builds and serves the production SPA on loopback, then checks Home,
movie browse/detail keyboard navigation, personal settings, and valid/invalid
invite forms at 375, 768, 1280, and 1920 px. The main journey checks include layout
assertions and screenshot attachments in `playwright-report/`. Keyboard regressions
also cover More navigation entry/traversal/Escape focus return, visible shelf
controls, and invite success/error focus with a usable retry. Shelf scrolling
respects reduced motion; the browser projects request that preference.
The tests in `e2e/` intercept BFF
HTTP calls with local fixtures; unexpected API calls and external requests fail.
No live indexers, media sources, credentials, or backend services are used.
Indexer action scenarios verify manager reads and admin mutations on fresh direct
Settings navigation. Delayed identity scenarios cover fresh roles, cached-role
downgrades, expired sessions, userdata failures, unsaved personal form state, and
the sign-out handoff. Cached identity is cosmetic: a completed session refresh
updates visible controls, explicit authentication denial clears it, and transient
network failures may retain it. Server authorization remains the BFF's responsibility.

Operator-control scenarios (`e2e/operator-controls.spec.ts`) check Activity, a library item page,
`/sessions` and the player's subtitle download at 375 and 1280 px for a `viewer` (controls
hidden), a `manager` (shown; root folder hidden) and an `admin` (root folder shown), including a
stale-role 403 that is explained calmly, not retried, and followed by a session re-read.

An existing Chromium binary can be selected with
`PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/path/to/chromium npm run test:e2e`.
[Browser fixtures CI](.github/workflows/browser.yml) uses Playwright's pinned
Chromium and uploads reports, screenshots, and failure traces.

This is partial T-M4-06 / NFR-A11Y-002 evidence. It verifies consumer rendering
and interactions, including the invite form's sign-in handoff. Full J-02 still
requires real invite creation, redemption, login, and session establishment;
J-03 requires fixture acquisition/import, notification, playback, and resume;
J-08 requires server-enforced parental restrictions. `e2e/parental.spec.ts` only checks
how the SPA renders each documented BFF response (blocked, unconfigured, unverifiable,
503, restricted route) at 375 and 1280 px; it does not prove enforcement. Those integrated
journeys must run against the household backend stack. These fixtures do not prove them.
The keyboard checks are partial NFR-A11Y-001 evidence: they do not establish full
WCAG conformance, contrast compliance, or actual screen-reader announcements.

`e2e/contrast.spec.ts` adds rendered text-contrast checks for Home, movie browse/detail,
Display/Playback settings, invite forms and parental detail/player outcomes in both
themes at all four widths (T-M4-08). Each fixture verifies the computed theme before
running axe's color-contrast rule; a deliberately failing control verifies the gate.
The invite success/sign-in handoff and filled control hover colors are also checked.
The JSON attachments retain indeterminate image/gradient comparisons for manual review.
Passing means no definite axe text-contrast failures in those fixtures, not complete
contrast coverage or WCAG conformance.

Foreground accent utilities use `--accent-text`, preserving the dark accent while
using a darker foreground in light mode. Filled controls and borders retain their
existing accent tokens. Danger text and filled danger controls have separate tokens,
so light error text can darken while filled controls keep their original red surface.
The invite success status uses a theme-aware success foreground without changing green fills.
The anchor reset lives in Tailwind's base layer so explicit foreground utilities win.

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
