import { type FormEvent, useId, useState } from 'react'
import { KeyRound } from 'lucide-react'
import { api } from '../api/client'

/** Jellyfin Quick Connect: approve a code shown on another device. */
export default function QuickConnect() {
  const codeInputId = useId()
  const [code, setCode] = useState('')
  const [message, setMessage] = useState<string | null>(null)
  const [ok, setOk] = useState(false)
  const [busy, setBusy] = useState(false)

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    const c = code.trim()
    if (c.length < 4) {
      setMessage('Enter the code shown on your other device.')
      setOk(false)
      return
    }
    setBusy(true)
    try {
      const res = await api.approveQuickConnect(c)
      setOk(true)
      setMessage(res.message || `Code "${c}" authorized.`)
    } catch (err) {
      setOk(false)
      setMessage(err instanceof Error ? err.message : 'Authorization failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mx-auto max-w-md space-y-6" data-testid="quickconnect-page">
      <header className="flex flex-col items-center gap-2 text-center">
        <span className="flex h-11 w-11 items-center justify-center rounded-full bg-[var(--bg-elevated-2)] text-[var(--accent-color)]">
          <KeyRound className="h-5 w-5" aria-hidden="true" />
        </span>
        <h1 className="text-2xl font-bold tracking-tight text-[var(--text-primary)]">Quick Connect</h1>
        <p className="text-sm text-[var(--text-secondary)]">
          Enter the code shown on your TV or other device to sign in.
        </p>
      </header>
      <form
        onSubmit={onSubmit}
        className="space-y-3 rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--bg-elevated)] p-4"
        aria-labelledby="quickconnect-form-heading"
      >
        <h2 id="quickconnect-form-heading" className="sr-only">
          Authorize device
        </h2>
        <label htmlFor={codeInputId} className="block space-y-1 text-sm">
          <span className="text-[var(--text-secondary)]">Code</span>
          <input
            id={codeInputId}
            value={code}
            onChange={(e) => setCode(e.target.value)}
            className="w-full rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--bg-base)] px-3 py-2 text-center text-lg tracking-widest outline-none focus:border-[var(--accent-color)]"
            placeholder="123456"
            inputMode="numeric"
            autoComplete="one-time-code"
            required
            aria-required="true"
          />
        </label>
        <button
          type="submit"
          disabled={busy}
          aria-busy={busy}
          className="w-full rounded-[var(--radius-md)] bg-[var(--accent-color)] px-4 py-2 text-sm font-semibold text-black transition hover:bg-[var(--accent-hover)] disabled:opacity-60"
        >
          {busy ? 'Authorizing…' : 'Authorize'}
        </button>
        {message && (
          <p
            role={ok ? 'status' : 'alert'}
            className={`text-sm ${ok ? 'text-[var(--success)]' : 'text-[var(--text-secondary)]'}`}
          >
            {message}
          </p>
        )}
      </form>
    </div>
  )
}
