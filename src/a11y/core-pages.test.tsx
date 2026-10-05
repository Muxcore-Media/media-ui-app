import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { axe } from 'vitest-axe';
import ForgotPassword from '../pages/ForgotPassword';
import QuickConnect from '../pages/QuickConnect';
import { axeOptions } from './axe';

vi.mock('../api/client', async () => {
  const actual = await vi.importActual<typeof import('../api/client')>('../api/client');
  return {
    ...actual,
    api: {
      approveQuickConnect: vi.fn(),
    },
  };
});

describe('core page axe', () => {
  it('forgot password has no violations', async () => {
    const { container } = render(
      <main>
        <ForgotPassword />
      </main>,
    );
    expect(await screen.findByRole('heading', { name: 'Forgot password' })).toBeInTheDocument();
    expect(await axe(container, axeOptions)).toHaveNoViolations();
  });

  it('quick connect has no violations', async () => {
    const { container } = render(
      <main>
        <MemoryRouter>
          <QuickConnect />
        </MemoryRouter>
      </main>,
    );
    expect(await screen.findByRole('heading', { name: 'Quick Connect' })).toBeInTheDocument();
    expect(await axe(container, axeOptions)).toHaveNoViolations();
  });
});
