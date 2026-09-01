# AGENTS.md — Media Server Web UI

Guidance for AI agents (and humans) building/maintaining this project: a modern, self-hosted media server frontend in the visual/UX tradition of Netflix, Hulu, Disney+, Plex, Emby, and Jellyfin. This client talks to a media server backend (Plex/Jellyfin/Emby-style API, or a custom one) to browse and stream a personal library of movies, TV shows, and music.

Follow these guidelines for every feature, component, and refactor. If a request conflicts with this doc, flag it before proceeding.

## 0. Adoption note for `media-ui-app` (MuxCore)

This doc was adopted into the existing `media-ui-app` repo (React + Vite + TS + Tailwind + React Router), not a greenfield rewrite. Decision record:

- **Refactor in place, not a new repo.** The data/integration layer here is already solid and load-bearing: `src/api/client.ts` (normalized BFF client), `src/lib/userdata.ts` (server-authoritative progress/favorites/prefs sync, next-up derivation), `auth-local` session wiring, TMDB search/request flow, and `/api/playback/resolve` transcode wiring. A rewrite would discard tested, working plumbing for zero architectural gain — the actual gap is the **presentation layer** (no design system, flat text nav, grid-only layout, no hero/shelves, no skeletons, no icon set), which this doc exists to fix.
- **Do not duplicate `media-ui`** (archived dump per workspace `MASTER-ROADMAP.md` Appendix H) or spin up another parallel frontend. `media-ui-app` is the canonical consumer surface; `admin-ui` is the canonical operator surface.
- Keep `src/api/client.ts`, `src/lib/userdata.ts`, auth/session flow, and existing test coverage intact while restyling — normalize new visual components on top of the existing typed data layer (`src/types/index.ts`), don't re-derive it.
- Apply §2–§12 below incrementally: design tokens → primitives (`components/ui`) → layout/nav → media components (`PosterCard`, `HeroBanner`, `Shelf`) → page rebuilds — always preserving accessible names/hrefs existing tests assert on unless the tests are deliberately updated alongside the change.
- **Shipped in this repo:** hero banners, horizontal shelves, skeleton loading states, `lucide-react` icons, custom video OSD, library URL filters, paginated browse grids, and server-authoritative userdata sync.

---

## 1. Product Intent

- This is a **library browsing + playback** app, not a marketing site. Optimize for: fast scanning of large catalogs, minimal clicks to "press play," and staying immersive (dark, cinematic, poster-driven).
- Primary surfaces: **Home/Discover**, **Library grid** (Movies/Shows/Music/Collections), **Detail page** (movie/show/season/episode), **Video player**, **Search**, **Settings/Server**.
- Target devices: desktop browser (primary), tablet, phone, and TV/10-foot UI (D-pad/remote navigation) as a stretch consideration. Design mobile- and TV-safe from the start even if not fully implemented yet.

---

## 2. Tech Stack Defaults

Use these unless the repo already establishes different conventions — check for existing `package.json` / config before assuming.

- **Framework**: React (Next.js or Vite+React Router) or SvelteKit. Prefer whatever the repo already uses; default to React + Vite for new SPA-style projects, Next.js if SSR/SEO or image optimization APIs are wanted.
- **Language**: TypeScript everywhere. No new `.js` files in `src/`.
- **Styling**: Tailwind CSS with a design-token config (see §3). Avoid ad-hoc inline styles except for dynamic values (e.g., computed backdrop position).
- **State/data**: TanStack Query (React Query) for server state (library data, metadata, images) with aggressive caching; lightweight client state (Zustand or Context) only for UI state (modals, player controls, active filters).
- **Routing**: File-based or declarative router with deep-linkable URLs for every library item, season, episode, and search query (`/movie/:id`, `/show/:id/season/:n`, `/search?q=`).
- **Video playback**: HTML5 `<video>` wrapped by a headless/customizable player (e.g., `vidstack`, `hls.js` for HLS, `dash.js` if DASH). Never ship a player with unstyled native browser controls in the final UI — always use a custom control bar (see §7).
- **Icons**: `lucide-react` (or the repo's existing icon set). No mixed icon libraries.
- **Animation**: Framer Motion (`motion`) for transitions; CSS transitions for simple hovers. Keep animations GPU-cheap (transform/opacity only).
- **Testing**: Vitest/Jest + React Testing Library for components; Playwright for critical flows (browse → detail → play).

---

## 3. Design System

### 3.1 Color palette

Dark-first, cinematic. Define as CSS variables / Tailwind theme tokens — never hardcode hex values in components.

```
--bg-base:        #0b0c0f   /* app background, near-black, slight blue tint */
--bg-elevated:     #15161b   /* cards, panels, nav */
--bg-overlay:      rgba(11,12,15,0.85)  /* modals, gradient overlays on hero */
--border-subtle:   #23252b
--text-primary:    #f5f5f7
--text-secondary:  #a1a1aa
--text-tertiary:   #6b6b73
--accent:          #e50914-style brand color, but make it configurable per-deployment
--accent-hover:    lighten(accent, 8%)
--success:         #3ddc84
--warning:         #f5a623
--danger:          #ef4444
--focus-ring:      accent at 60% opacity, 2px offset
```

- Ship a **light theme** too, but dark is the default and the one optimized first.
- Never use pure `#000000` for backgrounds — it flattens depth against poster art. Use near-blacks with subtle tint.
- Accent color should be **themeable** (a single CSS variable), since white-label/self-hosted deployments often want to rebrand.

### 3.2 Typography

- One primary UI font (system font stack or `Inter`/`Manrope`-style geometric sans). Optional secondary display font for hero titles only if it materially adds polish — don't add a second font just for flair.
- Scale (rem, 16px base): `12, 14, 16, 18, 20, 24, 30, 36, 48, 60`.
- Titles on dark imagery need a text-shadow or gradient scrim behind them — never place text directly on unprocessed poster art without a contrast-guaranteeing overlay.
- Truncate long titles with ellipsis at 2 lines max in cards; never wrap unbounded.

### 3.3 Spacing & grid

- 4px base spacing unit. Use Tailwind's default scale or an equivalent token scale — no arbitrary magic-number margins.
- Page gutters: 24px mobile, 48px tablet, 64–96px desktop (scale with viewport, cap at a max content width around 1600–1920px so UI doesn't stretch absurdly on ultra-wide monitors).
- Card grids use `auto-fill`/`auto-fit` with `minmax()` — never a fixed column count that breaks at odd widths.

### 3.4 Elevation & depth

- Use subtle shadows + slight scale/brightness increase for hover elevation, not borders alone.
- Modals/drawers get a scrim (`--bg-overlay`) behind them and a soft shadow, never a hard drop shadow that looks flat.

---

## 4. Layout Patterns

### 4.1 Navigation

- **Persistent top nav** (or a slim left rail on desktop) with: logo/server name, primary sections (Home, Movies, Shows, Music, Collections), search, and a user/profile menu (avatar, switch profile, settings, sign out).
- Nav becomes translucent/blurred over hero content at the top of a page, then solidifies (opaque background) on scroll — classic Netflix pattern. Implement via scroll-position class toggle, not JS-driven inline styles per frame.
- Mobile: collapse to a bottom tab bar (Home/Search/Library/More) or a hamburger + full-screen menu — bottom tab bar is preferred for thumb reach.
- Search is **always one tap/click away**, ideally a persistent icon that expands into an overlay/command-palette-style input with instant results as you type (debounced, ~200–300ms).

### 4.2 Home / Discover page

- **Hero banner** at top: large backdrop image (or looping muted video preview after a short delay) for a featured title, with title logo/treatment, short synopsis, metadata chips (year, rating, duration/seasons, genre), and primary actions (Play, More Info, Add to List). Include a gradient scrim (bottom + side) so nav and text stay legible.
- Below the hero: **horizontal shelves/carousels** grouped by relevance — "Continue Watching," "Recently Added," "Because you watched X," genre rows, "Top Rated," etc. Continue Watching should show a progress bar on each card.
- Each shelf: title + optional "See all" link, horizontally scrollable row of cards, with arrow controls on hover (desktop) and native touch scroll (mobile/tablet). Peek the next card partially at the row edge to signal scrollability.
- Lazy-load shelves below the fold; virtualize/limit rendered cards per row for large libraries.

### 4.3 Library / browse grid

- Filter/sort bar: genre, year, rating, resolution/quality, sort (recently added, alphabetical, release date, rating). Filters persist in the URL query string.
- Poster grid, not list, as default view (toggle to list view optional). Consistent poster aspect ratio per content type: **2:3** for movies/shows, **1:1** or **16:9** for music/collections/networks as appropriate — never mix aspect ratios within one grid.
- Infinite scroll or paginated "Load more" — prefer infinite scroll with a visible loading affordance, and always keep a working scrollbar/jump-to-letter for very large libraries (A–Z index for libraries with 500+ items).
- Empty/loading states: skeleton cards (shimmer), never blank white flashes or layout jumps when real data arrives.

### 4.4 Detail page (movie / show)

- Full-bleed backdrop header (same treatment as hero) with poster thumbnail, title, metadata row (year, runtime/seasons, content rating, genres, star rating), synopsis, cast/crew, and primary Play button (resumes from last position if applicable, with a secondary "Play from beginning" affordance).
- For shows: season selector (tabs or dropdown) + episode list with thumbnail, episode number/title, runtime, synopsis, watched/progress indicator, and per-episode play button.
- Secondary rows below the fold: "More like this," cast carousel, extras/trailers, technical/media info (codec, resolution, audio tracks) collapsed behind an "Info" disclosure — don't show raw file paths or technical clutter by default.
- Actions: Play, Add to Watchlist, Mark as Watched/Unwatched, Download (if supported), Share, Rate.

### 4.5 Search & results

- Instant, incremental results grouped by type (Movies, Shows, Episodes, People, Music). Show poster thumbnails, not just text rows.
- Empty query state can show recent searches or trending; empty results state should suggest spelling fixes or browsing categories instead of a bare "no results."

---

## 5. Component Guidelines

- **Cards**: poster image (with graceful fallback placeholder art if missing), title, subtitle metadata, hover state that scales up slightly (~1.05–1.1x) with elevated shadow and reveals quick actions (play, add to list, more info) — debounce hover expansion by ~150–300ms to avoid jitter on fast mouse movement across a row.
- **Buttons**: clear primary (filled, accent color) vs secondary (outline/ghost) vs icon-only hierarchy. Primary "Play" actions always most visually dominant on a page.
- **Progress bars**: thin, accent-colored, on card thumbnails and in the player scrubber; always show remaining time or percentage on hover for playback-adjacent bars.
- **Modals/drawers**: for quick-view "more info," use a centered modal or a slide-over panel with backdrop blur/scrim, not full navigation — keep users in flow.
- **Toasts/notifications**: bottom or top-right, auto-dismiss, used for non-blocking confirmations (added to watchlist, download started).
- **Avatars/profiles**: support multiple user profiles per server (like Netflix/Plex/Jellyfin profile switching) with distinct avatar art and optional PIN lock for kids' profiles.
- **Ratings badges**: display content ratings (PG-13, TV-MA, etc.) and critic/user scores (e.g., a Rotten-Tomatoes-style badge) as small, consistent badge components — don't reinvent per page.

---

## 6. Imagery & Media Handling

- All poster/backdrop images must have explicit `width`/`height` (or `aspect-ratio` CSS) reserved **before** load to prevent layout shift (CLS).
- Use responsive image techniques: request appropriately sized images from the backend/CDN per breakpoint/density (`srcset`/`sizes` or framework image component), never ship one giant image to every device.
- Lazy-load offscreen images (`loading="lazy"` or intersection observer); eager-load only the hero and first visible row.
- Provide blurred low-res placeholders or solid-color dominant-color placeholders while full images load — never a jarring blank box.
- Fallback artwork (generic poster/backdrop) for items missing metadata images — never render a broken-image icon in production UI.

---

## 7. Video Player Requirements

- Custom control bar: play/pause, scrubber with buffered + played state, volume, mute, current/remaining time, fullscreen, playback speed, subtitle/audio track selector, quality selector (if transcoding options exist), and a "Next Episode" prompt near the end of an episode.
- Controls auto-hide after ~3s of inactivity during playback; reappear on mouse move/tap/keyboard input.
- Keyboard shortcuts: Space/K = play/pause, arrows = seek ±10s / volume, F = fullscreen, M = mute, C = toggle captions — document these in a `?` help overlay.
- Support resume-from-position (store playback progress and report it back to the server via its progress/scrobble API).
- Buffering state gets a subtle spinner over the video, never a frozen frame with no feedback.
- Handle errors gracefully (transcode failure, network drop) with a retry action, not a silent black screen.
- Picture-in-picture and (if applicable) Chromecast/AirPlay affordances are expected in a "modern" player — stub the UI hook points even if backend support lags.

---

## 8. Responsiveness & Accessibility

- Breakpoints: mobile (<640px), tablet (640–1024px), desktop (1024–1536px), wide (>1536px). Test carousels and grids at all four.
- Full keyboard navigation: every actionable card, button, and row must be reachable via Tab and operable via Enter/Space. Carousels need arrow-key or focus-based horizontal scroll support, not just mouse hover.
- Visible focus rings (`--focus-ring`) on all interactive elements — never `outline: none` without an equally visible replacement.
- Color contrast: body text ≥ 4.5:1, large/title text ≥ 3:1 against its background/scrim, per WCAG AA.
- All images need meaningful `alt` text (title/name); decorative gradients/scrims are `aria-hidden`.
- Respect `prefers-reduced-motion`: disable autoplay preview videos and large parallax/scale animations when set.
- Design for remote/D-pad navigation on TV-sized layouts eventually: focus states must be large and obvious enough to see from a couch distance (scale-up + border glow, not just a thin outline).

---

## 9. Performance

- Virtualize long lists/grids (episode lists, large library grids) — don't render thousands of DOM nodes at once.
- Code-split by route; the video player (and its playback libraries) should be a separate lazy-loaded chunk not included in the initial bundle.
- Cache library/metadata queries aggressively (TanStack Query with sensible `staleTime`) since catalog data changes infrequently relative to browsing frequency.
- Prefetch on hover/focus intent for detail pages (start the data fetch when a card is hovered/focused, before click) to make navigation feel instant.
- Debounce search input and filter changes; cancel in-flight requests on new input (`AbortController`).
- Target: sub-2s perceived load for Home, sub-150ms interaction response for hover/focus card expansion.

---

## 10. Content & Copy Conventions

- Titles in Title Case as provided by metadata source — don't re-case data from the server.
- Runtime format: `1h 42m` for movies; `S2 · E5` or `Season 2, Episode 5` for episodes depending on space; relative dates ("Added 3 days ago") on recently-added rows, absolute dates elsewhere.
- Always show a content rating badge and runtime/episode count near the title — users scanning a catalog need this at a glance without opening the detail page.
- Never show raw backend error messages, file paths, or stack traces in the UI — translate into a friendly message with a "Details" disclosure for advanced/debug users only.

---

## 11. Project Structure Conventions

Adapt to the existing repo's structure if one exists; otherwise default to:

```
src/
  app/ or routes/        # pages, one per route
  components/
    ui/                  # generic, design-system-level primitives (Button, Card, Badge, Modal)
    media/                # domain components (PosterCard, HeroBanner, EpisodeRow, PlayerControls)
    layout/                # Nav, Footer, ProfileSwitcher
  hooks/                  # data fetching + UI hooks
  lib/                    # api client, formatting helpers, constants
  styles/                  # theme tokens, global css
  types/                   # shared TS types for media entities (Movie, Show, Episode, Person, etc.)
```

- Design tokens (colors, spacing, radii) live in **one** place (Tailwind config or a `tokens.css`) — never redefine a color inline elsewhere.
- Keep domain components (`PosterCard`, `HeroBanner`) decoupled from any single backend's API shape — normalize server responses (Plex/Jellyfin/Emby/custom) into a shared internal media-item type at the data layer, not inside components.

---

## 12. Definition of Done for UI Work

Before considering a feature/component complete, verify:

- [ ] Works at all four breakpoints (§8) with no overflow/clipping
- [ ] Keyboard-navigable and screen-reader labeled
- [ ] No layout shift on image/data load (skeletons in place)
- [ ] Uses design tokens, not hardcoded colors/spacing
- [ ] Loading, empty, and error states all designed — not just the happy path
- [ ] Animations respect `prefers-reduced-motion`
- [ ] No hardcoded backend-specific assumptions (works generically across Plex/Jellyfin/Emby-style metadata where applicable)
