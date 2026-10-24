/**
 * UUID utility functions for InternPath
 * Ensures RFC 4122 UUID v4 compliance across Node.js, Next.js Edge, and browser runtimes.
 */

export const UUID_V4_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Validates whether a string matches standard RFC 4122 UUID format.
 */
export function isValidUUID(id: unknown): id is string {
  if (typeof id !== 'string') return false;
  return UUID_V4_REGEX.test(id.trim());
}

/**
 * Generates an RFC 4122 version 4 UUID.
 * Uses native crypto.randomUUID() when available with an RFC 4122 fallback.
 */
export function generateUUID(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  // Universal RFC 4122 v4 compliant generator fallback
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}
