import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Comics from './Comics';

const listComics = vi.fn();

vi.mock('../api/client', async () => {
  const actual = await vi.importActual<typeof import('../api/client')>('../api/client');
  return {
    ...actual,
    api: {
      listComics: (...args: unknown[]) => listComics(...args),
    },
  };
});

describe('Comics library page', () => {
  beforeEach(() => {
    listComics.mockReset();
    listComics.mockResolvedValue({
      items: [{ id: 's1', name: 'Saga', title: 'Saga' }],
      available: true,
      total: 1,
    });
  });

  it('lists series from BFF', async () => {
    render(
      <MemoryRouter>
        <Comics />
      </MemoryRouter>,
    );
    expect(await screen.findByTestId('comics-page')).toBeInTheDocument();
    expect(await screen.findByText('Saga')).toBeInTheDocument();
  });
});
