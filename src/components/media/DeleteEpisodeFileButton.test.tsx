import { beforeEach, describe, expect, it, vi } from 'vitest';
import { setCurrentRoles } from '../../lib/session';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { DeleteEpisodeFileButton } from './DeleteEpisodeFileButton';
import { OperatorError } from '../../api/errors';
import { MEMBER_ROLE_CASES, OPERATOR_ROLE_CASES } from '../../test/operator-roles';

const removeEpisodeFile = vi.fn();

vi.mock('../../api/client', async () => {
  const actual = await vi.importActual<typeof import('../../api/client')>('../../api/client');
  return {
    ...actual,
    api: {
      removeEpisodeFile: (...args: unknown[]) => removeEpisodeFile(...args),
    },
  };
});

describe('DeleteEpisodeFileButton', () => {
  // The BFF reserves these controls for admin/manager (T-M5-12).
  beforeEach(() => setCurrentRoles(['manager']));

  it('deletes an episode file after confirm', async () => {
    removeEpisodeFile.mockResolvedValue({ removed: true, delete_files: true });
    vi.stubGlobal('confirm', vi.fn(() => true));
    const onRemoved = vi.fn();
    render(<DeleteEpisodeFileButton id="e1" onRemoved={onRemoved} />);
    fireEvent.click(screen.getByTestId('delete-episode-file'));
    await waitFor(() => {
      expect(removeEpisodeFile).toHaveBeenCalledWith({ id: 'e1', deleteFiles: true });
    });
    expect(onRemoved).toHaveBeenCalled();
    vi.unstubAllGlobals();
  });
});

describe('DeleteEpisodeFileButton operator gate (T-M5-12)', () => {
  it.each(MEMBER_ROLE_CASES)('renders nothing for %s', (_label, roles) => {
    setCurrentRoles(roles);
    const { container } = render(<DeleteEpisodeFileButton id="e1" />);
    expect(screen.queryByTestId('delete-episode-file')).toBeNull();
    expect(container).toBeEmptyDOMElement();
  });

  it.each(OPERATOR_ROLE_CASES)('offers the button to %s', (_label, roles) => {
    setCurrentRoles(roles);
    render(<DeleteEpisodeFileButton id="e1" />);
    expect(screen.getByTestId('delete-episode-file')).toBeInTheDocument();
  });

  it('explains a stale-role 403 calmly and does not retry', async () => {
    setCurrentRoles(['manager']);
    removeEpisodeFile.mockReset();
    removeEpisodeFile.mockRejectedValue(new OperatorError('operator.forbidden', 403));
    vi.stubGlobal('confirm', vi.fn(() => true));
    render(<DeleteEpisodeFileButton id="e1" />);
    fireEvent.click(screen.getByTestId('delete-episode-file'));
    const note = await screen.findByTestId('delete-file-note');
    expect(note).toHaveTextContent("You don't have permission for this action.");
    expect(note).toHaveAttribute('role', 'status');
    expect(removeEpisodeFile).toHaveBeenCalledTimes(1);
    vi.unstubAllGlobals();
  });
});
