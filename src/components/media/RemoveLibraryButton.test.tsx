import { beforeEach, describe, expect, it, vi } from 'vitest';
import { setCurrentRoles } from '../../lib/session';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { RemoveLibraryButton } from './RemoveLibraryButton';
import { OperatorError } from '../../api/errors';
import { MEMBER_ROLE_CASES, OPERATOR_ROLE_CASES } from '../../test/operator-roles';

const removeLibraryItem = vi.fn();

vi.mock('../../api/client', async () => {
  const actual = await vi.importActual<typeof import('../../api/client')>('../../api/client');
  return {
    ...actual,
    api: {
      removeLibraryItem: (...args: unknown[]) => removeLibraryItem(...args),
    },
  };
});

describe('RemoveLibraryButton', () => {
  // The BFF reserves these controls for admin/manager (T-M5-12).
  beforeEach(() => setCurrentRoles(['manager']));

  it('removes a movie and can delete files', async () => {
    removeLibraryItem.mockResolvedValue({ removed: true, delete_files: true });
    const onRemoved = vi.fn();
    render(<RemoveLibraryButton kind="movie" id="m1" title="Dune" hasFile onRemoved={onRemoved} />);
    fireEvent.click(screen.getByTestId('remove-library'));
    fireEvent.click(screen.getByTestId('remove-library-delete-files'));
    fireEvent.click(screen.getByRole('button', { name: 'Remove and delete files' }));
    await waitFor(() => {
      expect(removeLibraryItem).toHaveBeenCalledWith({ kind: 'movie', id: 'm1', deleteFiles: true });
    });
    expect(onRemoved).toHaveBeenCalled();
  });
});

describe('RemoveLibraryButton operator gate (T-M5-12)', () => {
  it.each(MEMBER_ROLE_CASES)('renders nothing for %s', (_label, roles) => {
    setCurrentRoles(roles);
    const { container } = render(<RemoveLibraryButton kind="movie" id="m1" title="Dune" hasFile />);
    expect(screen.queryByTestId('remove-library')).toBeNull();
    expect(container).toBeEmptyDOMElement();
  });

  it.each(OPERATOR_ROLE_CASES)('offers the button to %s', (_label, roles) => {
    setCurrentRoles(roles);
    render(<RemoveLibraryButton kind="movie" id="m1" title="Dune" hasFile />);
    expect(screen.getByTestId('remove-library')).toBeInTheDocument();
  });

  it('explains a stale-role 403 calmly and does not retry', async () => {
    setCurrentRoles(['manager']);
    removeLibraryItem.mockReset();
    removeLibraryItem.mockRejectedValue(new OperatorError('operator.forbidden', 403));
    render(<RemoveLibraryButton kind="movie" id="m1" title="Dune" hasFile />);
    fireEvent.click(screen.getByTestId('remove-library'));
    fireEvent.click(screen.getByRole('button', { name: 'Remove from library' }));
    const note = await screen.findByTestId('remove-library-note');
    expect(note).toHaveTextContent("You don't have permission for this action.");
    expect(note).toHaveAttribute('role', 'status');
    expect(removeLibraryItem).toHaveBeenCalledTimes(1);
  });
});
