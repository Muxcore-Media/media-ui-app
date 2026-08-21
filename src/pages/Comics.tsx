import { useCallback } from 'react'
import { api } from '../api/client'
import LibrarySection from './LibrarySection'

export default function Comics() {
  const load = useCallback(() => api.listComics(), [])
  return (
    <LibrarySection
      title="Comics"
      description="Browse comic series."
      load={load}
      primaryLabel={(row) => String(row.title || row.name || row.id)}
      secondaryLabel={(row) => String(row.publisher ?? '')}
      emptyReadyMessage="No comics in your library yet."
    />
  )
}
