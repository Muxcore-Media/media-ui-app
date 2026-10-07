import { describe, expect, it } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Nav from './Nav';
import { CapabilitiesContext, DEFAULT_CAPABILITIES } from '../../lib/capabilities';

function renderNav(caps = DEFAULT_CAPABILITIES, initialEntries: string[] = ['/']) {
  return render(
    <CapabilitiesContext.Provider value={{ caps, loading: false, error: null, retry: () => {} }}>
      <MemoryRouter initialEntries={initialEntries}>
        <Nav />
      </MemoryRouter>
    </CapabilitiesContext.Provider>,
  );
}

describe('Nav accessibility', () => {
  it('marks the active primary route with aria-current="page"', () => {
    renderNav(DEFAULT_CAPABILITIES, ['/movies']);
    const primaryNav = screen.getByRole('navigation', { name: 'Primary navigation' });
    expect(within(primaryNav).getByRole('link', { name: 'Movies' })).toHaveAttribute(
      'aria-current',
      'page',
    );
    expect(within(primaryNav).getByRole('link', { name: 'Home' })).not.toHaveAttribute(
      'aria-current',
    );
  });
});

describe('Nav More menu', () => {
  it('opens desktop overflow links when More is clicked', () => {
    renderNav();
    const primaryNav = screen.getByRole('navigation', { name: 'Primary navigation' });
    fireEvent.click(within(primaryNav).getByRole('button', { name: 'More' }));
    expect(screen.getByRole('menu')).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: 'Collections' })).toHaveAttribute(
      'href',
      '/collections',
    );
    expect(screen.getAllByRole('menuitem')[0]).toHaveFocus();
    fireEvent.keyDown(document.activeElement!, { key: 'Escape' });
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    expect(within(primaryNav).getByRole('button', { name: 'More' })).toHaveFocus();
  });

  it('opens mobile sheet when More is tapped', () => {
    renderNav();
    const mobileNav = screen.getByRole('navigation', { name: 'Mobile primary navigation' });
    fireEvent.click(within(mobileNav).getByRole('button', { name: 'More' }));
    const sheet = screen.getByRole('navigation', { name: 'More navigation' });
    expect(within(sheet).getByRole('link', { name: 'TV' })).toHaveAttribute('href', '/tv');
    expect(within(sheet).getByRole('link', { name: 'Collections' })).toHaveAttribute(
      'href',
      '/collections',
    );
    expect(within(sheet).getByRole('link', { name: 'TV' })).toHaveFocus();
    fireEvent.keyDown(document.activeElement!, { key: 'Escape' });
    expect(screen.queryByRole('navigation', { name: 'More navigation' })).not.toBeInTheDocument();
    expect(within(mobileNav).getByRole('button', { name: 'More' })).toHaveFocus();
  });

  it('activates a desktop menu link with Space', () => {
    renderNav();
    const primaryNav = screen.getByRole('navigation', { name: 'Primary navigation' });
    const trigger = within(primaryNav).getByRole('button', { name: 'More' });
    fireEvent.click(trigger);
    const collections = screen.getByRole('menuitem', { name: 'Collections' });
    collections.focus();
    fireEvent.keyDown(collections, { key: ' ' });
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    fireEvent.click(trigger);
    expect(screen.getByRole('menuitem', { name: 'Collections' })).toHaveAttribute('aria-current', 'page');
  });
});
