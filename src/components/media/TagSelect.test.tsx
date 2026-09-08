import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { TagSelect } from './TagSelect';
import { setCurrentRoles } from '../../lib/session';

const listTags = vi.fn();
const getItemTags = vi.fn();
const setItemTags = vi.fn();

vi.mock('../../api/client', async () => {
  const actual = await vi.importActual<typeof import('../../api/client')>('../../api/client');
  return {
    ...actual,
    api: {
      listTags: (...args: unknown[]) => listTags(...args),
      getItemTags: (...args: unknown[]) => getItemTags(...args),
      setItemTags: (...args: unknown[]) => setItemTags(...args),
    },
  };
});

describe('TagSelect', () => {
  it('assigns a catalog tag to a movie', async () => {
    setCurrentRoles(['admin']);
    listTags.mockResolvedValue({
      available: true,
      tags: [{ id: 'm1', label: '4K', media: 'movie', createdAt: '' }],
    });
    getItemTags.mockResolvedValue({ available: true, tags: [] });
    setItemTags.mockResolvedValue({ ok: true, tag_ids: ['m1'] });
    render(<TagSelect kind="movie" id="mov1" />);
    fireEvent.click(await screen.findByLabelText('Tag 4K'));
    await waitFor(() => {
      expect(setItemTags).toHaveBeenCalledWith('movie', 'mov1', ['m1']);
    });
  });
});
