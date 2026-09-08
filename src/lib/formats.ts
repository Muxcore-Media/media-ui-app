export type FormatRule = {
  field: string;
  op: string;
  value: string;
  negate: boolean;
};

export type QualityFormat = {
  id: string;
  name: string;
  score: number;
  ruleCount: number;
  rules: FormatRule[];
};

export type QualityProfile = {
  id: string;
  name: string;
  minScore: number;
  cutoffScore: number;
  upgradeAllowed: boolean;
  upgradeDelayMinutes: number;
  formatScores: Record<string, number>;
};

export type ReleaseProfile = {
  id: string;
  name: string;
  preferred: string[];
  mustContain: string[];
  mustNotContain: string[];
  preferredScore: number;
  enabled: boolean;
};

export type FormatsCatalog = {
  available: boolean;
  formats: QualityFormat[];
  profiles: QualityProfile[];
  releaseProfiles: ReleaseProfile[];
  sync?: {
    formatsUpserted: number;
    formatsSkipped: number;
    profilesUpserted: number;
    guidesPath: string;
    warnings: string[];
  };
};

export type ParsedQuality = {
  label: string;
  resolution: string;
  source: string;
  codec: string;
  hdr: boolean;
  score: number;
};

export type FormatScorePreview = {
  totalScore: number;
  qualityScore: number;
  formatScore: number;
  matches: { id: string; name: string; score: number }[];
  quality: ParsedQuality;
};

export function normalizeParsedQuality(raw: unknown): ParsedQuality {
  const row = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
  const quality =
    row.quality && typeof row.quality === 'object' ? (row.quality as Record<string, unknown>) : row;
  return {
    label: String(quality.label ?? ''),
    resolution: String(quality.resolution ?? ''),
    source: String(quality.source ?? ''),
    codec: String(quality.codec ?? ''),
    hdr: quality.hdr === true,
    score: asNumber(quality.score),
  };
}

export function parsedQualityLabel(q: ParsedQuality | null | undefined): string {
  if (!q) return '';
  if (q.label.trim()) return q.label.trim();
  return [q.resolution, q.source, q.codec, q.hdr ? 'HDR' : ''].filter(Boolean).join(' · ');
}

function normalizeFormatScores(raw: unknown): Record<string, number> {
  if (!raw || typeof raw !== 'object') return {};
  const out: Record<string, number> = {};
  for (const [id, value] of Object.entries(raw as Record<string, unknown>)) {
    if (!id.trim()) continue;
    out[id] = asNumber(value);
  }
  return out;
}

function normalizeTerms(raw: unknown): string[] {
  if (Array.isArray(raw)) {
    return raw.map((v) => String(v).trim()).filter(Boolean);
  }
  if (typeof raw === 'string') {
    return raw
      .split(/[,;\n]/)
      .map((v) => v.trim())
      .filter(Boolean);
  }
  return [];
}

export function normalizeReleaseProfile(raw: unknown): ReleaseProfile {
  const row = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
  return {
    id: String(row.id ?? ''),
    name: String(row.name ?? ''),
    preferred: normalizeTerms(row.preferred),
    mustContain: normalizeTerms(row.must_contain ?? row.mustContain),
    mustNotContain: normalizeTerms(row.must_not_contain ?? row.mustNotContain),
    preferredScore: asNumber(row.preferred_score ?? row.preferredScore),
    enabled: row.enabled !== false,
  };
}

export function releaseProfileWriteBody(input: {
  name: string;
  preferred?: string[];
  mustContain?: string[];
  mustNotContain?: string[];
  preferredScore?: number;
  enabled?: boolean;
}): Record<string, unknown> {
  return {
    name: input.name,
    preferred: input.preferred ?? [],
    must_contain: input.mustContain ?? [],
    must_not_contain: input.mustNotContain ?? [],
    preferred_score: input.preferredScore ?? 0,
    enabled: input.enabled,
  };
}

export function releaseTermsText(terms: string[]): string {
  return terms.join(', ');
}

export function parseReleaseTerms(text: string): string[] {
  return text
    .split(/[,;\n]/)
    .map((v) => v.trim())
    .filter(Boolean);
}

export function normalizeQualityProfile(raw: unknown): QualityProfile {
  const row = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
  return {
    id: String(row.id ?? ''),
    name: String(row.name ?? ''),
    minScore: asNumber(row.minScore ?? row.min_score),
    cutoffScore: asNumber(row.cutoffScore ?? row.cutoff_score),
    upgradeAllowed: row.upgradeAllowed === true || row.upgrade_allowed === true,
    upgradeDelayMinutes: asNumber(row.upgradeDelayMinutes ?? row.upgrade_delay_minutes),
    formatScores: normalizeFormatScores(row.formatScores ?? row.format_scores),
  };
}

export function normalizeFormatRule(raw: unknown): FormatRule {
  const row = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
  return {
    field: String(row.field ?? ''),
    op: String(row.op ?? ''),
    value: String(row.value ?? ''),
    negate: row.negate === true,
  };
}

export function normalizeQualityFormat(raw: unknown): QualityFormat {
  const row = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
  const rules = Array.isArray(row.rules) ? row.rules.map(normalizeFormatRule).filter((r) => r.field && r.op && r.value) : [];
  return {
    id: String(row.id ?? ''),
    name: String(row.name ?? ''),
    score: asNumber(row.score ?? row.default_score ?? row.defaultScore),
    ruleCount: asNumber(row.ruleCount ?? row.rule_count) || rules.length,
    rules,
  };
}

export function formatRulesText(rules: FormatRule[]): string {
  return rules
    .map((rule) => {
      const base = `${rule.field}|${rule.op}|${rule.value}`;
      return rule.negate ? `${base}|negate` : base;
    })
    .join('\n');
}

export function parseFormatRules(text: string): FormatRule[] {
  return text
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const parts = line.split('|');
      return {
        field: (parts[0] || '').trim(),
        op: (parts[1] || '').trim(),
        value: (parts[2] || '').trim(),
        negate: (parts[3] || '').trim().toLowerCase() === 'negate',
      };
    })
    .filter((rule) => rule.field && rule.op && rule.value);
}

export function customFormatWriteBody(input: Pick<QualityFormat, 'name' | 'score' | 'rules'>): Record<string, unknown> {
  return {
    name: input.name,
    default_score: input.score,
    score: input.score,
    rules: input.rules,
  };
}

export function qualityProfileWriteBody(profile: Pick<
  QualityProfile,
  'name' | 'minScore' | 'cutoffScore' | 'upgradeAllowed' | 'upgradeDelayMinutes' | 'formatScores'
>): Record<string, unknown> {
  return {
    name: profile.name,
    min_score: profile.minScore,
    cutoff_score: profile.cutoffScore,
    upgrade_allowed: profile.upgradeAllowed,
    upgrade_delay_minutes: profile.upgradeDelayMinutes,
    format_scores: profile.formatScores,
  };
}

function asNumber(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

export function normalizeFormatsCatalog(raw: Record<string, unknown> | null | undefined): FormatsCatalog {
  const formatsRaw = Array.isArray(raw?.formats) ? raw.formats : [];
  const profilesRaw = Array.isArray(raw?.profiles) ? raw.profiles : [];
  const releaseRaw = Array.isArray(raw?.release_profiles)
    ? raw.release_profiles
    : Array.isArray(raw?.releaseProfiles)
      ? raw.releaseProfiles
      : [];
  const syncRaw = raw?.sync && typeof raw.sync === 'object' ? (raw.sync as Record<string, unknown>) : null;
  return {
    available: raw?.available === true,
    formats: formatsRaw.map(normalizeQualityFormat).filter((row) => row.id || row.name),
    profiles: profilesRaw.map(normalizeQualityProfile).filter((row) => row.id || row.name),
    releaseProfiles: releaseRaw.map(normalizeReleaseProfile).filter((row) => row.id || row.name),
    sync: syncRaw
      ? {
          formatsUpserted: asNumber(syncRaw.formatsUpserted ?? syncRaw.formats_upserted),
          formatsSkipped: asNumber(syncRaw.formatsSkipped ?? syncRaw.formats_skipped),
          profilesUpserted: asNumber(syncRaw.profilesUpserted ?? syncRaw.profiles_upserted),
          guidesPath: String(syncRaw.guidesPath ?? syncRaw.guides_path ?? ''),
          warnings: Array.isArray(syncRaw.warnings) ? syncRaw.warnings.map(String) : [],
        }
      : undefined,
  };
}

export function normalizeFormatScore(raw: Record<string, unknown> | null | undefined): FormatScorePreview {
  const matches = Array.isArray(raw?.matches) ? raw.matches : [];
  return {
    totalScore: asNumber(raw?.totalScore ?? raw?.total_score),
    qualityScore: asNumber(raw?.qualityScore ?? raw?.quality_score),
    formatScore: asNumber(raw?.formatScore ?? raw?.format_score),
    matches: matches
      .filter((row): row is Record<string, unknown> => !!row && typeof row === 'object')
      .map((row) => ({
        id: String(row.id ?? ''),
        name: String(row.name ?? ''),
        score: asNumber(row.score),
      })),
    quality: normalizeParsedQuality(raw),
  };
}
