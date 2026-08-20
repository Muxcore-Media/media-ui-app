import { FormEvent, useEffect, useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import {
  applyTheme,
  getPreferences,
  updatePreferences,
  type UserPreferences,
} from '../lib/userdata'

const tabClass = ({ isActive }: { isActive: boolean }) =>
  `rounded-md px-3 py-2 text-sm font-medium ${
    isActive ? 'bg-[var(--accent)] text-black' : 'text-[var(--muted)] hover:bg-[var(--surface-2)]'
  }`

function usePrefs(): [UserPreferences, (p: Partial<UserPreferences>) => void] {
  const [prefs, setPrefs] = useState(getPreferences)
  function save(patch: Partial<UserPreferences>) {
    const next = updatePreferences(patch)
    setPrefs(next)
    if (patch.display?.theme) applyTheme(next.display.theme)
  }
  return [prefs, save]
}

function ProfilePane() {
  return (
    <div className="max-w-xl space-y-3 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4">
      <h2 className="font-semibold">Profile</h2>
      <p className="text-sm text-[var(--muted)]">
        Sign-in identity comes from auth-local via the media BFF. Preferences, progress, favorites, and
        queue sync to the server userdata store when the BFF is available; this browser keeps a local cache
        for offline use.
      </p>
      <a href="/logout" className="inline-flex rounded-md border border-[var(--border)] px-3 py-2 text-sm">
        Log out
      </a>
      <a href="/forgot-password" className="inline-flex rounded-md border border-[var(--border)] px-3 py-2 text-sm">
        Forgot password
      </a>
      <a href="/quickconnect" className="inline-flex rounded-md border border-[var(--border)] px-3 py-2 text-sm">
        Quick Connect
      </a>
    </div>
  )
}

function DisplayPane() {
  const [prefs, save] = usePrefs()
  function onSubmit(e: FormEvent) {
    e.preventDefault()
    const fd = new FormData(e.target as HTMLFormElement)
    save({
      display: {
        theme: String(fd.get('theme')) as UserPreferences['display']['theme'],
        libraryPageSize: Number(fd.get('libraryPageSize')) || 48,
        showWatchedIndicators: fd.get('showWatchedIndicators') === 'on',
      },
    })
  }
  return (
    <form onSubmit={onSubmit} className="max-w-xl space-y-4 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4">
      <label className="block space-y-1 text-sm">
        <span>Theme</span>
        <select
          name="theme"
          defaultValue={prefs.display.theme}
          className="w-full rounded-md border border-[var(--border)] bg-[var(--bg)] px-3 py-2"
        >
          <option value="dark">Dark</option>
          <option value="light">Light</option>
          <option value="system">System</option>
        </select>
      </label>
      <label className="block space-y-1 text-sm">
        <span>Library page size</span>
        <input
          name="libraryPageSize"
          type="number"
          min={12}
          max={200}
          defaultValue={prefs.display.libraryPageSize}
          className="w-full rounded-md border border-[var(--border)] bg-[var(--bg)] px-3 py-2"
        />
      </label>
      <label className="flex items-center gap-2 text-sm">
        <input name="showWatchedIndicators" type="checkbox" defaultChecked={prefs.display.showWatchedIndicators} />
        Show watched indicators
      </label>
      <button type="submit" className="rounded-md bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-black">
        Save
      </button>
    </form>
  )
}

function HomePane() {
  const [prefs, save] = usePrefs()
  function onSubmit(e: FormEvent) {
    e.preventDefault()
    const fd = new FormData(e.target as HTMLFormElement)
    save({
      home: {
        showContinueWatching: fd.get('showContinueWatching') === 'on',
        showFavorites: fd.get('showFavorites') === 'on',
        showRecentRequests: fd.get('showRecentRequests') === 'on',
        showNextUp: fd.get('showNextUp') === 'on',
      },
    })
  }
  return (
    <form onSubmit={onSubmit} className="max-w-xl space-y-3 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4">
      {(
        [
          ['showContinueWatching', 'Continue watching', prefs.home.showContinueWatching],
          ['showFavorites', 'Favorites row', prefs.home.showFavorites],
          ['showRecentRequests', 'Recent requests', prefs.home.showRecentRequests],
          ['showNextUp', 'Next up / ready to play', prefs.home.showNextUp],
        ] as const
      ).map(([name, label, checked]) => (
        <label key={name} className="flex items-center gap-2 text-sm">
          <input name={name} type="checkbox" defaultChecked={checked} />
          {label}
        </label>
      ))}
      <button type="submit" className="rounded-md bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-black">
        Save
      </button>
    </form>
  )
}

function PlaybackPane() {
  const [prefs, save] = usePrefs()
  function onSubmit(e: FormEvent) {
    e.preventDefault()
    const fd = new FormData(e.target as HTMLFormElement)
    save({
      playback: {
        autoplayNext: fd.get('autoplayNext') === 'on',
        rememberPosition: fd.get('rememberPosition') === 'on',
        skipIntroSec: Number(fd.get('skipIntroSec')) || 0,
      },
    })
  }
  return (
    <form onSubmit={onSubmit} className="max-w-xl space-y-4 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4">
      <label className="flex items-center gap-2 text-sm">
        <input name="autoplayNext" type="checkbox" defaultChecked={prefs.playback.autoplayNext} />
        Autoplay next episode
      </label>
      <label className="flex items-center gap-2 text-sm">
        <input name="rememberPosition" type="checkbox" defaultChecked={prefs.playback.rememberPosition} />
        Remember playback position
      </label>
      <label className="block space-y-1 text-sm">
        <span>Skip intro (seconds)</span>
        <input
          name="skipIntroSec"
          type="number"
          min={0}
          max={300}
          defaultValue={prefs.playback.skipIntroSec}
          className="w-full rounded-md border border-[var(--border)] bg-[var(--bg)] px-3 py-2"
        />
      </label>
      <button type="submit" className="rounded-md bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-black">
        Save
      </button>
    </form>
  )
}

function SubtitlesPane() {
  const [prefs, save] = usePrefs()
  function onSubmit(e: FormEvent) {
    e.preventDefault()
    const fd = new FormData(e.target as HTMLFormElement)
    save({
      subtitles: {
        enabled: fd.get('enabled') === 'on',
        language: String(fd.get('language') || 'eng'),
        textSize: String(fd.get('textSize')) as UserPreferences['subtitles']['textSize'],
      },
    })
  }
  return (
    <form onSubmit={onSubmit} className="max-w-xl space-y-4 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4">
      <label className="flex items-center gap-2 text-sm">
        <input name="enabled" type="checkbox" defaultChecked={prefs.subtitles.enabled} />
        Prefer subtitles when available
      </label>
      <label className="block space-y-1 text-sm">
        <span>Preferred language (ISO 639-2/B)</span>
        <input
          name="language"
          defaultValue={prefs.subtitles.language}
          className="w-full rounded-md border border-[var(--border)] bg-[var(--bg)] px-3 py-2"
        />
      </label>
      <label className="block space-y-1 text-sm">
        <span>Text size</span>
        <select
          name="textSize"
          defaultValue={prefs.subtitles.textSize}
          className="w-full rounded-md border border-[var(--border)] bg-[var(--bg)] px-3 py-2"
        >
          <option value="sm">Small</option>
          <option value="md">Medium</option>
          <option value="lg">Large</option>
        </select>
      </label>
      <button type="submit" className="rounded-md bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-black">
        Save
      </button>
    </form>
  )
}

function ControlsPane() {
  const [prefs, save] = usePrefs()
  function onSubmit(e: FormEvent) {
    e.preventDefault()
    const fd = new FormData(e.target as HTMLFormElement)
    save({
      controls: {
        enableKeyboardShortcuts: fd.get('enableKeyboardShortcuts') === 'on',
      },
    })
  }
  return (
    <form onSubmit={onSubmit} className="max-w-xl space-y-4 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4">
      <label className="flex items-center gap-2 text-sm">
        <input
          name="enableKeyboardShortcuts"
          type="checkbox"
          defaultChecked={prefs.controls.enableKeyboardShortcuts}
        />
        Keyboard shortcuts in the player (Space, ←/→, F)
      </label>
      <button type="submit" className="rounded-md bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-black">
        Save
      </button>
    </form>
  )
}

export default function Settings() {
  const { pathname } = useLocation()
  useEffect(() => {
    applyTheme(getPreferences().display.theme)
  }, [])

  let pane = <ProfilePane />
  if (pathname.endsWith('/display')) pane = <DisplayPane />
  else if (pathname.endsWith('/home')) pane = <HomePane />
  else if (pathname.endsWith('/playback')) pane = <PlaybackPane />
  else if (pathname.endsWith('/subtitles')) pane = <SubtitlesPane />
  else if (pathname.endsWith('/controls')) pane = <ControlsPane />

  return (
    <div className="space-y-6" data-testid="settings-page">
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-sm text-[var(--muted)]">
          Jellyfin-equivalent user preferences (display, home, playback, subtitles, controls).
        </p>
      </div>
      <nav className="flex flex-wrap gap-1 border-b border-[var(--border)] pb-3">
        <NavLink to="/settings" end className={tabClass}>
          Profile
        </NavLink>
        <NavLink to="/settings/display" className={tabClass}>
          Display
        </NavLink>
        <NavLink to="/settings/home" className={tabClass}>
          Home
        </NavLink>
        <NavLink to="/settings/playback" className={tabClass}>
          Playback
        </NavLink>
        <NavLink to="/settings/subtitles" className={tabClass}>
          Subtitles
        </NavLink>
        <NavLink to="/settings/controls" className={tabClass}>
          Controls
        </NavLink>
      </nav>
      {pane}
    </div>
  )
}
