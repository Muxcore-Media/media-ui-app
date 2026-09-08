import { describe, expect, it } from 'vitest';
import { backupSizeLabel, normalizeBackups } from './backups';

describe('normalizeBackups', () => {
  it('maps household backup rows', () => {
    const next = normalizeBackups({
      available: true,
      restore_dir: '/data/restore',
      backups: [{ id: 'backup_1', created_at: '2024-01-02T03:04:05Z', size_bytes: 2048, modules: ['auth-local'], checksum: 'abc' }],
    });
    expect(next).toEqual({
      available: true,
      restoreDir: '/data/restore',
      backups: [
        {
          id: 'backup_1',
          createdAt: '2024-01-02T03:04:05Z',
          sizeBytes: 2048,
          modules: ['auth-local'],
          checksum: 'abc',
        },
      ],
    });
  });

  it('soft-fails when the module is down', () => {
    expect(normalizeBackups({ available: false, backups: [] })).toEqual({
      available: false,
      restoreDir: '',
      backups: [],
    });
  });
});

describe('backupSizeLabel', () => {
  it('formats bytes', () => {
    expect(backupSizeLabel(512)).toBe('512 B');
    expect(backupSizeLabel(2048)).toBe('2.0 KB');
  });
});
