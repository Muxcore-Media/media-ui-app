/** Contact-admin password reset — auth-local has no self-service email flow. */
import { useState, type FormEvent } from 'react'

export default function ForgotPassword() {
  const [username, setUsername] = useState('')
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState<string | null>(null)

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    setDone(null)
    try {
      const res = await fetch('/api/password-reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ username: username.trim(), note: note.trim() }),
      })
      const data = (await res.json().catch(() => ({}))) as { error?: string; message?: string }
      if (!res.ok) {
        throw new Error(data.error || `Request failed (${res.status})`)
      }
      setDone(
        data.message ||
          'Request submitted. Your administrator will reset your password soon.',
      )
      setUsername('')
      setNote('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Request failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mx-auto max-w-md space-y-4" data-testid="forgot-password-page">
      <h1 className="text-2xl font-bold tracking-tight text-[var(--text-primary)]">Forgot password</h1>
      <p className="text-sm text-[var(--text-secondary)]">
        Enter your username and we&apos;ll notify your administrator to reset your password.
      </p>

      {done && (
        <p
          className="rounded-[var(--radius-md)] border border-[var(--success)]/40 bg-[var(--bg-elevated)] px-4 py-3 text-sm text-[var(--success)]"
          data-testid="forgot-password-success"
        >
          {done}
        </p>
      )}
      {error && (
        <p className="rounded-[var(--radius-md)] border border-[var(--danger-color)]/40 bg-[var(--bg-elevated)] px-4 py-3 text-sm text-[var(--danger-color)]">
          {error}
        </p>
      )}

      <form
        onSubmit={onSubmit}
        className="space-y-3 rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--bg-elevated)] p-4"
      >
        <label className="block space-y-1 text-sm">
          <span className="text-[var(--text-secondary)]">Username</span>
          <input
            name="username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
            autoComplete="username"
            className="w-full rounded-[var(--radius-sm)] border border-[var(--border-subtle)] bg-[var(--bg-elevated-2)] px-3 py-2 text-sm outline-none focus:border-[var(--accent-color)]"
            data-testid="forgot-password-username"
          />
        </label>
        <label className="block space-y-1 text-sm">
          <span className="text-[var(--text-secondary)]">Message (optional)</span>
          <textarea
            name="note"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={2}
            className="w-full rounded-[var(--radius-sm)] border border-[var(--border-subtle)] bg-[var(--bg-elevated-2)] px-3 py-2 text-sm outline-none focus:border-[var(--accent-color)]"
          />
        </label>
        <button
          type="submit"
          disabled={busy || !username.trim()}
          className="rounded-[var(--radius-md)] bg-[var(--accent-color)] px-4 py-2 text-sm font-semibold text-black transition hover:bg-[var(--accent-hover)] disabled:opacity-50"
          data-testid="forgot-password-submit"
        >
          {busy ? 'Submitting…' : 'Send reset request'}
        </button>
      </form>

      <div className="flex flex-wrap gap-3">
        <a
          href="/login"
          className="rounded-[var(--radius-md)] bg-[var(--accent-color)] px-4 py-2 text-sm font-semibold text-black transition hover:bg-[var(--accent-hover)]"
        >
          Back to login
        </a>
        <a
          href="/quickconnect"
          className="rounded-[var(--radius-md)] border border-[var(--border-subtle)] px-4 py-2 text-sm font-semibold text-[var(--text-secondary)] transition hover:text-[var(--text-primary)]"
        >
          Quick Connect
        </a>
      </div>
    </div>
  )
}
