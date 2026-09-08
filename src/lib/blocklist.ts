export type BlocklistEntry = {
  wantedItemId: string;
  guid: string;
  title: string;
  reason: string;
  loop: number;
  createdAt: string;
};

export type BlocklistResponse = {
  items: BlocklistEntry[];
  total: number;
  available: boolean;
};

function asNumber(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

export function normalizeBlocklist(raw: Record<string, unknown> | null | undefined): BlocklistResponse {
  const rows = Array.isArray(raw?.items) ? raw.items : [];
  return {
    available: raw?.available === true,
    total: asNumber(raw?.total),
    items: rows
      .filter((row): row is Record<string, unknown> => !!row && typeof row === 'object')
      .map((row) => ({
        wantedItemId: String(row.wantedItemId ?? row.wanted_item_id ?? ''),
        guid: String(row.guid ?? ''),
        title: String(row.title ?? row.guid ?? 'Blocked release'),
        reason: String(row.reason ?? ''),
        loop: asNumber(row.loop),
        createdAt: String(row.createdAt ?? row.created_at ?? ''),
      })),
  };
}
