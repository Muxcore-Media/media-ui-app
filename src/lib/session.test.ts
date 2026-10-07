import { describe, expect, it, beforeEach } from 'vitest';
import {
  canApproveRequests,
  canManageAcquisition,
  canManageRequestPolicy,
  canManageInvites,
  canManageLibrary,
  canManageNaming,
  canManageQuality,
  canManageLists,
  canManageMigrate,
  canManageBackups,
  canManageKeys,
  canManageNotifications,
  canManageSubtitles,
  canManageTags,
  canManageUsers,
  getCurrentRoles,
  getCurrentUserId,
  rolesFromUnknown,
  setCurrentRoles,
  setCurrentUserId,
  userIdFromUnknown,
} from './session';

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

describe('rolesFromUnknown', () => {
  it('reads an array or comma-separated string', () => {
    expect(rolesFromUnknown({ roles: ['admin', ' viewer '] })).toEqual(['admin', 'viewer']);
    expect(rolesFromUnknown({ roles: 'manager,approver' })).toEqual(['manager', 'approver']);
    expect(rolesFromUnknown({ roles: [] })).toEqual([]);
    expect(rolesFromUnknown(null)).toEqual([]);
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

  it.each([
    { roles: ['admin'], allowed: true },
    { roles: ['manager'], allowed: true },
    { roles: ['viewer', ' Manager '], allowed: true },
    { roles: ['approver'], allowed: false },
    { roles: ['user'], allowed: false },
    { roles: ['viewer'], allowed: false },
    { roles: [], allowed: false },
  ])('shared acquisition and request policy access for $roles is $allowed', ({ roles, allowed }) => {
    setCurrentRoles(roles);
    expect(canManageAcquisition()).toBe(allowed);
    expect(canManageRequestPolicy()).toBe(allowed);
  });

  it('keeps approver-only request approval separate from household policy management', () => {
    setCurrentRoles(['approver']);
    expect(canApproveRequests()).toBe(true);
    expect(canManageRequestPolicy()).toBe(false);
  });

  it('round-trips cached roles and privileged approve check', () => {
    expect(getCurrentRoles()).toEqual([]);
    expect(canApproveRequests()).toBe(false);
    setCurrentRoles([' viewer ', 'Admin']);
    expect(getCurrentRoles()).toEqual(['viewer', 'Admin']);
    expect(canApproveRequests()).toBe(true);
    expect(canApproveRequests(['member'])).toBe(false);
    expect(canApproveRequests(['approver'])).toBe(true);
    expect(canManageInvites(['approver'])).toBe(false);
    expect(canManageInvites(['admin'])).toBe(true);
    expect(canManageLibrary(['approver'])).toBe(false);
    expect(canManageLibrary(['manager'])).toBe(true);
    expect(canManageUsers(['approver'])).toBe(false);
    expect(canManageUsers(['admin'])).toBe(true);
    expect(canManageNaming(['approver'])).toBe(false);
    expect(canManageNaming(['manager'])).toBe(true);
    expect(canManageQuality(['approver'])).toBe(false);
    expect(canManageQuality(['admin'])).toBe(true);
    expect(canManageLists(['approver'])).toBe(false);
    expect(canManageLists(['manager'])).toBe(true);
    expect(canManageMigrate(['approver'])).toBe(false);
    expect(canManageMigrate(['admin'])).toBe(true);
    expect(canManageNotifications(['approver'])).toBe(false);
    expect(canManageNotifications(['manager'])).toBe(true);
    expect(canManageTags(['approver'])).toBe(false);
    expect(canManageTags(['admin'])).toBe(true);
    expect(canManageBackups(['approver'])).toBe(false);
    expect(canManageBackups(['admin'])).toBe(true);
    expect(canManageKeys(['approver'])).toBe(false);
    expect(canManageKeys(['manager'])).toBe(true);
    expect(canManageSubtitles(['approver'])).toBe(false);
    expect(canManageSubtitles(['admin'])).toBe(true);
    setCurrentRoles([]);
    expect(getCurrentRoles()).toEqual([]);
  });
});
