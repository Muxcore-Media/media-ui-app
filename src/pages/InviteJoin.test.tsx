import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import InviteJoin from './InviteJoin'

describe('InviteJoin page', () => {
  const fetchMock = vi.fn()

  beforeEach(() => {
    fetchMock.mockReset()
    vi.stubGlobal('fetch', fetchMock)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('shows invalid state when peek fails', async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ error: 'expired' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      }),
    )
    render(
      <MemoryRouter initialEntries={['/invite/abc']}>
        <Routes>
          <Route path="/invite/:token" element={<InviteJoin />} />
        </Routes>
      </MemoryRouter>,
    )
    expect(await screen.findByTestId('invite-join-invalid')).toBeInTheDocument()
    expect(screen.getByText(/expired/i)).toBeInTheDocument()
  })

  it('renders signup form for valid invite', async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ valid: true, role: 'user' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    )
    render(
      <MemoryRouter initialEntries={['/invite/good-token']}>
        <Routes>
          <Route path="/invite/:token" element={<InviteJoin />} />
        </Routes>
      </MemoryRouter>,
    )
    expect(await screen.findByTestId('invite-join-form')).toBeInTheDocument()
    await waitFor(() => {
      expect(screen.getByTestId('invite-join-username')).toBeInTheDocument()
    })
  })
})
