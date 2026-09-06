import { describe, expect, it, beforeEach } from 'vitest';
import { getCurrentUserId, setCurrentUserId, userIdFromUnknown } from './session';

describe('userIdFromUnknown', () => {
  it('reads user_id, userId, or id', () => {
    expect(userIdFromUnknown({ user_id: 'a' })).toBe('a');
    expect(userIdFromUnknown({ userId: 'b' })).toBe('b');
    expect(userIdFromUnknown({ id: 'c' })).toBe('c');
  });

  it('walks a nested user object', () => {
    expect(userIdFromUnknown({ user: { user_id: 'nested' } })).toBe('nested');
  });

  it('returns empty for non-objects and blank ids', () => {
    expect(userIdFromUnknown(null)).toBe('');
    expect(userIdFromUnknown('user-1')).toBe('');
    expect(userIdFromUnknown({ user_id: '   ' })).toBe('');
  });
});

describe('current user id cache', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('round-trips the cached id', () => {
    expect(getCurrentUserId()).toBe('');
    setCurrentUserId('  alice  ');
    expect(getCurrentUserId()).toBe('alice');
    setCurrentUserId('');
    expect(getCurrentUserId()).toBe('');
  });
});
