/** Only same-site absolute paths are accepted as a return address after signing in. */
export function safeReturnPath(value: string | null | undefined, fallback = '/overview') {
  if (!value || value.length > 512 || !value.startsWith('/') || value.startsWith('//') || value.includes('\\')) return fallback;
  // Reject control characters, which browsers strip and could turn into another origin.
  if (/[\u0000-\u001f\u007f]/.test(value)) return fallback;
  try {
    const parsed = new URL(value, 'http://qrconnect.invalid');
    if (parsed.origin !== 'http://qrconnect.invalid') return fallback;
    if (parsed.pathname === '/auth' || parsed.pathname.startsWith('/auth/') || parsed.pathname.startsWith('/api/')) return fallback;
    return parsed.pathname + parsed.search + parsed.hash;
  } catch { return fallback; }
}

export type AuthMode = 'signin' | 'signup';

export function signInPath(returnTo?: string, mode: AuthMode = 'signin') {
  const query = new URLSearchParams();
  if (mode === 'signup') query.set('mode', 'signup');
  const next = returnTo ? safeReturnPath(returnTo, '') : '';
  if (next) query.set('next', next);
  const search = query.toString();
  return search ? `/auth?${search}` : '/auth';
}

/** Rebuilds the requested page address from the App Router search params for the sign-in return. */
export function requestedPath(pathname: string, raw: Record<string, string | string[] | undefined> = {}) {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(raw)) if (typeof value === 'string') query.set(key, value);
  const search = query.toString();
  return search ? `${pathname}?${search}` : pathname;
}
