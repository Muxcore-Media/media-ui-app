import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import QuickConnect from './QuickConnect'

const approveQuickConnect = vi.fn()

vi.mock('../api/client', async () => {
  const actual = await vi.importActual<typeof import('../api/client')>('../api/client')
  return {
    ...actual,
    api: {
      approveQuickConnect: (...args: unknown[]) => approveQuickConnect(...args),
    },
  }
})

describe('QuickConnect page', () => {
  beforeEach(() => {
    approveQuickConnect.mockReset()
    approveQuickConnect.mockResolvedValue({ ok: true, message: 'Code authorized.' })
  })

  it('approves a device code', async () => {
    render(
      <MemoryRouter>
        <QuickConnect />
      </MemoryRouter>,
    )
    expect(screen.getByTestId('quickconnect-page')).toBeInTheDocument()
    fireEvent.change(screen.getByPlaceholderText('123456'), { target: { value: '654321' } })
    fireEvent.submit(screen.getByPlaceholderText('123456').closest('form')!)
    await waitFor(() => {
      expect(screen.getByText(/authorized/i)).toBeInTheDocument()
    })
    expect(approveQuickConnect).toHaveBeenCalledWith('654321')
  })
})
