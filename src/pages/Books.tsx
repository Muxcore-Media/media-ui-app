import { useCallback } from 'react'
import { api } from '../api/client'
import LibrarySection from './LibrarySection'

export default function Books() {
  const load = useCallback(() => api.listBooks(), [])
  return (
    <LibrarySection
      title="Books"
      description="Author library from media-books via mediauiprox GET /api/books."
      load={load}
      primaryLabel={(row) => row.name || row.title || row.id}
      secondaryLabel={(row) => row.path || ''}
      emptyReadyMessage="No authors in the books library yet. Scan a library root in media-books."
    />
  )
}
