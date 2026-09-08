import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Audiobooks from './Audiobooks';
import { NowPlayingProvider } from '../lib/nowPlaying';
import { setCurrentRoles } from '../lib/session';

const listAudiobooks = vi.fn();
const addAudiobook = vi.fn();

vi.mock('../api/client', async () => {
  const actual = await vi.importActual<typeof import('../api/client')>('../api/client');
  return {
    ...actual,
    api: {
      listAudiobooks: (...args: unknown[]) => listAudiobooks(...args),
      addAudiobook: (...args: unknown[]) => addAudiobook(...args),
    },
  };
});

function renderPage() {
  return render(
    <NowPlayingProvider>
      <MemoryRouter>
        <Audiobooks />
      </MemoryRouter>
    </NowPlayingProvider>,
  );
}

describe('Audiobooks library page', () => {
  beforeEach(() => {
    listAudiobooks.mockReset();
    addAudiobook.mockReset();
    setCurrentRoles([]);
    addAudiobook.mockResolvedValue({ added: true, item: { id: 'ab-new', title: 'The Name of the Wind' } });
    listAudiobooks.mockResolvedValue({
      items: [
        {
          id: 'ab1',
          title: 'Project Hail Mary',
          narrator: 'Ray Porter',
          files: [{ id: 'f1', title: 'Part 1', stream_url: '/stream/audiobooks/f1' }],
          stream_url: '/stream/audiobooks/f1',
        },
      ],
      available: true,
      total: 1,
    });
  });

  it('lists audiobooks from BFF', async () => {
    renderPage();
    expect(await screen.findByTestId('audiobooks-page')).toBeInTheDocument();
    expect(await screen.findByText('Project Hail Mary')).toBeInTheDocument();
  });

  it('links each title to its detail page', async () => {
    renderPage();
    const link = await screen.findByRole('link', { name: 'Project Hail Mary' });
    expect(link.getAttribute('href')).toBe('/audiobooks/ab1');
  });

  it('plays the first chapter from the list', async () => {
    renderPage();
    const play = await screen.findByRole('button', { name: /Play Project Hail Mary/i });
    fireEvent.click(play);
    expect(await screen.findByRole('button', { name: /Pause Project Hail Mary/i })).toBeInTheDocument();
  });

  it('adds an audiobook from the library list', async () => {
    setCurrentRoles(['admin']);
    listAudiobooks
      .mockResolvedValueOnce({
        items: [],
        available: true,
        total: 0,
      })
      .mockResolvedValueOnce({
        items: [{ id: 'ab-new', title: 'The Name of the Wind', year: 2007 }],
        available: true,
        total: 1,
      });
    renderPage();
    fireEvent.change(await screen.findByLabelText('Author'), { target: { value: 'Patrick Rothfuss' } });
    fireEvent.change(screen.getByLabelText('Title'), { target: { value: 'The Name of the Wind' } });
    fireEvent.change(screen.getByLabelText('Year'), { target: { value: '2007' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add audiobook' }));
    await waitFor(() => {
      expect(addAudiobook).toHaveBeenCalledWith({
        author: 'Patrick Rothfuss',
        title: 'The Name of the Wind',
        year: 2007,
      });
    });
    expect(await screen.findByRole('link', { name: 'The Name of the Wind' })).toBeInTheDocument();
  });
});
