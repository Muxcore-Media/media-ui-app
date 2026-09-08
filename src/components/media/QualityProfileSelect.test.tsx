import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QualityProfileSelect } from './QualityProfileSelect';

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
