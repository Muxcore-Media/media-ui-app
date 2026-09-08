import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { ImportFileField } from './ImportFileField';

vi.mock('../../lib/session', () => ({
  canManageLibrary: () => true,
}));

describe('ImportFileField', () => {
  it('submits a library path', async () => {
    const onImport = vi.fn().mockResolvedValue(undefined);
    render(<ImportFileField onImport={onImport} />);
    fireEvent.change(screen.getByLabelText('File path'), { target: { value: '/library/Dune.epub' } });
    fireEvent.click(screen.getByRole('button', { name: 'Import file' }));
    await waitFor(() => {
      expect(onImport).toHaveBeenCalledWith('/library/Dune.epub');
    });
  });
});
