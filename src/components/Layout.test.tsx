import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import Layout from './Layout';
import * as client from '../api/client';
import { CapabilitiesContext, ALL_CAPABILITIES, DEFAULT_CAPABILITIES } from '../lib/capabilities';
import { NowPlayingProvider, useNowPlaying } from '../lib/nowPlaying';

function PlayProbe() {
  const { play } = useNowPlaying();
  return (
    <button
      type="button"
      onClick={() =>
        play({
          id: 't1',
          src: '/stream/t1',
          title: 'Hyperballad',
          artistName: 'Björk',
          href: '/music/ar1',
        })
      }
    >
      start track
    </button>
  );
}

function renderLayout(caps = DEFAULT_CAPABILITIES) {
  return render(
    <NowPlayingProvider>
      <CapabilitiesContext.Provider value={{ caps, loading: false, error: null, retry: () => {} }}>
        <MemoryRouter initialEntries={['/']}>
          <Routes>
            <Route element={<Layout />}>
              <Route index element={<div>home body</div>} />
            </Route>
          </Routes>
        </MemoryRouter>
      </CapabilitiesContext.Provider>
    </NowPlayingProvider>,
  );
}

describe('Layout (session / login shell)', () => {
  it('signs out via POST /logout button so auth-local session cookie can be cleared', () => {
    const spy = vi.spyOn(client, 'signOut').mockResolvedValue();
    renderLayout();
    const logout = screen.getByRole('button', { name: 'Sign out' });
    expect(logout).toHaveAttribute('type', 'button');
    expect(screen.queryByRole('link', { name: 'Sign out' })).not.toBeInTheDocument();
    fireEvent.click(logout);
    expect(spy).toHaveBeenCalledTimes(1);
    spy.mockRestore();
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

  it('docks a now-playing bar after a track starts so music survives navigation', async () => {
    const { default: userEvent } = await import('@testing-library/user-event');
    const user = userEvent.setup();
    render(
      <NowPlayingProvider>
        <CapabilitiesContext.Provider
          value={{ caps: DEFAULT_CAPABILITIES, loading: false, error: null, retry: () => {} }}
        >
          <MemoryRouter initialEntries={['/']}>
            <Routes>
              <Route element={<Layout />}>
                <Route
                  index
                  element={
                    <div>
                      home body
                      <PlayProbe />
                    </div>
                  }
                />
              </Route>
            </Routes>
          </MemoryRouter>
        </CapabilitiesContext.Provider>
      </NowPlayingProvider>,
    );

    expect(screen.queryByTestId('now-playing-bar')).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'start track' }));
    expect(screen.getByTestId('now-playing-bar')).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Now playing' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Björk' })).toHaveAttribute('href', '/music/ar1');
  });
});
