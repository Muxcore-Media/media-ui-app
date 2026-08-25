import { renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { usePlaybackAnalysis } from './usePlaybackAnalysis';

const fetchPlaybackAnalysis = vi.fn();

vi.mock('../../../api/client', () => ({
  fetchPlaybackAnalysis: (...args: unknown[]) => fetchPlaybackAnalysis(...args),
}));

describe('usePlaybackAnalysis', () => {
  beforeEach(() => {
    fetchPlaybackAnalysis.mockReset();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('skips fetch when src is missing', () => {
    const { result } = renderHook(() => usePlaybackAnalysis(undefined));
    expect(fetchPlaybackAnalysis).not.toHaveBeenCalled();
    expect(result.current.analysis).toBeNull();
    expect(result.current.loaded).toBe(false);
  });

  it('stores enabled analysis', async () => {
    fetchPlaybackAnalysis.mockResolvedValueOnce({
      src: '/stream/movies/m1',
      enabled: true,
      info_line: '1080p',
    });

    const { result } = renderHook(() => usePlaybackAnalysis('/stream/movies/m1'));

    await waitFor(() => expect(result.current.loaded).toBe(true));
    expect(result.current.analysis?.info_line).toBe('1080p');
  });

  it('drops disabled probe responses', async () => {
    fetchPlaybackAnalysis.mockResolvedValueOnce({
      src: '/stream/movies/m1',
      enabled: false,
    });

    const { result } = renderHook(() => usePlaybackAnalysis('/stream/movies/m1'));

    await waitFor(() => expect(result.current.loaded).toBe(true));
    expect(result.current.analysis).toBeNull();
  });

  it('marks loaded after fetch errors', async () => {
    fetchPlaybackAnalysis.mockRejectedValueOnce(new Error('probe down'));

    const { result } = renderHook(() => usePlaybackAnalysis('/stream/movies/m1'));

    await waitFor(() => expect(result.current.loaded).toBe(true));
    expect(result.current.analysis).toBeNull();
  });
});
