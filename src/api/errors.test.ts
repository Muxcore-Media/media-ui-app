import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  api,
  ApiError,
  friendlyPlaybackError,
  OperatorError,
  ParentalError,
  resolvePlayback,
  fetchPlaybackChapters,
} from './client';
import {
  OPERATOR_CODES,
  OPERATOR_COPY,
  PARENTAL_CODES,
  PARENTAL_COPY,
  operatorCodeFromBody,
  operatorCodeFromMessage,
  parentalCodeFromBody,
  parentalCodeFromMessage,
  type ParentalCode,
} from './errors';
import { getCurrentRoles, getSessionSnapshot, setCurrentRoles, setCurrentUserId } from '../lib/session';
import { getRestrictedEntryPoints, resetRestrictedRoutes } from '../lib/restricted-routes';

function jsonResponse(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });
}

const CASES: Array<{ code: ParentalCode; status: number; retryable: boolean }> = [
  { code: 'parental.blocked', status: 403, retryable: false },
  { code: 'parental.restricted_route', status: 403, retryable: false },
  { code: 'parental.policy_unconfigured', status: 403, retryable: false },
  { code: 'parental.policy_unverifiable', status: 403, retryable: false },
  { code: 'parental.session_invalid', status: 401, retryable: false },
  { code: 'parental.policy_unavailable', status: 503, retryable: true },
  { code: 'parental.classification_unavailable', status: 503, retryable: true },
];

describe('parental error mapping (ADR-0031)', () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
    localStorage.clear();
    resetRestrictedRoutes();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('covers every documented code exactly once', () => {
    expect(CASES.map((c) => c.code).sort()).toEqual([...PARENTAL_CODES].sort());
  });

  for (const { code, status, retryable } of CASES) {
    it(`maps ${status} ${code} to a ParentalError`, async () => {
      fetchMock.mockResolvedValueOnce(jsonResponse(status, { error: 'server words', code }));
      const err = await resolvePlayback('/stream/movies/m1').catch((e: unknown) => e);
      expect(err).toBeInstanceOf(ParentalError);
      expect(err).toBeInstanceOf(ApiError);
      expect(err).toBeInstanceOf(Error);
      const parental = err as ParentalError;
      expect(parental.parentalCode).toBe(code);
      expect(parental.status).toBe(status);
      expect(parental.code).toBe(code);
      expect(parental.retryable).toBe(retryable);
      expect(parental.serverMessage).toBe('server words');
      // The SPA's own copy is surfaced, not the server wording.
      expect(parental.message).toBe(PARENTAL_COPY[code].message);
      expect(friendlyPlaybackError(parental)).toBe(PARENTAL_COPY[code].message);
      expect(parentalCodeFromMessage(parental.message)).toBe(code);
    });
  }

  it('resolve keeps playback.parental_blocked and adds parental_code', async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse(403, {
        error: 'blocked',
        code: 'playback.parental_blocked',
        parental_code: 'parental.blocked',
      }),
    );
    const err = await resolvePlayback('/stream/movies/m1').catch((e: unknown) => e);
    expect(err).toBeInstanceOf(ParentalError);
    expect((err as ParentalError).parentalCode).toBe('parental.blocked');
    expect((err as ParentalError).code).toBe('playback.parental_blocked');
  });

  it('still maps the legacy resolve code when parental_code is absent', () => {
    expect(parentalCodeFromBody({ code: 'playback.parental_blocked' })).toBe('parental.blocked');
  });

  it('keeps plain ApiError behaviour (message shape, status, code) for other failures', async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse(400, { error: 'src required', code: 'playback.src_required' }),
    );
    const err = await resolvePlayback('/stream/movies/m1').catch((e: unknown) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect(err).not.toBeInstanceOf(ParentalError);
    expect((err as ApiError).message).toBe('src required (playback.src_required)');
    expect((err as ApiError).status).toBe(400);
    expect((err as ApiError).code).toBe('playback.src_required');
  });

  it('treats an unknown code and a non-JSON body as ApiError, never as parental', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(403, { error: 'nope', code: 'parental.made_up' }));
    const unknown = await resolvePlayback('/x').catch((e: unknown) => e);
    expect(unknown).not.toBeInstanceOf(ParentalError);
    expect((unknown as ApiError).message).toBe('nope (parental.made_up)');

    fetchMock.mockResolvedValueOnce(new Response('upstream down', { status: 502, statusText: 'Bad Gateway' }));
    const text = await resolvePlayback('/x').catch((e: unknown) => e);
    expect(text).toBeInstanceOf(ApiError);
    expect((text as ApiError).message).toBe('502 Bad Gateway');
  });

  it('401 parental.session_invalid clears the cached identity and does not redirect', async () => {
    setCurrentUserId('cached-member');
    setCurrentRoles(['admin']);
    const assign = vi.fn();
    vi.stubGlobal('location', { ...window.location, assign });
    fetchMock.mockResolvedValueOnce(
      jsonResponse(401, { error: 'sign in', code: 'parental.session_invalid' }),
    );
    await expect(api.listMovies()).rejects.toMatchObject({ parentalCode: 'parental.session_invalid' });
    expect(getSessionSnapshot()).toEqual({ userId: '', roles: [] });
    expect(assign).not.toHaveBeenCalled();
  });

  it('does not clear identity for other parental codes', async () => {
    setCurrentUserId('cached-member');
    fetchMock.mockResolvedValueOnce(jsonResponse(403, { error: 'x', code: 'parental.blocked' }));
    await expect(fetchPlaybackChapters('/stream/movies/m1')).rejects.toBeInstanceOf(ParentalError);
    expect(getSessionSnapshot().userId).toBe('cached-member');
  });

  it('remembers restricted_route entry points only for that code', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(403, { error: 'x', code: 'parental.blocked' }));
    await api.search('x').catch(() => undefined);
    expect([...getRestrictedEntryPoints()]).toEqual([]);

    fetchMock.mockResolvedValueOnce(jsonResponse(403, { error: 'x', code: 'parental.restricted_route' }));
    await api.search('x').catch(() => undefined);
    expect([...getRestrictedEntryPoints()]).toEqual(['/search']);
  });

  it('never resolves a parental failure as a successful (allowed) response', async () => {
    for (const { code, status } of CASES) {
      fetchMock.mockResolvedValueOnce(jsonResponse(status, { error: 'x', code }));
      await expect(resolvePlayback('/stream/movies/m1')).rejects.toBeInstanceOf(ParentalError);
    }
  });
});

describe('operator role denial mapping (T-M5-12, C-30)', () => {
  const fetchMock = vi.fn();
  const isIdentity = (url: RequestInfo | URL) => /^\/api\/(session|me)(\?|$)/.test(String(url));
  const sessionReads = () => fetchMock.mock.calls.filter(([url]) => isIdentity(url)).length;

  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
    localStorage.clear();
    setCurrentUserId('u-viewer');
    setCurrentRoles(['manager']);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  function respond(operator: Response, session: Response = jsonResponse(200, { user_id: 'u-viewer', roles: ['viewer'] })) {
    fetchMock.mockImplementation(async (url: RequestInfo | URL) =>
      isIdentity(url) ? session.clone() : operator.clone(),
    );
  }

  it('documents exactly the two server codes', () => {
    expect([...OPERATOR_CODES].sort()).toEqual(['operator.admin_required', 'operator.forbidden']);
  });

  it.each(OPERATOR_CODES)('maps 403 %s to an OperatorError with SPA copy', async (code) => {
    respond(jsonResponse(403, { error: 'server words', code }));
    const err = await api.stopSession('s1').catch((e: unknown) => e);
    expect(err).toBeInstanceOf(OperatorError);
    expect(err).toBeInstanceOf(ApiError);
    const operator = err as OperatorError;
    expect(operator.operatorCode).toBe(code);
    expect(operator.status).toBe(403);
    expect(operator.code).toBe(code);
    expect(operator.serverMessage).toBe('server words');
    expect(operator.message).toBe(OPERATOR_COPY[code].message);
    expect(operator.message).toMatch(/don't have permission/);
    expect(operatorCodeFromMessage(operator.message)).toBe(code);
  });

  it('does not retry the refused request', async () => {
    respond(jsonResponse(403, { error: 'no', code: 'operator.forbidden' }));
    await api.stopSession('s1').catch(() => undefined);
    await vi.waitFor(() => expect(sessionReads()).toBe(1));
    const stops = fetchMock.mock.calls.filter(([url]) => String(url).includes('/stop'));
    expect(stops).toHaveLength(1);
  });

  it('re-reads the session so a stale cached role is corrected', async () => {
    respond(jsonResponse(403, { error: 'no', code: 'operator.forbidden' }));
    await api.stopSession('s1').catch(() => undefined);
    await vi.waitFor(() => expect(getCurrentRoles()).toEqual(['viewer']));
    expect(getSessionSnapshot().roles).toEqual(['viewer']);
  });

  it('is cosmetic: a refresh that fails or returns no roles never crashes or loops', async () => {
    respond(jsonResponse(403, { error: 'no', code: 'operator.forbidden' }), jsonResponse(503, { error: 'down' }));
    const err = await api.stopSession('s1').catch((e: unknown) => e);
    expect(err).toBeInstanceOf(OperatorError);
    await vi.waitFor(() => expect(sessionReads()).toBeGreaterThanOrEqual(1));
    expect(sessionReads()).toBeLessThanOrEqual(2);
    expect(getCurrentRoles()).toEqual(['manager']);
  });

  it('does not treat other denials as role denials', async () => {
    for (const [status, code] of [
      [403, 'csrf.rejected'],
      [403, 'parental.restricted_route'],
      [403, 'operator.made_up'],
      [403, undefined],
      [413, 'operator.body_too_large'],
      [400, 'operator.forbidden'],
      [401, 'operator.forbidden'],
    ] as const) {
      respond(jsonResponse(status, { error: 'x', code }));
      const err = await api.stopSession('s1').catch((e: unknown) => e);
      expect(err, `${status} ${code}`).not.toBeInstanceOf(OperatorError);
      expect(err).toBeInstanceOf(ApiError);
    }
    expect(operatorCodeFromBody({ code: 'operator.forbidden' }, 500)).toBeNull();
    expect(operatorCodeFromBody(null, 403)).toBeNull();
    expect(operatorCodeFromMessage('something else')).toBeNull();
    expect(operatorCodeFromMessage(null)).toBeNull();
  });

  it('keeps the library PATCH root-folder denial distinct from the generic one', async () => {
    respond(jsonResponse(403, { error: 'admin role required to change root_folder_path', code: 'operator.admin_required' }));
    const err = await api.setRootFolder({ kind: 'movie', id: 'm1', rootFolderPath: '/data/x' }).catch((e: unknown) => e);
    expect((err as OperatorError).operatorCode).toBe('operator.admin_required');
    expect((err as OperatorError).message).toContain('needs an administrator');
  });
});
