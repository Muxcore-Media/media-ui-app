import { describe, expect, it } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import Layout from './Layout';
import { CapabilitiesContext, ALL_CAPABILITIES, DEFAULT_CAPABILITIES } from '../lib/capabilities';

function renderLayout(caps = DEFAULT_CAPABILITIES) {
  return render(
    <CapabilitiesContext.Provider value={{ caps, loading: false, error: null, retry: () => {} }}>
      <MemoryRouter initialEntries={['/']}>
        <Routes>
          <Route element={<Layout />}>
            <Route index element={<div>home body</div>} />
          </Route>
        </Routes>
      </MemoryRouter>
    </CapabilitiesContext.Provider>,
  );
}

describe('Layout (session / login shell)', () => {
  it('exposes BFF logout so auth-local session cookie can be cleared', () => {
    renderLayout();
    const logout = screen.getByRole('link', { name: 'Sign out' });
    expect(logout).toHaveAttribute('href', '/logout');
  });

  it('renders only enabled library sections in primary nav', () => {
    renderLayout();
    const primaryNav = screen.getByRole('navigation', { name: 'Primary navigation' });
    expect(within(primaryNav).getByRole('link', { name: 'Home' })).toHaveAttribute('href', '/');
    expect(within(primaryNav).getByRole('link', { name: 'Movies' })).toHaveAttribute(
      'href',
      '/movies',
    );
    expect(within(primaryNav).getByRole('link', { name: 'TV' })).toHaveAttribute('href', '/tv');
    expect(within(primaryNav).queryByRole('link', { name: 'Music' })).not.toBeInTheDocument();
    expect(within(primaryNav).queryByRole('link', { name: 'Books' })).not.toBeInTheDocument();
    expect(screen.getByRole('search')).toBeInTheDocument();
    expect(screen.getByLabelText('Search')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Favorites' })).toHaveAttribute('href', '/favorites');
    expect(screen.getByRole('link', { name: 'Settings' })).toHaveAttribute('href', '/settings');
    expect(screen.getByText('home body')).toBeInTheDocument();
  });

  it('shows optional libraries when capabilities report them enabled', () => {
    renderLayout(ALL_CAPABILITIES);
    const primaryNav = screen.getByRole('navigation', { name: 'Primary navigation' });
    expect(within(primaryNav).getByRole('link', { name: 'Music' })).toHaveAttribute(
      'href',
      '/music',
    );
    expect(within(primaryNav).getByRole('link', { name: 'Books' })).toHaveAttribute(
      'href',
      '/books',
    );
  });
});
