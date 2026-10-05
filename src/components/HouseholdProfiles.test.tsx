import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { HouseholdProfiles } from './HouseholdProfiles';

const listViewerProfiles = vi.fn();
const createViewerProfile = vi.fn();
const activateViewerProfile = vi.fn();
const replaceUserdataFromServer = vi.fn(async () => true);

vi.mock('../api/client', () => ({
  api: {
    listViewerProfiles: (...args: unknown[]) => listViewerProfiles(...args),
    createViewerProfile: (...args: unknown[]) => createViewerProfile(...args),
    activateViewerProfile: (...args: unknown[]) => activateViewerProfile(...args),
  },
}));

vi.mock('../lib/userdata', () => ({
  replaceUserdataFromServer: (...args: unknown[]) => replaceUserdataFromServer(...args),
}));

describe('HouseholdProfiles', () => {
  beforeEach(() => {
    listViewerProfiles.mockReset();
    createViewerProfile.mockReset();
    activateViewerProfile.mockReset();
    replaceUserdataFromServer.mockClear();
    listViewerProfiles.mockResolvedValue({
      active_id: 'primary',
      profiles: [
        { id: 'primary', name: 'Primary', kids: false, pin_set: true },
        { id: 'kids1', name: 'Kids', kids: true, pin_set: true },
      ],
    });
  });

  it('asks for the current PIN before leaving a locked profile and reloads that profile userdata', async () => {
    activateViewerProfile.mockResolvedValue({
      active_id: 'kids1',
      profiles: [
        { id: 'primary', name: 'Primary', kids: false, pin_set: true },
        { id: 'kids1', name: 'Kids', kids: true, pin_set: true },
      ],
    });
    render(<HouseholdProfiles />);
    expect(await screen.findByText('Primary · PIN · active')).toBeTruthy();
    fireEvent.click(screen.getByRole('radio', { name: 'Kids · kids · PIN' }));
    fireEvent.change(screen.getByLabelText('Profile PIN'), { target: { value: '9999' } });
    fireEvent.click(screen.getByRole('button', { name: 'Switch profile' }));
    await waitFor(() => {
      expect(activateViewerProfile).toHaveBeenCalledWith('kids1', '9999');
    });
    expect(replaceUserdataFromServer).toHaveBeenCalled();
  });

  it('shows the server error when the PIN is rejected', async () => {
    activateViewerProfile.mockRejectedValue(new Error('PIN required (profile.pin_required)'));
    render(<HouseholdProfiles />);
    fireEvent.click(await screen.findByRole('radio', { name: 'Kids · kids · PIN' }));
    fireEvent.change(screen.getByLabelText('Profile PIN'), { target: { value: '0000' } });
    fireEvent.click(screen.getByRole('button', { name: 'Switch profile' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('PIN required');
    expect(replaceUserdataFromServer).not.toHaveBeenCalled();
  });
});
