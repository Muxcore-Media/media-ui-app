export type SeriesOverride = {
  seriesId: string;
  delayMinutes: number;
  preferredGroups: string[];
  ignoredGroups: string[];
};

export type SeriesOverrideResponse = {
  available: boolean;
  found: boolean;
  override: SeriesOverride;
};

function asNumber(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function asGroups(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v.map((g) => String(g).trim()).filter(Boolean);
}

export function normalizeSeriesOverride(
  raw: Record<string, unknown> | null | undefined,
): SeriesOverrideResponse {
  const ov = raw?.override && typeof raw.override === 'object' ? (raw.override as Record<string, unknown>) : raw;
  return {
    available: raw?.available === true,
    found: raw?.found === true,
    override: {
      seriesId: String(ov?.seriesId ?? ov?.series_id ?? ''),
      delayMinutes: Math.max(0, asNumber(ov?.delayMinutes ?? ov?.delay_minutes)),
      preferredGroups: asGroups(ov?.preferredGroups ?? ov?.preferred_groups),
      ignoredGroups: asGroups(ov?.ignoredGroups ?? ov?.ignored_groups),
    },
  };
}

export function parseGroupList(raw: string): string[] {
  return raw
    .split(/[,;\n]+/)
    .map((g) => g.trim())
    .filter(Boolean);
}
