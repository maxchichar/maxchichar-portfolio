/**
 * "github.com/me" -> "https://github.com/me", so a pasted profile link
 * without its scheme still passes the settings' http(s) URL rule. Anything
 * that already names a scheme (or is blank) is returned trimmed, unchanged.
 */
export function withScheme(value: string): string {
  const trimmed = value.trim();
  if (trimmed.length === 0 || /^[a-z][a-z\d+.-]*:/i.test(trimmed)) return trimmed;
  return `https://${trimmed.replace(/^\/+/, "")}`;
}
