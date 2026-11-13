let grant = null;
export function clearParentGrant() { grant = null; }
export function setParentGrant(receipt) {
  const expires = Date.parse(receipt?.expires_at);
  if (!/^[a-f0-9]{64}$/.test(receipt?.token || '') || !Number.isFinite(expires) || expires <= Date.now()) {
    clearParentGrant();
    throw new Error('The parent unlock was not valid. Please try again.');
  }
  grant = { token: receipt.token, expires };
}
export function getParentToken(now = Date.now()) {
  if (!grant || grant.expires <= now) { clearParentGrant(); return null; }
  return grant.token;
}
export function createParentFetch(projectUrl, fetchImpl = (...args) => fetch(...args)) {
  const origin = new URL(projectUrl).origin;
  return (input, init = {}) => {
    const url = new URL(typeof input === 'string' || input instanceof URL ? input : input.url);
    const headers = new Headers(init.headers ?? (input instanceof Request ? input.headers : undefined));
    headers.delete('x-parent-unlock');
    const token = getParentToken();
    if (token && url.origin === origin && (url.pathname.startsWith('/rest/v1/') || url.pathname.startsWith('/storage/v1/'))) headers.set('x-parent-unlock', token);
    return fetchImpl(input, { ...init, headers });
  };
}
