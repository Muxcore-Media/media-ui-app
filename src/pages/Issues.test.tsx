import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Issues from './Issues';

const listIssues = vi.fn();

vi.mock('../api/client', async () => {
  const actual = await vi.importActual<typeof import('../api/client')>('../api/client');
  return {
    ...actual,
    api: {
      listIssues: (...args: unknown[]) => listIssues(...args),
    },
  };
});

describe('Issues page', () => {
  beforeEach(() => {
    listIssues.mockReset();
  });

  it('lists household reports', async () => {
    listIssues.mockResolvedValueOnce([
      {
        id: 'iss_1',
        kind: 'subtitles',
        mediaType: 'movie',
        title: 'Fight Club',
        message: 'no English',
        reportedBy: 'alice',
        createdAt: '2026-09-08T00:00:00Z',
      },
    ]);
    render(
      <MemoryRouter>
        <Issues />
      </MemoryRouter>,
    );
    expect(await screen.findByText('Fight Club')).toBeInTheDocument();
    expect(screen.getByText('Subtitles')).toBeInTheDocument();
    expect(screen.getByText('no English')).toBeInTheDocument();
  });

  it('shows empty state', async () => {
    listIssues.mockResolvedValueOnce([]);
    render(
      <MemoryRouter>
        <Issues />
      </MemoryRouter>,
    );
    expect(await screen.findByTestId('issues-empty')).toBeInTheDocument();
  });
});
