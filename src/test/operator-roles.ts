/**
 * Role fixtures for the operator-control gates (T-M5-12, BFF-API.md "Operator route roles").
 * The BFF refuses these state-changing routes to every session without `admin` or `manager`,
 * and refuses `root_folder_path` to a manager. The SPA hides the controls for the same roles.
 */

export type RoleCase = readonly [label: string, roles: string[]];

/** Roles the BFF answers with 403 `operator.forbidden`. An empty cache is treated the same way. */
export const MEMBER_ROLE_CASES: readonly RoleCase[] = [
  ['no cached role', []],
  ['viewer', ['viewer']],
  ['user', ['user']],
  ['approver', ['approver']],
];

/** Roles that may use the operator controls (root-folder pickers excepted). */
export const OPERATOR_ROLE_CASES: readonly RoleCase[] = [
  ['manager', ['manager']],
  ['admin', ['admin']],
];

/** Roles that may change a library item's root folder. */
export const ROOT_ROLE_CASES: readonly RoleCase[] = [['admin', ['admin']]];

/** Operators who may not change a root folder: the BFF answers `operator.admin_required`. */
export const NON_ROOT_ROLE_CASES: readonly RoleCase[] = [...MEMBER_ROLE_CASES, ['manager', ['manager']]];
