export type HouseholdBackup = {
  id: string;
  createdAt: string;
  sizeBytes: number;
  modules: string[];
  checksum: string;
};

export type BackupsStatus = {
  available: boolean;
  restoreDir: string;
  backups: HouseholdBackup[];
};

function asRecord(raw: unknown): Record<string, unknown> {
  return raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
}

export function normalizeHouseholdBackup(raw: unknown): HouseholdBackup {
  const rec = asRecord(raw);
  const modules = Array.isArray(rec.modules) ? rec.modules.map(String).filter(Boolean) : [];
  const size = Number(rec.size_bytes ?? rec.sizeBytes ?? 0);
  return {
    id: String(rec.id ?? ''),
    createdAt: String(rec.created_at ?? rec.createdAt ?? ''),
    sizeBytes: Number.isFinite(size) ? size : 0,
    modules,
    checksum: String(rec.checksum ?? ''),
  };
}

export function normalizeBackups(raw: unknown): BackupsStatus {
  const rec = asRecord(raw);
  const rows = Array.isArray(rec.backups) ? rec.backups : [];
  return {
    available: rec.available === true,
    restoreDir: String(rec.restore_dir ?? rec.restoreDir ?? ''),
    backups: rows.map(normalizeHouseholdBackup).filter((row) => row.id),
  };
}

export function backupSizeLabel(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
