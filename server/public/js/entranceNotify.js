// Polls for entrance activity on the logged-in driver's own plates and
// surfaces it as a toast: reservation match ("Welcome, your reserved slot is
// X"), walk-in grant ("Welcome!"), or registered-but-full ("Sorry, no
// vacancy"). No push infra here (this is a plain polling web app, not a
// native app with background push) -- this only fires while the page this
// is started from is open in the foreground.
import { api } from "./api.js";
import { notifySuccess, notifyError } from "./toast.js";

const POLL_MS = 2000;

function describe(e) {
  if (e.action === "granted") {
    if (e.reason === "reservation_match") {
      return { ok: true, message: e.bayLabel ? `Welcome! Your reserved slot is ${e.bayLabel}.` : "Welcome! Your reservation is confirmed." };
    }
    return { ok: true, message: "Welcome!" };
  }
  if (e.reason === "registered_no_vacancy") {
    return { ok: false, message: "Sorry, no vacancy right now." };
  }
  return { ok: false, message: "Access denied at the entrance." };
}

export function startEntranceNotifications() {
  let seen = null;

  async function poll() {
    let events;
    try {
      events = await api.myAccessEvents();
    } catch {
      return; // best-effort -- try again next tick
    }

    if (seen === null) {
      // First poll just establishes the baseline -- otherwise every past
      // entrance event would replay as a "new" notification on page load.
      seen = new Set(events.map((e) => e.id));
      return;
    }

    // Newest-first from the server; walk oldest-to-newest so notifications
    // fire in the order they actually happened.
    for (const e of [...events].reverse()) {
      if (seen.has(e.id)) continue;
      seen.add(e.id);
      const { ok, message } = describe(e);
      if (ok) notifySuccess(message);
      else notifyError(message);
    }
  }

  poll();
  const id = setInterval(poll, POLL_MS);
  return () => clearInterval(id);
}
