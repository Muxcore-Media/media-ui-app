import { useEffect, useState, type ReactNode } from 'react'
import { api } from '../api/client'
import {
  CapabilitiesContext,
  DEFAULT_CAPABILITIES,
  type Capabilities,
} from '../lib/capabilities'

export default function CapabilitiesProvider({ children }: { children: ReactNode }) {
  const [caps, setCaps] = useState<Capabilities>(DEFAULT_CAPABILITIES)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    void api
      .getCapabilities()
      .then((next) => {
        if (!cancelled) {
          setCaps(next)
          setError(null)
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Could not load library settings')
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <CapabilitiesContext.Provider value={{ caps, loading, error }}>
      {children}
    </CapabilitiesContext.Provider>
  )
}
