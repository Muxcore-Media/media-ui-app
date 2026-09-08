export type AlternateTitle = {
  id: string;
  title: string;
  cleanTitle: string;
  source: string;
  user: boolean;
};

export type AlternateTitlesResponse = {
  available: boolean;
  titles: AlternateTitle[];
};

function asRecord(raw: unknown): Record<string, unknown> {
  return raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
}

export function normalizeAlternateTitle(raw: unknown): AlternateTitle {
  const rec = asRecord(raw);
  const source = String(rec.source ?? '');
  return {
    id: String(rec.id ?? ''),
    title: String(rec.title ?? ''),
    cleanTitle: String(rec.clean_title ?? rec.cleanTitle ?? ''),
    source,
    user: rec.user === true || source === 'user',
  };
}

export function normalizeAlternateTitles(raw: unknown): AlternateTitlesResponse {
  const rec = asRecord(raw);
  const rows = Array.isArray(rec.titles) ? rec.titles : [];
  return {
    available: rec.available === true,
    titles: rows.map(normalizeAlternateTitle).filter((row) => row.id || row.title),
  };
}

export function titlesPath(kind: 'movie' | 'tv', id: string): string {
  const root = kind === 'tv' ? '/api/tv' : '/api/movies';
  return `${root}/${encodeURIComponent(id)}/titles`;
}
