import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import VideoPlayer from './VideoPlayer'

describe('VideoPlayer empty shell', () => {
  it('renders empty-state copy when src is blank', () => {
    render(<VideoPlayer src="" title="Anything" />)
    expect(screen.getByText('No stream available')).toBeInTheDocument()
    expect(document.querySelector('video')).toBeNull()
  })
})
