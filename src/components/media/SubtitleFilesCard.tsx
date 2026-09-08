import { useEffect, useState, type ChangeEvent, type FormEvent } from 'react';
import { api } from '../../api/client';
import {
  subtitleFileLabel,
  subtitleTargetLabel,
  type ItemSubtitleFile,
  type ItemSubtitleTarget,
} from '../../lib/item-subtitles';
import { canManageSubtitles } from '../../lib/session';

function readFileData(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(reader.error ?? new Error('Could not read subtitle'));
    reader.readAsDataURL(file);
  });
}

export function SubtitleFilesCard({
  kind,
  id,
}: {
  kind: 'movie' | 'tv';
  id: string;
}) {
  const canEdit = canManageSubtitles();
  const [items, setItems] = useState<ItemSubtitleFile[]>([]);
  const [files, setFiles] = useState<ItemSubtitleTarget[]>([]);
  const [available, setAvailable] = useState<boolean | null>(null);
  const [language, setLanguage] = useState('eng');
  const [mediaFileId, setMediaFileId] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [flash, setFlash] = useState<string | null>(null);

  async function reload() {
    const next = await api.listItemSubtitles(kind, id);
    setAvailable(next.available);
    setItems(next.items);
    setFiles(next.files);
    setMediaFileId((cur) => cur || next.files[0]?.id || '');
  }

  useEffect(() => {
    let cancelled = false;
    void api
      .listItemSubtitles(kind, id)
      .then((next) => {
        if (cancelled) return;
        setAvailable(next.available);
        setItems(next.items);
        setFiles(next.files);
        setMediaFileId(next.files[0]?.id || '');
      })
      .catch(() => {
        if (!cancelled) setAvailable(false);
      });
    return () => {
      cancelled = true;
    };
  }, [kind, id]);

  async function onUpload(e: FormEvent) {
    e.preventDefault();
    const form = e.currentTarget as HTMLFormElement;
    const input = form.elements.namedItem('subtitle-file') as HTMLInputElement | null;
    const file = input?.files?.[0];
    if (!file || !id) return;
    setBusy(true);
    setError(null);
    setFlash(null);
    try {
      const data = await readFileData(file);
      const next = await api.uploadItemSubtitle(kind, id, {
        language,
        filename: file.name,
        data,
        mediaFileId,
      });
      setAvailable(true);
      setItems((cur) => (next.id ? [next, ...cur.filter((row) => row.id !== next.id)] : cur));
      setFlash(`${subtitleFileLabel(next)} uploaded`);
      if (input) input.value = '';
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not upload subtitle');
    } finally {
      setBusy(false);
    }
  }

  async function onDelete(fileId: string) {
    setBusy(true);
    setError(null);
    setFlash(null);
    try {
      await api.deleteItemSubtitle(fileId);
      setItems((cur) => cur.filter((row) => row.id !== fileId));
      setFlash('Subtitle deleted');
      await reload().catch(() => undefined);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not delete subtitle');
    } finally {
      setBusy(false);
    }
  }

  if (available === false && !canEdit) return null;

  return (
    <section className="min-w-0 space-y-2" data-testid="item-subtitles">
      <h3 className="text-sm font-semibold text-[var(--text-primary)]">Subtitle files</h3>
      <p className="text-sm text-[var(--text-secondary)]">
        Sidecar files stored for this title, like Bazarr. Delete a wrong language or upload an .srt.
      </p>
      {error ? <p className="text-sm text-[var(--danger-color)]">{error}</p> : null}
      {flash ? <p className="text-sm text-[var(--text-secondary)]" data-testid="item-subtitles-flash">{flash}</p> : null}
      {available === true && items.length === 0 ? (
        <p className="text-sm text-[var(--text-tertiary)]">No subtitle files yet.</p>
      ) : null}
      <ul className="space-y-2" data-testid="item-subtitles-list">
        {items.map((row) => (
          <li key={row.id} className="flex flex-wrap items-center justify-between gap-3 text-sm">
            <span className="text-[var(--text-secondary)]">
              {subtitleFileLabel(row)}
              {row.filename ? ` · ${row.filename}` : ''}
            </span>
            {canEdit ? (
              <button
                type="button"
                disabled={busy || !row.id}
                className="text-[var(--text-tertiary)] hover:text-[var(--danger-color)]"
                onClick={() => void onDelete(row.id)}
              >
                Delete
              </button>
            ) : null}
          </li>
        ))}
      </ul>
      {canEdit ? (
        <form className="flex flex-wrap items-end gap-2" onSubmit={(e) => void onUpload(e)} data-testid="item-subtitles-upload">
          {files.length > 1 ? (
            <label className="space-y-1 text-sm">
              <span className="text-[var(--text-secondary)]">Episode</span>
              <select
                className="block rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-transparent px-2 py-1"
                value={mediaFileId}
                aria-label="Subtitle video file"
                onChange={(e) => setMediaFileId(e.target.value)}
              >
                {files.map((row) => (
                  <option key={row.id} value={row.id}>
                    {subtitleTargetLabel(row)}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
          <label className="space-y-1 text-sm">
            <span className="text-[var(--text-secondary)]">Language</span>
            <input
              className="block w-20 rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-transparent px-2 py-1"
              value={language}
              aria-label="Subtitle language"
              onChange={(e: ChangeEvent<HTMLInputElement>) => setLanguage(e.target.value)}
            />
          </label>
          <label className="text-sm text-[var(--text-tertiary)]">
            <span className="sr-only">Upload subtitle</span>
            <input
              type="file"
              name="subtitle-file"
              accept=".srt,.vtt,.ass,.sub,.ssa"
              disabled={busy || !id}
              aria-label="Upload subtitle"
            />
          </label>
          <button
            type="submit"
            disabled={busy}
            className="rounded-[var(--radius-md)] border border-[var(--border-subtle)] px-3 py-1 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
          >
            {busy ? 'Uploading…' : 'Upload'}
          </button>
        </form>
      ) : null}
    </section>
  );
}
