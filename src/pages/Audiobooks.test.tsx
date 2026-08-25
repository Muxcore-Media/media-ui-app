import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Audiobooks from './Audiobooks';

const listAudiobooks = vi.fn();

vi.mock('../api/client', async () => {
  const actual = await vi.importActual<typeof import('../api/client')>('../api/client');
  return {
    ...actual,
    api: {
      listAudiobooks: (...args: unknown[]) => listAudiobooks(...args),
    },
  };
});

describe('Audiobooks library page', () => {
  beforeEach(() => {
    listAudiobooks.mockReset();
    listAudiobooks.mockResolvedValue({
      items: [{ id: 'ab1', title: 'Project Hail Mary', narrator: 'Ray Porter' }],
      available: true,
      total: 1,
    });
  });

  it('lists audiobooks from BFF', async () => {
    render(
      <MemoryRouter>
        <Audiobooks />
      </MemoryRouter>,
    );
    expect(await screen.findByTestId('audiobooks-page')).toBeInTheDocument();
    expect(await screen.findByText('Project Hail Mary')).toBeInTheDocument();
  });
});
