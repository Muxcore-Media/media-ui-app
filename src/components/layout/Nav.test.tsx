import { describe, expect, it } from 'vitest'
import { fireEvent, render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import Nav from './Nav'
import { CapabilitiesContext, DEFAULT_CAPABILITIES } from '../../lib/capabilities'

function renderNav(caps = DEFAULT_CAPABILITIES) {
  return render(
    <CapabilitiesContext.Provider value={{ caps, loading: false, error: null }}>
      <MemoryRouter>
        <Nav />
      </MemoryRouter>
    </CapabilitiesContext.Provider>,
  )
}

describe('Nav More menu', () => {
  it('opens desktop overflow links when More is clicked', () => {
    renderNav()
    const primaryNav = screen.getByRole('navigation', { name: 'Primary' })
    fireEvent.click(within(primaryNav).getByRole('button', { name: 'More' }))
    expect(screen.getByRole('menu')).toBeInTheDocument()
    expect(screen.getByRole('menuitem', { name: 'Collections' })).toHaveAttribute('href', '/collections')
  })

  it('opens mobile sheet when More is tapped', () => {
    renderNav()
    const mobileNav = screen.getByRole('navigation', { name: 'Mobile primary' })
    fireEvent.click(within(mobileNav).getByRole('button', { name: 'More' }))
    const sheet = screen.getByRole('navigation', { name: 'More' })
    expect(within(sheet).getByRole('link', { name: 'TV' })).toHaveAttribute('href', '/tv')
    expect(within(sheet).getByRole('link', { name: 'Collections' })).toHaveAttribute('href', '/collections')
  })
})
