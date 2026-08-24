import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Inbox } from 'lucide-react'
import { EmptyState } from './EmptyState'

describe('EmptyState', () => {
  it('renders message with default data-testid', () => {
    render(<EmptyState icon={Inbox} message="Nothing here yet." />)

    expect(screen.getByTestId('page-empty')).toBeInTheDocument()
    expect(screen.getByText('Nothing here yet.')).toBeInTheDocument()
  })
})
