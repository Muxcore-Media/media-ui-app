import { beforeEach, describe, expect, it, vi } from 'vitest';
import { setCurrentRoles } from '../../lib/session';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { RefreshMetadataButton } from './RefreshMetadataButton';
import { OperatorError } from '../../api/errors';
import { MEMBER_ROLE_CASES, OPERATOR_ROLE_CASES } from '../../test/operator-roles';

const refreshLibraryItem = vi.fn();

vi.mock('../../api/client', async () => {
  const actual = await vi.importActual<typeof import('../../api/client')>('../../api/client');
  return {
    ...actual,
    api: {
      refreshLibraryItem: (...args: unknown[]) => refreshLibraryItem(...args),
    },
  };
});

describe('RefreshMetadataButton', () => {
  // The BFF reserves these controls for admin/manager (T-M5-12).
  beforeEach(() => setCurrentRoles(['manager']));

  it('refreshes a series', async () => {
    refreshLibraryItem.mockResolvedValue({ refreshed: true });
    const onRefreshed = vi.fn();
    render(<RefreshMetadataButton kind="tv" id="s1" onRefreshed={onRefreshed} />);
    fireEvent.click(screen.getByTestId('refresh-metadata'));
    await waitFor(() => {
      expect(refreshLibraryItem).toHaveBeenCalledWith({ kind: 'tv', id: 's1' });
    });
    expect(onRefreshed).toHaveBeenCalled();
    expect(screen.getByText('Refreshed')).toBeInTheDocument();
  });

  it('refreshes an artist', async () => {
    refreshLibraryItem.mockResolvedValue({ refreshed: true });
    render(<RefreshMetadataButton kind="artist" id="ar1" />);
    fireEvent.click(screen.getByTestId('refresh-metadata'));
    await waitFor(() => {
      expect(refreshLibraryItem).toHaveBeenCalledWith({ kind: 'artist', id: 'ar1' });
    });
  });
});

describe('RefreshMetadataButton operator gate (T-M5-12)', () => {
  it.each(MEMBER_ROLE_CASES)('renders nothing for %s', (_label, roles) => {
    setCurrentRoles(roles);
    const { container } = render(<RefreshMetadataButton kind="tv" id="s1" />);
    expect(screen.queryByTestId('refresh-metadata')).toBeNull();
    expect(container).toBeEmptyDOMElement();
  });

  it.each(OPERATOR_ROLE_CASES)('offers the button to %s', (_label, roles) => {
    setCurrentRoles(roles);
    render(<RefreshMetadataButton kind="tv" id="s1" />);
    expect(screen.getByTestId('refresh-metadata')).toBeInTheDocument();
  });

  it('explains a stale-role 403 calmly and does not retry', async () => {
    setCurrentRoles(['manager']);
    refreshLibraryItem.mockReset();
    refreshLibraryItem.mockRejectedValue(new OperatorError('operator.forbidden', 403));
    render(<RefreshMetadataButton kind="tv" id="s1" />);
    fireEvent.click(screen.getByTestId('refresh-metadata'));
    const note = await screen.findByTestId('refresh-metadata-note');
    expect(note).toHaveTextContent("You don't have permission for this action.");
    expect(note).toHaveAttribute('role', 'status');
    expect(refreshLibraryItem).toHaveBeenCalledTimes(1);
  });
});
