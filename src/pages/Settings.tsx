import { type FormEvent, useEffect, useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { Gauge, Home as HomeIcon, Keyboard, LogOut, Monitor, Subtitles, User } from 'lucide-react'
import {
  applyTheme,
  getPreferences,
  updatePreferences,
  type UserPreferences,
} from '../lib/userdata'

const tabClass = ({ isActive }: { isActive: boolean }) =>
  `flex items-center gap-1.5 rounded-[var(--radius-md)] px-3 py-2 text-sm font-medium transition ${
    isActive
      ? 'bg-[var(--accent-color)] text-black'
      : 'text-[var(--text-secondary)] hover:bg-[var(--bg-elevated-2)] hover:text-[var(--text-primary)]'
  }`

const paneClass = 'max-w-xl space-y-4 rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--bg-elevated)] p-5'
const inputClass =
  'w-full rounded-[var(--radius-sm)] border border-[var(--border-subtle)] bg-[var(--bg-base)] px-3 py-2 text-sm outline-none focus:border-[var(--accent-color)]'
const saveBtnClass =
  'rounded-[var(--radius-md)] bg-[var(--accent-color)] px-4 py-2 text-sm font-semibold text-black transition hover:bg-[var(--accent-hover)]'

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
    <div className={paneClass}>
      <h2 className="font-semibold text-[var(--text-primary)]">Profile</h2>
      <p className="text-sm text-[var(--text-secondary)]">
        Your profile, watch progress, favorites, and queue sync across your devices when you&apos;re signed in.
      </p>
      <div className="flex flex-wrap gap-2">
        <a
          href="/logout"
          className="inline-flex items-center gap-1.5 rounded-[var(--radius-md)] border border-[var(--border-subtle)] px-3 py-2 text-sm text-[var(--text-secondary)] transition hover:border-[var(--accent-color)] hover:text-[var(--text-primary)]"
        >
          <LogOut className="h-4 w-4" aria-hidden="true" />
          Log out
        </a>
        <a
          href="/forgot-password"
          className="inline-flex items-center rounded-[var(--radius-md)] border border-[var(--border-subtle)] px-3 py-2 text-sm text-[var(--text-secondary)] transition hover:border-[var(--accent-color)] hover:text-[var(--text-primary)]"
        >
          Forgot password
        </a>
        <a
          href="/quickconnect"
          className="inline-flex items-center rounded-[var(--radius-md)] border border-[var(--border-subtle)] px-3 py-2 text-sm text-[var(--text-secondary)] transition hover:border-[var(--accent-color)] hover:text-[var(--text-primary)]"
        >
          Quick Connect
        </a>
      </div>
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
    <form onSubmit={onSubmit} className={paneClass}>
      <label className="block space-y-1 text-sm">
        <span className="text-[var(--text-secondary)]">Theme</span>
        <select name="theme" defaultValue={prefs.display.theme} className={inputClass}>
          <option value="dark">Dark</option>
          <option value="light">Light</option>
          <option value="system">System</option>
        </select>
      </label>
      <label className="block space-y-1 text-sm">
        <span className="text-[var(--text-secondary)]">Titles per page</span>
        <input
          name="libraryPageSize"
          type="number"
          min={12}
          max={200}
          defaultValue={prefs.display.libraryPageSize}
          className={inputClass}
        />
      </label>
      <label className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
        <input name="showWatchedIndicators" type="checkbox" defaultChecked={prefs.display.showWatchedIndicators} />
        Show watched indicators
      </label>
      <button type="submit" className={saveBtnClass}>
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
    <form onSubmit={onSubmit} className={paneClass}>
      {(
        [
          ['showContinueWatching', 'Continue watching', prefs.home.showContinueWatching],
          ['showFavorites', 'Favorites row', prefs.home.showFavorites],
          ['showRecentRequests', 'In progress on home', prefs.home.showRecentRequests],
          ['showNextUp', 'Next up', prefs.home.showNextUp],
        ] as const
      ).map(([name, label, checked]) => (
        <label key={name} className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
          <input name={name} type="checkbox" defaultChecked={checked} />
          {label}
        </label>
      ))}
      <button type="submit" className={saveBtnClass}>
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
    <form onSubmit={onSubmit} className={paneClass}>
      <label className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
        <input name="autoplayNext" type="checkbox" defaultChecked={prefs.playback.autoplayNext} />
        Autoplay next episode
      </label>
      <label className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
        <input name="rememberPosition" type="checkbox" defaultChecked={prefs.playback.rememberPosition} />
        Remember playback position
      </label>
      <label className="block space-y-1 text-sm">
        <span className="text-[var(--text-secondary)]">Skip intro (seconds)</span>
        <input name="skipIntroSec" type="number" min={0} max={300} defaultValue={prefs.playback.skipIntroSec} className={inputClass} />
      </label>
      <button type="submit" className={saveBtnClass}>
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
    <form onSubmit={onSubmit} className={paneClass}>
      <label className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
        <input name="enabled" type="checkbox" defaultChecked={prefs.subtitles.enabled} />
        Prefer subtitles when available
      </label>
      <label className="block space-y-1 text-sm">
        <span className="text-[var(--text-secondary)]">Subtitle language</span>
        <input name="language" defaultValue={prefs.subtitles.language} className={inputClass} />
      </label>
      <label className="block space-y-1 text-sm">
        <span className="text-[var(--text-secondary)]">Text size</span>
        <select name="textSize" defaultValue={prefs.subtitles.textSize} className={inputClass}>
          <option value="sm">Small</option>
          <option value="md">Medium</option>
          <option value="lg">Large</option>
        </select>
      </label>
      <button type="submit" className={saveBtnClass}>
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
    <form onSubmit={onSubmit} className={paneClass}>
      <label className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
        <input name="enableKeyboardShortcuts" type="checkbox" defaultChecked={prefs.controls.enableKeyboardShortcuts} />
        Keyboard shortcuts in the player (Space, ←/→, F)
      </label>
      <button type="submit" className={saveBtnClass}>
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
        <h1 className="text-2xl font-bold tracking-tight text-[var(--text-primary)]">Settings</h1>
        <p className="text-sm text-[var(--text-secondary)]">
          Manage your profile, playback, and display preferences.
        </p>
      </div>
      <nav className="flex flex-wrap gap-1 border-b border-[var(--border-subtle)] pb-3">
        <NavLink to="/settings" end className={tabClass}>
          <User className="h-4 w-4" aria-hidden="true" />
          Profile
        </NavLink>
        <NavLink to="/settings/display" className={tabClass}>
          <Monitor className="h-4 w-4" aria-hidden="true" />
          Display
        </NavLink>
        <NavLink to="/settings/home" className={tabClass}>
          <HomeIcon className="h-4 w-4" aria-hidden="true" />
          Home
        </NavLink>
        <NavLink to="/settings/playback" className={tabClass}>
          <Gauge className="h-4 w-4" aria-hidden="true" />
          Playback
        </NavLink>
        <NavLink to="/settings/subtitles" className={tabClass}>
          <Subtitles className="h-4 w-4" aria-hidden="true" />
          Subtitles
        </NavLink>
        <NavLink to="/settings/controls" className={tabClass}>
          <Keyboard className="h-4 w-4" aria-hidden="true" />
          Controls
        </NavLink>
      </nav>
      {pane}
    </div>
  )
}
