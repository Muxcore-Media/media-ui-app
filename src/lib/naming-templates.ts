export type NamingTemplate = {
  id: string;
  name: string;
  mediaType: string;
  pattern: string;
  isDefault: boolean;
  updatedAt: string;
};

export type NamingTemplatesResponse = {
  available: boolean;
  templates: NamingTemplate[];
};

function asRecord(raw: unknown): Record<string, unknown> {
  return raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
}

export function normalizeNamingTemplate(raw: unknown): NamingTemplate {
  const rec = asRecord(raw);
  return {
    id: String(rec.id ?? ''),
    name: String(rec.name ?? ''),
    mediaType: String(rec.media_type ?? rec.mediaType ?? ''),
    pattern: String(rec.pattern ?? ''),
    isDefault: rec.is_default === true || rec.isDefault === true,
    updatedAt: String(rec.updated_at ?? rec.updatedAt ?? ''),
  };
}

export function normalizeNamingTemplates(raw: unknown): NamingTemplatesResponse {
  const rec = asRecord(raw);
  const rows = Array.isArray(rec.templates) ? rec.templates : [];
  return {
    available: rec.available === true,
    templates: rows.map(normalizeNamingTemplate).filter((row) => row.id || row.pattern),
  };
}

export function namingTemplateLabel(tpl: NamingTemplate): string {
  const kind = tpl.mediaType || 'movie';
  const def = tpl.isDefault ? ' · default' : '';
  return `${tpl.name || 'Untitled'} (${kind}${def})`;
}
