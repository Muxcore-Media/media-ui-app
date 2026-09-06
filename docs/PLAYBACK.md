# In-App Playback — Architecture Notes

## Overview

All library items play natively inside `media-ui-app` via the `/player` route —
no external Jellyfin/Emby client is required for the primary watch path.

## Entry points

| Surface | Builder | Notes |
|---------|---------|-------|
| Movie detail page | `buildMoviePlayerHref(movie)` | Resumes from saved position |
| Movie detail — play from beginning | `buildMoviePlayerHrefFromBeginning(movie)` | Passes `restart=1` |
| TV show / episode list | `buildEpisodePlayerHref(show, ep)` | Returns `null` when no file |
| Continue-watching shelf (Home) | `buildProgressPlayerHref(entry)` | Preserves progress |
| Episode drawer (inside player) | `buildEpisodePlayerHref` | Advances to next episode |
| Up-next autoplay | `buildEpisodePlayerHref` via `useUpNext` | Triggered at outro/credits |

All builders produce `/player?src=…&id=…&kind=…&…` URLs consumed by
`src/pages/Player.tsx` → `src/components/VideoPlayer.tsx`.

## Direct play vs. transcode

Playback resolution happens in **`src/components/player/hooks/usePlaybackSource.ts`**:

```
GET /api/playback/resolve?src=<stream_url>
  → { stream_url, mode: "direct" | "transcode", transcoder_available, … }
```

**Direct play (`mode = "direct"`)** — the BFF determined the container/codec is
natively playable by the browser; the `<video>` element points straight at the
file or HTTP stream. No ffmpeg involvement.

**Transcode (`mode = "transcode"`, or forced by a quality cap)** — the BFF pipes
the stream through ffmpeg at `/stream/transcode?src=…`. Because this is a
live-piped fMP4 (no server-side random access once started), seeking mid-transcode
restarts the pipe at a new offset (`start=` query param) and the `<video>` element
is remounted with the new URL. Audio stream selection works the same way
(`audio_index=` on the transcode URL).

Quality override: when the user picks a non-`auto` quality level in Settings,
`usePlaybackSource` always forces a transcode capped at the chosen pixel height,
regardless of what `/api/playback/resolve` originally returned.

## Resume / progress

Progress is tracked server-authoritatively via `src/lib/userdata.ts`:

- **Write**: `useProgressReporting` reports position every ~5 s during playback and
  on page unload.
- **Read**: `VideoPlayer` calls `getProgress(mediaId)` after `loadedmetadata` fires.
  If a saved position exists (> 5 s from both ends), a `ResumeDialog` is shown;
  the user can resume or restart from the beginning.
- `startOver=true` (from "Play from beginning" links) skips the dialog entirely.

## Audio and subtitle tracks

Track lists come from two sources merged at render time:

1. **ffprobe analysis** (`GET /api/playback/analysis`) — richer labels, language
   codes, codec info, and PGS/image-subtitle detection. Preferred when available.
2. **Native browser `<track>` elements** — fallback for sidecar subtitle files
   delivered via `GET /api/playback/subtitles`.

The merge logic lives in `src/lib/player/tracks.ts`. Track selection UI is in
`ControlsBar` → `SettingsMenu`. For audio tracks during transcode, switching a
track restarts the transcode pipe with the new `audio_index`.

Graceful empty state: if no tracks are detected, the Audio row in Settings is
disabled (grayed out). The Subtitles panel always shows "Off" as an option.

## External linked-app handoff

`GET /api/jellyfin/play?mux_id=…` returns a deep-link URL when a Jellyfin server
is linked. This is surfaced as a secondary "Open in linked app" button on detail
pages — it is never the primary action. The lookup is fired in parallel with the
main page fetch so it adds no latency to rendering the native Play button, and a
404 / network error silently produces `null` (no button shown).
