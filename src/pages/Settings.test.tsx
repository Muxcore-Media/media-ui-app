import { describe, expect, it, beforeEach } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import Settings from './Settings';
import { CapabilitiesContext, DEFAULT_CAPABILITIES } from '../lib/capabilities';
import { getPreferences } from '../lib/userdata';

function renderSettings(path = '/settings') {
  return render(
    <CapabilitiesContext.Provider
      value={{ caps: DEFAULT_CAPABILITIES, loading: false, error: null, retry: () => {} }}
    >
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/settings/*" element={<Settings />} />
        </Routes>
      </MemoryRouter>
    </CapabilitiesContext.Provider>,
  );
}

describe('Settings page', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('renders profile pane by default', () => {
    renderSettings();
    expect(screen.getByTestId('settings-page')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Profile' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /log out/i })).toHaveAttribute('href', '/logout');
  });

  it('renders home feed toggles including recently added', () => {
    renderSettings('/settings/home');
    expect(screen.getByText('Recently added')).toBeInTheDocument();
    expect(screen.getByText('Continue watching')).toBeInTheDocument();
  });

  it('persists recently added home preference', () => {
    renderSettings('/settings/home');
    fireEvent.click(screen.getByRole('checkbox', { name: 'Recently added' }));
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(getPreferences().home.showRecentlyAdded).toBe(false);
  });

  it('persists Want to Watch home preference', () => {
    renderSettings('/settings/home');
    fireEvent.click(screen.getByRole('checkbox', { name: 'Want to Watch shelf' }));
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(getPreferences().home.showWantToWatch).toBe(false);
  });

  it('marks the active settings section with aria-current', () => {
    renderSettings('/settings/display');
    expect(screen.getByRole('link', { name: 'Display' })).toHaveAttribute('aria-current', 'page');
  });

  it('labels each settings pane with a section heading', () => {
    renderSettings('/settings/playback');
    expect(screen.getByRole('heading', { level: 2, name: 'Playback' })).toBeInTheDocument();
  });
});
