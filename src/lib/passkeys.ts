export type HouseholdPasskey = {
  id: string;
  credentialType: string;
  transports: string;
  createdAt: string;
  lastUsedAt: string;
};

export type PasskeysResponse = {
  available: boolean;
  passkeys: HouseholdPasskey[];
};

export type PasskeyBegin = {
  available: boolean;
  options: unknown;
  challenge: string;
};

export function normalizePasskey(raw: unknown): HouseholdPasskey {
  const rec = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
  return {
    id: String(rec.id ?? ''),
    credentialType: String(rec.credential_type ?? rec.credentialType ?? ''),
    transports: String(rec.transports ?? ''),
    createdAt: String(rec.created_at ?? rec.createdAt ?? ''),
    lastUsedAt: String(rec.last_used_at ?? rec.lastUsedAt ?? ''),
  };
}

export function normalizePasskeys(raw: unknown): PasskeysResponse {
  const rec = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
  const rows = Array.isArray(rec.passkeys) ? rec.passkeys : [];
  return {
    available: rec.available === true,
    passkeys: rows.map(normalizePasskey).filter((row) => row.id),
  };
}

export function normalizePasskeyBegin(raw: unknown): PasskeyBegin {
  const rec = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
  return {
    available: rec.available !== false,
    options: rec.options ?? null,
    challenge: String(rec.challenge ?? ''),
  };
}

export function passkeyLabel(passkey: HouseholdPasskey): string {
  const created = passkey.createdAt ? new Date(passkey.createdAt) : null;
  if (created && !Number.isNaN(created.getTime())) {
    return `Passkey added ${created.toLocaleDateString()}`;
  }
  return passkey.credentialType || 'Passkey';
}

export function passkeySupported(): boolean {
  return typeof window !== 'undefined' && typeof window.PublicKeyCredential === 'function';
}

function base64urlToBuffer(value: string): ArrayBuffer {
  const padded = value.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(value.length / 4) * 4, '=');
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
}

function bufferToBase64url(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  bytes.forEach((b) => {
    binary += String.fromCharCode(b);
  });
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : null;
}

export function credentialCreationOptions(raw: unknown): CredentialCreationOptions {
  const root = asRecord(raw) ?? {};
  const publicKey = asRecord(root.publicKey) ?? root;
  const user = asRecord(publicKey.user) ?? {};
  const exclude = Array.isArray(publicKey.excludeCredentials) ? publicKey.excludeCredentials : [];
  return {
    publicKey: {
      ...(publicKey as PublicKeyCredentialCreationOptions),
      challenge: base64urlToBuffer(String(publicKey.challenge ?? '')),
      user: {
        ...(user as PublicKeyCredentialUserEntity),
        id: base64urlToBuffer(String(user.id ?? '')),
        name: String(user.name ?? ''),
        displayName: String(user.displayName ?? user.name ?? ''),
      },
      excludeCredentials: exclude.map((item) => {
        const cred = asRecord(item) ?? {};
        return {
          ...(cred as PublicKeyCredentialDescriptor),
          id: base64urlToBuffer(String(cred.id ?? '')),
          type: (String(cred.type ?? 'public-key') as PublicKeyCredentialType),
        };
      }),
    },
  };
}

export function credentialAttestationJSON(credential: PublicKeyCredential): Record<string, unknown> {
  const response = credential.response as AuthenticatorAttestationResponse;
  return {
    id: credential.id,
    rawId: bufferToBase64url(credential.rawId),
    type: credential.type,
    response: {
      clientDataJSON: bufferToBase64url(response.clientDataJSON),
      attestationObject: bufferToBase64url(response.attestationObject),
    },
  };
}

export async function createBrowserPasskey(options: unknown): Promise<Record<string, unknown>> {
  if (!passkeySupported() || !navigator.credentials?.create) {
    throw new Error('This browser cannot create a passkey');
  }
  const credential = await navigator.credentials.create(credentialCreationOptions(options));
  if (!credential || credential.type !== 'public-key') {
    throw new Error('Passkey creation was cancelled');
  }
  return credentialAttestationJSON(credential as PublicKeyCredential);
}
