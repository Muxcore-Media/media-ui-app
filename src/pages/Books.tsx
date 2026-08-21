import { useCallback } from 'react'
import { api } from '../api/client'
import LibrarySection from './LibrarySection'

export default function Books() {
  const load = useCallback(() => api.listBooks(), [])
  return (
    <LibrarySection
      title="Books"
      description="Browse authors and their books."
      load={load}
      primaryLabel={(row) => row.name || row.title || row.id}
      emptyReadyMessage="No books in your library yet."
      rowHref={(row) => `/books/${encodeURIComponent(row.id)}`}
    />
  )
}
