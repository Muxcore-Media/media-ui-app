export type HouseholdTOTP = {
  available: boolean;
  enabled: boolean;
  verified: boolean;
  secret: string;
  qrCodeUrl: string;
};

export function normalizeTOTP(raw: unknown): HouseholdTOTP {
  const rec = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
  return {
    available: rec.available !== false,
    enabled: rec.enabled === true,
    verified: rec.verified === true,
    secret: String(rec.secret ?? ''),
    qrCodeUrl: String(rec.qr_code_url ?? rec.qrCodeUrl ?? ''),
  };
}
