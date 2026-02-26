/**
 * Trusted Device Manager
 * Stores a fingerprint after successful MFA verification so users
 * don't need to re-verify on every login (valid for 7 days).
 */

const STORAGE_KEY = 'plusterra_trusted_device';
const TRUST_DURATION_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

interface TrustedRecord {
  userId: string;
  fingerprint: string;
  verifiedAt: number; // epoch ms
}

/** Generate a simple device fingerprint based on browser characteristics */
function getDeviceFingerprint(): string {
  const raw = [
    navigator.userAgent,
    navigator.language,
    screen.width + 'x' + screen.height,
    Intl.DateTimeFormat().resolvedOptions().timeZone,
  ].join('|');

  // Simple hash
  let hash = 0;
  for (let i = 0; i < raw.length; i++) {
    const char = raw.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return hash.toString(36);
}

/** Check if this device is trusted for the given user */
export function isDeviceTrusted(userId: string): boolean {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return false;

    const record: TrustedRecord = JSON.parse(stored);
    if (record.userId !== userId) return false;
    if (record.fingerprint !== getDeviceFingerprint()) return false;

    const elapsed = Date.now() - record.verifiedAt;
    if (elapsed > TRUST_DURATION_MS) {
      localStorage.removeItem(STORAGE_KEY);
      return false;
    }

    return true;
  } catch {
    return false;
  }
}

/** Mark this device as trusted for the given user */
export function markDeviceTrusted(userId: string): void {
  const record: TrustedRecord = {
    userId,
    fingerprint: getDeviceFingerprint(),
    verifiedAt: Date.now(),
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(record));
}

/** Remove trust (e.g. on logout or manual revoke) */
export function revokeDeviceTrust(): void {
  localStorage.removeItem(STORAGE_KEY);
}
