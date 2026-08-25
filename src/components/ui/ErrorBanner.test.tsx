import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ErrorBanner } from './ErrorBanner';

describe('ErrorBanner', () => {
  it('renders message with default data-testid page-error', () => {
    render(<ErrorBanner message="Something went wrong." />);

    expect(screen.getByTestId('page-error')).toBeInTheDocument();
    expect(screen.getByText('Something went wrong.')).toBeInTheDocument();
  });

  it('uses role alert for accessibility', () => {
    render(<ErrorBanner message="Failed to load." />);

    expect(screen.getByRole('alert')).toHaveTextContent('Failed to load.');
  });

  it('accepts a custom data-testid', () => {
    render(<ErrorBanner message="Library error." testId="library-error" />);

    expect(screen.getByTestId('library-error')).toBeInTheDocument();
    expect(screen.queryByTestId('page-error')).not.toBeInTheDocument();
  });
});
