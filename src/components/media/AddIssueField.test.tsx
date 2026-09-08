import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { AddIssueField } from './AddIssueField';

vi.mock('../../lib/session', () => ({
  canManageLibrary: () => true,
}));

describe('AddIssueField', () => {
  it('submits number, title, and year', async () => {
    const onAdd = vi.fn().mockResolvedValue(undefined);
    render(<AddIssueField onAdd={onAdd} />);
    fireEvent.change(screen.getByLabelText('Number'), { target: { value: '1' } });
    fireEvent.change(screen.getByLabelText('Issue title'), { target: { value: 'Romance Dawn' } });
    fireEvent.change(screen.getByLabelText('Year'), { target: { value: '1997' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add issue' }));
    await waitFor(() => {
      expect(onAdd).toHaveBeenCalledWith({ title: 'Romance Dawn', number: '1', year: 1997 });
    });
  });
});
