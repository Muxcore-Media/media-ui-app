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
          'Request recorded. Contact your administrator — they can reset your password from Admin → Users.',
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
      <h1 className="text-2xl font-bold">Forgot password</h1>
      <p className="text-sm text-[var(--muted)]">
        MuxCore uses auth-local for credentials. There is no email reset unless you configure fixture SMTP.
        Submit your username so an admin can reset it from Admin → Users.
      </p>

      {done && (
        <p
          className="rounded-md border border-emerald-800/40 bg-[var(--surface)] px-4 py-3 text-sm text-emerald-200"
          data-testid="forgot-password-success"
        >
          {done}
        </p>
      )}
      {error && (
        <p className="rounded-md border border-[var(--danger)]/40 bg-[var(--surface)] px-4 py-3 text-sm text-[var(--danger)]">
          {error}
        </p>
      )}

      <form onSubmit={onSubmit} className="space-y-3 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4">
        <label className="block space-y-1 text-sm">
          <span className="text-[var(--muted)]">Username</span>
          <input
            name="username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
            autoComplete="username"
            className="w-full rounded-md border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2"
            data-testid="forgot-password-username"
          />
        </label>
        <label className="block space-y-1 text-sm">
          <span className="text-[var(--muted)]">Optional note for admin</span>
          <textarea
            name="note"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={2}
            className="w-full rounded-md border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2"
          />
        </label>
        <button
          type="submit"
          disabled={busy || !username.trim()}
          className="rounded-md bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-black disabled:opacity-50"
          data-testid="forgot-password-submit"
        >
          {busy ? 'Submitting…' : 'Request admin reset'}
        </button>
      </form>

      <div className="flex flex-wrap gap-3">
        <a href="/login" className="rounded-md bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-black">
          Back to login
        </a>
        <a href="/quickconnect" className="rounded-md border border-[var(--border)] px-4 py-2 text-sm font-semibold">
          Quick Connect
        </a>
      </div>
    </div>
  )
}
