import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Link, useParams } from 'react-router-dom';
import { UserPlus } from 'lucide-react';

type PeekResponse = {
  valid?: boolean;
  role?: string;
  expires_at?: string;
  error?: string;
};

/** Wizarr-style household invite signup on the consumer SPA (proxied to auth-local). */
export default function InviteJoin() {
  const { token: routeToken } = useParams();
  const token = (routeToken || '').trim();

  const [role, setRole] = useState<string>('user');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [invalid, setInvalid] = useState(false);
  const loginRef = useRef<HTMLAnchorElement>(null);
  const errorRef = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    if (done) loginRef.current?.focus();
  }, [done]);

  useEffect(() => {
    if (error && !busy && !invalid) errorRef.current?.focus();
  }, [error, busy, invalid]);

  useEffect(() => {
    if (!token) {
      setInvalid(true);
      setError('Missing invite link — ask your administrator for a new invite.');
      setLoading(false);
      return;
    }
    let cancelled = false;
    void fetch(`/api/invite/peek?token=${encodeURIComponent(token)}`, {
      headers: { Accept: 'application/json' },
    })
      .then(async (res) => {
        const data = (await res.json().catch(() => ({}))) as PeekResponse;
        if (!res.ok) {
          throw new Error(data.error || `Invite invalid (${res.status})`);
        }
        if (!cancelled) {
          setRole(data.role || 'user');
          setInvalid(false);
          setError(null);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setInvalid(true);
          setError(err instanceof Error ? err.message : 'Invite link invalid or expired');
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [token]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!token) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/invite/redeem', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({
          token,
          username: username.trim(),
          password,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string; username?: string };
      if (!res.ok) {
        throw new Error(data.error || `Signup failed (${res.status})`);
      }
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Signup failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-md space-y-6 py-8" data-testid="invite-join-page">
      <div className="flex items-center gap-3">
        <div
          className="flex h-11 w-11 items-center justify-center rounded-[var(--radius-md)] bg-[var(--accent-color)] text-lg font-bold text-black"
          aria-hidden="true"
        >
          M
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[var(--text-primary)]">
            Join your household
          </h1>
          <p className="text-sm text-[var(--text-secondary)]">
            Create your account with an invite link.
          </p>
        </div>
      </div>

      {loading && (
        <p role="status" className="text-sm text-[var(--text-secondary)]" data-testid="invite-join-loading">
          Checking invite…
        </p>
      )}

      {done && (
        <div
          className="space-y-3 rounded-[var(--radius-md)] border border-[var(--success)]/40 bg-[var(--bg-elevated)] p-4 text-sm"
          data-testid="invite-join-success"
        >
          <p id="invite-join-success-message" role="status" className="font-medium text-[var(--success)]">
            Account created — you can sign in now.
          </p>
          <a
            ref={loginRef}
            href="/login"
            aria-describedby="invite-join-success-message"
            className="inline-flex items-center gap-2 rounded-[var(--radius-md)] bg-[var(--accent-color)] px-4 py-2 font-semibold text-black transition hover:bg-[var(--accent-hover)]"
          >
            Go to login
          </a>
        </div>
      )}

      {!loading && !done && invalid && (
        <div
          role="alert"
          className="rounded-[var(--radius-md)] border border-[var(--danger-color)]/40 bg-[var(--bg-elevated)] px-4 py-3 text-sm text-[var(--danger-color)]"
          data-testid="invite-join-invalid"
        >
          {error || 'This invite link is invalid or expired.'}
        </div>
      )}

      {!loading && !done && !invalid && (
        <form
          onSubmit={onSubmit}
          className="space-y-4 rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--bg-elevated)] p-4"
          data-testid="invite-join-form"
        >
          <p className="text-sm text-[var(--text-secondary)]">
            You&apos;ll join as{' '}
            <span className="font-medium text-[var(--text-primary)]">{role}</span>.
          </p>
          {error && (
            <p ref={errorRef} role="alert" tabIndex={-1} className="rounded-[var(--radius-sm)] border border-[var(--danger-color)]/40 px-3 py-2 text-sm text-[var(--danger-color)]">
              {error}
            </p>
          )}
          <label className="block space-y-1 text-sm">
            <span className="text-[var(--text-secondary)]">Username</span>
            <input
              name="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              autoComplete="username"
              className="w-full rounded-[var(--radius-sm)] border border-[var(--border-subtle)] bg-[var(--bg-elevated-2)] px-3 py-2 outline-none focus:border-[var(--accent-color)]"
              data-testid="invite-join-username"
            />
          </label>
          <label className="block space-y-1 text-sm">
            <span className="text-[var(--text-secondary)]">Password</span>
            <input
              type="password"
              name="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
              autoComplete="new-password"
              className="w-full rounded-[var(--radius-sm)] border border-[var(--border-subtle)] bg-[var(--bg-elevated-2)] px-3 py-2 outline-none focus:border-[var(--accent-color)]"
              data-testid="invite-join-password"
            />
          </label>
          <button
            type="submit"
            disabled={busy || !username.trim() || password.length < 8}
            className="flex w-full items-center justify-center gap-2 rounded-[var(--radius-md)] bg-[var(--accent-color)] px-4 py-2.5 text-sm font-semibold text-black transition hover:bg-[var(--accent-hover)] disabled:opacity-50"
            data-testid="invite-join-submit"
          >
            <UserPlus className="h-4 w-4" aria-hidden="true" />
            {busy ? 'Creating account…' : 'Create account'}
          </button>
        </form>
      )}

      <p className="text-center text-xs text-[var(--text-tertiary)]">
        Already have an account?{' '}
        <a href="/login" className="font-medium text-[var(--accent-color)] hover:underline">
          Sign in
        </a>
        {' · '}
        <Link to="/" className="font-medium text-[var(--accent-color)] hover:underline">
          Browse library
        </Link>
      </p>
    </div>
  );
}
