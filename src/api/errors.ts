/**
 * Typed errors for BFF failures.
 *
 * The consumer BFF enforces parental policy on the server (ADR-0031, FR-PLAY-007) and
 * answers with `{ error, code }` JSON. `ParentalError` carries the `parental.*` code so
 * pages can render a specific state instead of a generic failure.
 *
 * Nothing here decides access: every code below is a *server decision* the SPA only
 * reports. 5xx-class codes (`policy_unavailable`, `classification_unavailable`) mean
 * "could not check" and must never be treated as allowed.
 */

/** `parental.*` codes documented in BFF-API.md "Parental enforcement (ADR-0031)". */
export const PARENTAL_CODES = [
  'parental.blocked',
  'parental.restricted_route',
  'parental.policy_unconfigured',
  'parental.policy_unverifiable',
  'parental.session_invalid',
  'parental.policy_unavailable',
  'parental.classification_unavailable',
] as const;

export type ParentalCode = (typeof PARENTAL_CODES)[number];

/** Non-parental BFF error. `message` keeps the historical `error (code)` shape. */
export class ApiError extends Error {
  readonly status: number;
  /** Machine code from the response body, when present (for example `playback.src_required`). */
  readonly code?: string;

  constructor(message: string, status: number, code?: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
  }
}

export type ParentalTone = 'calm' | 'error';

export type ParentalCopy = {
  /** Short heading for the state. */
  title: string;
  /** User-facing sentence; also the `ParentalError.message`. */
  message: string;
  /** `calm`: a decision, not a fault (polite status). `error`: transient failure (alert). */
  tone: ParentalTone;
  /** True when trying again later may succeed (never auto-retried). */
  retryable: boolean;
};

export const PARENTAL_COPY: Record<ParentalCode, ParentalCopy> = {
  'parental.blocked': {
    title: 'Not available for this profile',
    message: "This title isn't available for this profile.",
    tone: 'calm',
    retryable: false,
  },
  'parental.restricted_route': {
    title: 'Not available for restricted accounts',
    message: "This isn't available for restricted accounts.",
    tone: 'calm',
    retryable: false,
  },
  'parental.policy_unconfigured': {
    title: "Parental controls aren't set up",
    message:
      "Parental controls haven't been set up for this account yet. Ask an administrator to set them, then try again.",
    tone: 'calm',
    retryable: false,
  },
  'parental.policy_unverifiable': {
    title: 'Sign in with a password',
    message:
      "This session can't be checked against parental controls. Sign in with your password instead of Quick Connect, then try again.",
    tone: 'calm',
    retryable: false,
  },
  'parental.session_invalid': {
    title: 'Sign in again',
    message: 'Your session has expired. Sign in again to continue.',
    tone: 'calm',
    retryable: false,
  },
  'parental.policy_unavailable': {
    title: "Couldn't check parental controls",
    message: "Parental controls couldn't be checked right now. Try again in a moment.",
    tone: 'error',
    retryable: true,
  },
  'parental.classification_unavailable': {
    title: "Couldn't check this title",
    message: "This title couldn't be checked against parental controls right now. Try again in a moment.",
    tone: 'error',
    retryable: true,
  },
};

/** Server-enforced parental denial or failure to evaluate policy. */
export class ParentalError extends ApiError {
  readonly parentalCode: ParentalCode;
  /** Raw `error` text from the BFF. Diagnostic only; the UI shows `message`. */
  readonly serverMessage?: string;

  constructor(parentalCode: ParentalCode, status: number, code?: string, serverMessage?: string) {
    super(PARENTAL_COPY[parentalCode].message, status, code ?? parentalCode);
    this.name = 'ParentalError';
    this.parentalCode = parentalCode;
    this.serverMessage = serverMessage;
  }

  get retryable(): boolean {
    return PARENTAL_COPY[this.parentalCode].retryable;
  }
}

export function isParentalCode(value: unknown): value is ParentalCode {
  return typeof value === 'string' && (PARENTAL_CODES as readonly string[]).includes(value);
}

/**
 * Map a BFF error body to a parental code. Resolve keeps `code: playback.parental_blocked`
 * and adds `parental_code: parental.blocked`; both are accepted.
 */
export function parentalCodeFromBody(body: unknown): ParentalCode | null {
  if (!body || typeof body !== 'object') return null;
  const { code, parental_code: parentalCode } = body as Record<string, unknown>;
  if (isParentalCode(parentalCode)) return parentalCode;
  if (isParentalCode(code)) return code;
  if (code === 'playback.parental_blocked') return 'parental.blocked';
  return null;
}

/** Recover the parental code from a surfaced `ParentalError.message` (page-level `error` strings). */
export function parentalCodeFromMessage(message: string | null | undefined): ParentalCode | null {
  if (!message) return null;
  for (const code of PARENTAL_CODES) {
    if (PARENTAL_COPY[code].message === message) return code;
  }
  return null;
}

export function parentalCodeOf(err: unknown): ParentalCode | null {
  return err instanceof ParentalError ? err.parentalCode : null;
}

/** Page heading for a failed detail load: the parental state's title, else `fallback`. */
export function parentalTitleOr(message: string | null | undefined, fallback: string): string {
  const code = parentalCodeFromMessage(message);
  return code ? PARENTAL_COPY[code].title : fallback;
}

/**
 * `operator.*` role denials from the BFF operator route gate (T-M5-12, C-30; BFF-API.md
 * "Operator route roles"). The BFF answers 403 to a session without the admin or manager role on
 * state-changing operator routes, and 403 `operator.admin_required` when a manager names
 * `root_folder_path` in a library PATCH. The SPA hides those controls from members using a cached
 * role that can be stale; this is the calm fallback when a stale control is used anyway.
 *
 * Like `ParentalError`, this only reports a server decision. It never grants anything.
 */
export const OPERATOR_CODES = ['operator.forbidden', 'operator.admin_required'] as const;

export type OperatorCode = (typeof OPERATOR_CODES)[number];

export const OPERATOR_COPY: Record<OperatorCode, { title: string; message: string }> = {
  'operator.forbidden': {
    title: 'Not available for your role',
    message: "You don't have permission for this action.",
  },
  'operator.admin_required': {
    title: 'Administrator needed',
    message: "You don't have permission for this action. Changing a root folder needs an administrator.",
  },
};

export class OperatorError extends ApiError {
  readonly operatorCode: OperatorCode;
  /** Raw `error` text from the BFF. Diagnostic only; the UI shows `message`. */
  readonly serverMessage?: string;

  constructor(operatorCode: OperatorCode, status: number, serverMessage?: string) {
    super(OPERATOR_COPY[operatorCode].message, status, operatorCode);
    this.name = 'OperatorError';
    this.operatorCode = operatorCode;
    this.serverMessage = serverMessage;
  }
}

export function isOperatorCode(value: unknown): value is OperatorCode {
  return typeof value === 'string' && (OPERATOR_CODES as readonly string[]).includes(value);
}

/** Map a 403 BFF error body to an operator code. Other statuses (for example 413) are not role denials. */
export function operatorCodeFromBody(body: unknown, status: number): OperatorCode | null {
  if (status !== 403 || !body || typeof body !== 'object') return null;
  const { code } = body as Record<string, unknown>;
  return isOperatorCode(code) ? code : null;
}

/** Recover the operator code from a surfaced `OperatorError.message` (page-level `error` strings). */
export function operatorCodeFromMessage(message: string | null | undefined): OperatorCode | null {
  if (!message) return null;
  for (const code of OPERATOR_CODES) {
    if (OPERATOR_COPY[code].message === message) return code;
  }
  return null;
}

export function operatorCodeOf(err: unknown): OperatorCode | null {
  return err instanceof OperatorError ? err.operatorCode : null;
}
