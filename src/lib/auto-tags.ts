export const AUTO_TAG_FIELDS = ['title', 'genre', 'path', 'media_type'] as const;
export const AUTO_TAG_MATCHES = ['contains', 'equals', 'prefix', 'regex'] as const;

export type AutoTag = {
  id: string;
  name: string;
  category: string;
  color: string;
};

export type AutoTagRule = {
  id: string;
  tagId: string;
  field: string;
  match: string;
  pattern: string;
  enabled: boolean;
};

export type AutoTagCatalog = {
  available: boolean;
  tags: AutoTag[];
  rules: AutoTagRule[];
};

function asRows(raw: unknown): Record<string, unknown>[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter((row): row is Record<string, unknown> => Boolean(row) && typeof row === 'object');
}

export function normalizeAutoTagCatalog(raw: Record<string, unknown> | null | undefined): AutoTagCatalog {
  return {
    available: raw?.available === true,
    tags: asRows(raw?.tags).map((row) => ({
      id: String(row.id ?? ''),
      name: String(row.name ?? ''),
      category: String(row.category ?? ''),
      color: String(row.color ?? ''),
    })).filter((row) => row.id || row.name),
    rules: asRows(raw?.rules).map((row) => ({
      id: String(row.id ?? ''),
      tagId: String(row.tagId ?? row.tag_id ?? ''),
      field: String(row.field ?? 'title'),
      match: String(row.match ?? 'contains'),
      pattern: String(row.pattern ?? ''),
      enabled: row.enabled !== false,
    })).filter((row) => row.id || row.pattern),
  };
}

export type AutoTagClassifyResult = {
  mediaId: string;
  tags: AutoTag[];
  matchedRuleIds: string[];
};

export function normalizeAutoTagClassify(raw: Record<string, unknown> | null | undefined): AutoTagClassifyResult {
  return {
    mediaId: String(raw?.mediaId ?? raw?.media_id ?? ''),
    tags: asRows(raw?.tags).map((row) => ({
      id: String(row.id ?? ''),
      name: String(row.name ?? ''),
      category: String(row.category ?? ''),
      color: String(row.color ?? ''),
    })).filter((row) => row.id || row.name),
    matchedRuleIds: Array.isArray(raw?.matchedRuleIds)
      ? (raw?.matchedRuleIds as unknown[]).map((id) => String(id ?? '')).filter(Boolean)
      : Array.isArray(raw?.matched_rule_ids)
        ? (raw?.matched_rule_ids as unknown[]).map((id) => String(id ?? '')).filter(Boolean)
        : [],
  };
}

export function autoTagClassifyLabel(res: AutoTagClassifyResult): string {
  const names = res.tags.map((tag) => tag.name).filter(Boolean);
  if (names.length === 0) return `No auto-tags matched ${res.mediaId || 'title'}`;
  return `Applied ${names.join(', ')}`;
}

export function autoTagRuleLabel(rule: AutoTagRule, tags: AutoTag[]): string {
  const tag = tags.find((row) => row.id === rule.tagId);
  const name = tag?.name || rule.tagId || 'tag';
  const state = rule.enabled ? 'on' : 'off';
  return `${name} when ${rule.field} ${rule.match} “${rule.pattern}” · ${state}`;
}
