import { beforeEach, describe, expect, it, vi } from 'vitest';
import { setCurrentRoles } from '../../lib/session';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QualityProfileSelect } from './QualityProfileSelect';
import { OperatorError } from '../../api/errors';
import { MEMBER_ROLE_CASES, OPERATOR_ROLE_CASES } from '../../test/operator-roles';

const getFormats = vi.fn();
const setQualityProfile = vi.fn();

vi.mock('../../api/client', async () => {
  const actual = await vi.importActual<typeof import('../../api/client')>('../../api/client');
  return {
    ...actual,
    api: {
      getFormats: (...args: unknown[]) => getFormats(...args),
      setQualityProfile: (...args: unknown[]) => setQualityProfile(...args),
    },
  };
});

describe('QualityProfileSelect', () => {
  // The BFF reserves these controls for admin/manager (T-M5-12).
  beforeEach(() => setCurrentRoles(['manager']));

  it('assigns a TRaSH profile to a movie', async () => {
    getFormats.mockResolvedValue({
      available: true,
      formats: [],
      profiles: [{ id: 'qp_uhd', name: 'UHD', minScore: 0, cutoffScore: 10000, upgradeAllowed: true, formatScores: {} }],
    });
    setQualityProfile.mockResolvedValue({ quality_profile_id: 'qp_uhd' });
    const onChange = vi.fn();
    render(<QualityProfileSelect kind="movie" id="m1" onChange={onChange} />);
    fireEvent.change(await screen.findByLabelText('Quality profile'), { target: { value: 'qp_uhd' } });
    await waitFor(() => {
      expect(setQualityProfile).toHaveBeenCalledWith({
        kind: 'movie',
        id: 'm1',
        qualityProfileId: 'qp_uhd',
      });
    });
    expect(onChange).toHaveBeenCalledWith('qp_uhd');
  });

  it('assigns a TRaSH profile to an artist', async () => {
    getFormats.mockResolvedValue({
      available: true,
      formats: [],
      profiles: [{ id: 'qp_flac', name: 'FLAC', minScore: 0, cutoffScore: 10000, upgradeAllowed: true, formatScores: {} }],
    });
    setQualityProfile.mockResolvedValue({ quality_profile_id: 'qp_flac' });
    render(<QualityProfileSelect kind="artist" id="ar1" />);
    fireEvent.change(await screen.findByLabelText('Quality profile'), { target: { value: 'qp_flac' } });
    await waitFor(() => {
      expect(setQualityProfile).toHaveBeenCalledWith({
        kind: 'artist',
        id: 'ar1',
        qualityProfileId: 'qp_flac',
      });
    });
  });
});

describe('QualityProfileSelect operator gate (T-M5-12)', () => {
  const profiles = {
    available: true,
    formats: [],
    profiles: [{ id: 'qp_uhd', name: 'UHD', minScore: 0, cutoffScore: 10000, upgradeAllowed: true, formatScores: {} }],
  };

  it.each(MEMBER_ROLE_CASES)('renders nothing and loads nothing for %s', (_label, roles) => {
    getFormats.mockReset();
    getFormats.mockResolvedValue(profiles);
    setCurrentRoles(roles);
    const { container } = render(<QualityProfileSelect kind="movie" id="m1" />);
    expect(screen.queryByLabelText('Quality profile')).toBeNull();
    expect(container).toBeEmptyDOMElement();
    expect(getFormats).not.toHaveBeenCalled();
  });

  it.each(OPERATOR_ROLE_CASES)('offers the picker to %s', async (_label, roles) => {
    getFormats.mockReset();
    getFormats.mockResolvedValue(profiles);
    setCurrentRoles(roles);
    render(<QualityProfileSelect kind="movie" id="m1" />);
    expect(await screen.findByLabelText('Quality profile')).toBeInTheDocument();
  });

  it('explains a stale-role 403 calmly and does not retry', async () => {
    getFormats.mockReset();
    getFormats.mockResolvedValue(profiles);
    setQualityProfile.mockReset();
    setQualityProfile.mockRejectedValue(new OperatorError('operator.forbidden', 403));
    setCurrentRoles(['manager']);
    render(<QualityProfileSelect kind="movie" id="m1" />);
    fireEvent.change(await screen.findByLabelText('Quality profile'), { target: { value: 'qp_uhd' } });
    const note = await screen.findByTestId('quality-profile-note');
    expect(note).toHaveTextContent("You don't have permission for this action.");
    expect(note).toHaveAttribute('role', 'status');
    expect(setQualityProfile).toHaveBeenCalledTimes(1);
  });
});
