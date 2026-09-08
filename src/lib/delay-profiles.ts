export type DelayProfile = {
  protocol: string;
  waitMinutes: number;
};

export type DelayProfilesResponse = {
  available: boolean;
  profiles: DelayProfile[];
};

export const DEFAULT_DELAY_PROTOCOLS = ['torrent', 'usenet'] as const;

function asNumber(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

export function normalizeDelayProfiles(
  raw: Record<string, unknown> | null | undefined,
): DelayProfilesResponse {
  const rows = Array.isArray(raw?.profiles) ? raw.profiles : [];
  return {
    available: raw?.available === true,
    profiles: rows
      .filter((row): row is Record<string, unknown> => !!row && typeof row === 'object')
      .map((row) => ({
        protocol: String(row.protocol ?? '').toLowerCase(),
        waitMinutes: Math.max(0, asNumber(row.waitMinutes ?? row.wait_minutes)),
      }))
      .filter((row) => row.protocol !== ''),
  };
}

/** Ensure torrent/usenet rows exist so Settings can edit Arr-style delays. */
export function withDefaultDelayProfiles(profiles: DelayProfile[]): DelayProfile[] {
  const byProtocol = new Map(profiles.map((p) => [p.protocol, p]));
  const out: DelayProfile[] = [];
  for (const protocol of DEFAULT_DELAY_PROTOCOLS) {
    out.push(byProtocol.get(protocol) ?? { protocol, waitMinutes: protocol === 'torrent' ? 15 : 0 });
    byProtocol.delete(protocol);
  }
  for (const extra of byProtocol.values()) {
    out.push(extra);
  }
  return out;
}
