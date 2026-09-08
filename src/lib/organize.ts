export type OrganizeItem = {
  original: string;
  renamedTo: string;
  success: boolean;
  error: string;
};

export type OrganizeResult = {
  available: boolean;
  directory: string;
  mediaType: string;
  dryRun: boolean;
  total: number;
  renamed: number;
  errors: number;
  items: OrganizeItem[];
};

function asRecord(raw: unknown): Record<string, unknown> {
  return raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
}

function asNumber(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

export function normalizeOrganizeItem(raw: unknown): OrganizeItem {
  const rec = asRecord(raw);
  return {
    original: String(rec.original ?? ''),
    renamedTo: String(rec.renamed_to ?? rec.renamedTo ?? ''),
    success: rec.success === true,
    error: String(rec.error ?? ''),
  };
}

export function normalizeOrganize(raw: unknown): OrganizeResult {
  const rec = asRecord(raw);
  const rows = Array.isArray(rec.items) ? rec.items : [];
  return {
    available: rec.available === true,
    directory: String(rec.directory ?? ''),
    mediaType: String(rec.media_type ?? rec.mediaType ?? ''),
    dryRun: rec.dry_run === true || rec.dryRun === true,
    total: asNumber(rec.total),
    renamed: asNumber(rec.renamed),
    errors: asNumber(rec.errors),
    items: rows.map(normalizeOrganizeItem).filter((row) => row.original || row.renamedTo),
  };
}

export function organizeFolderOptions(paths: Array<string | undefined | null>): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of paths) {
    const next = String(raw ?? '').trim();
    if (!next || next === '/' || seen.has(next)) continue;
    seen.add(next);
    out.push(next);
  }
  return out;
}
