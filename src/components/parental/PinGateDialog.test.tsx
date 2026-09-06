import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { PinGateDialog } from './PinGateDialog';
import { hashPin } from '../../lib/parental';

async function renderDialog(pinHash: string, onSuccess = vi.fn(), onCancel = vi.fn()) {
  render(
    <PinGateDialog
      pinHash={pinHash}
      onSuccess={onSuccess}
      onCancel={onCancel}
      actionLabel="Unlock test title"
    />,
  );
  return { onSuccess, onCancel };
}

function fillPin(digits: string) {
  const inputs = screen.getAllByRole('textbox', { hidden: true }).filter((el) => {
    return (el as HTMLInputElement).maxLength === 1;
  });
  // Some environments expose them as generic inputs; fall back to aria-label pattern
  const pinInputs =
    inputs.length >= 4
      ? inputs
      : ([1, 2, 3, 4].map((n) => screen.getByLabelText(`PIN digit ${n}`)) as HTMLElement[]);

  for (let i = 0; i < digits.length; i++) {
    fireEvent.change(pinInputs[i]!, { target: { value: digits[i] } });
  }
}

describe('PinGateDialog', () => {
  it('renders with the action label', () => {
    render(
      <PinGateDialog
        pinHash=""
        onSuccess={vi.fn()}
        onCancel={vi.fn()}
        actionLabel="Unlock test"
      />,
    );
    expect(screen.getByText('Unlock test')).toBeInTheDocument();
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('calls onSuccess immediately when no pinHash is set (no PIN configured)', async () => {
    const onSuccess = vi.fn();
    render(
      <PinGateDialog pinHash="" onSuccess={onSuccess} onCancel={vi.fn()} />,
    );
    const inputs = [1, 2, 3, 4].map((n) => screen.getByLabelText(`PIN digit ${n}`));
    // Fill all 4 digits to trigger auto-submit
    for (const [i, input] of inputs.entries()) {
      fireEvent.change(input, { target: { value: String(i + 1) } });
    }
    await waitFor(() => expect(onSuccess).toHaveBeenCalledTimes(1));
  });

  it('calls onSuccess when the correct PIN is entered', async () => {
    const onSuccess = vi.fn();
    const pin = '4321';
    const hash = await hashPin(pin);
    render(<PinGateDialog pinHash={hash} onSuccess={onSuccess} onCancel={vi.fn()} />);
    const inputs = [1, 2, 3, 4].map((n) => screen.getByLabelText(`PIN digit ${n}`));
    for (const [i, input] of inputs.entries()) {
      fireEvent.change(input, { target: { value: pin[i] } });
    }
    await waitFor(() => expect(onSuccess).toHaveBeenCalledTimes(1));
  });

  it('shows an error and does NOT call onSuccess for a wrong PIN', async () => {
    const onSuccess = vi.fn();
    const hash = await hashPin('1111');
    render(<PinGateDialog pinHash={hash} onSuccess={onSuccess} onCancel={vi.fn()} />);
    const inputs = [1, 2, 3, 4].map((n) => screen.getByLabelText(`PIN digit ${n}`));
    for (const [i, input] of inputs.entries()) {
      fireEvent.change(input, { target: { value: String((i + 5) % 10) } }); // wrong PIN
    }
    await waitFor(() => expect(screen.getByRole('alert')).toBeInTheDocument());
    expect(screen.getByRole('alert').textContent).toMatch(/incorrect/i);
    expect(onSuccess).not.toHaveBeenCalled();
  });

  it('calls onCancel when Cancel is clicked', () => {
    const onCancel = vi.fn();
    render(<PinGateDialog pinHash="" onSuccess={vi.fn()} onCancel={onCancel} />);
    fireEvent.click(screen.getByRole('button', { name: /cancel/i }));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('calls onCancel when Escape is pressed', () => {
    const onCancel = vi.fn();
    render(<PinGateDialog pinHash="" onSuccess={vi.fn()} onCancel={onCancel} />);
    const input = screen.getByLabelText('PIN digit 1');
    fireEvent.keyDown(input, { key: 'Escape' });
    expect(onCancel).toHaveBeenCalledTimes(1);
  });
});
