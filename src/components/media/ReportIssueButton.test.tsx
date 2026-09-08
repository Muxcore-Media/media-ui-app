import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { CapabilitiesContext, DEFAULT_CAPABILITIES } from '../../lib/capabilities';
import { ReportIssueButton } from './ReportIssueButton';

const reportIssue = vi.fn();

vi.mock('../../api/client', async () => {
  const actual = await vi.importActual<typeof import('../../api/client')>('../../api/client');
  return {
    ...actual,
    api: {
      reportIssue: (...args: unknown[]) => reportIssue(...args),
    },
  };
});

describe('ReportIssueButton', () => {
  it('submits a household issue', async () => {
    reportIssue.mockResolvedValueOnce({ id: 'iss_1', kind: 'subtitles', title: 'Fight Club' });
    render(
      <CapabilitiesContext.Provider
        value={{ caps: DEFAULT_CAPABILITIES, loading: false, error: null, retry: () => {} }}
      >
        <ReportIssueButton title="Fight Club" mediaType="movie" tmdbId={550} />
      </CapabilitiesContext.Provider>,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Report issue' }));
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'subtitles' } });
    fireEvent.change(screen.getByLabelText(/Details/), { target: { value: 'no English' } });
    fireEvent.click(screen.getByRole('button', { name: 'Send report' }));
    await waitFor(() => {
      expect(reportIssue).toHaveBeenCalledWith(
        expect.objectContaining({
          kind: 'subtitles',
          title: 'Fight Club',
          tmdbId: 550,
          message: 'no English',
        }),
      );
    });
    expect(screen.getByText('Issue reported')).toBeInTheDocument();
  });

  it('renders a compact player OSD control', async () => {
    reportIssue.mockResolvedValueOnce({ id: 'iss_2', kind: 'video', title: 'Dune' });
    render(
      <CapabilitiesContext.Provider
        value={{ caps: DEFAULT_CAPABILITIES, loading: false, error: null, retry: () => {} }}
      >
        <ReportIssueButton variant="icon" title="Dune" mediaType="movie" mediaId="m1" />
      </CapabilitiesContext.Provider>,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Report an issue' }));
    fireEvent.click(screen.getByRole('button', { name: 'Send report' }));
    await waitFor(() => {
      expect(reportIssue).toHaveBeenCalledWith(expect.objectContaining({ title: 'Dune', mediaId: 'm1' }));
    });
  });
});
