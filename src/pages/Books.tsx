import { useCallback } from 'react';
import { api } from '../api/client';
import { AddArtistField } from '../components/media/AddArtistField';
import LibrarySection from './LibrarySection';

export default function Books() {
  const load = useCallback(() => api.listBooks(), []);
  return (
    <LibrarySection
      title="Books"
      description="Browse authors and their books."
      load={load}
      primaryLabel={(row) => row.name || row.title || row.id}
      emptyReadyMessage="Add an author or scan your books library to get started."
      rowHref={(row) => `/books/${encodeURIComponent(row.id)}`}
      addSlot={(reload) => (
        <AddArtistField
          nameLabel="Author name"
          submitLabel="Add author"
          testId="add-author"
          placeholder="Ursula K. Le Guin"
          onAdd={async ({ name }) => {
            await api.addBookAuthor({ name });
            await reload();
          }}
        />
      )}
    />
  );
}
