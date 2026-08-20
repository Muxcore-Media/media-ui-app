import { useCallback } from 'react'
import { api } from '../api/client'
import LibrarySection from './LibrarySection'

export default function Books() {
  const load = useCallback(() => api.listBooks(), [])
  return (
    <LibrarySection
      title="Books"
      description="Author library from media-books. Open an author for titles and ebook files."
      load={load}
      primaryLabel={(row) => row.name || row.title || row.id}
      secondaryLabel={(row) => row.path || ''}
      emptyReadyMessage="No authors in the books library yet. Scan a library root in media-books."
      rowHref={(row) => `/books/${encodeURIComponent(row.id)}`}
    />
  )
}
