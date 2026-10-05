import { type FormEvent, useEffect, useMemo, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import {
  HardDrive,
  CloudDownload,
  Gauge,
  Home as HomeIcon,
  Keyboard,
  Layers,
  LogOut,
  Bell,
  Monitor,
  PlugZap,
  Shield,
  Subtitles,
  Ticket,
  Timer,
  User,
} from 'lucide-react';
import { api, signOut } from '../api/client';
import { HouseholdProfiles } from '../components/HouseholdProfiles';
import { canApproveRequests, canManageLibrary, canManageNotifications, canManageQuality, canManageSubtitles } from '../lib/session';
import {
  applyTheme,
  getPreferences,
  getUserdataSyncStatus,
  updatePreferences,
  type UserPreferences,
} from '../lib/userdata';
import { hashPin, validateParentalPIN } from '../lib/parental';
import { featureEnabled, useCapabilities } from '../lib/capabilities';
import { indexerCapabilityLabels, type AcquisitionStatus } from '../lib/acquisition-status';
import {
  formatBytes,
  maintainerActionLabel,
  maintainerStatusLabel,
  type MaintainerStatus,
} from '../lib/maintainer';
import {
  formatRulesText,
  parseFormatRules,
  parseReleaseTerms,
  releaseTermsText,
  parsedQualityLabel,
  type FormatScorePreview,
  type FormatsCatalog,
  type ParsedQuality,
  type QualityFormat,
  type QualityProfile,
  type ReleaseProfile,
} from '../lib/formats';
import {
  withDefaultDelayProfiles,
  type DelayProfile,
} from '../lib/delay-profiles';
import { type HouseholdTOTP } from '../lib/totp';
import {
  createBrowserPasskey,
  passkeyLabel,
  passkeySupported,
  type HouseholdPasskey,
  type PasskeysResponse,
} from '../lib/passkeys';
import {
  GUARD_RULE_TYPES,
  guardParamsText,
  guardRuleLabel,
  guardRuleTypeLabel,
  parseGuardParams,
  type GuardCatalog,
  type GuardRule,
} from '../lib/guard';
import { SUBTITLE_TEXT_COLORS } from '../lib/subtitle-offset';
import { NOTIFY_CHANNELS, notifyChannelLabel, type NotifyChannel } from '../lib/notifications';
import {
  WATCH_NOTIFY_DESTINATION_TYPES,
  WATCH_NOTIFY_EVENTS,
  parseCsvList,
  watchNotifyDestinationLabel,
  watchNotifyEventLabel,
  watchNotifyRuleLabel,
  type WatchNotifyCatalog,
} from '../lib/watch-notify';
import {
  appendProfileLanguage,
  groupSubtitleLibrary,
  profileLanguagesLabel,
  uniqueSubtitleLanguages,
  type SubtitleBlacklistItem,
  type SubtitleHistoryItem,
  type SubtitleLanguage,
  type SubtitleLibraryItem,
  type SubtitleProfile,
  type SubtitleProvider,
  type SubtitleWantedItem,
} from '../lib/subtitle-ops';

const tabClass = ({ isActive }: { isActive: boolean }) =>
  `flex items-center gap-1.5 rounded-[var(--radius-md)] px-3 py-2 text-sm font-medium outline-none transition focus-visible:ring-2 focus-visible:ring-[var(--accent-color)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg-base)] ${
    isActive
      ? 'bg-[var(--accent-color)] text-black'
      : 'text-[var(--text-secondary)] hover:bg-[var(--bg-elevated-2)] hover:text-[var(--text-primary)]'
  }`;

const paneClass =
  'max-w-xl space-y-4 rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--bg-elevated)] p-5';
const inputClass =
  'w-full rounded-[var(--radius-sm)] border border-[var(--border-subtle)] bg-[var(--bg-base)] px-3 py-2 text-sm outline-none focus:border-[var(--accent-color)]';
const saveBtnClass =
  'rounded-[var(--radius-md)] bg-[var(--accent-color)] px-4 py-2 text-sm font-semibold text-black transition hover:bg-[var(--accent-hover)]';

function usePrefs(): [UserPreferences, (p: Partial<UserPreferences>) => void] {
  const [prefs, setPrefs] = useState(getPreferences);
  function save(patch: Partial<UserPreferences>) {
    const next = updatePreferences(patch);
    setPrefs(next);
    if (patch.display?.theme) applyTheme(next.display.theme);
  }
  return [prefs, save];
}

function ProfilePane() {
  const sync = getUserdataSyncStatus();
  const [totp, setTotp] = useState<HouseholdTOTP | null>(null);
  const [totpError, setTotpError] = useState<string | null>(null);
  const [totpBusy, setTotpBusy] = useState(false);
  const [totpCode, setTotpCode] = useState('');
  const [passkeys, setPasskeys] = useState<PasskeysResponse | null>(null);
  const [passkeyError, setPasskeyError] = useState<string | null>(null);
  const [passkeyBusy, setPasskeyBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void api.getTOTP().then((next) => {
      if (!cancelled) setTotp(next);
    });
    void api.listPasskeys().then((next) => {
      if (!cancelled) setPasskeys(next);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  async function onEnableTOTP() {
    setTotpBusy(true);
    setTotpError(null);
    try {
      setTotp(await api.enableTOTP());
    } catch (err) {
      setTotpError(err instanceof Error ? err.message : 'Could not enable authenticator');
    } finally {
      setTotpBusy(false);
    }
  }

  async function onVerifyTOTP(e: FormEvent) {
    e.preventDefault();
    setTotpBusy(true);
    setTotpError(null);
    try {
      setTotp(await api.verifyTOTP(totpCode));
      setTotpCode('');
    } catch (err) {
      setTotpError(err instanceof Error ? err.message : 'Could not verify authenticator');
    } finally {
      setTotpBusy(false);
    }
  }

  async function onDisableTOTP() {
    setTotpBusy(true);
    setTotpError(null);
    try {
      setTotp(await api.disableTOTP());
    } catch (err) {
      setTotpError(err instanceof Error ? err.message : 'Could not disable authenticator');
    } finally {
      setTotpBusy(false);
    }
  }

  async function onAddPasskey() {
    setPasskeyBusy(true);
    setPasskeyError(null);
    try {
      const began = await api.beginPasskeyRegister();
      const credential = await createBrowserPasskey(began.options);
      await api.completePasskeyRegister(began.challenge, credential);
      setPasskeys(await api.listPasskeys());
    } catch (err) {
      setPasskeyError(err instanceof Error ? err.message : 'Could not add a passkey');
    } finally {
      setPasskeyBusy(false);
    }
  }

  async function onDeletePasskey(passkey: HouseholdPasskey) {
    setPasskeyBusy(true);
    setPasskeyError(null);
    try {
      await api.deletePasskey(passkey.id);
      setPasskeys(await api.listPasskeys());
    } catch (err) {
      setPasskeyError(err instanceof Error ? err.message : 'Could not remove passkey');
    } finally {
      setPasskeyBusy(false);
    }
  }

  return (
    <div className={paneClass}>
      <h2 className="font-semibold text-[var(--text-primary)]">Profile</h2>
      <p className="text-sm text-[var(--text-secondary)]">
        Your profile, watch progress, favorites, and queue sync across your devices when you&apos;re
        signed in.
      </p>
      <p className="text-sm text-[var(--text-secondary)]" data-testid="profile-sync-status">
        {sync.authoritative
          ? sync.lastPullAt
            ? `Synced ${new Date(sync.lastPullAt).toLocaleString()}`
            : 'Synced with server'
          : 'Sync unavailable — using local data on this device'}
      </p>
      <HouseholdProfiles />
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => void signOut()}
          className="inline-flex items-center gap-1.5 rounded-[var(--radius-md)] border border-[var(--border-subtle)] px-3 py-2 text-sm text-[var(--text-secondary)] transition hover:border-[var(--accent-color)] hover:text-[var(--text-primary)]"
        >
          <LogOut className="h-4 w-4" aria-hidden="true" />
          Log out
        </button>
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
      {totp && totp.available !== false ? (
        <div className="space-y-2" data-testid="settings-totp">
          <h3 className="font-semibold text-[var(--text-primary)]">Authenticator</h3>
          <p className="text-sm text-[var(--text-secondary)]">
            {totp.enabled
              ? totp.secret
                ? 'Scan or enter this secret, then confirm a 6-digit code.'
                : 'An authenticator is enabled for this profile.'
              : 'Add an authenticator app so sign-in asks for a one-time code.'}
          </p>
          {totpError ? (
            <p className="text-sm text-[var(--danger-color)]" role="alert">
              {totpError}
            </p>
          ) : null}
          {totp.secret ? (
            <p className="break-all font-mono text-xs text-[var(--text-secondary)]" data-testid="totp-secret">
              {totp.secret}
            </p>
          ) : null}
          {totp.qrCodeUrl ? (
            <p className="break-all text-xs text-[var(--text-tertiary)]" data-testid="totp-otpauth">
              {totp.qrCodeUrl}
            </p>
          ) : null}
          {!totp.enabled ? (
            <button type="button" className={saveBtnClass} disabled={totpBusy} onClick={() => void onEnableTOTP()}>
              Enable authenticator
            </button>
          ) : totp.secret ? (
            <form onSubmit={(e) => void onVerifyTOTP(e)} className="space-y-2">
              <label htmlFor="settings-totp-code" className="block space-y-1 text-sm">
                <span className="text-[var(--text-secondary)]">Verification code</span>
                <input
                  id="settings-totp-code"
                  value={totpCode}
                  onChange={(e) => setTotpCode(e.target.value)}
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  className={inputClass}
                />
              </label>
              <button type="submit" className={saveBtnClass} disabled={totpBusy || totpCode.trim().length < 6}>
                Verify authenticator
              </button>
            </form>
          ) : (
            <button type="button" className={saveBtnClass} disabled={totpBusy} onClick={() => void onDisableTOTP()}>
              Disable authenticator
            </button>
          )}
        </div>
      ) : null}
      {passkeys && passkeys.available !== false ? (
        <div className="space-y-2" data-testid="settings-passkeys">
          <h3 className="font-semibold text-[var(--text-primary)]">Passkeys</h3>
          <p className="text-sm text-[var(--text-secondary)]">
            Sign in with this device instead of a password. Registration uses the same WebAuthn flow as admin-ui.
          </p>
          {passkeyError ? (
            <p className="text-sm text-[var(--danger-color)]" role="alert">
              {passkeyError}
            </p>
          ) : null}
          {passkeys.passkeys.length === 0 ? (
            <p className="text-sm text-[var(--text-tertiary)]">No passkeys on this profile.</p>
          ) : (
            <ul className="space-y-2">
              {passkeys.passkeys.map((passkey) => (
                <li key={passkey.id} className="flex items-center justify-between gap-2 text-sm">
                  <span className="text-[var(--text-secondary)]">{passkeyLabel(passkey)}</span>
                  <button
                    type="button"
                    className={saveBtnClass}
                    disabled={passkeyBusy}
                    onClick={() => void onDeletePasskey(passkey)}
                  >
                    Remove
                  </button>
                </li>
              ))}
            </ul>
          )}
          {passkeySupported() ? (
            <button type="button" className={saveBtnClass} disabled={passkeyBusy} onClick={() => void onAddPasskey()}>
              Add passkey
            </button>
          ) : (
            <p className="text-sm text-[var(--text-tertiary)]">This browser cannot create a passkey.</p>
          )}
        </div>
      ) : null}
    </div>
  );
}

function DisplayPane() {
  const [prefs, save] = usePrefs();
  function onSubmit(e: FormEvent) {
    e.preventDefault();
    const fd = new FormData(e.target as HTMLFormElement);
    save({
      display: {
        theme: String(fd.get('theme')) as UserPreferences['display']['theme'],
        libraryPageSize: Number(fd.get('libraryPageSize')) || 48,
        showWatchedIndicators: fd.get('showWatchedIndicators') === 'on',
      },
    });
  }
  return (
    <form onSubmit={onSubmit} className={paneClass} aria-labelledby="settings-display-heading">
      <h2 id="settings-display-heading" className="font-semibold text-[var(--text-primary)]">
        Display
      </h2>
      <label htmlFor="settings-theme" className="block space-y-1 text-sm">
        <span className="text-[var(--text-secondary)]">Theme</span>
        <select
          id="settings-theme"
          name="theme"
          defaultValue={prefs.display.theme}
          className={inputClass}
        >
          <option value="dark">Dark</option>
          <option value="light">Light</option>
          <option value="system">System</option>
        </select>
      </label>
      <label htmlFor="settings-library-page-size" className="block space-y-1 text-sm">
        <span className="text-[var(--text-secondary)]">Titles per page</span>
        <input
          id="settings-library-page-size"
          name="libraryPageSize"
          type="number"
          min={12}
          max={200}
          defaultValue={prefs.display.libraryPageSize}
          className={inputClass}
        />
      </label>
      <label className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
        <input
          name="showWatchedIndicators"
          type="checkbox"
          defaultChecked={prefs.display.showWatchedIndicators}
        />
        Show watched indicators
      </label>
      <button type="submit" className={saveBtnClass}>
        Save
      </button>
    </form>
  );
}

function HomePane() {
  const [prefs, save] = usePrefs();
  function onSubmit(e: FormEvent) {
    e.preventDefault();
    const fd = new FormData(e.target as HTMLFormElement);
    save({
      home: {
        showContinueWatching: fd.get('showContinueWatching') === 'on',
        showFavorites: fd.get('showFavorites') === 'on',
        showRecentRequests: fd.get('showRecentRequests') === 'on',
        showNextUp: fd.get('showNextUp') === 'on',
        showRecentlyAdded: fd.get('showRecentlyAdded') === 'on',
        showRecentlyWatched: fd.get('showRecentlyWatched') === 'on',
        showUpcoming: fd.get('showUpcoming') === 'on',
        showCollections: fd.get('showCollections') === 'on',
        showPlaylists: fd.get('showPlaylists') === 'on',
        showGenres: fd.get('showGenres') === 'on',
        showWantToWatch: fd.get('showWantToWatch') === 'on',
        showStudios: fd.get('showStudios') === 'on',
        showNetworks: fd.get('showNetworks') === 'on',
        showMusic: fd.get('showMusic') === 'on',
        showBooks: fd.get('showBooks') === 'on',
        showAudiobooks: fd.get('showAudiobooks') === 'on',
        showComics: fd.get('showComics') === 'on',
      },
    });
  }
  return (
    <form onSubmit={onSubmit} className={paneClass} aria-labelledby="settings-home-heading">
      <h2 id="settings-home-heading" className="font-semibold text-[var(--text-primary)]">
        Home feed
      </h2>
      {(
        [
          ['showContinueWatching', 'Continue watching', prefs.home.showContinueWatching],
          ['showRecentlyAdded', 'Recently added', prefs.home.showRecentlyAdded],
          ['showRecentlyWatched', 'Recently watched', prefs.home.showRecentlyWatched],
          ['showFavorites', 'Favorites row', prefs.home.showFavorites],
          ['showRecentRequests', 'In progress on home', prefs.home.showRecentRequests],
          ['showNextUp', 'Next up', prefs.home.showNextUp],
          ['showUpcoming', 'Upcoming / On The Air', prefs.home.showUpcoming],
          ['showCollections', 'Collections shelf', prefs.home.showCollections],
          ['showPlaylists', 'Playlists shelf', prefs.home.showPlaylists],
          ['showGenres', 'Browse by Genre shelf', prefs.home.showGenres],
          ['showWantToWatch', 'Want to Watch shelf', prefs.home.showWantToWatch],
          ['showStudios', 'Browse by Studio shelf', prefs.home.showStudios],
          ['showNetworks', 'Browse by Network shelf', prefs.home.showNetworks],
          ['showMusic', 'Music shelves (Artists & Albums)', prefs.home.showMusic],
          ['showBooks', 'Books shelf (Browse Authors)', prefs.home.showBooks],
          ['showAudiobooks', 'Audiobooks shelf', prefs.home.showAudiobooks],
          ['showComics', 'Comics shelf', prefs.home.showComics],
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
  );
}

const PARENTAL_RATINGS = ['', 'G', 'PG', 'PG-13', 'R', 'NC-17', 'TV-Y', 'TV-Y7', 'TV-G', 'TV-PG', 'TV-14', 'TV-MA'];

function ParentalPane() {
  const [prefs, save] = usePrefs();
  const [error, setError] = useState<string | null>(null);
  const [flash, setFlash] = useState<string | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const fd = new FormData(e.target as HTMLFormElement);
    const pin = String(fd.get('pin') || '').trim();
    const clearPin = fd.get('clearPin') === 'on';
    const pinError = validateParentalPIN(pin);
    if (pinError) {
      setError(pinError);
      setFlash(null);
      return;
    }
    setError(null);
    let pinHash = prefs.parental.pinHash;
    if (clearPin) {
      pinHash = '';
    } else if (pin) {
      pinHash = await hashPin(pin);
    }
    save({
      parental: {
        ...prefs.parental,
        kidsMode: fd.get('kidsMode') === 'on',
        maxRating: String(fd.get('maxRating') || ''),
        blockedTags: String(fd.get('blockedTags') || ''),
        allowedTags: String(fd.get('allowedTags') || ''),
        allowUnrated: fd.get('allowUnrated') === 'on',
        pinHash,
        pinEnabled: Boolean(pinHash),
      },
    });
    setFlash('Parental controls saved');
  }

  return (
    <form onSubmit={(e) => void onSubmit(e)} className={paneClass} data-testid="settings-parental" aria-labelledby="settings-parental-heading">
      <h2 id="settings-parental-heading" className="font-semibold text-[var(--text-primary)]">
        Parental
      </h2>
      <p className="text-sm text-[var(--text-secondary)]">
        Restrict this profile without opening admin-ui. The PIN uses the same hash as admin-ui.
      </p>
      {error ? (
        <p className="text-sm text-[var(--danger-color)]" role="alert">
          {error}
        </p>
      ) : null}
      {flash ? (
        <p className="text-sm text-[var(--text-secondary)]" data-testid="parental-flash">
          {flash}
        </p>
      ) : null}
      <label className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
        <input name="kidsMode" type="checkbox" defaultChecked={prefs.parental.kidsMode} />
        Kids mode
      </label>
      <label htmlFor="settings-parental-rating" className="block space-y-1 text-sm">
        <span className="text-[var(--text-secondary)]">Maximum rating</span>
        <select
          id="settings-parental-rating"
          name="maxRating"
          defaultValue={prefs.parental.maxRating}
          className={inputClass}
        >
          {PARENTAL_RATINGS.map((rating) => (
            <option key={rating || 'none'} value={rating}>
              {rating || 'Unrestricted'}
            </option>
          ))}
        </select>
      </label>
      <label htmlFor="settings-parental-blocked" className="block space-y-1 text-sm">
        <span className="text-[var(--text-secondary)]">Blocked tags</span>
        <input
          id="settings-parental-blocked"
          name="blockedTags"
          defaultValue={prefs.parental.blockedTags ?? ''}
          className={inputClass}
          placeholder="horror, gore"
        />
      </label>
      <label htmlFor="settings-parental-allowed" className="block space-y-1 text-sm">
        <span className="text-[var(--text-secondary)]">Allowed tags</span>
        <input
          id="settings-parental-allowed"
          name="allowedTags"
          defaultValue={prefs.parental.allowedTags ?? ''}
          className={inputClass}
        />
      </label>
      <label className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
        <input name="allowUnrated" type="checkbox" defaultChecked={prefs.parental.allowUnrated !== false} />
        Allow unrated titles
      </label>
      <p className="text-xs text-[var(--text-tertiary)]">
        {prefs.parental.pinHash ? 'A PIN is set for this profile.' : 'No PIN is set.'}
      </p>
      <label htmlFor="settings-parental-pin" className="block space-y-1 text-sm">
        <span className="text-[var(--text-secondary)]">New PIN (4–6 digits)</span>
        <input
          id="settings-parental-pin"
          name="pin"
          type="password"
          inputMode="numeric"
          autoComplete="off"
          className={inputClass}
        />
      </label>
      {prefs.parental.pinHash ? (
        <label className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
          <input name="clearPin" type="checkbox" />
          Clear PIN
        </label>
      ) : null}
      <button type="submit" className={saveBtnClass}>
        Save
      </button>
    </form>
  );
}

function PlaybackPane() {
  const [prefs, save] = usePrefs();
  const [skipMedia, setSkipMedia] = useState<{ id: string }[]>([]);
  useEffect(() => {
    let cancelled = false;
    api
      .listSkipMedia()
      .then((res) => {
        if (!cancelled && res.available) setSkipMedia(res.items);
      })
      .catch(() => {
        /* intro-outro optional */
      });
    return () => {
      cancelled = true;
    };
  }, []);
  function onSubmit(e: FormEvent) {
    e.preventDefault();
    const fd = new FormData(e.target as HTMLFormElement);
    save({
      playback: {
        autoplayNext: fd.get('autoplayNext') === 'on',
        rememberPosition: fd.get('rememberPosition') === 'on',
        skipIntroSec: Number(fd.get('skipIntroSec')) || 0,
        autoSkipIntro: fd.get('autoSkipIntro') === 'on',
        autoSkipCredits: fd.get('autoSkipCredits') === 'on',
        audioOffsetMs: Number(fd.get('audioOffsetMs') || 0),
      },
    });
  }
  return (
    <form onSubmit={onSubmit} className={paneClass} aria-labelledby="settings-playback-heading">
      <h2 id="settings-playback-heading" className="font-semibold text-[var(--text-primary)]">
        Playback
      </h2>
      <label className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
        <input name="autoplayNext" type="checkbox" defaultChecked={prefs.playback.autoplayNext} />
        Autoplay next episode
      </label>
      <label className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
        <input
          name="rememberPosition"
          type="checkbox"
          defaultChecked={prefs.playback.rememberPosition}
        />
        Remember playback position
      </label>
      <label className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
        <input name="autoSkipIntro" type="checkbox" defaultChecked={prefs.playback.autoSkipIntro} />
        Auto-skip intro and recap
      </label>
      <label className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
        <input
          name="autoSkipCredits"
          type="checkbox"
          defaultChecked={prefs.playback.autoSkipCredits}
        />
        Auto-skip outro and credits
      </label>
      <label htmlFor="settings-skip-intro" className="block space-y-1 text-sm">
        <span className="text-[var(--text-secondary)]">Skip intro (seconds)</span>
        <input
          id="settings-skip-intro"
          name="skipIntroSec"
          type="number"
          min={0}
          max={300}
          defaultValue={prefs.playback.skipIntroSec}
          className={inputClass}
        />
      </label>
      <label htmlFor="settings-audio-offset" className="block space-y-1 text-sm">
        <span className="text-[var(--text-secondary)]">Audio delay (ms)</span>
        <input
          id="settings-audio-offset"
          name="audioOffsetMs"
          type="number"
          min={-10000}
          max={10000}
          step={50}
          defaultValue={prefs.playback.audioOffsetMs ?? 0}
          className={inputClass}
        />
      </label>
      <p className="text-xs text-[var(--text-tertiary)]">
        Positive delays audio. Negative pulls audio earlier on direct play. Keyboard [ / ] in the player.
      </p>
      <button type="submit" className={saveBtnClass}>
        Save
      </button>
      {skipMedia.length > 0 ? (
        <section className="space-y-2" data-testid="skip-media-list">
          <h3 className="text-sm font-semibold text-[var(--text-primary)]">Titles with skip points</h3>
          <p className="text-xs text-[var(--text-tertiary)]">
            Open a title and use player Settings → Skip points to edit or clear them.
          </p>
          <ul className="divide-y divide-[var(--border-subtle)] rounded-[var(--radius-md)] border border-[var(--border-subtle)]">
            {skipMedia.map((row) => (
              <li key={row.id} className="px-3 py-2">
                <Link
                  to={`/search?q=${encodeURIComponent(row.id)}`}
                  className="text-sm font-medium text-[var(--accent-color)] hover:underline"
                >
                  {row.id}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </form>
  );
}

function SubtitlesPane() {
  const [prefs, save] = usePrefs();
  const canEdit = canManageSubtitles();
  const [wanted, setWanted] = useState<SubtitleWantedItem[]>([]);
  const [providers, setProviders] = useState<SubtitleProvider[]>([]);
  const [history, setHistory] = useState<SubtitleHistoryItem[]>([]);
  const [profiles, setProfiles] = useState<SubtitleProfile[]>([]);
  const [blacklist, setBlacklist] = useState<SubtitleBlacklistItem[]>([]);
  const [library, setLibrary] = useState<SubtitleLibraryItem[]>([]);
  const [languages, setLanguages] = useState<SubtitleLanguage[]>([]);
  const [catalogCode, setCatalogCode] = useState('');
  const [catalogHI, setCatalogHI] = useState(false);
  const [catalogForced, setCatalogForced] = useState(false);
  const [available, setAvailable] = useState<boolean | null>(null);
  const [title, setTitle] = useState('');
  const [language, setLanguage] = useState('eng');
  const [profileName, setProfileName] = useState('');
  const [profileLangs, setProfileLangs] = useState('eng');
  const [error, setError] = useState<string | null>(null);
  const [flash, setFlash] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function reload() {
    const [nextWanted, nextProviders, nextHistory, nextProfiles, nextBlacklist, nextLibrary, nextLanguages] = await Promise.all([
      api.listSubtitleWanted(),
      api.listSubtitleProviders(),
      api.listSubtitleHistory(),
      api.listSubtitleProfiles(),
      api.listSubtitleBlacklist(),
      api.listSubtitleMedia(),
      api.listSubtitleLanguages(),
    ]);
    setAvailable(nextWanted.available || nextProviders.available || nextBlacklist.available || nextLibrary.available || nextLanguages.available);
    setWanted(nextWanted.wanted);
    setProviders(nextProviders.providers);
    setHistory(nextHistory.history);
    setProfiles(nextProfiles.profiles);
    setBlacklist(nextBlacklist.entries);
    setLibrary(nextLibrary.items);
    setLanguages(nextLanguages.languages);
  }

  useEffect(() => {
    if (!canEdit) return;
    let cancelled = false;
    void Promise.all([
      api.listSubtitleWanted(),
      api.listSubtitleProviders(),
      api.listSubtitleHistory(),
      api.listSubtitleProfiles(),
      api.listSubtitleBlacklist(),
      api.listSubtitleMedia(),
      api.listSubtitleLanguages(),
    ])
      .then(([nextWanted, nextProviders, nextHistory, nextProfiles, nextBlacklist, nextLibrary, nextLanguages]) => {
        if (cancelled) return;
        setAvailable(nextWanted.available || nextProviders.available || nextBlacklist.available || nextLibrary.available || nextLanguages.available);
        setWanted(nextWanted.wanted);
        setProviders(nextProviders.providers);
        setHistory(nextHistory.history);
        setProfiles(nextProfiles.profiles);
        setBlacklist(nextBlacklist.entries);
        setLibrary(nextLibrary.items);
        setLanguages(nextLanguages.languages);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Could not load subtitle ops');
      });
    return () => {
      cancelled = true;
    };
  }, [canEdit]);

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    const fd = new FormData(e.target as HTMLFormElement);
    save({
      subtitles: {
        ...prefs.subtitles,
        enabled: fd.get('enabled') === 'on',
        language: String(fd.get('language') || 'eng'),
        textSize: String(fd.get('textSize')) as UserPreferences['subtitles']['textSize'],
        textColor: String(fd.get('textColor') || prefs.subtitles.textColor),
        backgroundOpacity: Number(fd.get('backgroundOpacity') || prefs.subtitles.backgroundOpacity),
        edgeStyle: String(fd.get('edgeStyle') || prefs.subtitles.edgeStyle) as UserPreferences['subtitles']['edgeStyle'],
        verticalPosition: String(fd.get('verticalPosition') || prefs.subtitles.verticalPosition) as UserPreferences['subtitles']['verticalPosition'],
        offsetMs: Number(fd.get('offsetMs') || 0),
      },
    });
  }

  async function onAddWanted(e: FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    setBusy(true);
    setError(null);
    setFlash(null);
    try {
      await api.createSubtitleWanted({ title: title.trim(), language: language.trim() || 'eng' });
      setTitle('');
      setFlash('Added to wanted');
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not add wanted');
    } finally {
      setBusy(false);
    }
  }

  async function onSearchWanted(mediaIds?: string[]) {
    setBusy(true);
    setError(null);
    setFlash(null);
    try {
      const next = await api.searchSubtitleWanted(mediaIds?.length ? { mediaIds } : undefined);
      setFlash(`Searched ${next.searched}, downloaded ${next.downloaded}`);
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Wanted search failed');
    } finally {
      setBusy(false);
    }
  }

  async function onClearHistory() {
    setBusy(true);
    setError(null);
    setFlash(null);
    try {
      await api.clearSubtitleHistory();
      setFlash('Subtitle history cleared');
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not clear history');
    } finally {
      setBusy(false);
    }
  }

  async function onRemoveWanted(id: string) {
    setBusy(true);
    setError(null);
    try {
      await api.deleteSubtitleWanted(id);
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not remove wanted');
    } finally {
      setBusy(false);
    }
  }

  async function onToggleProvider(id: string, enabled: boolean) {
    setBusy(true);
    setError(null);
    try {
      await api.setSubtitleProvider(id, enabled);
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not update provider');
    } finally {
      setBusy(false);
    }
  }

  async function onRemoveBlacklist(id: string) {
    if (!id) return;
    setBusy(true);
    setError(null);
    try {
      await api.removeSubtitleBlacklist(id);
      setFlash('Removed from blacklist');
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not remove blacklist entry');
    } finally {
      setBusy(false);
    }
  }

  async function onSaveProfile(e: FormEvent) {
    e.preventDefault();
    if (!profileName.trim() || !profileLangs.trim()) return;
    setBusy(true);
    setError(null);
    setFlash(null);
    try {
      await api.upsertSubtitleProfile({ name: profileName.trim(), languages: profileLangs.trim(), isDefault: true });
      setProfileName('');
      setFlash('Language profile saved');
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save profile');
    } finally {
      setBusy(false);
    }
  }

  const libraryRows = useMemo(() => groupSubtitleLibrary(library), [library]);
  const catalogLanguages = useMemo(() => uniqueSubtitleLanguages(languages), [languages]);

  function onAddCatalogLanguage() {
    if (!catalogCode) return;
    setProfileLangs((cur) => appendProfileLanguage(cur, catalogCode, { hearingImpaired: catalogHI, forced: catalogForced }));
    setCatalogHI(false);
    setCatalogForced(false);
  }

  async function applyLibrary(mediaIds: string[], input: { languageProfileId?: string; monitored?: boolean }) {
    if (mediaIds.length === 0) return;
    setBusy(true);
    setError(null);
    setFlash(null);
    try {
      if (mediaIds.length === 1 && mediaIds[0]) {
        await api.setSubtitleMedia(mediaIds[0], input);
      } else if (input.languageProfileId === '') {
        for (const id of mediaIds) {
          await api.setSubtitleMedia(id, { languageProfileId: '' });
        }
      } else {
        await api.massEditSubtitleMedia({
          mediaIds,
          languageProfileId: input.languageProfileId,
          setMonitored: input.monitored !== undefined,
          monitored: input.monitored,
        });
      }
      setFlash(input.languageProfileId !== undefined ? 'Language profile assigned' : 'Subtitle monitoring updated');
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not update subtitle library');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={paneClass} data-testid="settings-subtitles" aria-labelledby="settings-subtitles-heading">
      <form onSubmit={onSubmit} className="space-y-4">
        <h2 id="settings-subtitles-heading" className="font-semibold text-[var(--text-primary)]">
          Subtitles
        </h2>
        <label className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
          <input name="enabled" type="checkbox" defaultChecked={prefs.subtitles.enabled} />
          Prefer subtitles when available
        </label>
        <label htmlFor="settings-subtitle-language" className="block space-y-1 text-sm">
          <span className="text-[var(--text-secondary)]">Subtitle language</span>
          <input
            id="settings-subtitle-language"
            name="language"
            defaultValue={prefs.subtitles.language}
            className={inputClass}
          />
        </label>
        <label htmlFor="settings-subtitle-text-color" className="block space-y-1 text-sm">
          <span className="text-[var(--text-secondary)]">Text color</span>
          <select
            id="settings-subtitle-text-color"
            name="textColor"
            defaultValue={prefs.subtitles.textColor || '#ffffff'}
            className={inputClass}
          >
            {SUBTITLE_TEXT_COLORS.map((c) => (
              <option key={c.hex} value={c.hex}>
                {c.label}
              </option>
            ))}
          </select>
        </label>
        <label htmlFor="settings-subtitle-text-size" className="block space-y-1 text-sm">
          <span className="text-[var(--text-secondary)]">Text size</span>
          <select
            id="settings-subtitle-text-size"
            name="textSize"
            defaultValue={prefs.subtitles.textSize}
            className={inputClass}
          >
            <option value="sm">Small</option>
            <option value="md">Medium</option>
            <option value="lg">Large</option>
          </select>
        </label>
        <label htmlFor="settings-subtitle-background" className="block space-y-1 text-sm">
          <span className="text-[var(--text-secondary)]">Background opacity</span>
          <input
            id="settings-subtitle-background"
            name="backgroundOpacity"
            type="number"
            min={0}
            max={100}
            defaultValue={prefs.subtitles.backgroundOpacity}
            className={inputClass}
          />
        </label>
        <label htmlFor="settings-subtitle-edge" className="block space-y-1 text-sm">
          <span className="text-[var(--text-secondary)]">Edge style</span>
          <select
            id="settings-subtitle-edge"
            name="edgeStyle"
            defaultValue={prefs.subtitles.edgeStyle}
            className={inputClass}
          >
            <option value="none">None</option>
            <option value="drop-shadow">Drop shadow</option>
            <option value="outline">Outline</option>
          </select>
        </label>
        <label htmlFor="settings-subtitle-position" className="block space-y-1 text-sm">
          <span className="text-[var(--text-secondary)]">Vertical position</span>
          <select
            id="settings-subtitle-position"
            name="verticalPosition"
            defaultValue={prefs.subtitles.verticalPosition}
            className={inputClass}
          >
            <option value="bottom">Bottom</option>
            <option value="top">Top</option>
          </select>
        </label>
        <div className="space-y-1 text-sm">
          <label htmlFor="settings-subtitle-offset" className="text-[var(--text-secondary)]">
            Sync offset (ms)
          </label>
          <input
            id="settings-subtitle-offset"
            name="offsetMs"
            type="number"
            min={-10000}
            max={10000}
            step={50}
            defaultValue={prefs.subtitles.offsetMs ?? 0}
            className={inputClass}
          />
          <p className="text-xs text-[var(--text-secondary)]">
            Positive delays captions. During playback, G shifts earlier and H later.
          </p>
        </div>
        <button type="submit" className={saveBtnClass}>
          Save
        </button>
      </form>
      {canEdit ? (
        <div className="space-y-4 border-t border-[var(--border-subtle)] pt-4">
          <h3 className="text-sm font-semibold text-[var(--text-primary)]">Wanted &amp; providers</h3>
          <p className="text-sm text-[var(--text-secondary)]">
            Bazarr-style missing subtitles. Search now tries enabled providers (OpenSubtitles when a key is set).
          </p>
          {error ? (
            <p className="text-sm text-[var(--danger-color)]" role="alert">
              {error}
            </p>
          ) : null}
          {flash ? (
            <p className="text-sm text-[var(--text-secondary)]" data-testid="subtitle-ops-flash">
              {flash}
            </p>
          ) : null}
          {available === false ? (
            <p className="text-sm text-[var(--text-tertiary)]">media-subtitles is not available.</p>
          ) : null}
          <ul className="space-y-2" data-testid="subtitle-wanted-list">
            {wanted.map((row) => (
              <li key={row.id || row.title} className="flex items-center justify-between gap-3 text-sm">
                <span className="min-w-0 truncate text-[var(--text-secondary)]">
                  {row.title}
                  {row.language ? ` · ${row.language}` : ''}
                </span>
                <button
                  type="button"
                  disabled={busy || !row.id}
                  className="shrink-0 text-[var(--text-tertiary)] hover:text-[var(--danger-color)]"
                  onClick={() => void onRemoveWanted(row.id)}
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
          <form className="space-y-3" onSubmit={(e) => void onAddWanted(e)}>
            <label className="block space-y-1 text-sm">
              <span className="text-[var(--text-secondary)]">Wanted title</span>
              <input className={inputClass} value={title} aria-label="Wanted subtitle title" onChange={(e) => setTitle(e.target.value)} />
            </label>
            <label className="block space-y-1 text-sm">
              <span className="text-[var(--text-secondary)]">Language</span>
              {catalogLanguages.length > 0 ? (
                <select
                  className={inputClass}
                  value={language}
                  aria-label="Wanted subtitle language"
                  onChange={(e) => setLanguage(e.target.value)}
                >
                  {catalogLanguages.some((lang) => lang.code === language) ? null : (
                    <option value={language}>{language}</option>
                  )}
                  {catalogLanguages.map((lang) => (
                    <option key={lang.code} value={lang.code}>
                      {lang.name} ({lang.code})
                    </option>
                  ))}
                </select>
              ) : (
                <input className={inputClass} value={language} aria-label="Wanted subtitle language" onChange={(e) => setLanguage(e.target.value)} />
              )}
            </label>
            <div className="flex flex-wrap gap-2">
              <button type="submit" disabled={busy || !title.trim()} className={saveBtnClass}>
                {busy ? 'Working…' : 'Add wanted'}
              </button>
              <button type="button" disabled={busy} className={saveBtnClass} onClick={() => void onSearchWanted()}>
                Search now
              </button>
            </div>
          </form>
          <ul className="space-y-2" data-testid="subtitle-provider-list">
            {providers.map((row) => (
              <li key={row.id} className="flex items-center justify-between gap-3 text-sm">
                <span className="text-[var(--text-secondary)]">
                  {row.name || row.id}
                  {row.enabled ? ' · on' : ' · off'}
                </span>
                <button
                  type="button"
                  disabled={busy}
                  className="text-[var(--text-tertiary)] hover:text-[var(--text-primary)]"
                  onClick={() => void onToggleProvider(row.id, !row.enabled)}
                >
                  {row.enabled ? 'Disable' : 'Enable'}
                </button>
              </li>
            ))}
          </ul>
          <section data-testid="subtitle-blacklist">
            <h3 className="mb-2 text-sm font-semibold text-[var(--text-primary)]">Blacklist</h3>
            <p className="mb-2 text-sm text-[var(--text-secondary)]">
              Releases Bazarr skipped. Remove one to let Search now try it again.
            </p>
            {blacklist.length === 0 ? (
              <p className="text-sm text-[var(--text-tertiary)]">No blacklisted subtitle releases.</p>
            ) : (
              <ul className="space-y-2" data-testid="subtitle-blacklist-list">
                {blacklist.map((row) => (
                  <li key={row.id || row.title} className="flex items-center justify-between gap-3 text-sm">
                    <span className="min-w-0 truncate text-[var(--text-secondary)]">
                      {row.title || row.fileId || row.id}
                      {row.language ? ` · ${row.language}` : ''}
                      {row.reason ? ` · ${row.reason}` : ''}
                    </span>
                    <button
                      type="button"
                      disabled={busy || !row.id}
                      className="shrink-0 text-[var(--text-tertiary)] hover:text-[var(--danger-color)]"
                      onClick={() => void onRemoveBlacklist(row.id)}
                    >
                      Allow again
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-sm font-semibold text-[var(--text-primary)]">History</h3>
            <button
              type="button"
              disabled={busy || history.length === 0}
              className="text-sm text-[var(--text-tertiary)] hover:text-[var(--danger-color)]"
              onClick={() => void onClearHistory()}
            >
              Clear history
            </button>
          </div>
          <ul className="space-y-1 text-sm text-[var(--text-tertiary)]" data-testid="subtitle-history-list">
            {history.map((row) => (
              <li key={row.id || `${row.title}-${row.createdAt}`}>
                {row.title} · {row.action || 'download'}
                {row.provider ? ` · ${row.provider}` : ''}
              </li>
            ))}
          </ul>
          <ul className="space-y-1 text-sm text-[var(--text-secondary)]" data-testid="subtitle-profile-list">
            {profiles.map((row) => (
              <li key={row.id || row.name}>
                {row.name}
                {row.isDefault ? ' (default)' : ''}
                {row.languages.length ? ` · ${profileLanguagesLabel(row)}` : ''}
              </li>
            ))}
          </ul>
          <form className="space-y-3" onSubmit={(e) => void onSaveProfile(e)}>
            <h3 className="text-sm font-semibold text-[var(--text-primary)]">Language profile</h3>
            <label className="block space-y-1 text-sm">
              <span className="text-[var(--text-secondary)]">Profile name</span>
              <input className={inputClass} value={profileName} aria-label="Subtitle profile name" onChange={(e) => setProfileName(e.target.value)} />
            </label>
            <label className="block space-y-1 text-sm">
              <span className="text-[var(--text-secondary)]">Languages</span>
              <input
                className={inputClass}
                value={profileLangs}
                aria-label="Subtitle profile languages"
                onChange={(e) => setProfileLangs(e.target.value)}
                placeholder="eng, spa+hi"
              />
            </label>
            {catalogLanguages.length > 0 ? (
              <div className="space-y-2" data-testid="subtitle-language-catalog">
                <label className="block space-y-1 text-sm">
                  <span className="text-[var(--text-secondary)]">Add from catalog</span>
                  <select
                    className={inputClass}
                    value={catalogCode}
                    aria-label="Subtitle catalog language"
                    onChange={(e) => setCatalogCode(e.target.value)}
                  >
                    <option value="">Select a language</option>
                    {catalogLanguages.map((lang) => (
                      <option key={lang.code} value={lang.code}>
                        {lang.name} ({lang.code})
                      </option>
                    ))}
                  </select>
                </label>
                <div className="flex flex-wrap items-center gap-3 text-sm text-[var(--text-secondary)]">
                  <label className="inline-flex items-center gap-1">
                    <input
                      type="checkbox"
                      checked={catalogHI}
                      aria-label="Hearing impaired"
                      onChange={(e) => setCatalogHI(e.target.checked)}
                    />
                    HI
                  </label>
                  <label className="inline-flex items-center gap-1">
                    <input
                      type="checkbox"
                      checked={catalogForced}
                      aria-label="Forced subtitle"
                      onChange={(e) => setCatalogForced(e.target.checked)}
                    />
                    Forced
                  </label>
                  <button
                    type="button"
                    disabled={busy || !catalogCode}
                    className={saveBtnClass}
                    onClick={onAddCatalogLanguage}
                  >
                    Add language
                  </button>
                </div>
              </div>
            ) : null}
            <button type="submit" disabled={busy || !profileName.trim()} className={saveBtnClass}>
              Save profile
            </button>
          </form>
          <section data-testid="subtitle-library">
            <h3 className="mb-2 text-sm font-semibold text-[var(--text-primary)]">Library</h3>
            <p className="mb-2 text-sm text-[var(--text-secondary)]">
              Assign a language profile to movies and series. Series apply to every episode.
            </p>
            {libraryRows.length === 0 ? (
              <p className="text-sm text-[var(--text-tertiary)]">No subtitle library titles yet.</p>
            ) : (
              <ul className="space-y-2" data-testid="subtitle-library-list">
                {libraryRows.map((row) => (
                  <li key={row.key} className="flex flex-wrap items-center justify-between gap-3 text-sm">
                    <span className="min-w-0 truncate text-[var(--text-secondary)]">
                      {row.title}
                      {row.year ? ` (${row.year})` : ''}
                      {row.kind === 'series' ? ` · series · ${row.episodeCount} ep` : ' · movie'}
                    </span>
                    <div className="flex shrink-0 flex-wrap items-center gap-2">
                      <label className="sr-only" htmlFor={`subtitle-profile-${row.key}`}>
                        Language profile for {row.title}
                      </label>
                      <select
                        id={`subtitle-profile-${row.key}`}
                        aria-label={`Language profile for ${row.title}`}
                        className={inputClass}
                        disabled={busy || row.mediaIds.length === 0}
                        value={row.languageProfileId}
                        onChange={(e) => {
                          const next = e.target.value;
                          void applyLibrary(row.mediaIds, { languageProfileId: next });
                        }}
                      >
                        <option value="">Default</option>
                        {profiles.map((profile) => (
                          <option key={profile.id || profile.name} value={profile.id}>
                            {profile.name}
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        disabled={busy || row.mediaIds.length === 0}
                        className="text-[var(--text-tertiary)] hover:text-[var(--text-primary)]"
                        data-testid={`subtitle-library-search-${row.key}`}
                        onClick={() => void onSearchWanted(row.mediaIds)}
                      >
                        Search now
                      </button>
                      <button
                        type="button"
                        disabled={busy || row.mediaIds.length === 0}
                        className="text-[var(--text-tertiary)] hover:text-[var(--text-primary)]"
                        data-testid={`subtitle-library-monitor-${row.key}`}
                        onClick={() => void applyLibrary(row.mediaIds, { monitored: !row.monitored })}
                      >
                        {row.monitored ? 'Unmonitor' : 'Monitor'}
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      ) : null}
    </div>
  );
}

function ControlsPane() {
  const [prefs, save] = usePrefs();
  function onSubmit(e: FormEvent) {
    e.preventDefault();
    const fd = new FormData(e.target as HTMLFormElement);
    save({
      controls: {
        enableKeyboardShortcuts: fd.get('enableKeyboardShortcuts') === 'on',
      },
    });
  }
  return (
    <form onSubmit={onSubmit} className={paneClass} aria-labelledby="settings-controls-heading">
      <h2 id="settings-controls-heading" className="font-semibold text-[var(--text-primary)]">
        Controls
      </h2>
      <label className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
        <input
          name="enableKeyboardShortcuts"
          type="checkbox"
          defaultChecked={prefs.controls.enableKeyboardShortcuts}
        />
        Keyboard shortcuts in the player (Space, ←/→, F)
      </label>
      <button type="submit" className={saveBtnClass}>
        Save
      </button>
    </form>
  );
}

function DebridPane() {
  const [link, setLink] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [library, setLibrary] = useState<Array<{ id: string; filename: string }>>([]);
  const [libraryLoading, setLibraryLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch('/api/debrid/vfs', { headers: { Accept: 'application/json' } });
        const data = (await res.json().catch(() => ({}))) as {
          items?: Array<{ id: string; filename: string }>;
        };
        if (!cancelled) setLibrary(data.items || []);
      } catch {
        if (!cancelled) setLibrary([]);
      } finally {
        if (!cancelled) setLibraryLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [message]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const trimmed = link.trim();
    if (!trimmed) return;
    setBusy(true);
    setMessage(null);
    setError(null);
    try {
      const res = await fetch('/api/debrid/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ link: trimmed }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        id?: string;
        kind?: string;
      };
      if (!res.ok) throw new Error(data.error || `Failed (${res.status})`);
      setMessage(`Queued on debrid (${data.kind || 'link'}${data.id ? ` · ${data.id}` : ''})`);
      setLink('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Add failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className={paneClass} data-testid="settings-debrid-pane">
      <h2 className="font-semibold text-[var(--text-primary)]">Debrid</h2>
      <p className="text-sm text-[var(--text-secondary)]">
        Paste a magnet link or hoster URL to queue on your configured debrid provider.
      </p>
      {message && (
        <p
          role="status"
          className="rounded-[var(--radius-sm)] border border-[var(--success)]/40 px-3 py-2 text-sm text-[var(--success)]"
        >
          {message}
        </p>
      )}
      {error && (
        <p
          role="alert"
          className="rounded-[var(--radius-sm)] border border-[var(--danger-color)]/40 px-3 py-2 text-sm text-[var(--danger-color)]"
        >
          {error}
        </p>
      )}
      <label htmlFor="settings-debrid-link" className="block space-y-1 text-sm">
        <span className="text-[var(--text-secondary)]">Magnet or link</span>
        <input
          id="settings-debrid-link"
          name="link"
          value={link}
          onChange={(e) => setLink(e.target.value)}
          className={inputClass}
          placeholder="magnet:?xt=… or https://…"
          data-testid="settings-debrid-link"
        />
      </label>
      <button type="submit" disabled={busy || !link.trim()} className={saveBtnClass}>
        {busy ? 'Adding…' : 'Add to debrid'}
      </button>
      <div
        className="space-y-2 border-t border-[var(--border-subtle)] pt-4"
        data-testid="settings-debrid-library"
      >
        <h3 className="text-sm font-semibold text-[var(--text-primary)]">Cloud library</h3>
        {libraryLoading ? (
          <p className="text-sm text-[var(--text-secondary)]">Loading…</p>
        ) : library.length === 0 ? (
          <p className="text-sm text-[var(--text-secondary)]">No cloud downloads yet.</p>
        ) : (
          <ul className="space-y-2 text-sm">
            {library.map((item) => (
              <li key={item.id} className="flex items-center justify-between gap-3">
                <span className="truncate text-[var(--text-primary)]">
                  {item.filename || item.id}
                </span>
                <NavLink
                  to={`/player?src=${encodeURIComponent(`debrid:${item.id}`)}`}
                  className="shrink-0 text-[var(--accent-color)] hover:underline"
                >
                  Play
                </NavLink>
              </li>
            ))}
          </ul>
        )}
      </div>
    </form>
  );
}

function AcquisitionPane() {
  const [status, setStatus] = useState<AcquisitionStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [baseUrl, setBaseUrl] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [implementation, setImplementation] = useState('torznab');
  const [busy, setBusy] = useState(false);
  const canEdit = canManageQuality();

  async function reload() {
    setStatus(await api.getAcquisition());
  }

  useEffect(() => {
    let cancelled = false;
    void api
      .getAcquisition()
      .then((next) => {
        if (!cancelled) setStatus(next);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Could not load acquisition');
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const peers = status?.peers ?? [];
  const indexers = status?.indexers ?? [];

  return (
    <div className={paneClass} data-testid="settings-acquisition">
      <h2 className="font-semibold text-[var(--text-primary)]">Acquisition</h2>
      <p className="text-sm text-[var(--text-secondary)]">
        Requests need one live indexer and one live downloader. Fixture peers stay offline-safe;
        live pirate or qBittorrent traffic needs VPN.
      </p>
      {error ? (
        <p className="text-sm text-[var(--danger-color)]" role="alert">
          {error}
        </p>
      ) : null}
      {status ? (
        <p className="text-sm text-[var(--text-secondary)]" data-testid="acquisition-message">
          {status.message}
        </p>
      ) : null}
      {status ? (
        <div
          className="flex items-center justify-between gap-3 rounded-[var(--radius-sm)] border border-[var(--border-subtle)] px-3 py-2 text-sm"
          data-testid="acquisition-vpn"
        >
          <span className="text-[var(--text-primary)]">
            VPN {status.downloaderMode === 'fixture' ? '(fixture grab)' : '(live torrent)'}
          </span>
          <span
            className={
              status.liveGrabAllowed ? 'text-[var(--success)]' : 'text-[var(--text-tertiary)]'
            }
          >
            {status.liveGrabAllowed
              ? status.vpn.confPresent
                ? 'WG_CONF present'
                : 'Allowed'
              : status.vpn.configured
                ? 'Conf missing'
                : 'WG_CONF not set'}
          </span>
        </div>
      ) : null}
      <ul className="space-y-2 text-sm" data-testid="acquisition-peers">
        {peers.map((peer) => (
          <li
            key={peer.id}
            className="flex items-center justify-between gap-3 rounded-[var(--radius-sm)] border border-[var(--border-subtle)] px-3 py-2"
          >
            <span className="text-[var(--text-primary)]">{peer.label}</span>
            <span
              className={
                peer.live ? 'text-[var(--success)]' : 'text-[var(--text-tertiary)]'
              }
            >
              {peer.live ? 'Connected' : 'Not running'}
            </span>
          </li>
        ))}
      </ul>
      {status?.indexersAvailable === false ? (
        <p className="text-sm text-[var(--text-tertiary)]">
          Prowlarr/Jackett catalog is unavailable. Set INDEXER_TORZNAB_GRPC_CLIENT_ADDR and enable
          the indexer-torznab profile.
        </p>
      ) : null}
      {status?.capabilitiesAvailable && indexerCapabilityLabels(status.capabilities).length > 0 ? (
        <div className="space-y-2" data-testid="indexer-capabilities">
          <h3 className="text-sm font-semibold text-[var(--text-primary)]">Catalog capabilities</h3>
          <p className="text-sm text-[var(--text-secondary)]">
            What Prowlarr/Jackett reports for interactive search and season packs.
          </p>
          <ul className="flex flex-wrap gap-2 text-xs">
            {indexerCapabilityLabels(status.capabilities).map((label) => (
              <li
                key={label}
                className="rounded-[var(--radius-sm)] border border-[var(--border-subtle)] px-2 py-1 text-[var(--text-secondary)]"
              >
                {label}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      {indexers.length > 0 ? (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-[var(--text-primary)]">Indexers</h3>
          <ul className="space-y-2 text-sm" data-testid="indexer-list">
            {indexers.map((ix) => (
              <li
                key={`${ix.id}-${ix.name}`}
                className="flex items-center justify-between gap-3 rounded-[var(--radius-sm)] border border-[var(--border-subtle)] px-3 py-2"
              >
                <span className="min-w-0 truncate text-[var(--text-primary)]">
                  {ix.name}
                  {ix.protocol ? ` · ${ix.protocol}` : ''}
                </span>
                <span className="flex items-center gap-2">
                  <span className={ix.configured ? 'text-[var(--success)]' : 'text-[var(--text-tertiary)]'}>
                    {ix.configured ? 'Enabled' : 'Disabled'}
                  </span>
                  {canEdit ? (
                    <>
                      <button
                        type="button"
                        className="text-xs text-[var(--accent-color)]"
                        onClick={() => {
                          setBusy(true);
                          setError(null);
                          void api
                            .updateIndexer(ix.id, { enable: !ix.configured })
                            .then(() => reload())
                            .catch((err) => setError(err instanceof Error ? err.message : 'Could not update indexer'))
                            .finally(() => setBusy(false));
                        }}
                      >
                        {ix.configured ? 'Disable' : 'Enable'}
                      </button>
                      <button
                        type="button"
                        className="text-xs text-[var(--danger-color)]"
                        aria-label={`Remove ${ix.name}`}
                        onClick={() => {
                          setBusy(true);
                          setError(null);
                          void api
                            .deleteIndexer(ix.id)
                            .then(() => reload())
                            .catch((err) => setError(err instanceof Error ? err.message : 'Could not remove indexer'))
                            .finally(() => setBusy(false));
                        }}
                      >
                        Remove
                      </button>
                    </>
                  ) : null}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      {canEdit ? (
        <form
          className="space-y-2"
          data-testid="indexer-add-form"
          onSubmit={(e) => {
            e.preventDefault();
            setBusy(true);
            setError(null);
            void api
              .createIndexer({
                name: name.trim(),
                base_url: baseUrl.trim(),
                api_key: apiKey.trim() || undefined,
                implementation,
                enable: true,
              })
              .then(() => {
                setName('');
                setBaseUrl('');
                setApiKey('');
                return reload();
              })
              .catch((err) => setError(err instanceof Error ? err.message : 'Could not add indexer'))
              .finally(() => setBusy(false));
          }}
        >
          <h3 className="text-sm font-semibold text-[var(--text-primary)]">Add Prowlarr indexer</h3>
          <p className="text-sm text-[var(--text-secondary)]">
            Torznab or Newznab feed. MuxCore proxies Prowlarr — it does not keep its own indexer
            database.
          </p>
          <input
            className="w-full rounded-[var(--radius-sm)] border border-[var(--border-subtle)] bg-transparent px-3 py-2 text-sm"
            placeholder="Name"
            aria-label="Indexer name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
          <input
            className="w-full rounded-[var(--radius-sm)] border border-[var(--border-subtle)] bg-transparent px-3 py-2 text-sm"
            placeholder="https://indexer.example/api"
            aria-label="Indexer URL"
            value={baseUrl}
            onChange={(e) => setBaseUrl(e.target.value)}
            required
          />
          <input
            className="w-full rounded-[var(--radius-sm)] border border-[var(--border-subtle)] bg-transparent px-3 py-2 text-sm"
            placeholder="API key"
            aria-label="Indexer API key"
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
          />
          <select
            className="w-full rounded-[var(--radius-sm)] border border-[var(--border-subtle)] bg-transparent px-3 py-2 text-sm"
            aria-label="Indexer type"
            value={implementation}
            onChange={(e) => setImplementation(e.target.value)}
          >
            <option value="torznab">Torznab</option>
            <option value="newznab">Newznab</option>
          </select>
          <button type="submit" disabled={busy} className={saveBtnClass}>
            {busy ? 'Saving…' : 'Add indexer'}
          </button>
        </form>
      ) : null}
      {peers.length === 0 && !error ? (
        <p className="text-sm text-[var(--text-secondary)]">Checking acquisition peers…</p>
      ) : null}
      <p className="text-xs text-[var(--text-tertiary)]">
        Host install: set <code>MVP_ENABLE_ACQUISITION=1</code> to start the fixture indexer and
        torrent downloader. Compose: <code>--profile indexer-piratebay --profile downloader-torrent</code>.
      </p>
    </div>
  );
}

function DelayPane() {
  const [profiles, setProfiles] = useState<DelayProfile[]>([]);
  const [available, setAvailable] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void api
      .listDelayProfiles()
      .then((next) => {
        if (cancelled) return;
        const rows = withDefaultDelayProfiles(next.profiles);
        setAvailable(next.available);
        setProfiles(rows);
        setDrafts(Object.fromEntries(rows.map((p) => [p.protocol, String(p.waitMinutes)])));
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Could not load delay profiles');
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function save(protocol: string) {
    const raw = drafts[protocol] ?? '0';
    const waitMinutes = Number(raw);
    if (!Number.isFinite(waitMinutes) || waitMinutes < 0 || waitMinutes > 10080) {
      setError('Wait must be 0–10080 minutes');
      return;
    }
    setSaving(protocol);
    setError(null);
    try {
      const saved = await api.upsertDelayProfile({ protocol, waitMinutes: Math.round(waitMinutes) });
      setProfiles((prev) =>
        withDefaultDelayProfiles(prev.map((p) => (p.protocol === saved.protocol ? saved : p))),
      );
      setDrafts((prev) => ({ ...prev, [saved.protocol]: String(saved.waitMinutes) }));
      setAvailable(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save delay profile');
    } finally {
      setSaving(null);
    }
  }

  return (
    <div className={paneClass} data-testid="settings-delay">
      <h2 className="font-semibold text-[var(--text-primary)]">Delay</h2>
      <p className="text-sm text-[var(--text-secondary)]">
        Wait after a release first appears before grabbing it. Usenet is usually instant; torrent
        often waits so a better copy can show up.
      </p>
      {error ? (
        <p className="text-sm text-[var(--danger-color)]" role="alert">
          {error}
        </p>
      ) : null}
      {available === false ? (
        <p className="text-sm text-[var(--text-tertiary)]">Automation is not connected.</p>
      ) : null}
      <ul className="space-y-3" data-testid="delay-profiles">
        {profiles.map((p) => (
          <li
            key={p.protocol}
            className="flex flex-wrap items-end gap-2 rounded-[var(--radius-sm)] border border-[var(--border-subtle)] px-3 py-2"
          >
            <label className="min-w-[7rem] text-sm text-[var(--text-primary)]">
              <span className="mb-1 block text-xs text-[var(--text-tertiary)]">Protocol</span>
              {p.protocol}
            </label>
            <label className="text-sm text-[var(--text-primary)]">
              <span className="mb-1 block text-xs text-[var(--text-tertiary)]">Wait (minutes)</span>
              <input
                type="number"
                min={0}
                max={10080}
                className={`${inputClass} w-28`}
                value={drafts[p.protocol] ?? String(p.waitMinutes)}
                onChange={(e) =>
                  setDrafts((prev) => ({ ...prev, [p.protocol]: e.target.value }))
                }
                aria-label={`Wait minutes for ${p.protocol}`}
                data-testid={`delay-wait-${p.protocol}`}
              />
            </label>
            <button
              type="button"
              disabled={saving === p.protocol || available === false}
              className={saveBtnClass}
              onClick={() => void save(p.protocol)}
              aria-label={`Save delay profile for ${p.protocol}`}
            >
              {saving === p.protocol ? 'Saving…' : 'Save'}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

function emptyFormatDraft(): QualityFormat {
  return { id: '', name: '', score: 0, ruleCount: 0, rules: [] };
}

function emptyQualityDraft(): QualityProfile {
  return {
    id: '',
    name: '',
    minScore: 0,
    cutoffScore: 10000,
    upgradeAllowed: true,
    upgradeDelayMinutes: 0,
    formatScores: {},
  };
}

function QualityPane() {
  const canEdit = canManageQuality();
  const [catalog, setCatalog] = useState<FormatsCatalog | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [title, setTitle] = useState('');
  const [preview, setPreview] = useState<FormatScorePreview | null>(null);
  const [parsed, setParsed] = useState<ParsedQuality | null>(null);
  const [drafts, setDrafts] = useState<Record<string, QualityProfile>>({});
  const [createDraft, setCreateDraft] = useState<QualityProfile>(emptyQualityDraft);
  const [formatDrafts, setFormatDrafts] = useState<Record<string, QualityFormat>>({});
  const [formatRuleText, setFormatRuleText] = useState<Record<string, string>>({});
  const [createFormat, setCreateFormat] = useState<QualityFormat>(emptyFormatDraft);
  const [createRulesText, setCreateRulesText] = useState('');
  const [releaseDrafts, setReleaseDrafts] = useState<Record<string, ReleaseProfile>>({});
  const [createRelease, setCreateRelease] = useState({
    name: '',
    preferred: '',
    mustContain: '',
    mustNotContain: '',
    preferredScore: 10,
  });

  useEffect(() => {
    let cancelled = false;
    void api
      .getFormats()
      .then((next) => {
        if (!cancelled) {
          setCatalog(next);
          setDrafts(Object.fromEntries(next.profiles.map((p) => [p.id, p])));
          setFormatDrafts(Object.fromEntries(next.formats.map((f) => [f.id, f])));
          setFormatRuleText({});
          setReleaseDrafts(Object.fromEntries((next.releaseProfiles ?? []).map((p) => [p.id, p])));
        }
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Could not load quality packs');
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function reloadFrom(next: FormatsCatalog) {
    setCatalog(next);
    setDrafts(Object.fromEntries(next.profiles.map((p) => [p.id, p])));
    setFormatDrafts(Object.fromEntries(next.formats.map((f) => [f.id, f])));
    setFormatRuleText({});
    setReleaseDrafts(Object.fromEntries((next.releaseProfiles ?? []).map((p) => [p.id, p])));
  }

  async function onSync(official = false) {
    setBusy(true);
    setError(null);
    try {
      await reloadFrom(
        await api.syncTrashGuides({ importProfiles: true, services: ['radarr', 'sonarr'], official }),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'TRaSH sync failed');
    } finally {
      setBusy(false);
    }
  }

  async function onScore(e: FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      setPreview(await api.scoreRelease(title.trim()));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not score title');
    }
  }

  async function onParse() {
    setError(null);
    try {
      setParsed(await api.parseQuality(title.trim()));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not parse quality');
    }
  }

  async function onSave(id: string) {
    const draft = drafts[id];
    if (!draft) return;
    setBusy(true);
    setError(null);
    try {
      await api.updateQualityProfile(id, draft);
      await reloadFrom(await api.getFormats());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save profile');
    } finally {
      setBusy(false);
    }
  }

  async function onRemove(id: string) {
    setBusy(true);
    setError(null);
    try {
      await api.deleteQualityProfile(id);
      await reloadFrom(await api.getFormats());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not delete profile');
    } finally {
      setBusy(false);
    }
  }

  async function onCreate(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await api.createQualityProfile(createDraft);
      setCreateDraft(emptyQualityDraft());
      await reloadFrom(await api.getFormats());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create profile');
    } finally {
      setBusy(false);
    }
  }

  async function onSaveFormat(id: string) {
    const draft = formatDrafts[id];
    if (!draft) return;
    setBusy(true);
    setError(null);
    try {
      await api.updateCustomFormat(id, {
        ...draft,
        rules: parseFormatRules(formatRuleText[id] ?? formatRulesText(draft.rules)),
      });
      await reloadFrom(await api.getFormats());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save format');
    } finally {
      setBusy(false);
    }
  }

  async function onRemoveFormat(id: string) {
    setBusy(true);
    setError(null);
    try {
      await api.deleteCustomFormat(id);
      await reloadFrom(await api.getFormats());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not delete format');
    } finally {
      setBusy(false);
    }
  }

  async function onCreateFormat(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await api.createCustomFormat({
        name: createFormat.name,
        score: createFormat.score,
        rules: parseFormatRules(createRulesText),
      });
      setCreateFormat(emptyFormatDraft());
      setCreateRulesText('');
      await reloadFrom(await api.getFormats());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create format');
    } finally {
      setBusy(false);
    }
  }

  const formats = catalog?.formats ?? [];
  const profiles = catalog?.profiles ?? [];
  const releaseProfiles = catalog?.releaseProfiles ?? [];

  async function onSaveRelease(id: string) {
    const draft = releaseDrafts[id];
    if (!draft) return;
    setBusy(true);
    setError(null);
    try {
      await api.updateReleaseProfile(id, draft);
      await reloadFrom(await api.getFormats());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save restriction');
    } finally {
      setBusy(false);
    }
  }

  async function onToggleRelease(row: ReleaseProfile) {
    setBusy(true);
    setError(null);
    try {
      await api.updateReleaseProfile(row.id, { ...row, enabled: !row.enabled });
      await reloadFrom(await api.getFormats());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not update restriction');
    } finally {
      setBusy(false);
    }
  }

  async function onDeleteRelease(id: string) {
    setBusy(true);
    setError(null);
    try {
      await api.deleteReleaseProfile(id);
      await reloadFrom(await api.getFormats());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not remove restriction');
    } finally {
      setBusy(false);
    }
  }

  async function onCreateRelease(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await api.createReleaseProfile({
        name: createRelease.name,
        preferred: parseReleaseTerms(createRelease.preferred),
        mustContain: parseReleaseTerms(createRelease.mustContain),
        mustNotContain: parseReleaseTerms(createRelease.mustNotContain),
        preferredScore: createRelease.preferredScore,
        enabled: true,
      });
      setCreateRelease({ name: '', preferred: '', mustContain: '', mustNotContain: '', preferredScore: 10 });
      await reloadFrom(await api.getFormats());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not add restriction');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={paneClass} data-testid="settings-quality">
      <h2 className="font-semibold text-[var(--text-primary)]">Quality</h2>
      <p className="text-sm text-[var(--text-secondary)]">
        Recyclarr-style TRaSH packs decide which releases win. Bundled sync stays offline. Official
        sync downloads the TRaSH-Guides archive (admin/manager) so the household catalog matches
        Recyclarr. Automation uses these profiles for grab and upgrade-until.
      </p>
      {error ? (
        <p className="text-sm text-[var(--danger-color)]" role="alert">
          {error}
        </p>
      ) : null}
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={busy}
          data-testid="formats-sync-trash"
          onClick={() => void onSync(false)}
          className={saveBtnClass}
        >
          {busy ? 'Syncing…' : 'Sync bundled pack'}
        </button>
        {canEdit ? (
          <button
            type="button"
            disabled={busy}
            data-testid="formats-sync-official"
            onClick={() => void onSync(true)}
            className={saveBtnClass}
          >
            {busy ? 'Syncing…' : 'Sync official TRaSH Guides'}
          </button>
        ) : null}
      </div>
      {catalog?.sync ? (
        <p className="text-sm text-[var(--text-secondary)]" data-testid="formats-sync-result">
          Imported {catalog.sync.formatsUpserted} formats
          {catalog.sync.formatsSkipped ? ` (${catalog.sync.formatsSkipped} skipped)` : ''} and{' '}
          {catalog.sync.profilesUpserted} profiles
          {catalog.sync.guidesPath ? ` from ${catalog.sync.guidesPath}` : ''}
          {catalog.sync.warnings.length ? ` · ${catalog.sync.warnings.length} warnings` : ''}.
        </p>
      ) : null}
      <section data-testid="release-profiles">
        <h3 className="mb-2 text-sm font-semibold text-[var(--text-primary)]">Release restrictions</h3>
        <p className="mb-2 text-sm text-[var(--text-secondary)]">
          Required and blocked words, like Radarr restrictions / Sonarr release profiles. Preferred
          terms add a score bonus.
        </p>
        {releaseProfiles.length === 0 ? (
          <p className="text-sm text-[var(--text-tertiary)]">No restrictions yet — add one below.</p>
        ) : (
          <ul className="space-y-3" data-testid="release-profile-list">
            {releaseProfiles.map((row) => {
              const draft = releaseDrafts[row.id] || row;
              return (
                <li key={row.id} className="space-y-2 rounded-[var(--radius-sm)] border border-[var(--border-subtle)] p-3">
                  <p className="text-sm text-[var(--text-secondary)]">
                    {row.name}
                    {row.enabled ? '' : ' · paused'}
                  </p>
                  {canEdit ? (
                    <>
                      <label className="block space-y-1 text-sm">
                        <span className="text-[var(--text-secondary)]">Name</span>
                        <input
                          className={inputClass}
                          value={draft.name}
                          aria-label={`Restriction name for ${row.name}`}
                          onChange={(e) =>
                            setReleaseDrafts((cur) => ({ ...cur, [row.id]: { ...draft, name: e.target.value } }))
                          }
                        />
                      </label>
                      <label className="block space-y-1 text-sm">
                        <span className="text-[var(--text-secondary)]">Must contain</span>
                        <input
                          className={inputClass}
                          value={releaseTermsText(draft.mustContain)}
                          aria-label={`Must contain for ${row.name}`}
                          onChange={(e) =>
                            setReleaseDrafts((cur) => ({
                              ...cur,
                              [row.id]: { ...draft, mustContain: parseReleaseTerms(e.target.value) },
                            }))
                          }
                        />
                      </label>
                      <label className="block space-y-1 text-sm">
                        <span className="text-[var(--text-secondary)]">Must not contain</span>
                        <input
                          className={inputClass}
                          value={releaseTermsText(draft.mustNotContain)}
                          aria-label={`Must not contain for ${row.name}`}
                          onChange={(e) =>
                            setReleaseDrafts((cur) => ({
                              ...cur,
                              [row.id]: { ...draft, mustNotContain: parseReleaseTerms(e.target.value) },
                            }))
                          }
                        />
                      </label>
                      <label className="block space-y-1 text-sm">
                        <span className="text-[var(--text-secondary)]">Preferred</span>
                        <input
                          className={inputClass}
                          value={releaseTermsText(draft.preferred)}
                          aria-label={`Preferred terms for ${row.name}`}
                          onChange={(e) =>
                            setReleaseDrafts((cur) => ({
                              ...cur,
                              [row.id]: { ...draft, preferred: parseReleaseTerms(e.target.value) },
                            }))
                          }
                        />
                      </label>
                      <div className="flex flex-wrap gap-2">
                        <button type="button" disabled={busy} className={saveBtnClass} onClick={() => void onSaveRelease(row.id)}>
                          Save restriction
                        </button>
                        <button type="button" disabled={busy} className={saveBtnClass} onClick={() => void onToggleRelease(row)}>
                          {row.enabled ? 'Pause restriction' : 'Resume restriction'}
                        </button>
                        <button type="button" disabled={busy} className={saveBtnClass} onClick={() => void onDeleteRelease(row.id)}>
                          Remove restriction
                        </button>
                      </div>
                    </>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}
        {canEdit ? (
          <form className="mt-3 space-y-2" onSubmit={(e) => void onCreateRelease(e)}>
            <h4 className="text-sm font-semibold text-[var(--text-primary)]">New restriction</h4>
            <label className="block space-y-1 text-sm">
              <span className="text-[var(--text-secondary)]">Name</span>
              <input
                className={inputClass}
                value={createRelease.name}
                aria-label="New restriction name"
                onChange={(e) => setCreateRelease((cur) => ({ ...cur, name: e.target.value }))}
              />
            </label>
            <label className="block space-y-1 text-sm">
              <span className="text-[var(--text-secondary)]">Must not contain</span>
              <input
                className={inputClass}
                value={createRelease.mustNotContain}
                aria-label="New restriction must not contain"
                onChange={(e) => setCreateRelease((cur) => ({ ...cur, mustNotContain: e.target.value }))}
              />
            </label>
            <label className="block space-y-1 text-sm">
              <span className="text-[var(--text-secondary)]">Must contain</span>
              <input
                className={inputClass}
                value={createRelease.mustContain}
                aria-label="New restriction must contain"
                onChange={(e) => setCreateRelease((cur) => ({ ...cur, mustContain: e.target.value }))}
              />
            </label>
            <label className="block space-y-1 text-sm">
              <span className="text-[var(--text-secondary)]">Preferred</span>
              <input
                className={inputClass}
                value={createRelease.preferred}
                aria-label="New restriction preferred"
                onChange={(e) => setCreateRelease((cur) => ({ ...cur, preferred: e.target.value }))}
              />
            </label>
            <button type="submit" disabled={busy || !createRelease.name.trim()} className={saveBtnClass}>
              Add restriction
            </button>
          </form>
        ) : null}
      </section>
      <section>
        <h3 className="mb-2 text-sm font-semibold text-[var(--text-primary)]">Quality profiles</h3>
        {profiles.length === 0 ? (
          <p className="text-sm text-[var(--text-tertiary)]">No profiles yet — sync the pack.</p>
        ) : (
          <ul className="space-y-3" data-testid="quality-profile-list">
            {profiles.map((p) => {
              const draft = drafts[p.id] || p;
              return (
                <li key={p.id} className="space-y-2 rounded-[var(--radius-sm)] border border-[var(--border-subtle)] p-3">
                  {canEdit ? (
                    <>
                      <label className="block space-y-1 text-sm">
                        <span className="text-[var(--text-secondary)]">Name</span>
                        <input
                          className={inputClass}
                          value={draft.name}
                          aria-label={`Name for ${p.name}`}
                          onChange={(e) => setDrafts((cur) => ({ ...cur, [p.id]: { ...draft, name: e.target.value } }))}
                        />
                      </label>
                      <div className="grid gap-2 sm:grid-cols-3">
                        <label className="block space-y-1 text-sm">
                          <span className="text-[var(--text-secondary)]">Min score</span>
                          <input
                            className={inputClass}
                            type="number"
                            value={draft.minScore}
                            aria-label={`Min score for ${p.name}`}
                            onChange={(e) =>
                              setDrafts((cur) => ({ ...cur, [p.id]: { ...draft, minScore: Number(e.target.value) || 0 } }))
                            }
                          />
                        </label>
                        <label className="block space-y-1 text-sm">
                          <span className="text-[var(--text-secondary)]">Cutoff</span>
                          <input
                            className={inputClass}
                            type="number"
                            value={draft.cutoffScore}
                            aria-label={`Cutoff for ${p.name}`}
                            onChange={(e) =>
                              setDrafts((cur) => ({
                                ...cur,
                                [p.id]: { ...draft, cutoffScore: Number(e.target.value) || 0 },
                              }))
                            }
                          />
                        </label>
                        <label className="block space-y-1 text-sm">
                          <span className="text-[var(--text-secondary)]">Upgrade delay (min)</span>
                          <input
                            className={inputClass}
                            type="number"
                            value={draft.upgradeDelayMinutes}
                            aria-label={`Upgrade delay for ${p.name}`}
                            onChange={(e) =>
                              setDrafts((cur) => ({
                                ...cur,
                                [p.id]: { ...draft, upgradeDelayMinutes: Number(e.target.value) || 0 },
                              }))
                            }
                          />
                        </label>
                      </div>
                      <label className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
                        <input
                          type="checkbox"
                          checked={draft.upgradeAllowed}
                          aria-label={`Upgrades for ${p.name}`}
                          onChange={(e) =>
                            setDrafts((cur) => ({ ...cur, [p.id]: { ...draft, upgradeAllowed: e.target.checked } }))
                          }
                        />
                        Upgrade until cutoff
                      </label>
                      {formats.length > 0 ? (
                        <div className="space-y-1">
                          <p className="text-xs text-[var(--text-tertiary)]">Format scores</p>
                          {formats.map((fmt) => (
                            <label key={fmt.id} className="flex items-center justify-between gap-3 text-sm">
                              <span className="min-w-0 truncate text-[var(--text-secondary)]">{fmt.name}</span>
                              <input
                                className={`${inputClass} w-24`}
                                type="number"
                                value={draft.formatScores[fmt.id] ?? 0}
                                aria-label={`Score ${fmt.name} on ${p.name}`}
                                onChange={(e) =>
                                  setDrafts((cur) => ({
                                    ...cur,
                                    [p.id]: {
                                      ...draft,
                                      formatScores: { ...draft.formatScores, [fmt.id]: Number(e.target.value) || 0 },
                                    },
                                  }))
                                }
                              />
                            </label>
                          ))}
                        </div>
                      ) : null}
                      <div className="flex flex-wrap gap-2">
                        <button type="button" disabled={busy} className={saveBtnClass} onClick={() => void onSave(p.id)}>
                          Save
                        </button>
                        <button
                          type="button"
                          disabled={busy}
                          className="text-sm text-[var(--text-tertiary)] hover:text-[var(--danger-color)]"
                          onClick={() => void onRemove(p.id)}
                        >
                          Delete
                        </button>
                      </div>
                    </>
                  ) : (
                    <p className="text-sm text-[var(--text-secondary)]">
                      <span className="font-medium text-[var(--text-primary)]">{p.name}</span>
                      {' · '}cutoff {p.cutoffScore}
                      {p.upgradeAllowed ? ' · upgrades on' : ''}
                    </p>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>
      {canEdit ? (
        <form className="space-y-3" onSubmit={(e) => void onCreate(e)} data-testid="quality-profile-create">
          <h3 className="text-sm font-semibold text-[var(--text-primary)]">New profile</h3>
          <label className="block space-y-1 text-sm">
            <span className="text-[var(--text-secondary)]">Name</span>
            <input
              className={inputClass}
              value={createDraft.name}
              aria-label="New profile name"
              onChange={(e) => setCreateDraft((cur) => ({ ...cur, name: e.target.value }))}
            />
          </label>
          <label className="block space-y-1 text-sm">
            <span className="text-[var(--text-secondary)]">Cutoff</span>
            <input
              className={inputClass}
              type="number"
              value={createDraft.cutoffScore}
              aria-label="New profile cutoff"
              onChange={(e) => setCreateDraft((cur) => ({ ...cur, cutoffScore: Number(e.target.value) || 0 }))}
            />
          </label>
          <label className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
            <input
              type="checkbox"
              checked={createDraft.upgradeAllowed}
              aria-label="New profile upgrades"
              onChange={(e) => setCreateDraft((cur) => ({ ...cur, upgradeAllowed: e.target.checked }))}
            />
            Upgrade until cutoff
          </label>
          <button type="submit" disabled={busy || !createDraft.name.trim()} className={saveBtnClass}>
            {busy ? 'Saving…' : 'Create profile'}
          </button>
        </form>
      ) : null}
      <section>
        <h3 className="mb-2 text-sm font-semibold text-[var(--text-primary)]">Custom formats</h3>
        {formats.length === 0 ? (
          <p className="text-sm text-[var(--text-tertiary)]">No formats yet — sync the pack or add one below.</p>
        ) : (
          <ul className="space-y-3" data-testid="custom-format-list">
            {formats.map((f) => {
              const draft = formatDrafts[f.id] || f;
              return (
                <li key={f.id} className="space-y-2 rounded-[var(--radius-sm)] border border-[var(--border-subtle)] p-3">
                  {canEdit ? (
                    <>
                      <label className="block space-y-1 text-sm">
                        <span className="text-[var(--text-secondary)]">Name</span>
                        <input
                          className={inputClass}
                          value={draft.name}
                          aria-label={`Format name for ${f.name}`}
                          onChange={(e) =>
                            setFormatDrafts((cur) => ({ ...cur, [f.id]: { ...draft, name: e.target.value } }))
                          }
                        />
                      </label>
                      <label className="block space-y-1 text-sm">
                        <span className="text-[var(--text-secondary)]">Default score</span>
                        <input
                          className={inputClass}
                          type="number"
                          value={draft.score}
                          aria-label={`Score for ${f.name}`}
                          onChange={(e) =>
                            setFormatDrafts((cur) => ({
                              ...cur,
                              [f.id]: { ...draft, score: Number(e.target.value) || 0 },
                            }))
                          }
                        />
                      </label>
                      <label className="block space-y-1 text-sm">
                        <span className="text-[var(--text-secondary)]">Rules (field|op|value)</span>
                        <textarea
                          className={`${inputClass} min-h-20 font-mono text-xs`}
                          value={formatRuleText[f.id] ?? formatRulesText(draft.rules)}
                          aria-label={`Rules for ${f.name}`}
                          onChange={(e) => setFormatRuleText((cur) => ({ ...cur, [f.id]: e.target.value }))}
                        />
                      </label>
                      <div className="flex flex-wrap gap-2">
                        <button type="button" disabled={busy} className={saveBtnClass} onClick={() => void onSaveFormat(f.id)}>
                          Save format
                        </button>
                        <button
                          type="button"
                          disabled={busy}
                          className="text-sm text-[var(--text-tertiary)] hover:text-[var(--danger-color)]"
                          onClick={() => void onRemoveFormat(f.id)}
                        >
                          Delete format
                        </button>
                      </div>
                    </>
                  ) : (
                    <p className="flex justify-between gap-3 text-sm text-[var(--text-secondary)]">
                      <span>{f.name}</span>
                      <span className="tabular-nums">{f.score}</span>
                    </p>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>
      {canEdit ? (
        <form className="space-y-3" onSubmit={(e) => void onCreateFormat(e)} data-testid="custom-format-create">
          <h3 className="text-sm font-semibold text-[var(--text-primary)]">New format</h3>
          <label className="block space-y-1 text-sm">
            <span className="text-[var(--text-secondary)]">Name</span>
            <input
              className={inputClass}
              value={createFormat.name}
              aria-label="New format name"
              onChange={(e) => setCreateFormat((cur) => ({ ...cur, name: e.target.value }))}
            />
          </label>
          <label className="block space-y-1 text-sm">
            <span className="text-[var(--text-secondary)]">Default score</span>
            <input
              className={inputClass}
              type="number"
              value={createFormat.score}
              aria-label="New format score"
              onChange={(e) => setCreateFormat((cur) => ({ ...cur, score: Number(e.target.value) || 0 }))}
            />
          </label>
          <label className="block space-y-1 text-sm">
            <span className="text-[var(--text-secondary)]">Rules (field|op|value)</span>
            <textarea
              className={`${inputClass} min-h-20 font-mono text-xs`}
              value={createRulesText}
              aria-label="New format rules"
              onChange={(e) => setCreateRulesText(e.target.value)}
            />
          </label>
          <button type="submit" disabled={busy || !createFormat.name.trim()} className={saveBtnClass}>
            {busy ? 'Saving…' : 'Create format'}
          </button>
        </form>
      ) : null}
      <form className="space-y-2" onSubmit={(e) => void onScore(e)}>
        <label className="block text-sm text-[var(--text-secondary)]">
          Score a release name
          <input
            className={`${inputClass} mt-1`}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Dune.2021.1080p.BluRay.REMUX.HDR.mkv"
            data-testid="formats-score-title"
          />
        </label>
        <div className="flex flex-wrap gap-2">
          <button type="submit" className={saveBtnClass}>
            Score
          </button>
          <button
            type="button"
            className={saveBtnClass}
            disabled={!title.trim()}
            data-testid="formats-parse"
            onClick={() => void onParse()}
          >
            Parse quality
          </button>
        </div>
      </form>
      {parsed ? (
        <p className="text-sm text-[var(--text-secondary)]" data-testid="formats-parse-result">
          {parsedQualityLabel(parsed) || 'Unknown quality'}
          {parsed.resolution ? ` · ${parsed.resolution}` : ''}
          {parsed.source ? ` · ${parsed.source}` : ''}
          {parsed.codec ? ` · ${parsed.codec}` : ''}
          {parsed.hdr ? ' · HDR' : ''}
        </p>
      ) : null}
      {preview ? (
        <p className="text-sm text-[var(--text-secondary)]" data-testid="formats-score-result">
          {preview.quality.label || 'Release'} · total {preview.totalScore} (formats{' '}
          {preview.formatScore})
          {preview.matches.length
            ? ` · ${preview.matches.map((m) => `${m.name} ${m.score}`).join(', ')}`
            : ''}
        </p>
      ) : null}
    </div>
  );
}

function NotificationsPane() {
  const [prefs, save] = usePrefs();
  const canEdit = canManageNotifications();
  const [channels, setChannels] = useState<NotifyChannel[]>([]);
  const [available, setAvailable] = useState<boolean | null>(null);
  const [watchNotify, setWatchNotify] = useState<WatchNotifyCatalog | null>(null);
  const [channel, setChannel] = useState('discord');
  const [webhookUrl, setWebhookUrl] = useState('');
  const [smtpHost, setSmtpHost] = useState('');
  const [smtpPort, setSmtpPort] = useState('587');
  const [smtpUser, setSmtpUser] = useState('');
  const [smtpPass, setSmtpPass] = useState('');
  const [smtpFrom, setSmtpFrom] = useState('');
  const [to, setTo] = useState('');
  const [ruleName, setRuleName] = useState('Someone started watching');
  const [ruleEvent, setRuleEvent] = useState<(typeof WATCH_NOTIFY_EVENTS)[number]>('playback.started');
  const [ruleTitle, setRuleTitle] = useState('Playback started');
  const [ruleMessage, setRuleMessage] = useState('{user} started watching "{title}"');
  const [ruleDestIds, setRuleDestIds] = useState<string[]>([]);
  const [ruleTranscodeOnly, setRuleTranscodeOnly] = useState(false);
  const [rulePlatforms, setRulePlatforms] = useState('');
  const [destName, setDestName] = useState('');
  const [destType, setDestType] = useState<(typeof WATCH_NOTIFY_DESTINATION_TYPES)[number]>('discord');
  const [destUrl, setDestUrl] = useState('');
  const [destEvents, setDestEvents] = useState<string[]>(['playback.started']);
  const [error, setError] = useState<string | null>(null);
  const [flash, setFlash] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function reload() {
    const next = await api.getNotifications();
    setAvailable(next.available);
    setChannels(next.channels);
  }

  async function reloadWatch() {
    const next = await api.getWatchNotify();
    setWatchNotify(next);
  }

  useEffect(() => {
    if (!canEdit) return;
    let cancelled = false;
    void Promise.all([
      api.getNotifications(),
      api.getWatchNotify().catch(() => ({ available: false, rules: [], destinations: [] })),
    ])
      .then(([next, watch]) => {
        if (cancelled) return;
        setAvailable(next.available);
        setChannels(next.channels);
        setWatchNotify(watch);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Could not load notifications');
      });
    return () => {
      cancelled = true;
    };
  }, [canEdit]);

  function onReadySubmit(e: FormEvent) {
    e.preventDefault();
    const fd = new FormData(e.target as HTMLFormElement);
    save({
      notifications: {
        downloadReady: fd.get('downloadReady') === 'on',
      },
    });
  }

  async function onSaveConnect(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setFlash(null);
    try {
      await api.configureNotification({
        channel,
        webhookUrl: channel === 'email' ? undefined : webhookUrl,
        smtpHost: channel === 'email' ? smtpHost : undefined,
        smtpPort: channel === 'email' ? smtpPort : undefined,
        smtpUser: channel === 'email' ? smtpUser : undefined,
        smtpPass: channel === 'email' ? smtpPass : undefined,
        smtpFrom: channel === 'email' ? smtpFrom : undefined,
        to: channel === 'email' ? to : undefined,
        enabled: true,
      });
      setWebhookUrl('');
      setSmtpPass('');
      setFlash('Connect channel saved');
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save channel');
    } finally {
      setBusy(false);
    }
  }

  async function onTest(id: string) {
    setBusy(true);
    setError(null);
    setFlash(null);
    try {
      const next = await api.testNotification(id);
      setFlash(next.ok ? `Test sent on ${next.channel}` : next.error || 'Test failed');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Test failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={paneClass} data-testid="settings-notifications">
      <h2 className="font-semibold text-[var(--text-primary)]">Notifications</h2>
      <p className="text-sm text-[var(--text-secondary)]">
        In-app toasts when a request is ready, plus Arr-style Discord, Slack, webhook, or email
        Connect for household ops.
      </p>
      <form className="space-y-3" onSubmit={onReadySubmit}>
        <label className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
          <input
            name="downloadReady"
            type="checkbox"
            defaultChecked={prefs.notifications.downloadReady}
            aria-label="Download ready toasts"
          />
          Show a toast when a requested title is ready
        </label>
        <button type="submit" className={saveBtnClass}>
          Save
        </button>
      </form>
      {canEdit ? (
        <div className="space-y-3 border-t border-[var(--border-subtle)] pt-4">
          <h3 className="text-sm font-semibold text-[var(--text-primary)]">Connect</h3>
          {error ? (
            <p className="text-sm text-[var(--danger-color)]" role="alert">
              {error}
            </p>
          ) : null}
          {flash ? (
            <p className="text-sm text-[var(--text-secondary)]" data-testid="notify-flash">
              {flash}
            </p>
          ) : null}
          {available === false ? (
            <p className="text-sm text-[var(--text-tertiary)]">
              notification-default is not available. Start it to configure Discord, Slack, or email.
            </p>
          ) : null}
          <ul className="space-y-2" data-testid="notify-channels">
            {channels.map((ch) => (
              <li key={ch.id} className="flex items-center justify-between gap-3 text-sm">
                <span className="min-w-0 truncate text-[var(--text-secondary)]">{notifyChannelLabel(ch)}</span>
                <button
                  type="button"
                  disabled={busy}
                  className="shrink-0 text-[var(--text-tertiary)] hover:text-[var(--text-primary)]"
                  onClick={() => void onTest(ch.id)}
                >
                  Test
                </button>
              </li>
            ))}
          </ul>
          <form className="space-y-3" onSubmit={(e) => void onSaveConnect(e)}>
            <label className="block space-y-1 text-sm">
              <span className="text-[var(--text-secondary)]">Channel</span>
              <select
                className={inputClass}
                value={channel}
                aria-label="Connect channel"
                onChange={(e) => setChannel(e.target.value)}
              >
                {NOTIFY_CHANNELS.map((id) => (
                  <option key={id} value={id}>
                    {id}
                  </option>
                ))}
              </select>
            </label>
            {channel === 'email' ? (
              <>
                <label className="block space-y-1 text-sm">
                  <span className="text-[var(--text-secondary)]">SMTP host</span>
                  <input
                    className={inputClass}
                    value={smtpHost}
                    aria-label="SMTP host"
                    onChange={(e) => setSmtpHost(e.target.value)}
                  />
                </label>
                <label className="block space-y-1 text-sm">
                  <span className="text-[var(--text-secondary)]">SMTP port</span>
                  <input
                    className={inputClass}
                    value={smtpPort}
                    aria-label="SMTP port"
                    onChange={(e) => setSmtpPort(e.target.value)}
                  />
                </label>
                <label className="block space-y-1 text-sm">
                  <span className="text-[var(--text-secondary)]">SMTP user</span>
                  <input
                    className={inputClass}
                    value={smtpUser}
                    aria-label="SMTP user"
                    onChange={(e) => setSmtpUser(e.target.value)}
                  />
                </label>
                <label className="block space-y-1 text-sm">
                  <span className="text-[var(--text-secondary)]">SMTP password</span>
                  <input
                    className={inputClass}
                    type="password"
                    value={smtpPass}
                    aria-label="SMTP password"
                    onChange={(e) => setSmtpPass(e.target.value)}
                  />
                </label>
                <label className="block space-y-1 text-sm">
                  <span className="text-[var(--text-secondary)]">From</span>
                  <input
                    className={inputClass}
                    value={smtpFrom}
                    aria-label="Email from"
                    onChange={(e) => setSmtpFrom(e.target.value)}
                  />
                </label>
                <label className="block space-y-1 text-sm">
                  <span className="text-[var(--text-secondary)]">To</span>
                  <input
                    className={inputClass}
                    value={to}
                    aria-label="Email to"
                    onChange={(e) => setTo(e.target.value)}
                  />
                </label>
              </>
            ) : (
              <label className="block space-y-1 text-sm">
                <span className="text-[var(--text-secondary)]">Webhook URL</span>
                <input
                  className={inputClass}
                  type="password"
                  value={webhookUrl}
                  aria-label="Connect webhook URL"
                  onChange={(e) => setWebhookUrl(e.target.value)}
                  autoComplete="off"
                />
              </label>
            )}
            <button type="submit" disabled={busy} className={saveBtnClass}>
              {busy ? 'Saving…' : 'Save channel'}
            </button>
          </form>
          <div className="space-y-3 border-t border-[var(--border-subtle)] pt-4">
            <h3 className="text-sm font-semibold text-[var(--text-primary)]">Watch alerts</h3>
            <p className="text-sm text-[var(--text-secondary)]">
              Tautulli-style alerts when someone starts or stops watching, a request is ready, or
              playback-guard fires. Leave destinations empty to use the Connect channels above.
            </p>
            {watchNotify && !watchNotify.available ? (
              <p className="text-sm text-[var(--text-tertiary)]">
                playback-monitor is not connected. Start it to edit watch alert rules.
              </p>
            ) : null}
            <ul className="space-y-2" data-testid="watch-notify-destinations">
              {(watchNotify?.destinations ?? []).map((dest) => (
                <li key={dest.id || dest.name} className="flex items-center justify-between gap-3 text-sm">
                  <span className="min-w-0 truncate text-[var(--text-secondary)]">
                    {watchNotifyDestinationLabel(dest)}
                  </span>
                  <span className="flex shrink-0 gap-2">
                    <button
                      type="button"
                      disabled={busy || !dest.id}
                      className="text-[var(--text-tertiary)] hover:text-[var(--text-primary)]"
                      onClick={() => {
                        void (async () => {
                          setBusy(true);
                          setError(null);
                          setFlash(null);
                          try {
                            const next = await api.testWatchNotifyDestination(dest.id);
                            setFlash(next.ok ? `Test sent to ${dest.name || dest.type}` : 'Test failed');
                          } catch (err) {
                            setError(err instanceof Error ? err.message : 'Test failed');
                          } finally {
                            setBusy(false);
                          }
                        })();
                      }}
                    >
                      Test
                    </button>
                    <button
                      type="button"
                      disabled={busy || !dest.id}
                      className="text-[var(--text-tertiary)] hover:text-[var(--danger-color)]"
                      onClick={() => {
                        void (async () => {
                          setBusy(true);
                          setError(null);
                          setFlash(null);
                          try {
                            await api.deleteWatchNotifyDestination(dest.id);
                            setFlash('Destination removed');
                            setRuleDestIds((cur) => cur.filter((id) => id !== dest.id));
                            await reloadWatch();
                          } catch (err) {
                            setError(err instanceof Error ? err.message : 'Could not delete destination');
                          } finally {
                            setBusy(false);
                          }
                        })();
                      }}
                    >
                      Remove
                    </button>
                  </span>
                </li>
              ))}
            </ul>
            <form
              className="space-y-3"
              data-testid="watch-notify-destination-form"
              onSubmit={(e) => {
                e.preventDefault();
                void (async () => {
                  setBusy(true);
                  setError(null);
                  setFlash(null);
                  try {
                    const config: Record<string, string> =
                      destType === 'apprise' ? { urls: destUrl } : { webhook_url: destUrl };
                    await api.upsertWatchNotifyDestination({
                      name: destName,
                      type: destType,
                      enabled: true,
                      events: destEvents,
                      config,
                    });
                    setDestName('');
                    setDestUrl('');
                    setFlash('Watch destination saved');
                    await reloadWatch();
                  } catch (err) {
                    setError(err instanceof Error ? err.message : 'Could not save destination');
                  } finally {
                    setBusy(false);
                  }
                })();
              }}
            >
              <label className="block space-y-1 text-sm">
                <span className="text-[var(--text-secondary)]">Destination name</span>
                <input
                  className={inputClass}
                  value={destName}
                  aria-label="Watch destination name"
                  onChange={(e) => setDestName(e.target.value)}
                />
              </label>
              <label className="block space-y-1 text-sm">
                <span className="text-[var(--text-secondary)]">Destination type</span>
                <select
                  className={inputClass}
                  value={destType}
                  aria-label="Watch destination type"
                  onChange={(e) => setDestType(e.target.value as (typeof WATCH_NOTIFY_DESTINATION_TYPES)[number])}
                >
                  {WATCH_NOTIFY_DESTINATION_TYPES.map((id) => (
                    <option key={id} value={id}>
                      {id}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block space-y-1 text-sm">
                <span className="text-[var(--text-secondary)]">
                  {destType === 'apprise' ? 'Apprise URLs' : 'Webhook URL'}
                </span>
                <input
                  className={inputClass}
                  type="password"
                  value={destUrl}
                  aria-label={destType === 'apprise' ? 'Watch destination Apprise URLs' : 'Watch destination webhook URL'}
                  onChange={(e) => setDestUrl(e.target.value)}
                  autoComplete="off"
                />
              </label>
              <fieldset className="space-y-1">
                <legend className="text-sm text-[var(--text-secondary)]">Destination events</legend>
                {WATCH_NOTIFY_EVENTS.map((ev) => (
                  <label key={ev} className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
                    <input
                      type="checkbox"
                      checked={destEvents.includes(ev)}
                      aria-label={`Destination event ${watchNotifyEventLabel(ev)}`}
                      onChange={(e) => {
                        setDestEvents((cur) =>
                          e.target.checked ? [...cur, ev] : cur.filter((id) => id !== ev),
                        );
                      }}
                    />
                    {watchNotifyEventLabel(ev)}
                  </label>
                ))}
              </fieldset>
              <button type="submit" disabled={busy || !destName.trim() || !destUrl.trim()} className={saveBtnClass}>
                {busy ? 'Saving…' : 'Save destination'}
              </button>
            </form>
            <ul className="space-y-2" data-testid="watch-notify-rules">
              {(watchNotify?.rules ?? []).map((rule) => (
                <li key={rule.id || rule.name} className="flex items-center justify-between gap-3 text-sm">
                  <span className="min-w-0 truncate text-[var(--text-secondary)]">{watchNotifyRuleLabel(rule)}</span>
                  <button
                    type="button"
                    disabled={busy || !rule.id}
                    className="shrink-0 text-[var(--text-tertiary)] hover:text-[var(--danger-color)]"
                    onClick={() => {
                      void (async () => {
                        setBusy(true);
                        setError(null);
                        setFlash(null);
                        try {
                          await api.deleteWatchNotifyRule(rule.id);
                          setFlash('Watch alert removed');
                          await reloadWatch();
                        } catch (err) {
                          setError(err instanceof Error ? err.message : 'Could not delete watch alert');
                        } finally {
                          setBusy(false);
                        }
                      })();
                    }}
                  >
                    Remove
                  </button>
                </li>
              ))}
            </ul>
            <form
              className="space-y-3"
              data-testid="watch-notify-rule-form"
              onSubmit={(e) => {
                e.preventDefault();
                void (async () => {
                  setBusy(true);
                  setError(null);
                  setFlash(null);
                  try {
                    await api.upsertWatchNotifyRule({
                      name: ruleName,
                      enabled: true,
                      eventType: ruleEvent,
                      titleTemplate: ruleTitle,
                      messageTemplate: ruleMessage,
                      destinationIds: ruleDestIds,
                      filters: {
                        transcodeOnly: ruleTranscodeOnly,
                        platforms: parseCsvList(rulePlatforms),
                      },
                    });
                    setFlash('Watch alert saved');
                    await reloadWatch();
                  } catch (err) {
                    setError(err instanceof Error ? err.message : 'Could not save watch alert');
                  } finally {
                    setBusy(false);
                  }
                })();
              }}
            >
              <label className="block space-y-1 text-sm">
                <span className="text-[var(--text-secondary)]">Alert name</span>
                <input
                  className={inputClass}
                  value={ruleName}
                  aria-label="Watch alert name"
                  onChange={(e) => setRuleName(e.target.value)}
                />
              </label>
              <label className="block space-y-1 text-sm">
                <span className="text-[var(--text-secondary)]">Event</span>
                <select
                  className={inputClass}
                  value={ruleEvent}
                  aria-label="Watch alert event"
                  onChange={(e) => setRuleEvent(e.target.value as (typeof WATCH_NOTIFY_EVENTS)[number])}
                >
                  {WATCH_NOTIFY_EVENTS.map((ev) => (
                    <option key={ev} value={ev}>
                      {watchNotifyEventLabel(ev)}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block space-y-1 text-sm">
                <span className="text-[var(--text-secondary)]">Title template</span>
                <input
                  className={inputClass}
                  value={ruleTitle}
                  aria-label="Watch alert title template"
                  onChange={(e) => setRuleTitle(e.target.value)}
                />
              </label>
              <label className="block space-y-1 text-sm">
                <span className="text-[var(--text-secondary)]">Message template</span>
                <input
                  className={inputClass}
                  value={ruleMessage}
                  aria-label="Watch alert message template"
                  onChange={(e) => setRuleMessage(e.target.value)}
                />
              </label>
              <label className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
                <input
                  type="checkbox"
                  checked={ruleTranscodeOnly}
                  aria-label="Watch alert transcode only"
                  onChange={(e) => setRuleTranscodeOnly(e.target.checked)}
                />
                Transcode only
              </label>
              <label className="block space-y-1 text-sm">
                <span className="text-[var(--text-secondary)]">Platforms (comma separated)</span>
                <input
                  className={inputClass}
                  value={rulePlatforms}
                  aria-label="Watch alert platforms"
                  onChange={(e) => setRulePlatforms(e.target.value)}
                />
              </label>
              {(watchNotify?.destinations ?? []).length > 0 ? (
                <fieldset className="space-y-1">
                  <legend className="text-sm text-[var(--text-secondary)]">Send to destinations</legend>
                  {watchNotify?.destinations.map((dest) => (
                    <label key={dest.id} className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
                      <input
                        type="checkbox"
                        checked={ruleDestIds.includes(dest.id)}
                        aria-label={`Send watch alert to ${dest.name}`}
                        onChange={(e) => {
                          setRuleDestIds((cur) =>
                            e.target.checked ? [...cur, dest.id] : cur.filter((id) => id !== dest.id),
                          );
                        }}
                      />
                      {dest.name || dest.type}
                    </label>
                  ))}
                </fieldset>
              ) : null}
              <button type="submit" disabled={busy || !ruleName.trim()} className={saveBtnClass}>
                {busy ? 'Saving…' : 'Save watch alert'}
              </button>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function RequestsPane() {
  const [pending, setPending] = useState('0');
  const [week, setWeek] = useState('0');
  const [users, setUsers] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void api
      .getRequestPolicy()
      .then((p) => {
        if (cancelled) return;
        setPending(String(p.maxPendingPerUser));
        setWeek(String(p.maxPerWeek));
        setUsers(p.autoApproveUsers.join(', '));
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Could not load request policy');
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setSaved(false);
    try {
      await api.updateRequestPolicy({
        maxPendingPerUser: Number(pending) || 0,
        maxPerWeek: Number(week) || 0,
        autoApproveUsersCsv: users,
      });
      setSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save request policy');
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className={paneClass} onSubmit={(e) => void onSubmit(e)} data-testid="settings-requests">
      <h2 className="font-semibold text-[var(--text-primary)]">Requests</h2>
      <p className="text-sm text-[var(--text-secondary)]">
        Limit how many titles a household member can request, and skip approval for trusted users.
        Zero means unlimited.
      </p>
      {error ? (
        <p className="text-sm text-[var(--danger-color)]" role="alert">
          {error}
        </p>
      ) : null}
      {saved ? (
        <p className="text-sm text-[var(--success)]" role="status">
          Request policy saved
        </p>
      ) : null}
      <label className="block space-y-1 text-sm">
        <span className="text-[var(--text-secondary)]">Max pending per person</span>
        <input
          className={inputClass}
          type="number"
          min={0}
          value={pending}
          onChange={(e) => setPending(e.target.value)}
          data-testid="settings-max-pending"
        />
      </label>
      <label className="block space-y-1 text-sm">
        <span className="text-[var(--text-secondary)]">Max requests per week</span>
        <input
          className={inputClass}
          type="number"
          min={0}
          value={week}
          onChange={(e) => setWeek(e.target.value)}
          data-testid="settings-max-week"
        />
      </label>
      <label className="block space-y-1 text-sm">
        <span className="text-[var(--text-secondary)]">Auto-approve user ids</span>
        <input
          className={inputClass}
          value={users}
          onChange={(e) => setUsers(e.target.value)}
          placeholder="alice, sam"
          data-testid="settings-auto-approve"
        />
      </label>
      <button type="submit" disabled={busy} className={saveBtnClass}>
        {busy ? 'Saving…' : 'Save'}
      </button>
    </form>
  );
}

function MaintainerPane() {
  const [status, setStatus] = useState<MaintainerStatus | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [flash, setFlash] = useState<string | null>(null);
  const [ruleName, setRuleName] = useState('Stale unwatched movies');
  const [preset, setPreset] = useState<'stale_unwatched' | 'last_watched'>('stale_unwatched');
  const [days, setDays] = useState(90);
  const [scope, setScope] = useState<'movie' | 'series'>('movie');
  const [action, setAction] = useState<'delete' | 'unmonitor'>('delete');
  const [protectTitle, setProtectTitle] = useState('');
  const [protectItemId, setProtectItemId] = useState('');
  const [protectScope, setProtectScope] = useState<'movie' | 'series'>('movie');
  const [collectionId, setCollectionId] = useState('');
  const [collectionName, setCollectionName] = useState('Leaving soon');
  const [graceDays, setGraceDays] = useState(7);
  const [leavingSoon, setLeavingSoon] = useState(true);
  const [exclusionName, setExclusionName] = useState('Never delete list');
  const [exclusionType, setExclusionType] = useState<'local' | 'trakt' | 'mdblist' | 'justwatch'>('local');
  const [exclusionUrl, setExclusionUrl] = useState('');
  const [exclusionKey, setExclusionKey] = useState('');
  const [exclusionIds, setExclusionIds] = useState('');
  const [importYaml, setImportYaml] = useState('');

  async function reload() {
    const next = await api.getMaintainer();
    setStatus(next);
  }

  useEffect(() => {
    let cancelled = false;
    void api
      .getMaintainer()
      .then((next) => {
        if (!cancelled) setStatus(next);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Could not load maintainer');
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function onScan() {
    setBusy(true);
    setError(null);
    setFlash(null);
    try {
      const next = await api.scanMaintainer({ dryRun: true });
      setFlash(`Dry-run scan found ${next.candidatesFound} candidates`);
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Scan failed');
    } finally {
      setBusy(false);
    }
  }

  async function onAct(freeUp: boolean) {
    setBusy(true);
    setError(null);
    setFlash(null);
    try {
      const next = await api.actMaintainer({ freeUp });
      setFlash(freeUp ? `Freed space: ${next.actionsTaken} actions` : `Applied ${next.actionsTaken} actions`);
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Action failed');
    } finally {
      setBusy(false);
    }
  }

  function ruleInput() {
    return { name: ruleName, preset, days, scope, action, collectionId };
  }

  async function onSaveRule(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setFlash(null);
    try {
      await api.upsertMaintainerRule(ruleInput());
      setFlash('Rule saved');
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save rule');
    } finally {
      setBusy(false);
    }
  }

  async function onPreviewRule() {
    setBusy(true);
    setError(null);
    setFlash(null);
    try {
      const next = await api.previewMaintainerRule(ruleInput());
      setFlash(`Preview matched ${next.total} title${next.total === 1 ? '' : 's'}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Preview failed');
    } finally {
      setBusy(false);
    }
  }

  async function onToggleRule(id: string) {
    setBusy(true);
    setError(null);
    setFlash(null);
    try {
      const next = await api.toggleMaintainerRule(id);
      setFlash(next.enabled ? 'Rule enabled' : 'Rule disabled');
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not toggle rule');
    } finally {
      setBusy(false);
    }
  }

  async function onProtect(e: FormEvent) {
    e.preventDefault();
    if (!protectItemId.trim()) return;
    setBusy(true);
    setError(null);
    setFlash(null);
    try {
      await api.upsertMaintainerProtection({
        itemId: protectItemId.trim(),
        title: protectTitle.trim(),
        scope: protectScope,
        reason: 'Household favorite',
      });
      setFlash('Title protected from cleanup');
      setProtectTitle('');
      setProtectItemId('');
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not protect title');
    } finally {
      setBusy(false);
    }
  }

  async function onUnprotect(id: string) {
    setBusy(true);
    setError(null);
    setFlash(null);
    try {
      await api.deleteMaintainerProtection(id);
      setFlash('Protection removed');
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not remove protection');
    } finally {
      setBusy(false);
    }
  }

  async function onDeleteRule(id: string) {
    setBusy(true);
    setError(null);
    setFlash(null);
    try {
      await api.deleteMaintainerRule(id);
      setFlash('Rule deleted');
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not delete rule');
    } finally {
      setBusy(false);
    }
  }

  async function onSaveCollection(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setFlash(null);
    try {
      const next = await api.upsertMaintainerCollection({
        name: collectionName,
        graceDays,
        action,
        leavingSoonEnabled: leavingSoon,
      });
      setFlash('Leaving-soon collection saved');
      if (next.id) setCollectionId(next.id);
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save collection');
    } finally {
      setBusy(false);
    }
  }

  async function onDeleteCollection(id: string) {
    setBusy(true);
    setError(null);
    setFlash(null);
    try {
      await api.deleteMaintainerCollection(id);
      if (collectionId === id) setCollectionId('');
      setFlash('Collection deleted');
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not delete collection');
    } finally {
      setBusy(false);
    }
  }

  async function onSaveExclusion(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setFlash(null);
    try {
      await api.upsertMaintainerExclusion({
        name: exclusionName,
        type: exclusionType,
        listUrl: exclusionUrl,
        apiKey: exclusionKey,
        tmdbIdsText: exclusionIds,
      });
      setFlash('Exclusion list saved');
      setExclusionUrl('');
      setExclusionKey('');
      setExclusionIds('');
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save exclusion list');
    } finally {
      setBusy(false);
    }
  }

  async function onDeleteExclusion(id: string) {
    setBusy(true);
    setError(null);
    setFlash(null);
    try {
      await api.deleteMaintainerExclusion(id);
      setFlash('Exclusion list deleted');
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not delete exclusion list');
    } finally {
      setBusy(false);
    }
  }

  async function onSyncExclusions() {
    setBusy(true);
    setError(null);
    setFlash(null);
    try {
      const next = await api.syncMaintainerExclusions();
      setFlash(`Synced ${next.listsSynced} lists (${next.idsLoaded} TMDB ids)`);
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not sync exclusion lists');
    } finally {
      setBusy(false);
    }
  }

  async function onExportRules() {
    setBusy(true);
    setError(null);
    setFlash(null);
    try {
      const next = await api.exportMaintainerRules();
      const body = next.rulesYaml || next.rulesJson;
      const blob = new Blob([body], { type: 'text/yaml' });
      const href = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = href;
      a.download = 'maintainer-rules.yaml';
      a.click();
      URL.revokeObjectURL(href);
      setFlash('Rules exported');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not export rules');
    } finally {
      setBusy(false);
    }
  }

  async function onImportRules(e: FormEvent) {
    e.preventDefault();
    if (!importYaml.trim()) return;
    setBusy(true);
    setError(null);
    setFlash(null);
    try {
      const next = await api.importMaintainerRules({ rulesYaml: importYaml });
      setFlash(`Imported ${next.imported} rule${next.imported === 1 ? '' : 's'}`);
      setImportYaml('');
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not import rules');
    } finally {
      setBusy(false);
    }
  }

  async function onCandidate(id: string, action: 'approve' | 'postpone' | 'cancel') {
    setBusy(true);
    setError(null);
    setFlash(null);
    try {
      await api.maintainerCandidateAction(id, action);
      setFlash(action === 'approve' ? 'Candidate approved' : action === 'postpone' ? 'Candidate postponed 7 days' : 'Candidate cancelled');
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not update candidate');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={`${paneClass} max-w-2xl`} data-testid="settings-maintainer">
      <h2 className="font-semibold text-[var(--text-primary)]">Maintainer</h2>
      <p className="text-sm text-[var(--text-secondary)]">
        Clean up unwatched or leftover library titles the way Maintainerr does. Attach a leaving-soon
        collection so matches wait a grace period before delete. Scan is a dry-run; approve a
        candidate, then apply actions. Needs the optional library-maintainer module.
      </p>
      {error ? (
        <p className="text-sm text-[var(--danger-color)]" role="alert">
          {error}
        </p>
      ) : null}
      {flash ? (
        <p className="text-sm text-[var(--text-secondary)]" data-testid="maintainer-flash">
          {flash}
        </p>
      ) : null}
      {status && !status.available ? (
        <p className="text-sm text-[var(--text-tertiary)]">
          Library maintainer is not running. Enable the library-maintainer compose profile or
          MVP_ENABLE_MEDIA_LIBRARY_MAINTAINER=1.
        </p>
      ) : null}
      {status?.storage.length ? (
        <ul className="space-y-1 text-sm text-[var(--text-secondary)]" data-testid="maintainer-storage">
          {status.storage.map((row) => (
            <li key={row.path}>
              {row.path} · {row.freePercent.toFixed(1)}% free · {formatBytes(row.freeBytes)}
            </li>
          ))}
        </ul>
      ) : null}
      <p className="text-sm text-[var(--text-tertiary)]">
        {status?.rulesTotal ?? 0} cleanup rule{(status?.rulesTotal ?? 0) === 1 ? '' : 's'}
      </p>
      <form className="space-y-3" onSubmit={(e) => void onSaveRule(e)} data-testid="maintainer-rule-form">
        <h3 className="text-sm font-semibold text-[var(--text-primary)]">Cleanup rule</h3>
        <label className="block space-y-1 text-sm">
          <span className="text-[var(--text-secondary)]">Name</span>
          <input className={inputClass} value={ruleName} aria-label="Maintainer rule name" onChange={(e) => setRuleName(e.target.value)} />
        </label>
        <label className="block space-y-1 text-sm">
          <span className="text-[var(--text-secondary)]">Match</span>
          <select className={inputClass} value={preset} aria-label="Maintainer rule preset" onChange={(e) => setPreset(e.target.value as 'stale_unwatched' | 'last_watched')}>
            <option value="stale_unwatched">Never watched, added more than N days ago</option>
            <option value="last_watched">Last watched more than N days ago</option>
          </select>
        </label>
        <label className="block space-y-1 text-sm">
          <span className="text-[var(--text-secondary)]">Days</span>
          <input className={inputClass} type="number" min={1} value={days} aria-label="Maintainer rule days" onChange={(e) => setDays(Number(e.target.value) || 90)} />
        </label>
        <label className="block space-y-1 text-sm">
          <span className="text-[var(--text-secondary)]">Library</span>
          <select className={inputClass} value={scope} aria-label="Maintainer rule scope" onChange={(e) => setScope(e.target.value as 'movie' | 'series')}>
            <option value="movie">Movies</option>
            <option value="series">TV</option>
          </select>
        </label>
        <label className="block space-y-1 text-sm">
          <span className="text-[var(--text-secondary)]">Action</span>
          <select className={inputClass} value={action} aria-label="Maintainer rule action" onChange={(e) => setAction(e.target.value as 'delete' | 'unmonitor')}>
            <option value="delete">Delete</option>
            <option value="unmonitor">Unmonitor</option>
          </select>
        </label>
        <label className="block space-y-1 text-sm">
          <span className="text-[var(--text-secondary)]">Leaving-soon collection</span>
          <select className={inputClass} value={collectionId} aria-label="Maintainer rule collection" onChange={(e) => setCollectionId(e.target.value)}>
            <option value="">None — act after scan</option>
            {(status?.collections ?? []).map((row) => (
              <option key={row.id} value={row.id}>
                {row.name} ({row.graceDays}d)
              </option>
            ))}
          </select>
        </label>
        <div className="flex flex-wrap gap-2">
          <button type="submit" disabled={busy || !ruleName.trim()} className={saveBtnClass}>
            Save rule
          </button>
          <button type="button" disabled={busy} className={saveBtnClass} onClick={() => void onPreviewRule()}>
            Preview
          </button>
        </div>
      </form>
      <ul className="space-y-2" data-testid="maintainer-rules">
        {(status?.rules ?? []).map((row) => (
          <li key={row.id || row.name} className="flex flex-wrap items-center justify-between gap-3 text-sm">
            <span className="text-[var(--text-secondary)]">
              {row.name}
              {row.enabled ? ' · on' : ' · off'}
              {row.scope ? ` · ${row.scope}` : ''}
              {row.arrAction ? ` · ${maintainerActionLabel(row.arrAction)}` : ''}
              {row.collectionId ? ' · leaving soon' : ''}
            </span>
            <span className="flex flex-wrap gap-2">
              <button type="button" disabled={busy || !row.id} className="text-[var(--text-tertiary)] hover:text-[var(--text-primary)]" onClick={() => void onToggleRule(row.id)}>
                {row.enabled ? 'Disable' : 'Enable'}
              </button>
              <button type="button" disabled={busy || !row.id} className="text-[var(--text-tertiary)] hover:text-[var(--danger-color)]" onClick={() => void onDeleteRule(row.id)}>
                Delete
              </button>
            </span>
          </li>
        ))}
      </ul>
      <form className="space-y-3" onSubmit={(e) => void onImportRules(e)} data-testid="maintainer-rules-io">
        <div className="flex flex-wrap gap-2">
          <button type="button" disabled={busy || !status?.available} className={saveBtnClass} onClick={() => void onExportRules()}>
            Export rules
          </button>
        </div>
        <label className="block space-y-1 text-sm">
          <span className="text-[var(--text-secondary)]">Import YAML</span>
          <textarea
            className={inputClass}
            rows={3}
            value={importYaml}
            aria-label="Maintainer rules YAML"
            onChange={(e) => setImportYaml(e.target.value)}
          />
        </label>
        <button type="submit" disabled={busy || !importYaml.trim()} className={saveBtnClass}>
          Import rules
        </button>
      </form>
      <form className="space-y-3" onSubmit={(e) => void onSaveCollection(e)} data-testid="maintainer-collection-form">
        <h3 className="text-sm font-semibold text-[var(--text-primary)]">Leaving soon</h3>
        <p className="text-sm text-[var(--text-secondary)]">
          Grace period after a rule matches. Titles stay in Leaving soon until the days elapse, then
          they can be deleted. Attach the collection on a cleanup rule.
        </p>
        <label className="block space-y-1 text-sm">
          <span className="text-[var(--text-secondary)]">Name</span>
          <input className={inputClass} value={collectionName} aria-label="Leaving-soon collection name" onChange={(e) => setCollectionName(e.target.value)} />
        </label>
        <label className="block space-y-1 text-sm">
          <span className="text-[var(--text-secondary)]">Grace days</span>
          <input className={inputClass} type="number" min={1} value={graceDays} aria-label="Leaving-soon grace days" onChange={(e) => setGraceDays(Number(e.target.value) || 7)} />
        </label>
        <label className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
          <input type="checkbox" checked={leavingSoon} onChange={(e) => setLeavingSoon(e.target.checked)} aria-label="Mark matches as leaving soon" />
          Mark matches as leaving soon
        </label>
        <button type="submit" disabled={busy || !collectionName.trim()} className={saveBtnClass}>
          Save collection
        </button>
      </form>
      <ul className="space-y-2" data-testid="maintainer-collections">
        {(status?.collections ?? []).map((row) => (
          <li key={row.id || row.name} className="flex flex-wrap items-center justify-between gap-3 text-sm">
            <span className="text-[var(--text-secondary)]">
              {row.name}
              {row.graceDays ? ` · ${row.graceDays}d` : ''}
              {row.leavingSoonEnabled ? ' · leaving soon' : ''}
              {row.arrAction ? ` · ${maintainerActionLabel(row.arrAction)}` : ''}
            </span>
            <button type="button" disabled={busy || !row.id} className="text-[var(--text-tertiary)] hover:text-[var(--danger-color)]" onClick={() => void onDeleteCollection(row.id)}>
              Delete
            </button>
          </li>
        ))}
      </ul>
      <form className="space-y-3" onSubmit={(e) => void onSaveExclusion(e)} data-testid="maintainer-exclusion-form">
        <h3 className="text-sm font-semibold text-[var(--text-primary)]">Exclusion lists</h3>
        <p className="text-sm text-[var(--text-secondary)]">
          Skip titles on Trakt, MDBList, or a local TMDB id list, like Maintainerr exclusions. Local ids work
          without an external account.
        </p>
        <label className="block space-y-1 text-sm">
          <span className="text-[var(--text-secondary)]">Name</span>
          <input className={inputClass} value={exclusionName} aria-label="Exclusion list name" onChange={(e) => setExclusionName(e.target.value)} />
        </label>
        <label className="block space-y-1 text-sm">
          <span className="text-[var(--text-secondary)]">Type</span>
          <select className={inputClass} value={exclusionType} aria-label="Exclusion list type" onChange={(e) => setExclusionType(e.target.value as 'local' | 'trakt' | 'mdblist' | 'justwatch')}>
            <option value="local">Local TMDB ids</option>
            <option value="trakt">Trakt</option>
            <option value="mdblist">MDBList</option>
            <option value="justwatch">JustWatch</option>
          </select>
        </label>
        {exclusionType !== 'local' ? (
          <>
            <label className="block space-y-1 text-sm">
              <span className="text-[var(--text-secondary)]">List URL</span>
              <input className={inputClass} value={exclusionUrl} aria-label="Exclusion list URL" onChange={(e) => setExclusionUrl(e.target.value)} />
            </label>
            <label className="block space-y-1 text-sm">
              <span className="text-[var(--text-secondary)]">API key</span>
              <input className={inputClass} value={exclusionKey} aria-label="Exclusion list API key" onChange={(e) => setExclusionKey(e.target.value)} />
            </label>
          </>
        ) : (
          <label className="block space-y-1 text-sm">
            <span className="text-[var(--text-secondary)]">TMDB ids</span>
            <input className={inputClass} value={exclusionIds} aria-label="Exclusion TMDB ids" placeholder="550, 603" onChange={(e) => setExclusionIds(e.target.value)} />
          </label>
        )}
        <div className="flex flex-wrap gap-2">
          <button type="submit" disabled={busy || !exclusionName.trim()} className={saveBtnClass}>
            Save exclusion list
          </button>
          <button type="button" disabled={busy || !status?.available} className={saveBtnClass} onClick={() => void onSyncExclusions()}>
            Sync lists
          </button>
        </div>
      </form>
      <ul className="space-y-2" data-testid="maintainer-exclusions">
        {(status?.exclusions ?? []).map((row) => (
          <li key={row.id || row.name} className="flex flex-wrap items-center justify-between gap-3 text-sm">
            <span className="text-[var(--text-secondary)]">
              {row.name}
              {row.type ? ` · ${row.type}` : ''}
              {row.tmdbCount ? ` · ${row.tmdbCount} ids` : ''}
            </span>
            <button type="button" disabled={busy || !row.id} className="text-[var(--text-tertiary)] hover:text-[var(--danger-color)]" onClick={() => void onDeleteExclusion(row.id)}>
              Delete
            </button>
          </li>
        ))}
      </ul>
      <form className="space-y-3" onSubmit={(e) => void onProtect(e)} data-testid="maintainer-protect-form">
        <h3 className="text-sm font-semibold text-[var(--text-primary)]">Never delete</h3>
        <p className="text-sm text-[var(--text-secondary)]">
          Protect a title from cleanup, like Maintainerr exclusions. You can also do this from a movie or TV page.
        </p>
        <label className="block space-y-1 text-sm">
          <span className="text-[var(--text-secondary)]">Title</span>
          <input className={inputClass} value={protectTitle} aria-label="Protected title" onChange={(e) => setProtectTitle(e.target.value)} />
        </label>
        <label className="block space-y-1 text-sm">
          <span className="text-[var(--text-secondary)]">Library id</span>
          <input className={inputClass} value={protectItemId} aria-label="Protected item id" onChange={(e) => setProtectItemId(e.target.value)} />
        </label>
        <label className="block space-y-1 text-sm">
          <span className="text-[var(--text-secondary)]">Library</span>
          <select className={inputClass} value={protectScope} aria-label="Protected scope" onChange={(e) => setProtectScope(e.target.value as 'movie' | 'series')}>
            <option value="movie">Movies</option>
            <option value="series">TV</option>
          </select>
        </label>
        <button type="submit" disabled={busy || !protectItemId.trim()} className={saveBtnClass}>
          Protect title
        </button>
      </form>
      <ul className="space-y-2" data-testid="maintainer-protections">
        {(status?.protections ?? []).map((row) => (
          <li key={row.id || row.itemId} className="flex flex-wrap items-center justify-between gap-3 text-sm">
            <span className="text-[var(--text-secondary)]">
              {row.title || row.itemId}
              {row.reason ? ` · ${row.reason}` : ''}
            </span>
            <button type="button" disabled={busy || !row.id} className="text-[var(--text-tertiary)] hover:text-[var(--danger-color)]" onClick={() => void onUnprotect(row.id)}>
              Remove
            </button>
          </li>
        ))}
      </ul>
      <div className="flex flex-wrap gap-2">
        <button type="button" disabled={busy} className={saveBtnClass} onClick={() => void onScan()}>
          Dry-run scan
        </button>
        <button type="button" disabled={busy || !status?.available} className={saveBtnClass} onClick={() => void onAct(false)}>
          Apply actions
        </button>
        <button type="button" disabled={busy || !status?.available} className={saveBtnClass} onClick={() => void onAct(true)}>
          Free up space
        </button>
      </div>
      <ul className="space-y-2" data-testid="maintainer-candidates">
        {(status?.candidates ?? []).map((row) => (
          <li key={row.id || row.title} className="flex flex-wrap items-center justify-between gap-3 text-sm">
            <span className="min-w-0 text-[var(--text-secondary)]">
              {row.title}
              {row.year ? ` (${row.year})` : ''}
              {row.status ? ` · ${maintainerStatusLabel(row.status)}` : ''}
              {row.arrAction ? ` · ${maintainerActionLabel(row.arrAction)}` : ''}
              {row.sizeBytes ? ` · ${formatBytes(row.sizeBytes)}` : ''}
            </span>
            <span className="flex flex-wrap gap-2">
              <button type="button" disabled={busy || !row.id} className="text-[var(--text-tertiary)] hover:text-[var(--text-primary)]" onClick={() => void onCandidate(row.id, 'approve')}>
                Approve
              </button>
              <button type="button" disabled={busy || !row.id} className="text-[var(--text-tertiary)] hover:text-[var(--text-primary)]" onClick={() => void onCandidate(row.id, 'postpone')}>
                Postpone
              </button>
              <button type="button" disabled={busy || !row.id} className="text-[var(--text-tertiary)] hover:text-[var(--danger-color)]" onClick={() => void onCandidate(row.id, 'cancel')}>
                Cancel
              </button>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function GuardPane() {
  const [catalog, setCatalog] = useState<GuardCatalog | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [flash, setFlash] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [name, setName] = useState('Two streams');
  const [type, setType] = useState<(typeof GUARD_RULE_TYPES)[number]>('concurrent_streams');
  const [enabled, setEnabled] = useState(true);
  const [paramsText, setParamsText] = useState('max_streams=2');
  const [mergeSource, setMergeSource] = useState('');
  const [mergeTarget, setMergeTarget] = useState('');

  async function reload() {
    const next = await api.getGuard();
    setCatalog(next);
  }

  useEffect(() => {
    let cancelled = false;
    void api
      .getGuard()
      .then((next) => {
        if (!cancelled) {
          setCatalog(next);
          setError(null);
        }
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Could not load playback guard');
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function onSaveRule(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setFlash(null);
    try {
      await api.upsertGuardRule({
        type,
        name,
        enabled,
        params: parseGuardParams(paramsText),
      });
      setFlash('Rule saved');
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save rule');
    } finally {
      setBusy(false);
    }
  }

  async function onDeleteRule(id: string) {
    setBusy(true);
    setError(null);
    setFlash(null);
    try {
      await api.deleteGuardRule(id);
      setFlash('Rule removed');
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not delete rule');
    } finally {
      setBusy(false);
    }
  }

  async function onAck(id: string) {
    setBusy(true);
    setError(null);
    setFlash(null);
    try {
      await api.ackGuardViolations([id]);
      setFlash('Violation acknowledged');
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not acknowledge violation');
    } finally {
      setBusy(false);
    }
  }

  async function onResetTrust(row: GuardCatalog['trust'][number]) {
    setBusy(true);
    setError(null);
    setFlash(null);
    try {
      await api.resetGuardTrust({ userId: row.userId, userName: row.userName });
      setFlash('Trust score reset');
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not reset trust');
    } finally {
      setBusy(false);
    }
  }

  async function onMergeUsers(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setFlash(null);
    try {
      const next = await api.mergeGuardUsers({
        sourceUserName: mergeSource,
        targetUserName: mergeTarget,
      });
      setFlash(`Merged identities · ${next.aliasesCreated} alias`);
      setMergeSource('');
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not merge users');
    } finally {
      setBusy(false);
    }
  }

  function editRule(rule: GuardRule) {
    setName(rule.name);
    if ((GUARD_RULE_TYPES as readonly string[]).includes(rule.type)) {
      setType(rule.type as (typeof GUARD_RULE_TYPES)[number]);
    }
    setEnabled(rule.enabled);
    setParamsText(guardParamsText(rule.params));
  }

  return (
    <div className={`${paneClass} max-w-2xl`} data-testid="settings-guard">
      <h2 className="font-semibold text-[var(--text-primary)]">Playback guard</h2>
      <p className="text-sm text-[var(--text-secondary)]">
        Limit concurrent streams, flag impossible travel, and review household violations. Needs the
        optional playback-guard module.
      </p>
      {error ? (
        <p className="text-sm text-[var(--danger-color)]" role="alert">
          {error}
        </p>
      ) : null}
      {flash ? (
        <p className="text-sm text-[var(--text-secondary)]" data-testid="guard-flash">
          {flash}
        </p>
      ) : null}
      {catalog && !catalog.available ? (
        <p className="text-sm text-[var(--text-secondary)]">
          Playback guard is not running. Enable the playback-guard compose profile or
          MVP_ENABLE_PLAYBACK_GUARD=1.
        </p>
      ) : null}
      <form className="space-y-3" onSubmit={(e) => void onSaveRule(e)} data-testid="guard-rule-form">
        <label className="block space-y-1 text-sm">
          <span className="text-[var(--text-secondary)]">Rule name</span>
          <input className={inputClass} value={name} aria-label="Guard rule name" onChange={(e) => setName(e.target.value)} />
        </label>
        <label className="block space-y-1 text-sm">
          <span className="text-[var(--text-secondary)]">Rule type</span>
          <select
            className={inputClass}
            value={type}
            aria-label="Guard rule type"
            onChange={(e) => setType(e.target.value as (typeof GUARD_RULE_TYPES)[number])}
          >
            {GUARD_RULE_TYPES.map((kind) => (
              <option key={kind} value={kind}>
                {guardRuleTypeLabel(kind)}
              </option>
            ))}
          </select>
        </label>
        <label className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
          <input type="checkbox" checked={enabled} aria-label="Guard rule enabled" onChange={(e) => setEnabled(e.target.checked)} />
          Enabled
        </label>
        <label className="block space-y-1 text-sm">
          <span className="text-[var(--text-secondary)]">Params (key=value)</span>
          <textarea
            className={inputClass}
            rows={3}
            value={paramsText}
            aria-label="Guard rule params"
            onChange={(e) => setParamsText(e.target.value)}
          />
        </label>
        <button type="submit" disabled={busy || !name.trim()} className={saveBtnClass}>
          {busy ? 'Working…' : 'Save rule'}
        </button>
      </form>
      {catalog?.rules.length ? (
        <ul className="space-y-2" data-testid="guard-rules">
          {catalog.rules.map((row) => (
            <li key={row.id || row.name} className="flex items-center justify-between gap-3 rounded-[var(--radius-md)] border border-[var(--border-subtle)] px-3 py-2">
              <p className="min-w-0 truncate text-sm text-[var(--text-primary)]">{guardRuleLabel(row)}</p>
              <div className="flex shrink-0 gap-2">
                <button type="button" className="text-xs font-semibold text-[var(--accent-color)]" onClick={() => editRule(row)}>
                  Edit
                </button>
                <button type="button" className="text-xs font-semibold text-[var(--danger-color)]" onClick={() => void onDeleteRule(row.id)}>
                  Remove
                </button>
              </div>
            </li>
          ))}
        </ul>
      ) : null}
      {catalog?.violations.length ? (
        <section className="space-y-2">
          <h3 className="text-sm font-semibold text-[var(--text-primary)]">Violations</h3>
          <ul className="space-y-2" data-testid="guard-violations">
            {catalog.violations.map((row) => (
              <li key={row.id} className="flex items-center justify-between gap-3 rounded-[var(--radius-md)] border border-[var(--border-subtle)] px-3 py-2">
                <p className="min-w-0 truncate text-sm text-[var(--text-primary)]">{row.summary || row.id}</p>
                <button type="button" className="shrink-0 text-xs font-semibold text-[var(--accent-color)]" onClick={() => void onAck(row.id)}>
                  Acknowledge
                </button>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
      {catalog?.trust.length ? (
        <section className="space-y-2">
          <h3 className="text-sm font-semibold text-[var(--text-primary)]">Trust scores</h3>
          <ul className="space-y-2" data-testid="guard-trust">
            {catalog.trust.map((row) => (
              <li key={row.userId || row.userName} className="flex items-center justify-between gap-3 rounded-[var(--radius-md)] border border-[var(--border-subtle)] px-3 py-2">
                <p className="min-w-0 truncate text-sm text-[var(--text-primary)]">
                  {row.userName || row.userId} · {Math.round(row.score)}
                </p>
                <button type="button" className="shrink-0 text-xs font-semibold text-[var(--accent-color)]" onClick={() => void onResetTrust(row)}>
                  Reset
                </button>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
      <form className="space-y-3 border-t border-[var(--border-subtle)] pt-4" onSubmit={(e) => void onMergeUsers(e)} data-testid="guard-merge-form">
        <h3 className="text-sm font-semibold text-[var(--text-primary)]">Merge identities</h3>
        <p className="text-sm text-[var(--text-secondary)]">
          Combine duplicate watchers so guard violations and trust scores follow one household name.
        </p>
        <label className="block space-y-1 text-sm">
          <span className="text-[var(--text-secondary)]">Source name</span>
          <input
            className={inputClass}
            value={mergeSource}
            aria-label="Guard merge source"
            onChange={(e) => setMergeSource(e.target.value)}
          />
        </label>
        <label className="block space-y-1 text-sm">
          <span className="text-[var(--text-secondary)]">Keep as</span>
          <input
            className={inputClass}
            value={mergeTarget}
            aria-label="Guard merge target"
            onChange={(e) => setMergeTarget(e.target.value)}
          />
        </label>
        <button type="submit" disabled={busy || !mergeSource.trim() || !mergeTarget.trim()} className={saveBtnClass}>
          {busy ? 'Working…' : 'Merge users'}
        </button>
      </form>
    </div>
  );
}

export default function Settings() {
  const { caps } = useCapabilities();
  const { pathname } = useLocation();
  useEffect(() => {
    applyTheme(getPreferences().display.theme);
  }, []);

  let pane = <ProfilePane />;
  if (pathname.endsWith('/display')) pane = <DisplayPane />;
  else if (pathname.endsWith('/home')) pane = <HomePane />;
  else if (pathname.endsWith('/playback')) pane = <PlaybackPane />;
  else if (pathname.endsWith('/parental')) pane = <ParentalPane />;
  else if (pathname.endsWith('/subtitles')) pane = <SubtitlesPane />;
  else if (pathname.endsWith('/controls')) pane = <ControlsPane />;
  else if (pathname.endsWith('/debrid') && featureEnabled(caps, 'debrid')) pane = <DebridPane />;
  else if (pathname.endsWith('/acquisition')) pane = <AcquisitionPane />;
  else if (pathname.endsWith('/quality') && featureEnabled(caps, 'formats')) pane = <QualityPane />;
  else if (pathname.endsWith('/maintainer') && canManageLibrary()) pane = <MaintainerPane />;
  else if (pathname.endsWith('/guard') && canManageLibrary()) pane = <GuardPane />;
  else if (pathname.endsWith('/delay') && featureEnabled(caps, 'activity')) pane = <DelayPane />;
  else if (pathname.endsWith('/notifications')) pane = <NotificationsPane />;
  else if (pathname.endsWith('/requests') && canApproveRequests() && featureEnabled(caps, 'request')) {
    pane = <RequestsPane />;
  }

  const showDebrid = featureEnabled(caps, 'debrid');
  const showRequests = canApproveRequests() && featureEnabled(caps, 'request');
  const showQuality = featureEnabled(caps, 'formats');
  const showLibraries = canManageLibrary();
  const showDelay = featureEnabled(caps, 'activity');

  return (
    <div className="space-y-6" data-testid="settings-page">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-[var(--text-primary)]">Settings</h1>
        <p className="text-sm text-[var(--text-secondary)]">
          Manage your profile, playback, and display preferences.
        </p>
      </div>
      <nav
        aria-label="Settings sections"
        className="flex flex-wrap gap-1 border-b border-[var(--border-subtle)] pb-3"
      >
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
        <NavLink to="/settings/parental" className={tabClass}>
          <Shield className="h-4 w-4" aria-hidden="true" />
          Parental
        </NavLink>
        <NavLink to="/settings/subtitles" className={tabClass}>
          <Subtitles className="h-4 w-4" aria-hidden="true" />
          Subtitles
        </NavLink>
        <NavLink to="/settings/controls" className={tabClass}>
          <Keyboard className="h-4 w-4" aria-hidden="true" />
          Controls
        </NavLink>
        <NavLink to="/settings/notifications" className={tabClass}>
          <Bell className="h-4 w-4" aria-hidden="true" />
          Notifications
        </NavLink>
        {showDebrid && (
          <NavLink to="/settings/debrid" className={tabClass}>
            <CloudDownload className="h-4 w-4" aria-hidden="true" />
            Debrid
          </NavLink>
        )}
        <NavLink to="/settings/acquisition" className={tabClass}>
          <PlugZap className="h-4 w-4" aria-hidden="true" />
          Acquisition
        </NavLink>
        {showQuality && (
          <NavLink to="/settings/quality" className={tabClass}>
            <Layers className="h-4 w-4" aria-hidden="true" />
            Quality
          </NavLink>
        )}
        {showLibraries && (
          <NavLink to="/settings/maintainer" className={tabClass}>
            <HardDrive className="h-4 w-4" aria-hidden="true" />
            Maintainer
          </NavLink>
        )}
        {showLibraries && (
          <NavLink to="/settings/guard" className={tabClass}>
            <Shield className="h-4 w-4" aria-hidden="true" />
            Guard
          </NavLink>
        )}
        {showDelay && (
          <NavLink to="/settings/delay" className={tabClass}>
            <Timer className="h-4 w-4" aria-hidden="true" />
            Delay
          </NavLink>
        )}
        {showRequests && (
          <NavLink to="/settings/requests" className={tabClass}>
            <Ticket className="h-4 w-4" aria-hidden="true" />
            Requests
          </NavLink>
        )}
      </nav>
      {pane}
    </div>
  );
}
