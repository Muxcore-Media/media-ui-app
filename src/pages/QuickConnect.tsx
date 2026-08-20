import { FormEvent, useState } from 'react'
import { api } from '../api/client'

/** Jellyfin Quick Connect: approve a code shown on another device. */
export default function QuickConnect() {
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
      setMessage(res.message || `Code “${c}” authorized.`)
    } catch (err) {
      setOk(false)
      setMessage(err instanceof Error ? err.message : 'Authorization failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mx-auto max-w-md space-y-6" data-testid="quickconnect-page">
      <div>
        <h1 className="text-2xl font-bold">Quick Connect</h1>
        <p className="text-sm text-[var(--muted)]">
          Approve a TV or other client the way Jellyfin Quick Connect does.
        </p>
      </div>
      <form onSubmit={onSubmit} className="space-y-3 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4">
        <label className="block space-y-1 text-sm">
          <span>Code</span>
          <input
            value={code}
            onChange={(e) => setCode(e.target.value)}
            className="w-full rounded-md border border-[var(--border)] bg-[var(--bg)] px-3 py-2 tracking-widest"
            placeholder="123456"
            inputMode="numeric"
          />
        </label>
        <button
          type="submit"
          disabled={busy}
          className="rounded-md bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-black disabled:opacity-60"
        >
          {busy ? 'Authorizing…' : 'Authorize'}
        </button>
        {message && (
          <p className={`text-sm ${ok ? 'text-emerald-400' : 'text-[var(--muted)]'}`}>{message}</p>
        )}
      </form>
    </div>
  )
}
