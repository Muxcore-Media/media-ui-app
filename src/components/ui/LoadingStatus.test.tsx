import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { LoadingStatus } from './LoadingStatus';

describe('LoadingStatus', () => {
  it('announces loading with a polite status region', () => {
    render(<LoadingStatus label="Loading movies" />);
    expect(screen.getByRole('status', { name: 'Loading movies' })).toHaveAttribute(
      'aria-live',
      'polite',
    );
  });
});
