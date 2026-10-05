import { FormEvent, useEffect, useState } from 'react';
import { api, type ViewerProfile, type ViewerProfiles } from '../api/client';
import { replaceUserdataFromServer } from '../lib/userdata';

const fieldClass =
  'w-full rounded-[var(--radius-sm)] border border-[var(--border-subtle)] bg-[var(--bg-base)] px-3 py-2 text-sm outline-none focus:border-[var(--accent-color)]';
const buttonClass =
  'rounded-[var(--radius-md)] bg-[var(--accent-color)] px-4 py-2 text-sm font-semibold text-black transition hover:bg-[var(--accent-hover)] disabled:opacity-60';

const emptyList: ViewerProfiles = {
  active_id: 'primary',
  profiles: [{ id: 'primary', name: 'Primary', kids: false, pin_set: false }],
};

export function HouseholdProfiles() {
  const [list, setList] = useState<ViewerProfiles>(emptyList);
  const [selected, setSelected] = useState('primary');
  const [pin, setPin] = useState('');
  const [name, setName] = useState('');
  const [kids, setKids] = useState(true);
  const [newPin, setNewPin] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void api.listViewerProfiles().then((next) => {
      if (cancelled) return;
      setList(next);
      setSelected(next.active_id || 'primary');
    }).catch((err: unknown) => {
      if (!cancelled) setError(err instanceof Error ? err.message : 'Could not load profiles');
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const active = list.profiles.find((p) => p.id === list.active_id);
  const needsPin = Boolean(active?.pin_set && selected !== list.active_id);

  async function onSwitch(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const next = await api.activateViewerProfile(selected, needsPin ? pin : undefined);
      setList(next);
      setPin('');
      await replaceUserdataFromServer();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not switch profile');
    } finally {
      setBusy(false);
    }
  }

  async function onCreate(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const next = await api.createViewerProfile({
        name: name.trim(),
        kids,
        pin: newPin.trim() || undefined,
        current_pin: active?.pin_set ? pin : undefined,
      });
      setList(next);
      setName('');
      setNewPin('');
      setPin('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not add profile');
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="space-y-3 border-t border-[var(--border-subtle)] pt-4" data-testid="household-profiles">
      <h3 className="text-sm font-semibold text-[var(--text-primary)]">Household profiles</h3>
      <p className="text-sm text-[var(--text-secondary)]">
        Each profile keeps its own watch progress and parental settings. A PIN is required to leave a profile that has one.
      </p>
      <form className="space-y-3" onSubmit={(e) => void onSwitch(e)}>
        <ul className="space-y-2">
          {list.profiles.map((profile) => (
            <li key={profile.id}>
              <label className="flex items-center gap-2 text-sm text-[var(--text-primary)]">
                <input
                  type="radio"
                  name="viewer-profile"
                  value={profile.id}
                  checked={selected === profile.id}
                  onChange={() => setSelected(profile.id)}
                />
                <ProfileLabel profile={profile} active={profile.id === list.active_id} />
              </label>
            </li>
          ))}
        </ul>
        {needsPin ? (
          <label className="block space-y-1 text-sm">
            <span className="text-[var(--text-secondary)]">PIN to leave {active?.name ?? 'this profile'}</span>
            <input
              className={fieldClass}
              inputMode="numeric"
              autoComplete="off"
              aria-label="Profile PIN"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
            />
          </label>
        ) : null}
        <button type="submit" className={buttonClass} disabled={busy || selected === list.active_id}>
          {busy ? 'Working…' : 'Switch profile'}
        </button>
      </form>
      <form className="space-y-3" onSubmit={(e) => void onCreate(e)} data-testid="household-profile-create">
        <label className="block space-y-1 text-sm">
          <span className="text-[var(--text-secondary)]">New profile name</span>
          <input
            className={fieldClass}
            aria-label="New profile name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </label>
        <label className="flex items-center gap-2 text-sm text-[var(--text-primary)]">
          <input type="checkbox" checked={kids} onChange={(e) => setKids(e.target.checked)} />
          Kids profile (PG ceiling)
        </label>
        <label className="block space-y-1 text-sm">
          <span className="text-[var(--text-secondary)]">PIN for this profile (optional)</span>
          <input
            className={fieldClass}
            inputMode="numeric"
            autoComplete="off"
            aria-label="New profile PIN"
            value={newPin}
            onChange={(e) => setNewPin(e.target.value)}
          />
        </label>
        {active?.pin_set ? (
          <label className="block space-y-1 text-sm">
            <span className="text-[var(--text-secondary)]">Current profile PIN</span>
            <input
              className={fieldClass}
              inputMode="numeric"
              autoComplete="off"
              aria-label="Current profile PIN"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
            />
          </label>
        ) : null}
        <button type="submit" className={buttonClass} disabled={busy || name.trim() === ''}>
          Add profile
        </button>
      </form>
      {error ? <p className="text-sm text-red-400" role="alert">{error}</p> : null}
    </section>
  );
}

function ProfileLabel({ profile, active }: { profile: ViewerProfile; active: boolean }) {
  const bits = [profile.name];
  if (profile.kids) bits.push('kids');
  if (profile.pin_set) bits.push('PIN');
  if (active) bits.push('active');
  return <span>{bits.join(' · ')}</span>;
}
