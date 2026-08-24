import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import ForgotPassword from './ForgotPassword'

describe('ForgotPassword page', () => {
  const fetchMock = vi.fn()

  beforeEach(() => {
    fetchMock.mockReset()
    vi.stubGlobal('fetch', fetchMock)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('submits reset request to BFF', async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ message: 'Admin notified.' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    )
    render(<ForgotPassword />)
    fireEvent.change(screen.getByTestId('forgot-password-username'), { target: { value: 'ender' } })
    fireEvent.click(screen.getByTestId('forgot-password-submit'))
    await waitFor(() => {
      expect(screen.getByTestId('forgot-password-success')).toHaveTextContent('Admin notified.')
    })
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/password-reset',
      expect.objectContaining({ method: 'POST' }),
    )
  })
})
