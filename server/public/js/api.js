import { getToken, redirectToLogin } from "./auth.js";

// Same-origin: frontend and API are served by the same Express process, so
// this is always relative -- nothing to configure per-environment.
const API_BASE = "/api";

async function request(path, { auth = false, ...options } = {}) {
  const headers = { "Content-Type": "application/json", ...(options.headers || {}) };
  if (auth) {
    const token = getToken();
    if (!token) {
      redirectToLogin();
      throw new Error("Not authenticated");
    }
    headers.Authorization = `Bearer ${token}`;
  }

  let res;
  try {
    res = await fetch(`${API_BASE}${path}`, { ...options, headers });
  } catch (networkError) {
    const err = new Error("You appear to be offline");
    err.offline = true;
    throw err;
  }

  if (res.status === 401 && auth) {
    redirectToLogin();
    throw new Error("Session expired");
  }

  if (res.status === 204) return null;

  const body = await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error(body?.error || `Request failed (${res.status})`);
  }
  return body;
}

export const api = {
  signup: (payload) => request("/auth/signup", { method: "POST", body: JSON.stringify(payload) }),
  login: (email, password) =>
    request("/auth/login", { method: "POST", body: JSON.stringify({ email, password }) }),
  logout: () => request("/auth/logout", { method: "POST", auth: true }),
  me: () => request("/auth/me", { auth: true }),
  updateProfile: (payload) => request("/auth/me", { method: "PATCH", auth: true, body: JSON.stringify(payload) }),
  changePassword: (payload) => request("/auth/change-password", { method: "POST", auth: true, body: JSON.stringify(payload) }),
  deactivateAccount: (password) => request("/auth/deactivate", { method: "POST", auth: true, body: JSON.stringify({ password }) }),

  listVehicles: () => request("/vehicles", { auth: true }),
  addVehicle: (payload) =>
    request("/vehicles", { method: "POST", auth: true, body: JSON.stringify(payload) }),
  deleteVehicle: (id) => request(`/vehicles/${id}`, { method: "DELETE", auth: true }),

  listReservations: () => request("/reservations", { auth: true }),
  createReservation: (payload) =>
    request("/reservations", { method: "POST", auth: true, body: JSON.stringify(payload) }),
  setReservationStatus: (id, status) =>
    request(`/reservations/${id}`, { method: "PATCH", auth: true, body: JSON.stringify({ status }) }),

  getBays: () => request("/parking/bays"),

  myAccessEvents: () => request("/notifications/access-events", { auth: true }),
};
