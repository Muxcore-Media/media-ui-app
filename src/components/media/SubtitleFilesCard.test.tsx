import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { SubtitleFilesCard } from './SubtitleFilesCard';

const listItemSubtitles = vi.fn();
const uploadItemSubtitle = vi.fn();
const deleteItemSubtitle = vi.fn();

vi.mock('../../api/client', () => ({
  api: {
    listItemSubtitles: (...args: unknown[]) => listItemSubtitles(...args),
    uploadItemSubtitle: (...args: unknown[]) => uploadItemSubtitle(...args),
    deleteItemSubtitle: (...args: unknown[]) => deleteItemSubtitle(...args),
  },
}));

vi.mock('../../lib/session', () => ({
  canManageSubtitles: () => true,
}));

describe('SubtitleFilesCard', () => {
  it('lists sidecar files and deletes one', async () => {
    listItemSubtitles.mockReset();
    deleteItemSubtitle.mockReset();
    listItemSubtitles.mockResolvedValue({
      available: true,
      items: [{
        id: 'sub1', mediaFileId: 'mf1', language: 'eng', format: 'srt',
        forced: false, hearingImpaired: false, source: 'sidecar', provider: '',
        score: 0, sizeBytes: 12, filename: 'Fight.Club.eng.srt',
      }],
      files: [{ id: 'mf1', title: '', season: 0, episode: 0 }],
    });
    deleteItemSubtitle.mockResolvedValue({ removed: true, id: 'sub1' });
    render(<SubtitleFilesCard kind="movie" id="m1" />);
    expect(await screen.findByTestId('item-subtitles-list')).toHaveTextContent('ENG · srt');
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }));
    await waitFor(() => {
      expect(deleteItemSubtitle).toHaveBeenCalledWith('sub1');
    });
    expect(await screen.findByTestId('item-subtitles-flash')).toHaveTextContent('Subtitle deleted');
  });

  it('uploads a sidecar file', async () => {
    listItemSubtitles.mockReset();
    uploadItemSubtitle.mockReset();
    listItemSubtitles.mockResolvedValue({
      available: true,
      items: [],
      files: [{ id: 'mf1', title: '', season: 0, episode: 0 }],
    });
    uploadItemSubtitle.mockResolvedValue({
      id: 'sub-new', mediaFileId: 'mf1', language: 'spa', format: 'srt',
      forced: false, hearingImpaired: false, source: 'upload', provider: '',
      score: 0, sizeBytes: 4, filename: 'Fight.Club.spa.srt',
    });
    vi.stubGlobal(
      'FileReader',
      class {
        result = 'data:text/plain;base64,abc';
        onload: (() => void) | null = null;
        onerror: (() => void) | null = null;
        readAsDataURL() {
          this.onload?.();
        }
      },
    );
    render(<SubtitleFilesCard kind="movie" id="m1" />);
    expect(await screen.findByTestId('item-subtitles-upload')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Subtitle language'), { target: { value: 'spa' } });
    const file = new File(['hola'], 'movie.spa.srt', { type: 'text/plain' });
    fireEvent.change(screen.getByLabelText('Upload subtitle'), { target: { files: [file] } });
    fireEvent.click(screen.getByRole('button', { name: 'Upload' }));
    await waitFor(() => {
      expect(uploadItemSubtitle).toHaveBeenCalledWith('movie', 'm1', {
        language: 'spa',
        filename: 'movie.spa.srt',
        data: 'data:text/plain;base64,abc',
        mediaFileId: 'mf1',
      });
    });
    expect(await screen.findByTestId('item-subtitles-flash')).toHaveTextContent('SPA · srt · upload');
  });
});
