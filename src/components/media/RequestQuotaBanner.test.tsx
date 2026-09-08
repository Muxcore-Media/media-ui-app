import { render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ALL_CAPABILITIES, CapabilitiesContext, DEFAULT_CAPABILITIES } from '../../lib/capabilities';
import { RequestQuotaBanner } from './RequestQuotaBanner';

const getRequestPolicy = vi.fn();

vi.mock('../../api/client', async () => {
  const actual = await vi.importActual<typeof import('../../api/client')>('../../api/client');
  return {
    ...actual,
    api: {
      getRequestPolicy: (...args: unknown[]) => getRequestPolicy(...args),
    },
  };
});

describe('RequestQuotaBanner', () => {
  it('hides when request is off', () => {
    render(
      <CapabilitiesContext.Provider
        value={{
          caps: {
            ...DEFAULT_CAPABILITIES,
            features: { ...DEFAULT_CAPABILITIES.features, request: false },
          },
          loading: false,
          error: null,
          retry: () => {},
        }}
      >
        <RequestQuotaBanner />
      </CapabilitiesContext.Provider>,
    );
    expect(screen.queryByTestId('request-quota')).not.toBeInTheDocument();
    expect(getRequestPolicy).not.toHaveBeenCalled();
  });

  it('shows remaining weekly requests', async () => {
    getRequestPolicy.mockResolvedValueOnce({
      maxPendingPerUser: 0,
      maxPerWeek: 5,
      remainingWeek: 3,
      remainingPending: -1,
      canRequest: true,
      reason: '',
    });
    render(
      <CapabilitiesContext.Provider
        value={{
          caps: { ...ALL_CAPABILITIES, features: { ...ALL_CAPABILITIES.features, request: true } },
          loading: false,
          error: null,
          retry: () => {},
        }}
      >
        <RequestQuotaBanner />
      </CapabilitiesContext.Provider>,
    );
    await waitFor(() => {
      expect(screen.getByTestId('request-quota')).toHaveTextContent('3 of 5 this week');
    });
  });
});
