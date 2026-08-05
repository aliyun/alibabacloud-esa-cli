/**
 * Mask an AccessKey ID for safe terminal output.
 * Keeps the first 4 and last 4 characters, e.g. "LTAI****BZGo".
 */
export function maskAccessKey(accessKey?: string): string {
  if (!accessKey) {
    return '(empty)';
  }
  if (accessKey.length <= 8) {
    return `${accessKey.slice(0, 2)}****`;
  }
  return `${accessKey.slice(0, 4)}****${accessKey.slice(-4)}`;
}
