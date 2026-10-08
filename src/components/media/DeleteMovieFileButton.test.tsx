import { beforeEach, describe, expect, it, vi } from 'vitest';
import { setCurrentRoles } from '../../lib/session';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { DeleteMovieFileButton } from './DeleteMovieFileButton';
import { OperatorError } from '../../api/errors';
import { MEMBER_ROLE_CASES, OPERATOR_ROLE_CASES } from '../../test/operator-roles';

const removeMovieFile = vi.fn();

vi.mock('../../api/client', async () => {
  const actual = await vi.importActual<typeof import('../../api/client')>('../../api/client');
  return {
    ...actual,
    api: {
      removeMovieFile: (...args: unknown[]) => removeMovieFile(...args),
    },
  };
});

describe('DeleteMovieFileButton', () => {
  // The BFF reserves these controls for admin/manager (T-M5-12).
  beforeEach(() => setCurrentRoles(['manager']));

  it('deletes a movie file after confirm', async () => {
    removeMovieFile.mockResolvedValue({ removed: true, delete_files: true, files: 1 });
    vi.stubGlobal('confirm', vi.fn(() => true));
    const onRemoved = vi.fn();
    render(<DeleteMovieFileButton id="m1" onRemoved={onRemoved} />);
    fireEvent.click(screen.getByTestId('delete-movie-file'));
    await waitFor(() => {
      expect(removeMovieFile).toHaveBeenCalledWith({ id: 'm1', deleteFiles: true });
    });
    expect(onRemoved).toHaveBeenCalled();
    vi.unstubAllGlobals();
  });
});

describe('DeleteMovieFileButton operator gate (T-M5-12)', () => {
  it.each(MEMBER_ROLE_CASES)('renders nothing for %s', (_label, roles) => {
    setCurrentRoles(roles);
    const { container } = render(<DeleteMovieFileButton id="m1" />);
    expect(screen.queryByTestId('delete-movie-file')).toBeNull();
    expect(container).toBeEmptyDOMElement();
  });

  it.each(OPERATOR_ROLE_CASES)('offers the button to %s', (_label, roles) => {
    setCurrentRoles(roles);
    render(<DeleteMovieFileButton id="m1" />);
    expect(screen.getByTestId('delete-movie-file')).toBeInTheDocument();
  });

  it('explains a stale-role 403 calmly and does not retry', async () => {
    setCurrentRoles(['manager']);
    removeMovieFile.mockReset();
    removeMovieFile.mockRejectedValue(new OperatorError('operator.forbidden', 403));
    vi.stubGlobal('confirm', vi.fn(() => true));
    render(<DeleteMovieFileButton id="m1" />);
    fireEvent.click(screen.getByTestId('delete-movie-file'));
    const note = await screen.findByTestId('delete-file-note');
    expect(note).toHaveTextContent("You don't have permission for this action.");
    expect(note).toHaveAttribute('role', 'status');
    expect(removeMovieFile).toHaveBeenCalledTimes(1);
    vi.unstubAllGlobals();
  });
});
