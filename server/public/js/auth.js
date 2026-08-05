// Session storage: the *only* thing this app keeps client-side is the logged-in
// user's own session/profile -- a cache, never a second source of truth. The
// cloud backend (this same origin's /api/...) is authoritative for accounts.
const SESSION_KEY = "parkline_session";

export function getSession() {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function setSession(session) {
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

export function updateSession(patch) {
  const current = getSession() || {};
  setSession({ ...current, ...patch });
}

export function clearSession() {
  localStorage.removeItem(SESSION_KEY);
}

export function getToken() {
  return getSession()?.token || null;
}

export function currentUser() {
  return getSession()?.user || null;
}

export function currentVehicles() {
  return getSession()?.vehicles || [];
}

// Call at the top of every page that needs a logged-in driver. Redirects to
// login (preserving where the driver was headed) if there's no session.
export function requireAuth() {
  if (!getToken()) {
    redirectToLogin();
    return false;
  }
  return true;
}

export function redirectToLogin() {
  clearSession();
  const next = encodeURIComponent(location.pathname + location.search);
  location.href = `login.html?next=${next}`;
}

export function afterLoginRedirect() {
  const params = new URLSearchParams(location.search);
  location.href = params.get("next") || "home.html";
}
