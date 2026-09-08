export type SubtitleWantedItem = {
  id: string;
  mediaId: string;
  title: string;
  language: string;
  mediaType: string;
  season: number;
  episode: number;
  imdbId: string;
  tmdbId: number;
};

export type SubtitleWantedResponse = {
  available: boolean;
  wanted: SubtitleWantedItem[];
  total: number;
};

export type SubtitleProvider = {
  id: string;
  name: string;
  enabled: boolean;
  implemented: boolean;
};

export type SubtitleProvidersResponse = {
  available: boolean;
  providers: SubtitleProvider[];
};

export type SubtitleHistoryItem = {
  id: string;
  title: string;
  language: string;
  provider: string;
  action: string;
  score: number;
  createdAt: string;
};

export type SubtitleHistoryResponse = {
  available: boolean;
  history: SubtitleHistoryItem[];
  total: number;
};

export type SubtitleLanguageReq = {
  language: string;
  hearingImpaired: boolean;
  forced: boolean;
};

export type SubtitleProfile = {
  id: string;
  name: string;
  languages: SubtitleLanguageReq[];
  isDefault: boolean;
};

export type SubtitleProfilesResponse = {
  available: boolean;
  profiles: SubtitleProfile[];
};

export type SubtitleBlacklistItem = {
  id: string;
  title: string;
  provider: string;
  language: string;
  reason: string;
  fileId: string;
  createdAt: string;
};

export type SubtitleBlacklistResponse = {
  available: boolean;
  entries: SubtitleBlacklistItem[];
  total: number;
};

export type SubtitleLibraryItem = {
  id: string;
  title: string;
  mediaType: string;
  monitored: boolean;
  languageProfileId: string;
  season: number;
  episode: number;
  seriesId: string;
  seriesName: string;
  year: number;
  hasFile: boolean;
};

export type SubtitleLibraryResponse = {
  available: boolean;
  items: SubtitleLibraryItem[];
  total: number;
};

export type SubtitleLibraryRow = {
  key: string;
  title: string;
  kind: 'movie' | 'series';
  mediaIds: string[];
  languageProfileId: string;
  monitored: boolean;
  year: number;
  episodeCount: number;
};

function asRecord(raw: unknown): Record<string, unknown> {
  return raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
}

export function normalizeWantedItem(raw: unknown): SubtitleWantedItem {
  const rec = asRecord(raw);
  return {
    id: String(rec.id ?? ''),
    mediaId: String(rec.media_id ?? rec.mediaId ?? ''),
    title: String(rec.title ?? ''),
    language: String(rec.language ?? ''),
    mediaType: String(rec.media_type ?? rec.mediaType ?? ''),
    season: Number(rec.season ?? 0),
    episode: Number(rec.episode ?? 0),
    imdbId: String(rec.imdb_id ?? rec.imdbId ?? ''),
    tmdbId: Number(rec.tmdb_id ?? rec.tmdbId ?? 0),
  };
}

export function normalizeWanted(raw: unknown): SubtitleWantedResponse {
  const rec = asRecord(raw);
  const rows = Array.isArray(rec.wanted) ? rec.wanted : [];
  return {
    available: rec.available === true,
    wanted: rows.map(normalizeWantedItem).filter((row) => row.id || row.title),
    total: Number(rec.total ?? rows.length),
  };
}

export function normalizeSubtitleProvider(raw: unknown): SubtitleProvider {
  const rec = asRecord(raw);
  return {
    id: String(rec.id ?? ''),
    name: String(rec.name ?? rec.id ?? ''),
    enabled: rec.enabled !== false,
    implemented: rec.implemented !== false,
  };
}

export function normalizeSubtitleProviders(raw: unknown): SubtitleProvidersResponse {
  const rec = asRecord(raw);
  const rows = Array.isArray(rec.providers) ? rec.providers : [];
  return {
    available: rec.available === true,
    providers: rows.map(normalizeSubtitleProvider).filter((row) => row.id),
  };
}

export function normalizeHistoryItem(raw: unknown): SubtitleHistoryItem {
  const rec = asRecord(raw);
  return {
    id: String(rec.id ?? ''),
    title: String(rec.title ?? ''),
    language: String(rec.language ?? ''),
    provider: String(rec.provider ?? ''),
    action: String(rec.action ?? ''),
    score: Number(rec.score ?? 0),
    createdAt: String(rec.created_at ?? rec.createdAt ?? ''),
  };
}

export function normalizeSubtitleHistory(raw: unknown): SubtitleHistoryResponse {
  const rec = asRecord(raw);
  const rows = Array.isArray(rec.history) ? rec.history : [];
  return {
    available: rec.available === true,
    history: rows.map(normalizeHistoryItem).filter((row) => row.id || row.title),
    total: Number(rec.total ?? rows.length),
  };
}

export function normalizeSubtitleProfile(raw: unknown): SubtitleProfile {
  const rec = asRecord(raw);
  const langs = Array.isArray(rec.languages) ? rec.languages : [];
  return {
    id: String(rec.id ?? ''),
    name: String(rec.name ?? ''),
    languages: langs.map((lang) => {
      const lr = asRecord(lang);
      return {
        language: String(lr.language ?? ''),
        hearingImpaired: lr.hearing_impaired === true || lr.hearingImpaired === true,
        forced: lr.forced === true,
      };
    }).filter((lr) => lr.language),
    isDefault: rec.is_default === true || rec.isDefault === true,
  };
}

export function normalizeSubtitleProfiles(raw: unknown): SubtitleProfilesResponse {
  const rec = asRecord(raw);
  const rows = Array.isArray(rec.profiles) ? rec.profiles : [];
  return {
    available: rec.available === true,
    profiles: rows.map(normalizeSubtitleProfile).filter((row) => row.id || row.name),
  };
}

export type SubtitleLanguage = {
  code: string;
  name: string;
};

export type SubtitleLanguagesResponse = {
  available: boolean;
  languages: SubtitleLanguage[];
};

export function normalizeSubtitleLanguage(raw: unknown): SubtitleLanguage {
  const rec = asRecord(raw);
  return {
    code: String(rec.code ?? ''),
    name: String(rec.name ?? rec.code ?? ''),
  };
}

export function normalizeSubtitleLanguages(raw: unknown): SubtitleLanguagesResponse {
  const rec = asRecord(raw);
  const rows = Array.isArray(rec.languages) ? rec.languages : [];
  return {
    available: rec.available === true,
    languages: rows.map(normalizeSubtitleLanguage).filter((row) => row.code),
  };
}

/** Prefer ISO-639-2 (eng) over 2-letter aliases when names collide. */
export function uniqueSubtitleLanguages(languages: SubtitleLanguage[]): SubtitleLanguage[] {
  const byName = new Map<string, SubtitleLanguage>();
  for (const lang of languages) {
    const key = lang.name.trim().toLowerCase() || lang.code;
    const prev = byName.get(key);
    if (!prev || (lang.code.length >= 3 && prev.code.length < 3)) {
      byName.set(key, lang);
    }
  }
  return [...byName.values()];
}

export function appendProfileLanguage(
  current: string,
  code: string,
  opts?: { hearingImpaired?: boolean; forced?: boolean },
): string {
  let token = code.trim().toLowerCase();
  if (!token) return current.trim();
  if (opts?.hearingImpaired) token += '+hi';
  if (opts?.forced) token += '+forced';
  const parts = current.split(',').map((part) => part.trim()).filter(Boolean);
  const base = token.split('+')[0];
  if (parts.some((part) => part.split('+')[0]?.toLowerCase() === base)) {
    return parts.join(', ');
  }
  return [...parts, token].join(', ');
}

export function profileLanguagesLabel(profile: SubtitleProfile): string {
  return profile.languages
    .map((lr) => {
      let label = lr.language;
      if (lr.hearingImpaired) label += '+HI';
      if (lr.forced) label += '+forced';
      return label;
    })
    .join(', ');
}

export function normalizeBlacklistItem(raw: unknown): SubtitleBlacklistItem {
  const rec = asRecord(raw);
  return {
    id: String(rec.id ?? ''),
    title: String(rec.title ?? ''),
    provider: String(rec.provider ?? ''),
    language: String(rec.language ?? ''),
    reason: String(rec.reason ?? ''),
    fileId: String(rec.file_id ?? rec.fileId ?? ''),
    createdAt: String(rec.created_at ?? rec.createdAt ?? ''),
  };
}

export function normalizeSubtitleBlacklist(raw: unknown): SubtitleBlacklistResponse {
  const rec = asRecord(raw);
  const rows = Array.isArray(rec.entries) ? rec.entries : Array.isArray(rec.blacklist) ? rec.blacklist : [];
  return {
    available: rec.available === true,
    entries: rows.map(normalizeBlacklistItem).filter((row) => row.id || row.title),
    total: Number(rec.total ?? rows.length),
  };
}

export function wantedWriteBody(input: { title: string; language?: string; mediaType?: string }): Record<string, unknown> {
  return {
    title: input.title,
    language: input.language,
    media_type: input.mediaType,
  };
}

export function normalizeSubtitleLibraryItem(raw: unknown): SubtitleLibraryItem {
  const rec = asRecord(raw);
  return {
    id: String(rec.id ?? ''),
    title: String(rec.title ?? ''),
    mediaType: String(rec.media_type ?? rec.mediaType ?? ''),
    monitored: rec.monitored === true,
    languageProfileId: String(rec.language_profile_id ?? rec.languageProfileId ?? ''),
    season: Number(rec.season ?? 0),
    episode: Number(rec.episode ?? 0),
    seriesId: String(rec.series_id ?? rec.seriesId ?? ''),
    seriesName: String(rec.series_name ?? rec.seriesName ?? ''),
    year: Number(rec.year ?? 0),
    hasFile: rec.has_file === true || rec.hasFile === true,
  };
}

export function normalizeSubtitleLibrary(raw: unknown): SubtitleLibraryResponse {
  const rec = asRecord(raw);
  const rows = Array.isArray(rec.items) ? rec.items : [];
  return {
    available: rec.available === true,
    items: rows.map(normalizeSubtitleLibraryItem).filter((row) => row.id || row.title),
    total: Number(rec.total ?? rows.length),
  };
}

function isSubtitleSeriesItem(item: SubtitleLibraryItem): boolean {
  const kind = item.mediaType.trim().toLowerCase();
  return Boolean(item.seriesId || item.seriesName) || kind === 'episode' || kind === 'tv' || kind === 'series';
}

/** Collapse episodes into one series row so operators assign a language profile like Bazarr. */
export function groupSubtitleLibrary(items: SubtitleLibraryItem[]): SubtitleLibraryRow[] {
  const groups = new Map<string, SubtitleLibraryItem[]>();
  for (const item of items) {
    const key = isSubtitleSeriesItem(item)
      ? `series:${item.seriesId || item.seriesName || item.id}`
      : `movie:${item.id || item.title}`;
    const bucket = groups.get(key) ?? [];
    bucket.push(item);
    groups.set(key, bucket);
  }
  const rows: SubtitleLibraryRow[] = [];
  for (const [key, bucket] of groups) {
    const first = bucket[0];
    if (!first) continue;
    const series = key.startsWith('series:');
    const profile = bucket.find((row) => row.languageProfileId)?.languageProfileId ?? '';
    rows.push({
      key,
      title: series ? first.seriesName || first.title : first.title,
      kind: series ? 'series' : 'movie',
      mediaIds: bucket.map((row) => row.id).filter(Boolean),
      languageProfileId: profile,
      monitored: bucket.every((row) => row.monitored),
      year: first.year,
      episodeCount: series ? bucket.length : 0,
    });
  }
  return rows;
}

export function massEditSubtitleBody(input: {
  mediaIds: string[];
  languageProfileId?: string;
  setMonitored?: boolean;
  monitored?: boolean;
}): Record<string, unknown> {
  return {
    media_ids: input.mediaIds,
    language_profile_id: input.languageProfileId,
    set_monitored: input.setMonitored === true,
    monitored: input.monitored === true,
  };
}
