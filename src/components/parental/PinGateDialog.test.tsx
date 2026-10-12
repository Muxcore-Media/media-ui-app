import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PinGateDialog } from './PinGateDialog';
import { hashPin } from '../../lib/parental';
import * as parental from '../../lib/parental';
import { setCurrentUserId } from '../../lib/session';

describe('PinGateDialog', () => {
  afterEach(() => vi.restoreAllMocks());

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
    const input = screen.getByLabelText('PIN');
    expect(input).toHaveFocus();
    expect(input).toHaveAttribute('type', 'password');
    expect(input).toHaveAttribute('inputmode', 'numeric');
    expect(input).toHaveAttribute('maxlength', '6');
    expect(input).toHaveAccessibleDescription('Enter 4–6 digits.');
  });

  it('preserves empty-hash success after explicit submission', async () => {
    const onSuccess = vi.fn();
    render(
      <PinGateDialog pinHash="" onSuccess={onSuccess} onCancel={vi.fn()} />,
    );
    fireEvent.change(screen.getByLabelText('PIN'), { target: { value: '1234' } });
    expect(onSuccess).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Unlock' }));
    await waitFor(() => expect(onSuccess).toHaveBeenCalledTimes(1));
  });

  it('calls onSuccess when the correct PIN is entered', async () => {
    const onSuccess = vi.fn();
    const pin = '4321';
    const hash = await hashPin(pin);
    render(<PinGateDialog pinHash={hash} onSuccess={onSuccess} onCancel={vi.fn()} />);
    fireEvent.change(screen.getByLabelText('PIN'), { target: { value: pin } });
    fireEvent.click(screen.getByRole('button', { name: 'Unlock' }));
    await waitFor(() => expect(onSuccess).toHaveBeenCalledTimes(1));
  });

  it.each(['0123', '01234', '012345'])('unlocks with the Settings-supported PIN %s, preserving its leading zero', async (pin) => {
    setCurrentUserId('fixture-member');
    const onSuccess = vi.fn();
    const hash = await hashPin(pin);
    render(<PinGateDialog pinHash={hash} onSuccess={onSuccess} onCancel={vi.fn()} />);

    fireEvent.change(screen.getByLabelText('PIN'), { target: { value: pin } });
    fireEvent.click(screen.getByRole('button', { name: 'Unlock' }));

    await waitFor(() => expect(onSuccess).toHaveBeenCalledTimes(1));
  });

  it.each(['0123', '01234', '012345'])('clears and refocuses an incorrect %s attempt, then accepts Enter on retry', async (pin) => {
    const user = userEvent.setup();
    const onSuccess = vi.fn();
    const hash = await hashPin(pin);
    render(<PinGateDialog pinHash={hash} onSuccess={onSuccess} onCancel={vi.fn()} />);
    const input = screen.getByLabelText('PIN');
    await user.type(input, '9'.repeat(pin.length));
    await user.click(screen.getByRole('button', { name: 'Unlock' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Incorrect PIN. Try again.');
    expect(onSuccess).not.toHaveBeenCalled();
    expect(input).toHaveValue('');
    expect(input).toHaveFocus();
    await user.type(input, pin);
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    await user.keyboard('{Enter}');
    await waitFor(() => expect(onSuccess).toHaveBeenCalledTimes(1));
  });

  it.each(['', '123', '1234567', '12a4'])('never verifies an invalid PIN %j, including a direct form submission', (pin) => {
    const verify = vi.spyOn(parental, 'verifyPin');
    const onSuccess = vi.fn();
    render(<PinGateDialog pinHash="" onSuccess={onSuccess} onCancel={vi.fn()} />);
    const input = screen.getByLabelText('PIN');
    fireEvent.change(input, { target: { value: pin } });
    expect(screen.getByRole('button', { name: 'Unlock' })).toBeDisabled();
    fireEvent.submit(input.closest('form')!);
    expect(screen.getByRole('alert')).toHaveTextContent('Enter 4–6 digits.');
    expect(verify).not.toHaveBeenCalled();
    expect(onSuccess).not.toHaveBeenCalled();
  });

  it('does not verify while typing four, five or six digits before Unlock', async () => {
    const verify = vi.spyOn(parental, 'verifyPin');
    const onSuccess = vi.fn();
    render(<PinGateDialog pinHash="" onSuccess={onSuccess} onCancel={vi.fn()} />);
    const input = screen.getByLabelText('PIN');
    for (const pin of ['0123', '01234', '012345']) {
      await act(async () => { fireEvent.change(input, { target: { value: pin } }); });
      expect(input).toHaveValue(pin);
      expect(verify).not.toHaveBeenCalled();
      expect(onSuccess).not.toHaveBeenCalled();
    }
    fireEvent.click(screen.getByRole('button', { name: 'Unlock' }));
    await waitFor(() => expect(onSuccess).toHaveBeenCalledTimes(1));
    expect(verify).toHaveBeenCalledExactlyOnceWith('012345', '');
  });

  it('prevents duplicate verification and cancellation while a hash check is pending', async () => {
    let resolve!: (valid: boolean) => void;
    const pending = new Promise<boolean>((done) => { resolve = done; });
    const verify = vi.spyOn(parental, 'verifyPin').mockReturnValue(pending);
    const onSuccess = vi.fn();
    const onCancel = vi.fn();
    render(<PinGateDialog pinHash="saved-hash" onSuccess={onSuccess} onCancel={onCancel} />);
    const input = screen.getByLabelText('PIN');
    fireEvent.change(input, { target: { value: '012345' } });
    const form = input.closest('form')!;
    fireEvent.submit(form);
    fireEvent.submit(form);
    fireEvent.submit(form);
    expect(verify).toHaveBeenCalledExactlyOnceWith('012345', 'saved-hash');
    expect(input).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Verifying…' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Verifying…' })).toHaveAttribute('aria-busy', 'true');
    const cancel = screen.getByRole('button', { name: 'Cancel' });
    expect(cancel).toBeDisabled();
    fireEvent.click(cancel);
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });
    expect(onCancel).not.toHaveBeenCalled();
    expect(onSuccess).not.toHaveBeenCalled();
    await act(async () => { resolve(true); await pending; });
    expect(onSuccess).toHaveBeenCalledTimes(1);
    expect(input).toBeEnabled();
  });

  it('calls only onCancel when Cancel is clicked with a complete PIN', () => {
    const onCancel = vi.fn();
    const onSuccess = vi.fn();
    const verify = vi.spyOn(parental, 'verifyPin');
    render(<PinGateDialog pinHash="" onSuccess={onSuccess} onCancel={onCancel} />);
    fireEvent.change(screen.getByLabelText('PIN'), { target: { value: '012345' } });
    const cancel = screen.getByRole('button', { name: 'Cancel' });
    expect(cancel).toHaveAttribute('type', 'button');
    fireEvent.click(cancel);
    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(onSuccess).not.toHaveBeenCalled();
    expect(verify).not.toHaveBeenCalled();
  });

  it('calls onCancel when Escape is pressed', () => {
    const onCancel = vi.fn();
    render(<PinGateDialog pinHash="" onSuccess={vi.fn()} onCancel={onCancel} />);
    const input = screen.getByLabelText('PIN');
    fireEvent.keyDown(input, { key: 'Escape' });
    expect(onCancel).toHaveBeenCalledTimes(1);
  });
});
