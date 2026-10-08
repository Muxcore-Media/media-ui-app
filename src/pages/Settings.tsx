import { type FormEvent, useEffect, useMemo, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import {
  Archive,
  HardDrive,
  KeyRound,
  CloudDownload,
  Folder,
  Gauge,
  Home as HomeIcon,
  Import,
  Keyboard,
  Layers,
  List,
  LogOut,
  Mail,
  Bell,
  Tags,
  Monitor,
  Pencil,
  PlugZap,
  Shield,
  Subtitles,
  Ticket,
  Timer,
  User,
  Users,
} from 'lucide-react';
import { api, signOut } from '../api/client';
import { canManageAcquisition, canManageBackups, canManageIndexers, canManageInvites, canManageKeys, canManageLibrary, canManageLists, canManageMigrate, canManageNaming, canManageNotifications, canManageQuality, canManageRequestPolicy, canManageSubtitles, canManageTags, canManageUsers, getCurrentUserId } from '../lib/session';
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
import { inviteUsesLabel, type HouseholdInvite } from '../lib/invites';
import { primaryRole, type HouseholdUser } from '../lib/users';
import { type HouseholdTOTP } from '../lib/totp';
import {
  createBrowserPasskey,
  passkeyLabel,
  passkeySupported,
  type HouseholdPasskey,
  type PasskeysResponse,
} from '../lib/passkeys';
import { type PasswordResetRequest } from '../lib/password-resets';
import {
  GUARD_RULE_TYPES,
  guardParamsText,
  guardRuleLabel,
  guardRuleTypeLabel,
  parseGuardParams,
  type GuardCatalog,
  type GuardRule,
} from '../lib/guard';
import { ROOT_MEDIA_KINDS, rootLabel, rootProbeLabel, type LibraryRoot, type RootBrowseEntry, type RootProbe } from '../lib/roots';
import { libraryScanStatusLabel, watchDirLabel, type LibraryScanStatus, type WatchDir } from '../lib/library-scan';
import { namingTemplateLabel, type NamingTemplate } from '../lib/naming-templates';
import { organizeFolderOptions, type OrganizeResult } from '../lib/organize';
import { SUBTITLE_TEXT_COLORS } from '../lib/subtitle-offset';
import {
  LIST_SOURCE_TYPES,
  listSourceLabel,
  listSyncItemLabel,
  listSyncLogLabel,
  type ListSource,
  type ListSyncItem,
  type ListSyncLog,
} from '../lib/list-sources';
import { MIGRATE_SERVICES, type MigrateResult } from '../lib/arr-migrate';
import { historyImportLabel, tautulliImportLabel, type HistoryImportResult, type TautulliImportResult } from '../lib/watch-stats';
import {
  jellyfinStatusLabel,
  jellyfinSyncLabel,
  type JellyfinRefreshResult,
  type JellyfinStatus,
  type JellyfinSyncResult,
} from '../lib/jellyfin-sync';
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
import { TAG_MEDIA, tagLabel, type LibraryTag } from '../lib/tags';
import {
  AUTO_TAG_FIELDS,
  AUTO_TAG_MATCHES,
  autoTagClassifyLabel,
  autoTagRuleLabel,
  type AutoTag,
  type AutoTagCatalog,
} from '../lib/auto-tags';
import { backupSizeLabel, type HouseholdBackup } from '../lib/backups';
import { apiKeyLabel, type HouseholdAPIKey } from '../lib/keys';
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
      <p className="text-sm text-[var(--text-secondary)]" data-testid="parental-server-note">
        These settings only change what this device shows and prompts for. They do not restrict
        playback or browsing. The server applies the parental controls an administrator sets for
        your account, and a PIN cannot override them.
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
  const canEdit = canManageIndexers();

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

function LibrariesPane() {
  const [roots, setRoots] = useState<LibraryRoot[]>([]);
  const [available, setAvailable] = useState<boolean | null>(null);
  const [browseAvailable, setBrowseAvailable] = useState<boolean | null>(null);
  const [scan, setScan] = useState<LibraryScanStatus | null>(null);
  const [scanFlash, setScanFlash] = useState<string | null>(null);
  const [watchDirs, setWatchDirs] = useState<WatchDir[]>([]);
  const [watchAvailable, setWatchAvailable] = useState<boolean | null>(null);
  const [watchKind, setWatchKind] = useState('both');
  const [watchLibrary, setWatchLibrary] = useState('');
  const [path, setPath] = useState('/');
  const [parent, setParent] = useState('');
  const [entries, setEntries] = useState<RootBrowseEntry[]>([]);
  const [name, setName] = useState('');
  const [kind, setKind] = useState('movies');
  const [isDefault, setIsDefault] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [probe, setProbe] = useState<RootProbe | null>(null);
  const [drafts, setDrafts] = useState<Record<string, LibraryRoot>>({});

  function applyRoots(next: LibraryRoot[]) {
    setRoots(next);
    setDrafts(Object.fromEntries(next.filter((row) => row.id).map((row) => [row.id, row])));
  }

  async function reloadRoots() {
    const catalog = await api.listRoots();
    setAvailable(catalog.available);
    applyRoots(catalog.roots);
  }

  async function openPath(next: string) {
    const listing = await api.browseRoots(next);
    setBrowseAvailable(listing.available);
    setPath(listing.path || next || '/');
    setParent(listing.parent);
    setEntries(listing.entries);
  }

  useEffect(() => {
    let cancelled = false;
    void Promise.all([
      api.listRoots(),
      api.browseRoots('/'),
      api.getLibraryScan().catch(() => null),
      api.listWatchDirs().catch(() => null),
    ])
      .then(([catalog, listing, scanStatus, watches]) => {
        if (cancelled) return;
        setAvailable(catalog.available);
        applyRoots(catalog.roots);
        setBrowseAvailable(listing.available);
        setPath(listing.path || '/');
        setParent(listing.parent);
        setEntries(listing.entries);
        setScan(scanStatus);
        if (watches) {
          setWatchAvailable(watches.available);
          setWatchDirs(watches.dirs);
        }
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Could not load library roots');
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function onCreate(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await api.createRoot({ path, name, mediaKind: kind, isDefault });
      setName('');
      await reloadRoots();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not add root');
    } finally {
      setBusy(false);
    }
  }

  async function onProbe() {
    setBusy(true);
    setError(null);
    try {
      setProbe(await api.probeRoot(path));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not test folder');
    } finally {
      setBusy(false);
    }
  }

  async function onSave(id: string) {
    const draft = drafts[id];
    if (!draft) return;
    setBusy(true);
    setError(null);
    try {
      await api.updateRoot(id, { name: draft.name, mediaKind: draft.mediaKind, isDefault: draft.isDefault });
      await reloadRoots();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save root');
    } finally {
      setBusy(false);
    }
  }

  async function onRemove(id: string) {
    setBusy(true);
    setError(null);
    try {
      await api.deleteRoot(id);
      await reloadRoots();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not remove root');
    } finally {
      setBusy(false);
    }
  }

  async function reloadWatchDirs() {
    const next = await api.listWatchDirs();
    setWatchAvailable(next.available);
    setWatchDirs(next.dirs);
  }

  async function onAddWatch() {
    setBusy(true);
    setError(null);
    try {
      await api.createWatchDir({ path, mediaType: watchKind, libraryPath: watchLibrary });
      await reloadWatchDirs();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not add watch folder');
    } finally {
      setBusy(false);
    }
  }

  async function onRemoveWatch(id: string) {
    setBusy(true);
    setError(null);
    try {
      await api.deleteWatchDir(id);
      await reloadWatchDirs();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not remove watch folder');
    } finally {
      setBusy(false);
    }
  }

  async function onToggleWatch(dir: WatchDir) {
    if (!dir.id) return;
    setBusy(true);
    setError(null);
    try {
      await api.updateWatchDir(dir.id, { enabled: !dir.enabled });
      await reloadWatchDirs();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not update watch folder');
    } finally {
      setBusy(false);
    }
  }

  async function onScan(type: 'watch' | 'library_roots') {
    setBusy(true);
    setError(null);
    setScanFlash(null);
    try {
      const next = await api.runLibraryScan({ type });
      setScanFlash(next.message);
      setScan(await api.getLibraryScan().catch(() => scan));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Library scan failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={`${paneClass} max-w-2xl`} data-testid="settings-libraries">
      <h2 className="font-semibold text-[var(--text-primary)]">Libraries</h2>
      <p className="text-sm text-[var(--text-secondary)]">
        Add movie and TV root folders the way Radarr and Sonarr do. Browse a path, then add it.
        Scan watch folders, movie/TV roots, and music, books, comics, or audiobook libraries after you copy files in.
      </p>
      {scan ? (
        <div className="space-y-2" data-testid="library-scan">
          <p className="text-sm text-[var(--text-secondary)]" data-testid="library-scan-status">
            {libraryScanStatusLabel(scan)}
          </p>
          {scan.lastError ? (
            <p className="text-sm text-[var(--danger-color)]">{scan.lastError}</p>
          ) : null}
          {scanFlash ? (
            <p className="text-sm text-[var(--text-primary)]" data-testid="library-scan-flash">
              {scanFlash}
            </p>
          ) : null}
          {scan.available ? (
            <div className="flex flex-wrap gap-2">
              {scan.scanner ? (
                <button
                  type="button"
                  disabled={busy}
                  className={saveBtnClass}
                  onClick={() => void onScan('watch')}
                >
                  {busy ? 'Scanning…' : 'Scan watch folders'}
                </button>
              ) : null}
              <button
                type="button"
                disabled={busy}
                className="rounded-[var(--radius-md)] border border-[var(--border-subtle)] px-4 py-2 text-sm font-semibold text-[var(--text-primary)]"
                onClick={() => void onScan('library_roots')}
              >
                Scan library roots
              </button>
            </div>
          ) : (
            <p className="text-sm text-[var(--text-tertiary)]">
              Start media-scanner or a music, books, comics, or audiobooks module to scan from here.
            </p>
          )}
        </div>
      ) : null}
      {watchAvailable !== null ? (
        <div className="space-y-2" data-testid="watch-dirs">
          <h3 className="text-sm font-semibold text-[var(--text-primary)]">Watch folders</h3>
          <p className="text-sm text-[var(--text-secondary)]">
            Download folders the scanner watches, like Radarr completed-download handling.
          </p>
          {watchAvailable === false ? (
            <p className="text-sm text-[var(--text-tertiary)]">Watch folders need media-scanner.</p>
          ) : (
            <>
              <ul className="space-y-2" data-testid="watch-dir-list">
                {watchDirs.map((dir) => (
                  <li key={dir.id || dir.path} className="flex items-center justify-between gap-3 text-sm">
                    <span className="min-w-0 truncate text-[var(--text-secondary)]">{watchDirLabel(dir)}</span>
                    <span className="flex shrink-0 items-center gap-3">
                      <button
                        type="button"
                        disabled={busy || !dir.id}
                        className="text-[var(--text-tertiary)] hover:text-[var(--text-primary)]"
                        onClick={() => void onToggleWatch(dir)}
                      >
                        {dir.enabled ? 'Pause watch' : 'Resume watch'}
                      </button>
                      <button
                        type="button"
                        disabled={busy || !dir.id}
                        className="text-[var(--text-tertiary)] hover:text-[var(--danger-color)]"
                        onClick={() => void onRemoveWatch(dir.id)}
                      >
                        Remove watch
                      </button>
                    </span>
                  </li>
                ))}
              </ul>
              <div className="grid gap-2 sm:grid-cols-2">
                <label className="block space-y-1 text-sm">
                  <span className="text-[var(--text-secondary)]">Watch kind</span>
                  <select
                    className={inputClass}
                    value={watchKind}
                    aria-label="Watch folder kind"
                    onChange={(e) => setWatchKind(e.target.value)}
                  >
                    <option value="both">movies + tv</option>
                    <option value="movie">movies</option>
                    <option value="tv">tv</option>
                    <option value="music">music</option>
                  </select>
                </label>
                {roots.length > 0 ? (
                  <label className="block space-y-1 text-sm">
                    <span className="text-[var(--text-secondary)]">Import into</span>
                    <select
                      className={inputClass}
                      value={watchLibrary}
                      aria-label="Watch folder library root"
                      onChange={(e) => setWatchLibrary(e.target.value)}
                    >
                      <option value="">Default library</option>
                      {roots.map((root) => (
                        <option key={root.id || root.path} value={root.path}>
                          {rootLabel(root)}
                        </option>
                      ))}
                    </select>
                  </label>
                ) : null}
              </div>
              <button type="button" disabled={busy || !path.trim()} className={saveBtnClass} onClick={() => void onAddWatch()}>
                Add current folder as watch
              </button>
            </>
          )}
        </div>
      ) : null}
      {error ? (
        <p className="text-sm text-[var(--danger-color)]" role="alert">
          {error}
        </p>
      ) : null}
      {available === false ? (
        <p className="text-sm text-[var(--text-tertiary)]">Root folders module is not available.</p>
      ) : null}
      <ul className="space-y-3" data-testid="library-root-list">
        {roots.map((root) => {
          const draft = drafts[root.id] ?? root;
          return (
            <li key={root.id || root.path} className="space-y-2 rounded-[var(--radius-md)] border border-[var(--border-subtle)] p-3">
              <p className="truncate font-mono text-xs text-[var(--text-tertiary)]">{root.path}</p>
              {root.id ? (
                <div className="grid gap-2 sm:grid-cols-2">
                  <label className="block space-y-1 text-sm">
                    <span className="text-[var(--text-secondary)]">Name</span>
                    <input
                      className={inputClass}
                      value={draft.name}
                      aria-label={`Name for ${root.path}`}
                      onChange={(e) =>
                        setDrafts((cur) => ({ ...cur, [root.id]: { ...draft, name: e.target.value } }))
                      }
                    />
                  </label>
                  <label className="block space-y-1 text-sm">
                    <span className="text-[var(--text-secondary)]">Kind</span>
                    <select
                      className={inputClass}
                      value={draft.mediaKind || 'any'}
                      aria-label={`Kind for ${root.path}`}
                      onChange={(e) =>
                        setDrafts((cur) => ({ ...cur, [root.id]: { ...draft, mediaKind: e.target.value } }))
                      }
                    >
                      {ROOT_MEDIA_KINDS.map((k) => (
                        <option key={k} value={k}>
                          {k}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
              ) : (
                <span className="min-w-0 truncate text-sm text-[var(--text-secondary)]">{rootLabel(root)}</span>
              )}
              <div className="flex flex-wrap items-center justify-between gap-2">
                {root.id ? (
                  <label className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
                    <input
                      type="checkbox"
                      checked={draft.isDefault}
                      aria-label={`Default root for ${root.path}`}
                      onChange={(e) =>
                        setDrafts((cur) => ({ ...cur, [root.id]: { ...draft, isDefault: e.target.checked } }))
                      }
                    />
                    Default for this kind
                  </label>
                ) : null}
                <span className="flex shrink-0 items-center gap-3">
                  {root.id ? (
                    <button
                      type="button"
                      disabled={busy}
                      className="text-[var(--accent-color)]"
                      onClick={() => void onSave(root.id)}
                    >
                      Save
                    </button>
                  ) : null}
                  <button
                    type="button"
                    disabled={busy || !root.id}
                    className="text-[var(--text-tertiary)] hover:text-[var(--danger-color)]"
                    onClick={() => void onRemove(root.id)}
                  >
                    Remove
                  </button>
                </span>
              </div>
            </li>
          );
        })}
      </ul>
      {browseAvailable === false ? (
        <p className="text-sm text-[var(--text-tertiary)]">
          Folder browse is limited to allowed prefixes on this host.
        </p>
      ) : (
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <p className="min-w-0 flex-1 truncate font-mono text-[var(--text-primary)]" data-testid="library-browse-path">
              {path}
            </p>
            {parent ? (
              <button
                type="button"
                className="text-[var(--accent-color)]"
                onClick={() => void openPath(parent).catch((err) => setError(err instanceof Error ? err.message : 'Browse failed'))}
              >
                Up
              </button>
            ) : null}
          </div>
          <ul className="max-h-48 space-y-1 overflow-auto rounded-[var(--radius-sm)] border border-[var(--border-subtle)] p-2" data-testid="library-browse-entries">
            {entries.map((entry) => (
              <li key={entry.path}>
                <button
                  type="button"
                  className="w-full truncate text-left text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                  onClick={() => void openPath(entry.path).catch((err) => setError(err instanceof Error ? err.message : 'Browse failed'))}
                >
                  {entry.name}/
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
      <form className="space-y-3" onSubmit={(e) => void onCreate(e)}>
        <label className="block space-y-1 text-sm">
          <span className="text-[var(--text-secondary)]">Name</span>
          <input className={inputClass} value={name} aria-label="Root folder name" onChange={(e) => setName(e.target.value)} />
        </label>
        <label className="block space-y-1 text-sm">
          <span className="text-[var(--text-secondary)]">Kind</span>
          <select className={inputClass} value={kind} aria-label="Root folder kind" onChange={(e) => setKind(e.target.value)}>
            <option value="movies">movies</option>
            <option value="tv">tv</option>
            <option value="music">music</option>
            <option value="books">books</option>
            <option value="audiobooks">audiobooks</option>
            <option value="comics">comics</option>
            <option value="any">any</option>
          </select>
        </label>
        <label className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
          <input
            type="checkbox"
            checked={isDefault}
            aria-label="Default root folder"
            onChange={(e) => setIsDefault(e.target.checked)}
          />
          Default for this kind
        </label>
        <div className="flex flex-wrap gap-2">
          <button type="submit" disabled={busy || !path} className={saveBtnClass}>
            {busy ? 'Adding…' : 'Add this folder'}
          </button>
          <button
            type="button"
            disabled={busy || !path.trim()}
            className="rounded-[var(--radius-md)] border border-[var(--border-subtle)] px-4 py-2 text-sm font-semibold text-[var(--text-primary)]"
            data-testid="library-probe"
            onClick={() => void onProbe()}
          >
            Test folder
          </button>
        </div>
        {probe ? (
          <p
            className={`text-sm ${probe.available && probe.accessible ? 'text-[var(--text-secondary)]' : 'text-[var(--danger-color)]'}`}
            data-testid="library-probe-result"
          >
            {rootProbeLabel(probe)}
          </p>
        ) : null}
      </form>
    </div>
  );
}

function NamingPane() {
  const [templates, setTemplates] = useState<NamingTemplate[]>([]);
  const [available, setAvailable] = useState<boolean | null>(null);
  const [name, setName] = useState('');
  const [kind, setKind] = useState('movie');
  const [pattern, setPattern] = useState('{Title} ({Year})/{Title} ({Year}) [{Quality}]');
  const [isDefault, setIsDefault] = useState(false);
  const [drafts, setDrafts] = useState<Record<string, NamingTemplate>>({});
  const [folders, setFolders] = useState<string[]>([]);
  const [organizeDir, setOrganizeDir] = useState('');
  const [organizeKind, setOrganizeKind] = useState('movie');
  const [organizePreview, setOrganizePreview] = useState<OrganizeResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function reload() {
    const next = await api.listNamingTemplates();
    setAvailable(next.available);
    setTemplates(next.templates);
    setDrafts(Object.fromEntries(next.templates.map((tpl) => [tpl.id, tpl])));
  }

  useEffect(() => {
    let cancelled = false;
    void Promise.all([
      api.listNamingTemplates(),
      api.listRoots().catch(() => null),
      api.listWatchDirs().catch(() => null),
    ])
      .then(([next, catalog, watches]) => {
        if (cancelled) return;
        setAvailable(next.available);
        setTemplates(next.templates);
        setDrafts(Object.fromEntries(next.templates.map((tpl) => [tpl.id, tpl])));
        const nextFolders = organizeFolderOptions([
          ...(catalog?.roots ?? []).map((root) => root.path),
          ...(watches?.dirs ?? []).flatMap((dir) => [dir.path, dir.libraryPath]),
        ]);
        setFolders(nextFolders);
        setOrganizeDir((cur) => cur || nextFolders[0] || '');
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Could not load naming templates');
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function onCreate(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await api.createNamingTemplate({ name, mediaType: kind, pattern, isDefault });
      setName('');
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create template');
    } finally {
      setBusy(false);
    }
  }

  async function onSave(id: string) {
    const draft = drafts[id];
    if (!draft) return;
    setBusy(true);
    setError(null);
    try {
      await api.updateNamingTemplate(id, {
        name: draft.name,
        pattern: draft.pattern,
        isDefault: draft.isDefault,
      });
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save template');
    } finally {
      setBusy(false);
    }
  }

  async function onRemove(id: string) {
    setBusy(true);
    setError(null);
    try {
      await api.deleteNamingTemplate(id);
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not delete template');
    } finally {
      setBusy(false);
    }
  }

  async function onOrganize(dryRun: boolean) {
    if (!organizeDir) return;
    setBusy(true);
    setError(null);
    try {
      const next = await api.organizeLibrary({
        directory: organizeDir,
        mediaType: organizeKind,
        dryRun,
      });
      setOrganizePreview(next);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not organize library');
    } finally {
      setBusy(false);
    }
  }

  const canApplyOrganize =
    Boolean(organizeDir) &&
    organizePreview?.directory === organizeDir &&
    organizePreview.dryRun &&
    organizePreview.available;

  return (
    <div className={`${paneClass} max-w-2xl`} data-testid="settings-naming">
      <h2 className="font-semibold text-[var(--text-primary)]">Naming</h2>
      <p className="text-sm text-[var(--text-secondary)]">
        File and folder patterns for Preview Rename. Tokens include {'{Title}'}, {'{Year}'}, {'{Quality}'},{' '}
        {'{season:00}'}, {'{episode:00}'}, and {'{EpisodeTitle}'}.
      </p>
      {error ? (
        <p className="text-sm text-[var(--danger-color)]" role="alert">
          {error}
        </p>
      ) : null}
      {available === false ? (
        <p className="text-sm text-[var(--text-tertiary)]">Rename module is not available.</p>
      ) : null}
      <ul className="space-y-4" data-testid="naming-template-list">
        {templates.map((tpl) => {
          const draft = drafts[tpl.id] || tpl;
          return (
            <li key={tpl.id} className="space-y-2 rounded-[var(--radius-sm)] border border-[var(--border-subtle)] p-3">
              <p className="text-xs text-[var(--text-tertiary)]">{namingTemplateLabel(tpl)}</p>
              <label className="block space-y-1 text-sm">
                <span className="text-[var(--text-secondary)]">Name</span>
                <input
                  className={inputClass}
                  value={draft.name}
                  aria-label={`Name for ${tpl.name}`}
                  onChange={(e) => setDrafts((cur) => ({ ...cur, [tpl.id]: { ...draft, name: e.target.value } }))}
                />
              </label>
              <label className="block space-y-1 text-sm">
                <span className="text-[var(--text-secondary)]">Pattern</span>
                <textarea
                  className={`${inputClass} font-mono`}
                  rows={2}
                  value={draft.pattern}
                  aria-label={`Pattern for ${tpl.name}`}
                  onChange={(e) => setDrafts((cur) => ({ ...cur, [tpl.id]: { ...draft, pattern: e.target.value } }))}
                />
              </label>
              <label className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
                <input
                  type="checkbox"
                  checked={draft.isDefault}
                  aria-label={`Default for ${tpl.name}`}
                  onChange={(e) => setDrafts((cur) => ({ ...cur, [tpl.id]: { ...draft, isDefault: e.target.checked } }))}
                />
                Default for {tpl.mediaType || 'movie'}
              </label>
              <div className="flex flex-wrap gap-2">
                <button type="button" disabled={busy} className={saveBtnClass} onClick={() => void onSave(tpl.id)}>
                  Save
                </button>
                <button
                  type="button"
                  disabled={busy}
                  className="text-sm text-[var(--text-tertiary)] hover:text-[var(--danger-color)]"
                  onClick={() => void onRemove(tpl.id)}
                >
                  Delete
                </button>
              </div>
            </li>
          );
        })}
      </ul>
      <form className="space-y-3" onSubmit={(e) => void onCreate(e)}>
        <h3 className="text-sm font-semibold text-[var(--text-primary)]">New template</h3>
        <label className="block space-y-1 text-sm">
          <span className="text-[var(--text-secondary)]">Name</span>
          <input className={inputClass} value={name} aria-label="New template name" onChange={(e) => setName(e.target.value)} />
        </label>
        <label className="block space-y-1 text-sm">
          <span className="text-[var(--text-secondary)]">Media type</span>
          <select className={inputClass} value={kind} aria-label="New template media type" onChange={(e) => setKind(e.target.value)}>
            <option value="movie">movie</option>
            <option value="tv">tv</option>
          </select>
        </label>
        <label className="block space-y-1 text-sm">
          <span className="text-[var(--text-secondary)]">Pattern</span>
          <textarea
            className={`${inputClass} font-mono`}
            rows={2}
            value={pattern}
            aria-label="New template pattern"
            onChange={(e) => setPattern(e.target.value)}
          />
        </label>
        <label className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
          <input
            type="checkbox"
            checked={isDefault}
            aria-label="Default new template"
            onChange={(e) => setIsDefault(e.target.checked)}
          />
          Default for this media type
        </label>
        <button type="submit" disabled={busy || !name.trim() || !pattern.trim()} className={saveBtnClass}>
          {busy ? 'Saving…' : 'Create template'}
        </button>
      </form>
      <section className="space-y-3 border-t border-[var(--border-subtle)] pt-4" data-testid="settings-organize">
        <h3 className="text-sm font-semibold text-[var(--text-primary)]">Organize library</h3>
        <p className="text-sm text-[var(--text-secondary)]">
          Preview then apply file names for one configured root or watch folder. Paths outside those folders are rejected.
        </p>
        {folders.length === 0 ? (
          <p className="text-sm text-[var(--text-tertiary)]">Add a library root or watch folder first.</p>
        ) : (
          <>
            <label className="block space-y-1 text-sm">
              <span className="text-[var(--text-secondary)]">Folder</span>
              <select
                className={inputClass}
                value={organizeDir}
                aria-label="Organize folder"
                onChange={(e) => {
                  setOrganizeDir(e.target.value);
                  setOrganizePreview(null);
                }}
              >
                {folders.map((path) => (
                  <option key={path} value={path}>
                    {path}
                  </option>
                ))}
              </select>
            </label>
            <label className="block space-y-1 text-sm">
              <span className="text-[var(--text-secondary)]">Media type</span>
              <select
                className={inputClass}
                value={organizeKind}
                aria-label="Organize media type"
                onChange={(e) => setOrganizeKind(e.target.value)}
              >
                <option value="movie">movie</option>
                <option value="tv">tv</option>
              </select>
            </label>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                disabled={busy || !organizeDir}
                className={saveBtnClass}
                onClick={() => void onOrganize(true)}
              >
                Preview organize
              </button>
              <button
                type="button"
                disabled={busy || !canApplyOrganize}
                className={saveBtnClass}
                onClick={() => void onOrganize(false)}
              >
                Apply organize
              </button>
            </div>
          </>
        )}
        {organizePreview ? (
          <p className="text-sm text-[var(--text-secondary)]" data-testid="organize-summary">
            {organizePreview.dryRun ? 'Preview' : 'Applied'}: {organizePreview.renamed} of {organizePreview.total} file
            {organizePreview.total === 1 ? '' : 's'}
            {organizePreview.errors ? ` · ${organizePreview.errors} error${organizePreview.errors === 1 ? '' : 's'}` : ''}
          </p>
        ) : null}
      </section>
    </div>
  );
}

function ListsPane() {
  const [sources, setSources] = useState<ListSource[]>([]);
  const [available, setAvailable] = useState<boolean | null>(null);
  const [profiles, setProfiles] = useState<QualityProfile[]>([]);
  const [roots, setRoots] = useState<LibraryRoot[]>([]);
  const [name, setName] = useState('');
  const [kind, setKind] = useState('trakt');
  const [listUrl, setListUrl] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [qualityProfileId, setQualityProfileId] = useState('');
  const [rootFolderPath, setRootFolderPath] = useState('');
  const [history, setHistory] = useState<ListSyncLog[]>([]);
  const [items, setItems] = useState<ListSyncItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [flash, setFlash] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function reload() {
    const [next, logs, imported] = await Promise.all([
      api.listListSources(),
      api.listListHistory().catch(() => null),
      api.listListItems().catch(() => null),
    ]);
    setAvailable(next.available);
    setSources(next.sources);
    if (logs) setHistory(logs.entries);
    if (imported) setItems(imported.items);
  }

  useEffect(() => {
    let cancelled = false;
    void Promise.all([
      api.listListSources(),
      api.getFormats().catch(() => null),
      api.listRoots().catch(() => null),
      api.listListHistory().catch(() => null),
      api.listListItems().catch(() => null),
    ])
      .then(([lists, catalog, catalogRoots, logs, imported]) => {
        if (cancelled) return;
        setAvailable(lists.available);
        setSources(lists.sources);
        setProfiles(catalog?.profiles ?? []);
        setRoots(catalogRoots?.roots ?? []);
        setHistory(logs?.entries ?? []);
        setItems(imported?.items ?? []);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Could not load import lists');
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function onCreate(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setFlash(null);
    try {
      await api.createListSource({
        name,
        type: kind,
        listUrl,
        apiKey,
        qualityProfileId,
        rootFolderPath,
      });
      setName('');
      setListUrl('');
      setApiKey('');
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not add list');
    } finally {
      setBusy(false);
    }
  }

  async function onRemove(id: string) {
    setBusy(true);
    setError(null);
    try {
      await api.deleteListSource(id);
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not remove list');
    } finally {
      setBusy(false);
    }
  }

  async function onToggle(src: ListSource) {
    if (!src.id) return;
    setBusy(true);
    setError(null);
    try {
      await api.updateListSource(src.id, { enabled: !src.enabled });
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not update list');
    } finally {
      setBusy(false);
    }
  }

  async function onSync() {
    setBusy(true);
    setError(null);
    try {
      const next = await api.syncListSources();
      setFlash(`Synced ${next.itemsFound} titles (${next.itemsNew} new).`);
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sync failed');
    } finally {
      setBusy(false);
    }
  }

  async function onSyncOne(id: string) {
    if (!id) return;
    setBusy(true);
    setError(null);
    try {
      const next = await api.syncListSource(id);
      setFlash(`Synced ${next.itemsFound} titles (${next.itemsNew} new).`);
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sync failed');
    } finally {
      setBusy(false);
    }
  }

  async function onTestOne(id: string) {
    if (!id) return;
    setBusy(true);
    setError(null);
    try {
      const next = await api.testListSource(id);
      if (next.ok) {
        setFlash(next.message || `Found ${next.itemsFound} titles.`);
      } else {
        setError(next.message || 'List test failed');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'List test failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={`${paneClass} max-w-2xl`} data-testid="settings-lists">
      <h2 className="font-semibold text-[var(--text-primary)]">Lists</h2>
      <p className="text-sm text-[var(--text-secondary)]">
        Import Trakt, IMDb, Plex, or Arr lists the way Seerr and Radarr do. Synced titles land on
        Watchlist.
      </p>
      {error ? (
        <p className="text-sm text-[var(--danger-color)]" role="alert">
          {error}
        </p>
      ) : null}
      {flash ? (
        <p className="text-sm text-[var(--text-secondary)]" data-testid="lists-sync-result">
          {flash}
        </p>
      ) : null}
      {available === false ? (
        <p className="text-sm text-[var(--text-tertiary)]">List sync module is not available.</p>
      ) : null}
      <button type="button" disabled={busy} className={saveBtnClass} onClick={() => void onSync()}>
        {busy ? 'Syncing…' : 'Sync lists now'}
      </button>
      <ul className="space-y-2" data-testid="list-source-list">
        {sources.map((src) => (
          <li key={src.id} className="flex items-center justify-between gap-3 text-sm">
            <span className="min-w-0 truncate text-[var(--text-secondary)]">
              {listSourceLabel(src)}
              {src.listUrl ? ` · ${src.listUrl}` : ''}
            </span>
            <span className="flex shrink-0 items-center gap-3">
              <button
                type="button"
                disabled={busy || !src.id}
                data-testid={`list-source-test-${src.id}`}
                className="text-[var(--text-tertiary)] hover:text-[var(--text-primary)]"
                onClick={() => void onTestOne(src.id)}
              >
                Test
              </button>
              <button
                type="button"
                disabled={busy || !src.id}
                data-testid={`list-source-sync-${src.id}`}
                className="text-[var(--text-tertiary)] hover:text-[var(--text-primary)]"
                onClick={() => void onSyncOne(src.id)}
              >
                Sync
              </button>
              <button
                type="button"
                disabled={busy || !src.id}
                className="text-[var(--text-tertiary)] hover:text-[var(--text-primary)]"
                onClick={() => void onToggle(src)}
              >
                {src.enabled ? 'Pause list' : 'Resume list'}
              </button>
              <button
                type="button"
                disabled={busy || !src.id}
                className="text-[var(--text-tertiary)] hover:text-[var(--danger-color)]"
                onClick={() => void onRemove(src.id)}
              >
                Remove
              </button>
            </span>
          </li>
        ))}
      </ul>
      <form className="space-y-3" onSubmit={(e) => void onCreate(e)}>
        <h3 className="text-sm font-semibold text-[var(--text-primary)]">New list</h3>
        <label className="block space-y-1 text-sm">
          <span className="text-[var(--text-secondary)]">Name</span>
          <input className={inputClass} value={name} aria-label="New list name" onChange={(e) => setName(e.target.value)} />
        </label>
        <label className="block space-y-1 text-sm">
          <span className="text-[var(--text-secondary)]">Type</span>
          <select className={inputClass} value={kind} aria-label="New list type" onChange={(e) => setKind(e.target.value)}>
            {LIST_SOURCE_TYPES.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
        </label>
        <label className="block space-y-1 text-sm">
          <span className="text-[var(--text-secondary)]">List URL</span>
          <input
            className={inputClass}
            value={listUrl}
            aria-label="New list URL"
            placeholder="https://trakt.tv/users/you/watchlist"
            onChange={(e) => setListUrl(e.target.value)}
          />
        </label>
        <label className="block space-y-1 text-sm">
          <span className="text-[var(--text-secondary)]">API token</span>
          <input
            className={inputClass}
            type="password"
            value={apiKey}
            aria-label="New list API token"
            autoComplete="off"
            onChange={(e) => setApiKey(e.target.value)}
          />
        </label>
        {profiles.length > 0 ? (
          <label className="block space-y-1 text-sm">
            <span className="text-[var(--text-secondary)]">Quality profile</span>
            <select
              className={inputClass}
              value={qualityProfileId}
              aria-label="New list quality profile"
              onChange={(e) => setQualityProfileId(e.target.value)}
            >
              <option value="">—</option>
              {profiles.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </label>
        ) : null}
        {roots.length > 0 ? (
          <label className="block space-y-1 text-sm">
            <span className="text-[var(--text-secondary)]">Root folder</span>
            <select
              className={inputClass}
              value={rootFolderPath}
              aria-label="New list root folder"
              onChange={(e) => setRootFolderPath(e.target.value)}
            >
              <option value="">—</option>
              {roots.map((root) => (
                <option key={root.id || root.path} value={root.path}>
                  {rootLabel(root)}
                </option>
              ))}
            </select>
          </label>
        ) : null}
        <button type="submit" disabled={busy || !name.trim()} className={saveBtnClass}>
          {busy ? 'Saving…' : 'Add list'}
        </button>
      </form>
      <section className="space-y-2 border-t border-[var(--border-subtle)] pt-4" data-testid="lists-history">
        <h3 className="text-sm font-semibold text-[var(--text-primary)]">Sync history</h3>
        {history.length === 0 ? (
          <p className="text-sm text-[var(--text-tertiary)]">No list syncs yet.</p>
        ) : (
          <ul className="space-y-1" data-testid="lists-history-list">
            {history.map((entry) => (
              <li key={entry.id || entry.startedAt} className="text-sm text-[var(--text-secondary)]">
                {listSyncLogLabel(entry)}
                {entry.error ? ` · ${entry.error}` : ''}
              </li>
            ))}
          </ul>
        )}
      </section>
      <section className="space-y-2" data-testid="lists-items">
        <h3 className="text-sm font-semibold text-[var(--text-primary)]">Imported titles</h3>
        {items.length === 0 ? (
          <p className="text-sm text-[var(--text-tertiary)]">No titles from lists yet.</p>
        ) : (
          <ul className="space-y-1" data-testid="lists-item-list">
            {items.map((item) => (
              <li key={item.id || item.title} className="text-sm text-[var(--text-secondary)]">
                {listSyncItemLabel(item)}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function MigratePane() {
  const [roots, setRoots] = useState<LibraryRoot[]>([]);
  const [service, setService] = useState<(typeof MIGRATE_SERVICES)[number]>('radarr');
  const [baseUrl, setBaseUrl] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [remapFrom, setRemapFrom] = useState('');
  const [remapTo, setRemapTo] = useState('');
  const [result, setResult] = useState<MigrateResult | null>(null);
  const [tautulliUrl, setTautulliUrl] = useState('');
  const [tautulliKey, setTautulliKey] = useState('');
  const [tautulliResult, setTautulliResult] = useState<TautulliImportResult | null>(null);
  const [jellystatJson, setJellystatJson] = useState('');
  const [jellystatResult, setJellystatResult] = useState<HistoryImportResult | null>(null);
  const [jellyfinStatus, setJellyfinStatus] = useState<JellyfinStatus | null>(null);
  const [jellyfinDirection, setJellyfinDirection] = useState<'both' | 'jellyfin' | 'muxcore'>('both');
  const [jellyfinResult, setJellyfinResult] = useState<JellyfinSyncResult | null>(null);
  const [jellyfinRefresh, setJellyfinRefresh] = useState<JellyfinRefreshResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [tautulliBusy, setTautulliBusy] = useState(false);
  const [jellystatBusy, setJellystatBusy] = useState(false);
  const [jellyfinBusy, setJellyfinBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void api
      .listRoots()
      .then((next) => {
        if (!cancelled) setRoots(next.roots);
      })
      .catch(() => {
        /* remap-to dropdown is optional */
      });
    void api
      .getJellyfinStatus()
      .then((next) => {
        if (!cancelled) setJellyfinStatus(next);
      })
      .catch(() => {
        if (!cancelled) {
          setJellyfinStatus({
            available: false,
            configured: false,
            baseUrl: '',
            conflictMode: '',
            itemLinks: 0,
            sessionsPollEnabled: false,
            userdataSync: false,
            sseConnected: false,
            error: '',
          });
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function run(dryRun: boolean) {
    setBusy(true);
    setError(null);
    try {
      const next = await api.migrateArrLibrary({
        service,
        baseUrl,
        apiKey,
        dryRun,
        remapFrom,
        remapTo,
      });
      setResult(next);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not import from Arr');
    } finally {
      setBusy(false);
    }
  }

  async function runTautulli(dryRun: boolean) {
    setTautulliBusy(true);
    setError(null);
    try {
      const next = await api.importTautulliHistory({
        tautulliUrl,
        apiKey: tautulliKey,
        dryRun,
      });
      setTautulliResult(next);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not import Tautulli history');
    } finally {
      setTautulliBusy(false);
    }
  }

  async function runJellystat(dryRun: boolean) {
    setJellystatBusy(true);
    setError(null);
    try {
      const next = await api.importJellystatHistory({
        backupJson: jellystatJson,
        dryRun,
      });
      setJellystatResult(next);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not import Jellystat history');
    } finally {
      setJellystatBusy(false);
    }
  }

  async function runJellyfin(dryRun: boolean) {
    setJellyfinBusy(true);
    setError(null);
    try {
      const next = await api.syncJellyfinLibrary({ direction: jellyfinDirection, dryRun });
      setJellyfinResult(next);
      const status = await api.getJellyfinStatus().catch(() => null);
      if (status) setJellyfinStatus(status);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not sync Jellyfin links');
    } finally {
      setJellyfinBusy(false);
    }
  }

  async function runJellyfinRefresh() {
    setJellyfinBusy(true);
    setError(null);
    try {
      setJellyfinRefresh(await api.refreshJellyfinLibrary());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not refresh Jellyfin');
    } finally {
      setJellyfinBusy(false);
    }
  }

  return (
    <div className={`${paneClass} max-w-2xl`} data-testid="settings-migrate">
      <h2 className="font-semibold text-[var(--text-primary)]">Import</h2>
      <p className="text-sm text-[var(--text-secondary)]">
        Bring a Radarr, Sonarr, or Lidarr library into MuxCore in an afternoon. Preview first, then
        import. API keys stay on this device and are never stored.
      </p>
      {error ? (
        <p className="text-sm text-[var(--danger-color)]" role="alert">
          {error}
        </p>
      ) : null}
      {result ? (
        <div
          className="rounded-[var(--radius-sm)] border border-[var(--border-subtle)] bg-[var(--bg-base)] p-3 text-sm"
          data-testid="migrate-result"
        >
          <p className="text-[var(--text-primary)]">
            {result.dryRun
              ? `Dry run: would consider ${result.fetched} titles`
              : `Imported ${result.imported}, skipped ${result.skipped} of ${result.fetched} fetched`}
          </p>
          {result.scanNote ? (
            <p className="mt-1 text-[var(--text-secondary)]" data-testid="migrate-scan">
              {result.scanNote}
            </p>
          ) : null}
          {result.errors.length > 0 ? (
            <ul className="mt-2 max-h-32 list-disc overflow-y-auto pl-5 text-xs text-[var(--danger-color)]">
              {result.errors.map((row) => (
                <li key={row}>{row}</li>
              ))}
            </ul>
          ) : null}
          {result.preview.length > 0 ? (
            <ul className="mt-2 max-h-40 space-y-1 overflow-y-auto text-xs text-[var(--text-secondary)]">
              {result.preview.map((row) => (
                <li key={`${row.source}-${row.arrId}-${row.title}`}>
                  {row.title}
                  {row.year ? ` (${row.year})` : ''} → {row.rootFolderPath || 'same path'}
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}
      <form
        className="space-y-3"
        onSubmit={(e) => {
          e.preventDefault();
          void run(true);
        }}
      >
        <label className="block space-y-1 text-sm">
          <span className="text-[var(--text-secondary)]">Service</span>
          <select
            className={inputClass}
            value={service}
            aria-label="Arr service"
            onChange={(e) => setService(e.target.value as (typeof MIGRATE_SERVICES)[number])}
          >
            {MIGRATE_SERVICES.map((kind) => (
              <option key={kind} value={kind}>
                {kind}
              </option>
            ))}
          </select>
        </label>
        <label className="block space-y-1 text-sm">
          <span className="text-[var(--text-secondary)]">Arr URL</span>
          <input
            className={inputClass}
            value={baseUrl}
            aria-label="Arr base URL"
            placeholder="http://192.168.1.10:7878"
            onChange={(e) => setBaseUrl(e.target.value)}
          />
        </label>
        <label className="block space-y-1 text-sm">
          <span className="text-[var(--text-secondary)]">API key</span>
          <input
            className={inputClass}
            type="password"
            value={apiKey}
            aria-label="Arr API key"
            autoComplete="off"
            onChange={(e) => setApiKey(e.target.value)}
          />
        </label>
        <label className="block space-y-1 text-sm">
          <span className="text-[var(--text-secondary)]">Remap from (optional)</span>
          <input
            className={inputClass}
            value={remapFrom}
            aria-label="Remap from path"
            placeholder="/movies"
            onChange={(e) => setRemapFrom(e.target.value)}
          />
        </label>
        <label className="block space-y-1 text-sm">
          <span className="text-[var(--text-secondary)]">MuxCore root</span>
          {roots.length > 0 ? (
            <select
              className={inputClass}
              value={remapTo}
              aria-label="Remap to root"
              onChange={(e) => setRemapTo(e.target.value)}
            >
              <option value="">Keep Arr paths</option>
              {roots.map((root) => (
                <option key={root.id || root.path} value={root.path}>
                  {rootLabel(root)}
                </option>
              ))}
            </select>
          ) : (
            <input
              className={inputClass}
              value={remapTo}
              aria-label="Remap to root"
              placeholder="/data/movies"
              onChange={(e) => setRemapTo(e.target.value)}
            />
          )}
        </label>
        <div className="flex flex-wrap gap-2">
          <button type="submit" disabled={busy || !baseUrl.trim() || !apiKey.trim()} className={saveBtnClass}>
            {busy ? 'Working…' : 'Preview'}
          </button>
          <button
            type="button"
            disabled={busy || !baseUrl.trim() || !apiKey.trim()}
            className="rounded-[var(--radius-md)] border border-[var(--border-subtle)] px-4 py-2 text-sm font-semibold text-[var(--text-primary)]"
            onClick={() => void run(false)}
          >
            Import now
          </button>
        </div>
      </form>
      <section className="space-y-3 border-t border-[var(--border-subtle)] pt-6">
        <h3 className="font-semibold text-[var(--text-primary)]">Tautulli history</h3>
        <p className="text-sm text-[var(--text-secondary)]">
          Pull play history from an existing Tautulli instance so Watch stats and Continue watching
          start with the household you already have.
        </p>
        {tautulliResult ? (
          <p className="text-sm text-[var(--text-primary)]" data-testid="tautulli-import-result">
            {tautulliImportLabel(tautulliResult)}
            {tautulliResult.error ? ` · ${tautulliResult.error}` : ''}
          </p>
        ) : null}
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            void runTautulli(true);
          }}
        >
          <label className="block space-y-1 text-sm">
            <span className="text-[var(--text-secondary)]">Tautulli URL</span>
            <input
              className={inputClass}
              value={tautulliUrl}
              aria-label="Tautulli URL"
              placeholder="http://192.168.1.10:8181"
              onChange={(e) => setTautulliUrl(e.target.value)}
            />
          </label>
          <label className="block space-y-1 text-sm">
            <span className="text-[var(--text-secondary)]">Tautulli API key</span>
            <input
              className={inputClass}
              type="password"
              value={tautulliKey}
              aria-label="Tautulli API key"
              autoComplete="off"
              onChange={(e) => setTautulliKey(e.target.value)}
            />
          </label>
          <div className="flex flex-wrap gap-2">
            <button
              type="submit"
              disabled={tautulliBusy || !tautulliUrl.trim() || !tautulliKey.trim()}
              className={saveBtnClass}
            >
              {tautulliBusy ? 'Working…' : 'Preview history'}
            </button>
            <button
              type="button"
              disabled={tautulliBusy || !tautulliUrl.trim() || !tautulliKey.trim()}
              className="rounded-[var(--radius-md)] border border-[var(--border-subtle)] px-4 py-2 text-sm font-semibold text-[var(--text-primary)]"
              onClick={() => void runTautulli(false)}
            >
              Import history
            </button>
          </div>
        </form>
      </section>
      <section className="space-y-3 border-t border-[var(--border-subtle)] pt-6">
        <h3 className="font-semibold text-[var(--text-primary)]">Jellystat history</h3>
        <p className="text-sm text-[var(--text-secondary)]">
          Paste a Jellystat backup JSON export to bring Jellyfin play history into the household monitor.
        </p>
        {jellystatResult ? (
          <p className="text-sm text-[var(--text-primary)]" data-testid="jellystat-import-result">
            {historyImportLabel(jellystatResult)}
            {jellystatResult.error ? ` · ${jellystatResult.error}` : ''}
          </p>
        ) : null}
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            void runJellystat(true);
          }}
        >
          <label className="block space-y-1 text-sm">
            <span className="text-[var(--text-secondary)]">Jellystat backup JSON</span>
            <textarea
              className={inputClass}
              rows={5}
              value={jellystatJson}
              aria-label="Jellystat backup JSON"
              placeholder='[{"Id":"..."}]'
              onChange={(e) => setJellystatJson(e.target.value)}
            />
          </label>
          <div className="flex flex-wrap gap-2">
            <button type="submit" disabled={jellystatBusy || !jellystatJson.trim()} className={saveBtnClass}>
              {jellystatBusy ? 'Working…' : 'Preview Jellystat'}
            </button>
            <button
              type="button"
              disabled={jellystatBusy || !jellystatJson.trim()}
              className="rounded-[var(--radius-md)] border border-[var(--border-subtle)] px-4 py-2 text-sm font-semibold text-[var(--text-primary)]"
              onClick={() => void runJellystat(false)}
            >
              Import Jellystat
            </button>
          </div>
        </form>
      </section>
      <section className="space-y-3 border-t border-[var(--border-subtle)] pt-6">
        <h3 className="font-semibold text-[var(--text-primary)]">Jellyfin library</h3>
        <p className="text-sm text-[var(--text-secondary)]">
          Match MuxCore titles to Jellyfin items so Play on Jellyfin and Now watching stay linked after
          a library change. Preview first, then sync.
        </p>
        <p className="text-sm text-[var(--text-primary)]" data-testid="jellyfin-status">
          {jellyfinStatus ? jellyfinStatusLabel(jellyfinStatus) : 'Checking Jellyfin…'}
        </p>
        {jellyfinResult ? (
          <p className="text-sm text-[var(--text-primary)]" data-testid="jellyfin-sync-result">
            {jellyfinSyncLabel(jellyfinResult)}
            {jellyfinResult.errors.length > 0 ? ` · ${jellyfinResult.errors[0]}` : ''}
          </p>
        ) : null}
        {jellyfinRefresh?.ok ? (
          <p className="text-sm text-[var(--text-secondary)]" data-testid="jellyfin-refresh-result">
            Jellyfin library refresh started
          </p>
        ) : null}
        <form
          className="space-y-3"
          data-testid="jellyfin-sync-form"
          onSubmit={(e) => {
            e.preventDefault();
            void runJellyfin(true);
          }}
        >
          <label className="block space-y-1 text-sm">
            <span className="text-[var(--text-secondary)]">Direction</span>
            <select
              className={inputClass}
              value={jellyfinDirection}
              aria-label="Jellyfin sync direction"
              onChange={(e) => setJellyfinDirection(e.target.value as typeof jellyfinDirection)}
            >
              <option value="both">Both ways</option>
              <option value="jellyfin">Pull from Jellyfin</option>
              <option value="muxcore">Push MuxCore links</option>
            </select>
          </label>
          <div className="flex flex-wrap gap-2">
            <button type="submit" disabled={jellyfinBusy} className={saveBtnClass}>
              {jellyfinBusy ? 'Working…' : 'Preview links'}
            </button>
            <button
              type="button"
              disabled={jellyfinBusy}
              className="rounded-[var(--radius-md)] border border-[var(--border-subtle)] px-4 py-2 text-sm font-semibold text-[var(--text-primary)]"
              onClick={() => void runJellyfin(false)}
            >
              Sync links
            </button>
            <button
              type="button"
              disabled={jellyfinBusy}
              className="rounded-[var(--radius-md)] border border-[var(--border-subtle)] px-4 py-2 text-sm font-semibold text-[var(--text-primary)]"
              onClick={() => void runJellyfinRefresh()}
            >
              Refresh Jellyfin
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}

function UsersPane() {
  const me = getCurrentUserId();
  const [users, setUsers] = useState<HouseholdUser[]>([]);
  const [available, setAvailable] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState('');
  const [resets, setResets] = useState<PasswordResetRequest[]>([]);
  const [resetPasswords, setResetPasswords] = useState<Record<string, string>>({});
  const [userPasswords, setUserPasswords] = useState<Record<string, string>>({});
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState('user');

  useEffect(() => {
    let cancelled = false;
    void Promise.all([api.listUsers(), api.listPasswordResets()])
      .then(([next, queue]) => {
        if (cancelled) return;
        setAvailable(next.available);
        setUsers(next.users);
        setResets(queue.requests);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Could not load users');
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function reloadResets() {
    const queue = await api.listPasswordResets();
    setResets(queue.requests);
  }

  async function onRole(id: string, role: string) {
    setBusyId(id);
    setError(null);
    try {
      const next = await api.setUserRole(id, role);
      setUsers((prev) => prev.map((row) => (row.id === id ? next : row)));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not change role');
    } finally {
      setBusyId('');
    }
  }

  async function onCreate(e: FormEvent) {
    e.preventDefault();
    const username = newUsername.trim();
    const password = newPassword.trim();
    if (!username || password.length < 8) {
      setError('Username and a password of at least 8 characters are required');
      return;
    }
    setBusyId('create');
    setError(null);
    try {
      const created = await api.createUser({ username, password, role: newRole });
      setUsers((prev) => [created, ...prev.filter((row) => row.id !== created.id)]);
      setNewUsername('');
      setNewPassword('');
      setNewRole('user');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create user');
    } finally {
      setBusyId('');
    }
  }

  async function onSetPassword(id: string) {
    const password = (userPasswords[id] || '').trim();
    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }
    setBusyId(id);
    setError(null);
    try {
      await api.setUserPassword(id, password);
      setUserPasswords((prev) => ({ ...prev, [id]: '' }));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not set password');
    } finally {
      setBusyId('');
    }
  }

  async function onRemove(id: string) {
    setBusyId(id);
    setError(null);
    try {
      await api.deleteUser(id);
      setUsers((prev) => prev.filter((row) => row.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not remove user');
    } finally {
      setBusyId('');
    }
  }

  async function onDismissReset(id: string) {
    setBusyId(id);
    setError(null);
    try {
      await api.dismissPasswordReset(id);
      await reloadResets();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not dismiss reset');
    } finally {
      setBusyId('');
    }
  }

  async function onSetResetPassword(id: string) {
    const password = (resetPasswords[id] || '').trim();
    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }
    setBusyId(id);
    setError(null);
    try {
      await api.setPasswordReset(id, password);
      setResetPasswords((prev) => ({ ...prev, [id]: '' }));
      await reloadResets();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not set password');
    } finally {
      setBusyId('');
    }
  }

  return (
    <div className={`${paneClass} max-w-2xl`} data-testid="settings-users">
      <h2 className="font-semibold text-[var(--text-primary)]">Users</h2>
      <p className="text-sm text-[var(--text-secondary)]">
        Add a household account, change a role, or set a password without opening admin-ui. Invites still work for self-serve join.
      </p>
      <form className="space-y-2 rounded-[var(--radius-sm)] border border-[var(--border-subtle)] p-3" onSubmit={(e) => void onCreate(e)} data-testid="household-user-create">
        <h3 className="text-sm font-semibold text-[var(--text-primary)]">Add user</h3>
        <label className="block space-y-1 text-sm">
          <span className="text-[var(--text-secondary)]">Username</span>
          <input
            className={inputClass}
            value={newUsername}
            autoComplete="off"
            aria-label="New user username"
            onChange={(e) => setNewUsername(e.target.value)}
          />
        </label>
        <label className="block space-y-1 text-sm">
          <span className="text-[var(--text-secondary)]">Password</span>
          <input
            className={inputClass}
            type="password"
            value={newPassword}
            autoComplete="new-password"
            aria-label="New user password"
            onChange={(e) => setNewPassword(e.target.value)}
          />
        </label>
        <label className="block space-y-1 text-sm">
          <span className="text-[var(--text-secondary)]">Role</span>
          <select className={inputClass} value={newRole} aria-label="New user role" onChange={(e) => setNewRole(e.target.value)}>
            <option value="user">user</option>
            <option value="viewer">viewer</option>
            <option value="approver">approver</option>
            <option value="manager">manager</option>
            <option value="admin">admin</option>
          </select>
        </label>
        <button type="submit" disabled={Boolean(busyId) || !newUsername.trim() || newPassword.trim().length < 8} className={saveBtnClass}>
          {busyId === 'create' ? 'Creating…' : 'Add user'}
        </button>
      </form>
      {error ? (
        <p className="text-sm text-[var(--danger-color)]" role="alert">
          {error}
        </p>
      ) : null}
      {available === false ? (
        <p className="text-sm text-[var(--text-tertiary)]">
          User admin is not linked to auth-local for this session. Sign in again, then retry.
        </p>
      ) : null}
      <ul className="space-y-3" data-testid="household-user-list">
        {users.map((user) => {
          const self = Boolean(me && user.id === me);
          return (
            <li key={user.id || user.username} className="space-y-2 rounded-[var(--radius-sm)] border border-[var(--border-subtle)] p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-medium text-[var(--text-primary)]">{user.username || user.id}</p>
                {user.totpEnabled ? (
                  <span className="text-xs text-[var(--text-tertiary)]">TOTP on</span>
                ) : null}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <label className="min-w-0 flex-1 text-sm">
                  <span className="sr-only">Role for {user.username}</span>
                  <select
                    className={inputClass}
                    value={primaryRole(user)}
                    disabled={Boolean(busyId) || self}
                    aria-label={`Role for ${user.username || user.id}`}
                    onChange={(e) => void onRole(user.id, e.target.value)}
                  >
                    <option value="user">user</option>
                    <option value="viewer">viewer</option>
                    <option value="approver">approver</option>
                    <option value="manager">manager</option>
                    <option value="admin">admin</option>
                  </select>
                </label>
                <button
                  type="button"
                  disabled={Boolean(busyId) || self || !user.id}
                  className="shrink-0 text-sm text-[var(--text-tertiary)] hover:text-[var(--danger-color)] disabled:opacity-40"
                  onClick={() => void onRemove(user.id)}
                >
                  {self ? 'You' : 'Remove'}
                </button>
              </div>
              <div className="flex flex-wrap items-end gap-2">
                <label className="min-w-0 flex-1 space-y-1 text-sm">
                  <span className="text-[var(--text-secondary)]">Set password</span>
                  <input
                    className={inputClass}
                    type="password"
                    autoComplete="new-password"
                    value={userPasswords[user.id] || ''}
                    aria-label={`Set password for ${user.username || user.id}`}
                    onChange={(e) => setUserPasswords((prev) => ({ ...prev, [user.id]: e.target.value }))}
                  />
                </label>
                <button
                  type="button"
                  disabled={Boolean(busyId) || !user.id || (userPasswords[user.id] || '').trim().length < 8}
                  className="shrink-0 text-sm text-[var(--text-primary)] disabled:opacity-40"
                  onClick={() => void onSetPassword(user.id)}
                >
                  Save password
                </button>
              </div>
            </li>
          );
        })}
      </ul>
      <section className="space-y-3" data-testid="password-reset-queue">
        <h3 className="font-semibold text-[var(--text-primary)]">Password reset queue</h3>
        <p className="text-sm text-[var(--text-secondary)]">
          Requests from Forgot password. Set a new password when the account exists, or dismiss stale rows.
        </p>
        {resets.length === 0 ? (
          <p className="text-sm text-[var(--text-tertiary)]" data-testid="password-reset-empty">
            No pending password reset requests.
          </p>
        ) : (
          <ul className="space-y-3" data-testid="password-reset-list">
            {resets.map((row) => (
              <li key={row.id || row.username} className="space-y-2 rounded-[var(--radius-sm)] border border-[var(--border-subtle)] p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-medium text-[var(--text-primary)]">{row.username}</p>
                  {row.note ? <span className="text-xs text-[var(--text-tertiary)]">{row.note}</span> : null}
                </div>
                {row.user ? (
                  <label className="block space-y-1 text-sm">
                    <span className="text-[var(--text-secondary)]">New password</span>
                    <input
                      className={inputClass}
                      type="password"
                      autoComplete="new-password"
                      value={resetPasswords[row.id] || ''}
                      aria-label={`New password for ${row.username}`}
                      onChange={(e) => setResetPasswords((prev) => ({ ...prev, [row.id]: e.target.value }))}
                    />
                  </label>
                ) : (
                  <p className="text-xs text-[var(--text-tertiary)]">
                    No matching user account — create the user first or dismiss this request.
                  </p>
                )}
                <div className="flex flex-wrap items-center gap-2">
                  {row.user ? (
                    <button
                      type="button"
                      disabled={Boolean(busyId) || (resetPasswords[row.id] || '').trim().length < 8}
                      className="text-sm text-[var(--text-primary)]"
                      onClick={() => void onSetResetPassword(row.id)}
                    >
                      Set password
                    </button>
                  ) : null}
                  <button
                    type="button"
                    disabled={Boolean(busyId)}
                    className="text-sm text-[var(--text-tertiary)] hover:text-[var(--danger-color)]"
                    onClick={() => void onDismissReset(row.id)}
                  >
                    Dismiss
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function InvitesPane() {
  const [invites, setInvites] = useState<HouseholdInvite[]>([]);
  const [available, setAvailable] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [createdUrl, setCreatedUrl] = useState('');
  const [role, setRole] = useState('user');
  const [maxUses, setMaxUses] = useState('1');
  const [ttlHours, setTtlHours] = useState('168');

  useEffect(() => {
    let cancelled = false;
    void api
      .listInvites()
      .then((next) => {
        if (cancelled) return;
        setAvailable(next.available);
        setInvites(next.invites);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Could not load invites');
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function onCreate(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const invite = await api.createInvite({
        role,
        maxUses: Number(maxUses) || 0,
        ttlHours: Number(ttlHours) || 168,
      });
      setCreatedUrl(invite.joinUrl);
      setInvites((prev) => [invite, ...prev]);
      setAvailable(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create invite');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={paneClass} data-testid="settings-invites">
      <h2 className="font-semibold text-[var(--text-primary)]">Invites</h2>
      <p className="text-sm text-[var(--text-secondary)]">
        Send a household join link. Family signs up at the link — no admin account sharing.
      </p>
      {error ? (
        <p className="text-sm text-[var(--danger-color)]" role="alert">
          {error}
        </p>
      ) : null}
      {available === false ? (
        <p className="text-sm text-[var(--text-tertiary)]">
          Invite admin is not linked to auth-local for this session. Sign in again, then retry.
        </p>
      ) : null}
      <form className="space-y-3" onSubmit={(e) => void onCreate(e)}>
        <label className="block space-y-1 text-sm">
          <span className="text-[var(--text-secondary)]">Role</span>
          <select className={inputClass} value={role} aria-label="Invite role" onChange={(e) => setRole(e.target.value)}>
            <option value="user">user</option>
            <option value="viewer">viewer</option>
            <option value="manager">manager</option>
          </select>
        </label>
        <label className="block space-y-1 text-sm">
          <span className="text-[var(--text-secondary)]">Max uses (0 = unlimited)</span>
          <input
            className={inputClass}
            type="number"
            min={0}
            value={maxUses}
            aria-label="Invite max uses"
            onChange={(e) => setMaxUses(e.target.value)}
          />
        </label>
        <label className="block space-y-1 text-sm">
          <span className="text-[var(--text-secondary)]">Expires in hours</span>
          <input
            className={inputClass}
            type="number"
            min={1}
            value={ttlHours}
            aria-label="Invite TTL hours"
            onChange={(e) => setTtlHours(e.target.value)}
          />
        </label>
        <button type="submit" disabled={busy} className={saveBtnClass}>
          {busy ? 'Creating…' : 'Create invite link'}
        </button>
      </form>
      {createdUrl ? (
        <p className="break-all text-sm text-[var(--text-primary)]" data-testid="invite-created-url">
          {createdUrl}
        </p>
      ) : null}
      <ul className="space-y-2" data-testid="invite-list">
        {invites.map((invite) => (
          <li key={invite.id} className="flex items-center justify-between gap-3 text-sm">
            <span className="min-w-0 truncate text-[var(--text-secondary)]">
              {invite.role} · {invite.prefix || invite.id} · {inviteUsesLabel(invite)}
              {invite.revoked ? ' · revoked' : ''}
            </span>
            {!invite.revoked ? (
              <button
                type="button"
                className="shrink-0 text-sm font-semibold text-[var(--text-primary)] hover:text-[var(--accent-color)]"
                aria-label={`Revoke invite ${invite.prefix || invite.id}`}
                onClick={() => {
                  void api
                    .revokeInvite(invite.id)
                    .then(() => {
                      setInvites((prev) =>
                        prev.map((row) => (row.id === invite.id ? { ...row, revoked: true } : row)),
                      );
                    })
                    .catch((err) => {
                      setError(err instanceof Error ? err.message : 'Could not revoke invite');
                    });
                }}
              >
                Revoke
              </button>
            ) : null}
          </li>
        ))}
      </ul>
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

function TagsPane() {
  const [tags, setTags] = useState<LibraryTag[]>([]);
  const [available, setAvailable] = useState<boolean | null>(null);
  const [label, setLabel] = useState('');
  const [media, setMedia] = useState('movie');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [autoTags, setAutoTags] = useState<AutoTagCatalog | null>(null);
  const [autoName, setAutoName] = useState('');
  const [autoTagId, setAutoTagId] = useState('');
  const [autoField, setAutoField] = useState<(typeof AUTO_TAG_FIELDS)[number]>('title');
  const [autoMatch, setAutoMatch] = useState<(typeof AUTO_TAG_MATCHES)[number]>('contains');
  const [autoPattern, setAutoPattern] = useState('');
  const [autoBusy, setAutoBusy] = useState(false);
  const [classifyId, setClassifyId] = useState('');
  const [classifyTitle, setClassifyTitle] = useState('');
  const [classifyPath, setClassifyPath] = useState('');
  const [classifyType, setClassifyType] = useState('movie');
  const [classifyFlash, setClassifyFlash] = useState<string | null>(null);

  async function reload() {
    const next = await api.listTags();
    setAvailable(next.available);
    setTags(next.tags);
  }

  async function reloadAuto() {
    const next = await api.getTagging();
    setAutoTags(next);
    if (!autoTagId && next.tags[0]?.id) setAutoTagId(next.tags[0].id);
  }

  useEffect(() => {
    let cancelled = false;
    void Promise.all([api.listTags(), api.getTagging().catch(() => ({ available: false, tags: [], rules: [] }))])
      .then(([next, tagging]) => {
        if (cancelled) return;
        setAvailable(next.available);
        setTags(next.tags);
        setAutoTags(tagging);
        if (tagging.tags[0]?.id) setAutoTagId((cur) => cur || tagging.tags[0].id);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Could not load tags');
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function onCreate(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await api.createTag({ label, media });
      setLabel('');
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create tag');
    } finally {
      setBusy(false);
    }
  }

  async function onRemove(id: string, kind: string) {
    setBusy(true);
    setError(null);
    try {
      await api.deleteTag(id, kind);
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not delete tag');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={paneClass} data-testid="settings-tags">
      <h2 className="font-semibold text-[var(--text-primary)]">Tags</h2>
      <p className="text-sm text-[var(--text-secondary)]">
        Arr-style labels for movies, TV, and music — assign them on a title page to filter and organize
        the library.
      </p>
      {error ? (
        <p className="text-sm text-[var(--danger-color)]" role="alert">
          {error}
        </p>
      ) : null}
      {available === false ? (
        <p className="text-sm text-[var(--text-tertiary)]">Library tag catalogs are not available.</p>
      ) : null}
      <ul className="space-y-2" data-testid="tag-list">
        {tags.map((tag) => (
          <li key={`${tag.media}-${tag.id}`} className="flex items-center justify-between gap-3 text-sm">
            <span className="min-w-0 truncate text-[var(--text-secondary)]">
              {tagLabel(tag)}
              {tag.media ? ` (${tag.media})` : ''}
            </span>
            <button
              type="button"
              disabled={busy || !tag.id}
              className="shrink-0 text-[var(--text-tertiary)] hover:text-[var(--danger-color)]"
              onClick={() => void onRemove(tag.id, tag.media)}
            >
              Remove
            </button>
          </li>
        ))}
      </ul>
      <form className="space-y-3" onSubmit={(e) => void onCreate(e)}>
        <h3 className="text-sm font-semibold text-[var(--text-primary)]">New tag</h3>
        <label className="block space-y-1 text-sm">
          <span className="text-[var(--text-secondary)]">Label</span>
          <input className={inputClass} value={label} aria-label="New tag label" onChange={(e) => setLabel(e.target.value)} />
        </label>
        <label className="block space-y-1 text-sm">
          <span className="text-[var(--text-secondary)]">Library</span>
          <select className={inputClass} value={media} aria-label="New tag library" onChange={(e) => setMedia(e.target.value)}>
            {TAG_MEDIA.map((kind) => (
              <option key={kind} value={kind}>
                {kind}
              </option>
            ))}
          </select>
        </label>
        <button type="submit" disabled={busy || !label.trim()} className={saveBtnClass}>
          {busy ? 'Saving…' : 'Create tag'}
        </button>
      </form>
      <section className="space-y-3 border-t border-[var(--border-subtle)] pt-6">
        <h3 className="font-semibold text-[var(--text-primary)]">Auto-tag</h3>
        <p className="text-sm text-[var(--text-secondary)]">
          Apply a classification tag when a title, genre, path, or media type matches — the same
          leftover Sonarr auto-tag covers. Needs the optional media-tagging module.
        </p>
        {autoTags && !autoTags.available ? (
          <p className="text-sm text-[var(--text-tertiary)]">
            Auto-tag is not running. Enable the tagging compose profile or MVP_ENABLE_MEDIA_TAGGING=1.
          </p>
        ) : null}
        <form
          className="space-y-3"
          data-testid="auto-tag-form"
          onSubmit={(e) => {
            e.preventDefault();
            void (async () => {
              setAutoBusy(true);
              setError(null);
              try {
                let tagId = autoTagId;
                if (!tagId && autoName.trim()) {
                  const created = await api.createTaggingTag({ name: autoName.trim(), category: 'general' });
                  tagId = created.id;
                  setAutoTagId(tagId);
                }
                if (!tagId) throw new Error('Create or choose an auto-tag first');
                await api.upsertTaggingRule({
                  tagId,
                  field: autoField,
                  match: autoMatch,
                  pattern: autoPattern,
                  enabled: true,
                });
                setAutoPattern('');
                await reloadAuto();
              } catch (err) {
                setError(err instanceof Error ? err.message : 'Could not save auto-tag rule');
              } finally {
                setAutoBusy(false);
              }
            })();
          }}
        >
          <label className="block space-y-1 text-sm">
            <span className="text-[var(--text-secondary)]">Auto-tag name</span>
            <input
              className={inputClass}
              value={autoName}
              aria-label="New auto-tag name"
              placeholder="Kids"
              onChange={(e) => setAutoName(e.target.value)}
            />
          </label>
          {autoTags?.tags.length ? (
            <label className="block space-y-1 text-sm">
              <span className="text-[var(--text-secondary)]">Existing auto-tag</span>
              <select className={inputClass} value={autoTagId} aria-label="Existing auto-tag" onChange={(e) => setAutoTagId(e.target.value)}>
                {autoTags.tags.map((tag: AutoTag) => (
                  <option key={tag.id} value={tag.id}>
                    {tag.name}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
          <label className="block space-y-1 text-sm">
            <span className="text-[var(--text-secondary)]">Field</span>
            <select className={inputClass} value={autoField} aria-label="Auto-tag field" onChange={(e) => setAutoField(e.target.value as (typeof AUTO_TAG_FIELDS)[number])}>
              {AUTO_TAG_FIELDS.map((field) => (
                <option key={field} value={field}>
                  {field}
                </option>
              ))}
            </select>
          </label>
          <label className="block space-y-1 text-sm">
            <span className="text-[var(--text-secondary)]">Match</span>
            <select className={inputClass} value={autoMatch} aria-label="Auto-tag match" onChange={(e) => setAutoMatch(e.target.value as (typeof AUTO_TAG_MATCHES)[number])}>
              {AUTO_TAG_MATCHES.map((kind) => (
                <option key={kind} value={kind}>
                  {kind}
                </option>
              ))}
            </select>
          </label>
          <label className="block space-y-1 text-sm">
            <span className="text-[var(--text-secondary)]">Pattern</span>
            <input className={inputClass} value={autoPattern} aria-label="Auto-tag pattern" onChange={(e) => setAutoPattern(e.target.value)} />
          </label>
          <button type="submit" disabled={autoBusy || !autoPattern.trim() || (!autoTagId && !autoName.trim())} className={saveBtnClass}>
            {autoBusy ? 'Saving…' : 'Save auto-tag rule'}
          </button>
        </form>
        {autoTags?.rules.length ? (
          <ul className="space-y-2" data-testid="auto-tag-rules">
            {autoTags.rules.map((rule) => (
              <li key={rule.id || rule.pattern} className="flex items-center justify-between gap-3 text-sm">
                <span className="min-w-0 truncate text-[var(--text-secondary)]">{autoTagRuleLabel(rule, autoTags.tags)}</span>
                <button
                  type="button"
                  disabled={autoBusy || !rule.id}
                  className="shrink-0 text-[var(--text-tertiary)] hover:text-[var(--danger-color)]"
                  onClick={() => {
                    void (async () => {
                      setAutoBusy(true);
                      setError(null);
                      try {
                        await api.deleteTaggingRule(rule.id);
                        await reloadAuto();
                      } catch (err) {
                        setError(err instanceof Error ? err.message : 'Could not delete auto-tag rule');
                      } finally {
                        setAutoBusy(false);
                      }
                    })();
                  }}
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
        ) : null}
        <form
          className="space-y-3 border-t border-[var(--border-subtle)] pt-4"
          data-testid="auto-tag-classify-form"
          onSubmit={(e) => {
            e.preventDefault();
            void (async () => {
              setAutoBusy(true);
              setError(null);
              setClassifyFlash(null);
              try {
                const next = await api.classifyTagging({
                  mediaId: classifyId,
                  title: classifyTitle,
                  path: classifyPath,
                  mediaType: classifyType,
                  merge: true,
                });
                setClassifyFlash(autoTagClassifyLabel(next));
              } catch (err) {
                setError(err instanceof Error ? err.message : 'Could not run auto-tag');
              } finally {
                setAutoBusy(false);
              }
            })();
          }}
        >
          <h3 className="text-sm font-semibold text-[var(--text-primary)]">Run auto-tag</h3>
          <p className="text-sm text-[var(--text-secondary)]">
            Apply saved rules to one library title now.
          </p>
          {classifyFlash ? (
            <p className="text-sm text-[var(--text-secondary)]" data-testid="auto-tag-classify-flash">
              {classifyFlash}
            </p>
          ) : null}
          <label className="block space-y-1 text-sm">
            <span className="text-[var(--text-secondary)]">Library id</span>
            <input className={inputClass} value={classifyId} aria-label="Auto-tag library id" onChange={(e) => setClassifyId(e.target.value)} />
          </label>
          <label className="block space-y-1 text-sm">
            <span className="text-[var(--text-secondary)]">Title</span>
            <input className={inputClass} value={classifyTitle} aria-label="Auto-tag title" onChange={(e) => setClassifyTitle(e.target.value)} />
          </label>
          <label className="block space-y-1 text-sm">
            <span className="text-[var(--text-secondary)]">Path</span>
            <input className={inputClass} value={classifyPath} aria-label="Auto-tag path" onChange={(e) => setClassifyPath(e.target.value)} />
          </label>
          <label className="block space-y-1 text-sm">
            <span className="text-[var(--text-secondary)]">Media type</span>
            <select className={inputClass} value={classifyType} aria-label="Auto-tag media type" onChange={(e) => setClassifyType(e.target.value)}>
              <option value="movie">movie</option>
              <option value="tv">tv</option>
            </select>
          </label>
          <button type="submit" disabled={autoBusy || !classifyId.trim()} className={saveBtnClass}>
            {autoBusy ? 'Working…' : 'Run auto-tag'}
          </button>
        </form>
      </section>
    </div>
  );
}

function KeysPane() {
  const me = getCurrentUserId();
  const [keys, setKeys] = useState<HouseholdAPIKey[]>([]);
  const [users, setUsers] = useState<{ id: string; username: string }[]>([]);
  const [available, setAvailable] = useState<boolean | null>(null);
  const [name, setName] = useState('');
  const [userId, setUserId] = useState('');
  const [secret, setSecret] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function reload() {
    const next = await api.listAPIKeys();
    setAvailable(next.available);
    setKeys(next.keys);
  }

  useEffect(() => {
    let cancelled = false;
    void Promise.all([api.listAPIKeys(), api.listUsers()])
      .then(([next, household]) => {
        if (cancelled) return;
        setAvailable(next.available);
        setKeys(next.keys);
        setUsers(household.users.map((row) => ({ id: row.id, username: row.username })));
        setUserId((prev) => {
          if (prev) return prev;
          if (me && household.users.some((row) => row.id === me)) return me;
          return household.users[0]?.id || '';
        });
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Could not load API keys');
      });
    return () => {
      cancelled = true;
    };
  }, [me]);

  async function onCreate(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const next = await api.createAPIKey({ name, userId });
      setSecret(next.secret);
      setName('');
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create API key');
    } finally {
      setBusy(false);
    }
  }

  async function onRotate(id: string) {
    setBusy(true);
    setError(null);
    try {
      const next = await api.rotateAPIKey(id);
      setSecret(next.secret);
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not rotate API key');
    } finally {
      setBusy(false);
    }
  }

  async function onRemove(id: string) {
    setBusy(true);
    setError(null);
    try {
      await api.deleteAPIKey(id);
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not revoke API key');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={paneClass} data-testid="settings-keys">
      <h2 className="font-semibold text-[var(--text-primary)]">API keys</h2>
      <p className="text-sm text-[var(--text-secondary)]">
        Issue a copy-once token for scripts and devices. The secret is shown once — store it, then
        rotate if it leaks.
      </p>
      {error ? (
        <p className="text-sm text-[var(--danger-color)]" role="alert">
          {error}
        </p>
      ) : null}
      {available === false ? (
        <p className="text-sm text-[var(--text-tertiary)]">
          API keys are not linked to auth-local for this session. Sign in again, then retry.
        </p>
      ) : null}
      {secret ? (
        <p className="break-all rounded-[var(--radius-sm)] border border-[var(--border-subtle)] bg-[var(--bg-base)] px-3 py-2 font-mono text-sm" data-testid="key-secret">
          {secret}
        </p>
      ) : null}
      <ul className="space-y-2" data-testid="key-list">
        {keys.map((key) => (
          <li key={key.id} className="flex items-center justify-between gap-3 text-sm">
            <span className="min-w-0 truncate text-[var(--text-secondary)]">
              {apiKeyLabel(key)}
              {key.prefix ? ` · ${key.prefix}` : ''}
            </span>
            <span className="flex shrink-0 gap-3">
              <button
                type="button"
                disabled={busy}
                className="text-[var(--text-tertiary)] hover:text-[var(--text-primary)]"
                onClick={() => void onRotate(key.id)}
              >
                Rotate
              </button>
              <button
                type="button"
                disabled={busy}
                className="text-[var(--text-tertiary)] hover:text-[var(--danger-color)]"
                onClick={() => void onRemove(key.id)}
              >
                Revoke
              </button>
            </span>
          </li>
        ))}
      </ul>
      <form className="space-y-3" onSubmit={(e) => void onCreate(e)}>
        <h3 className="text-sm font-semibold text-[var(--text-primary)]">New key</h3>
        <label className="block space-y-1 text-sm">
          <span className="text-[var(--text-secondary)]">Name</span>
          <input className={inputClass} value={name} aria-label="New API key name" onChange={(e) => setName(e.target.value)} />
        </label>
        <label className="block space-y-1 text-sm">
          <span className="text-[var(--text-secondary)]">User</span>
          <select className={inputClass} value={userId} aria-label="New API key user" onChange={(e) => setUserId(e.target.value)}>
            {users.map((user) => (
              <option key={user.id} value={user.id}>
                {user.username || user.id}
              </option>
            ))}
          </select>
        </label>
        <button type="submit" disabled={busy || !name.trim()} className={saveBtnClass}>
          {busy ? 'Saving…' : 'Create API key'}
        </button>
      </form>
    </div>
  );
}

function BackupsPane() {
  const [backups, setBackups] = useState<HouseholdBackup[]>([]);
  const [available, setAvailable] = useState<boolean | null>(null);
  const [restoreDir, setRestoreDir] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [flash, setFlash] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function reload() {
    const next = await api.listBackups();
    setAvailable(next.available);
    setRestoreDir(next.restoreDir);
    setBackups(next.backups);
  }

  useEffect(() => {
    let cancelled = false;
    void api
      .listBackups()
      .then((next) => {
        if (cancelled) return;
        setAvailable(next.available);
        setRestoreDir(next.restoreDir);
        setBackups(next.backups);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Could not load backups');
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function onCreate() {
    setBusy(true);
    setError(null);
    setFlash(null);
    try {
      await api.createBackup();
      setFlash('Backup created');
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create backup');
    } finally {
      setBusy(false);
    }
  }

  async function onRemove(id: string) {
    setBusy(true);
    setError(null);
    setFlash(null);
    try {
      await api.deleteBackup(id);
      setFlash('Backup removed');
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not delete backup');
    } finally {
      setBusy(false);
    }
  }

  async function onRestore(id: string) {
    setBusy(true);
    setError(null);
    setFlash(null);
    try {
      const next = await api.restoreBackup(id);
      setFlash(`Restored ${next.filesRestored} files into ${next.restoreDir || restoreDir || 'the restore directory'}`);
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not restore backup');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={paneClass} data-testid="settings-backups">
      <h2 className="font-semibold text-[var(--text-primary)]">Backups</h2>
      <p className="text-sm text-[var(--text-secondary)]">
        Archive household auth, library databases, and userdata. Restore extracts into the
        configured restore directory — it does not overwrite live files in place.
      </p>
      {error ? (
        <p className="text-sm text-[var(--danger-color)]" role="alert">
          {error}
        </p>
      ) : null}
      {flash ? (
        <p className="text-sm text-[var(--text-secondary)]" data-testid="backup-flash">
          {flash}
        </p>
      ) : null}
      {available === false ? (
        <p className="text-sm text-[var(--text-tertiary)]">
          backup-local is not available. Enable the backup-local compose profile or
          MVP_ENABLE_BACKUP_LOCAL=1.
        </p>
      ) : null}
      {restoreDir ? (
        <p className="text-sm text-[var(--text-tertiary)]">Restore directory: {restoreDir}</p>
      ) : (
        <p className="text-sm text-[var(--text-tertiary)]">
          Restore is disabled until BACKUP_RESTORE_DIR is set on the media UI.
        </p>
      )}
      <ul className="space-y-2" data-testid="backup-list">
        {backups.map((row) => (
          <li key={row.id} className="flex items-center justify-between gap-3 text-sm">
            <span className="min-w-0 truncate text-[var(--text-secondary)]">
              {row.id}
              {row.createdAt ? ` · ${row.createdAt}` : ''}
              {` · ${backupSizeLabel(row.sizeBytes)}`}
            </span>
            <span className="flex shrink-0 gap-3">
              <button
                type="button"
                disabled={busy || !restoreDir}
                className="text-[var(--text-tertiary)] hover:text-[var(--text-primary)]"
                onClick={() => void onRestore(row.id)}
              >
                Restore
              </button>
              <button
                type="button"
                disabled={busy}
                className="text-[var(--text-tertiary)] hover:text-[var(--danger-color)]"
                onClick={() => void onRemove(row.id)}
              >
                Remove
              </button>
            </span>
          </li>
        ))}
      </ul>
      <button type="button" disabled={busy} className={saveBtnClass} onClick={() => void onCreate()}>
        {busy ? 'Working…' : 'Create backup'}
      </button>
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
  else if (pathname.endsWith('/acquisition') && canManageAcquisition() && featureEnabled(caps, 'acquisition')) pane = <AcquisitionPane />;
  else if (pathname.endsWith('/quality') && canManageQuality() && featureEnabled(caps, 'formats')) pane = <QualityPane />;
  else if (pathname.endsWith('/libraries') && canManageLibrary()) pane = <LibrariesPane />;
  else if (pathname.endsWith('/maintainer') && canManageLibrary()) pane = <MaintainerPane />;
  else if (pathname.endsWith('/guard') && canManageLibrary()) pane = <GuardPane />;
  else if (pathname.endsWith('/naming') && canManageNaming()) pane = <NamingPane />;
  else if (pathname.endsWith('/lists') && canManageLists()) pane = <ListsPane />;
  else if (pathname.endsWith('/migrate') && canManageMigrate()) pane = <MigratePane />;
  else if (pathname.endsWith('/users') && canManageUsers()) pane = <UsersPane />;
  else if (pathname.endsWith('/keys') && canManageKeys()) pane = <KeysPane />;
  else if (pathname.endsWith('/invites') && canManageInvites()) pane = <InvitesPane />;
  else if (pathname.endsWith('/delay') && canManageQuality() && featureEnabled(caps, 'activity')) pane = <DelayPane />;
  else if (pathname.endsWith('/tags') && canManageTags()) pane = <TagsPane />;
  else if (pathname.endsWith('/backups') && canManageBackups()) pane = <BackupsPane />;
  else if (pathname.endsWith('/notifications')) pane = <NotificationsPane />;
  else if (pathname.endsWith('/requests') && canManageRequestPolicy() && featureEnabled(caps, 'request')) {
    pane = <RequestsPane />;
  }

  const showDebrid = featureEnabled(caps, 'debrid');
  const showRequests = canManageRequestPolicy() && featureEnabled(caps, 'request');
  const showAcquisition = canManageAcquisition() && featureEnabled(caps, 'acquisition');
  const showQuality = canManageQuality() && featureEnabled(caps, 'formats');
  const showLibraries = canManageLibrary();
  const showNaming = canManageNaming();
  const showLists = canManageLists();
  const showMigrate = canManageMigrate();
  const showUsers = canManageUsers();
  const showKeys = canManageKeys();
  const showInvites = canManageInvites();
  const showDelay = canManageQuality() && featureEnabled(caps, 'activity');
  const showTags = canManageTags();
  const showBackups = canManageBackups();

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
        {showAcquisition && (
          <NavLink to="/settings/acquisition" className={tabClass}>
            <PlugZap className="h-4 w-4" aria-hidden="true" />
            Acquisition
          </NavLink>
        )}
        {showQuality && (
          <NavLink to="/settings/quality" className={tabClass}>
            <Layers className="h-4 w-4" aria-hidden="true" />
            Quality
          </NavLink>
        )}
        {showLibraries && (
          <NavLink to="/settings/libraries" className={tabClass}>
            <Folder className="h-4 w-4" aria-hidden="true" />
            Libraries
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
        {showNaming && (
          <NavLink to="/settings/naming" className={tabClass}>
            <Pencil className="h-4 w-4" aria-hidden="true" />
            Naming
          </NavLink>
        )}
        {showTags && (
          <NavLink to="/settings/tags" className={tabClass}>
            <Tags className="h-4 w-4" aria-hidden="true" />
            Tags
          </NavLink>
        )}
        {showBackups && (
          <NavLink to="/settings/backups" className={tabClass}>
            <Archive className="h-4 w-4" aria-hidden="true" />
            Backups
          </NavLink>
        )}
        {showLists && (
          <NavLink to="/settings/lists" className={tabClass}>
            <List className="h-4 w-4" aria-hidden="true" />
            Lists
          </NavLink>
        )}
        {showMigrate && (
          <NavLink to="/settings/migrate" className={tabClass}>
            <Import className="h-4 w-4" aria-hidden="true" />
            Import
          </NavLink>
        )}
        {showUsers && (
          <NavLink to="/settings/users" className={tabClass}>
            <Users className="h-4 w-4" aria-hidden="true" />
            Users
          </NavLink>
        )}
        {showKeys && (
          <NavLink to="/settings/keys" className={tabClass}>
            <KeyRound className="h-4 w-4" aria-hidden="true" />
            API keys
          </NavLink>
        )}
        {showInvites && (
          <NavLink to="/settings/invites" className={tabClass}>
            <Mail className="h-4 w-4" aria-hidden="true" />
            Invites
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
