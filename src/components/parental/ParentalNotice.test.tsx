import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { PARENTAL_CODES, PARENTAL_COPY } from '../../api/errors';
import { ErrorBanner } from '../ui/ErrorBanner';
import { ParentalNotice } from './ParentalNotice';

describe('ParentalNotice', () => {
  for (const code of PARENTAL_CODES) {
    it(`renders the specific ${code} state`, () => {
      render(<ParentalNotice code={code} />);
      const copy = PARENTAL_COPY[code];
      const notice = screen.getByTestId('parental-notice');
      expect(notice).toHaveAttribute('data-parental-code', code);
      expect(notice).toHaveTextContent(copy.title);
      expect(notice).toHaveTextContent(copy.message);
      // Decisions are polite status messages; "could not check" is an alert.
      expect(notice).toHaveAttribute('role', copy.tone === 'error' ? 'alert' : 'status');
    });
  }

  it('shows Retry only for retryable codes and only when a handler is given', () => {
    const onRetry = vi.fn();
    const { rerender } = render(<ParentalNotice code="parental.policy_unavailable" onRetry={onRetry} />);
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(onRetry).toHaveBeenCalledTimes(1);
    rerender(<ParentalNotice code="parental.blocked" onRetry={onRetry} />);
    expect(screen.queryByRole('button', { name: 'Try again' })).not.toBeInTheDocument();
    rerender(<ParentalNotice code="parental.classification_unavailable" />);
    expect(screen.queryByRole('button', { name: 'Try again' })).not.toBeInTheDocument();
  });

  it('offers a sign-in link for an invalid session', () => {
    render(<ParentalNotice code="parental.session_invalid" />);
    expect(screen.getByRole('link', { name: 'Sign in' })).toHaveAttribute('href', '/login');
  });

  it('tells restricted accounts calmly and unconfigured accounts to ask an administrator', () => {
    const { rerender } = render(<ParentalNotice code="parental.restricted_route" />);
    expect(screen.getByRole('status')).toHaveTextContent(/restricted accounts/i);
    rerender(<ParentalNotice code="parental.policy_unconfigured" />);
    expect(screen.getByRole('status')).toHaveTextContent(/ask an administrator/i);
    rerender(<ParentalNotice code="parental.policy_unverifiable" />);
    expect(screen.getByRole('status')).toHaveTextContent(/password instead of Quick Connect/i);
  });
});

describe('ErrorBanner with parental copy', () => {
  it('turns a ParentalError message into the calm state, not a red alert', () => {
    render(<ErrorBanner message={PARENTAL_COPY['parental.restricted_route'].message} />);
    expect(screen.getByTestId('parental-notice')).toHaveAttribute('role', 'status');
    expect(screen.queryByTestId('page-error')).not.toBeInTheDocument();
  });

  it('keeps ordinary failures as the existing alert', () => {
    render(<ErrorBanner message="Something broke" />);
    expect(screen.getByTestId('page-error')).toHaveAttribute('role', 'alert');
  });

  it('keeps a custom testId for the retryable alert variant', () => {
    render(<ErrorBanner message={PARENTAL_COPY['parental.policy_unavailable'].message} testId="library-error" />);
    expect(screen.getByTestId('library-error')).toHaveAttribute('role', 'alert');
  });
});
