import { describe, expect, it, vi } from 'vitest';
import { watchSessionEvents } from './session-events';

class FakeEventSource {
  static last: FakeEventSource | null = null;
  url: string;
  closed = false;
  listeners = new Map<string, Array<() => void>>();
  onmessage: (() => void) | null = null;
  constructor(url: string) {
    this.url = url;
    FakeEventSource.last = this;
  }
  addEventListener(type: string, fn: () => void) {
    const list = this.listeners.get(type) ?? [];
    list.push(fn);
    this.listeners.set(type, list);
  }
  emit(type: string) {
    for (const fn of this.listeners.get(type) ?? []) fn();
  }
  close() {
    this.closed = true;
  }
}

describe('session-events', () => {
  it('refreshes on a monitor session event and closes', () => {
    vi.stubGlobal('EventSource', FakeEventSource);
    const onEvent = vi.fn();
    const stop = watchSessionEvents(onEvent);
    expect(FakeEventSource.last?.url).toBe('/api/sessions/events');
    FakeEventSource.last?.emit('session');
    expect(onEvent).toHaveBeenCalledTimes(1);
    stop();
    expect(FakeEventSource.last?.closed).toBe(true);
    vi.unstubAllGlobals();
  });
});
