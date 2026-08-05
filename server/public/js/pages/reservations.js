import ReactDOM from "https://esm.sh/react-dom@18.3.1/client";
import { h, useState, useEffect } from "../shared.js";
import { Button, Card, BottomNav, Badge, IconList } from "../shared.js";
import { requireAuth } from "../auth.js";
import { api } from "../api.js";
import { loadWithCache, queueOutbox } from "../store.js";

if (!requireAuth()) {
  throw new Error("redirecting to login");
}

function fmt(iso) {
  return new Date(iso).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}

const TONE = { active: "success", cancelled: "danger", completed: "muted", walk_in: "success" };

function ReservationsPage() {
  const [reservations, setReservations] = useState(null);
  const [busyId, setBusyId] = useState(null);

  useEffect(() => {
    loadWithCache("reservations", api.listReservations, {
      onCache: setReservations,
      onFresh: setReservations,
    }).catch(() => {});
  }, []);

  async function cancel(id) {
    setBusyId(id);
    try {
      await api.setReservationStatus(id, "cancelled");
      setReservations((rows) => rows.map((r) => (r.id === id ? { ...r, status: "cancelled" } : r)));
    } catch (err) {
      if (err.offline) {
        queueOutbox("cancelReservation", { id });
        setReservations((rows) => rows.map((r) => (r.id === id ? { ...r, status: "cancelled" } : r)));
      }
    } finally {
      setBusyId(null);
    }
  }

  return h(
    "div",
    { className: "pk-shell" },
    h(
      "div",
      { className: "pk-page" },
      h("h1", { className: "pk-title-xl" }, "My Reservations"),

      !reservations
        ? h("p", { className: "pk-hint" }, "Loading…")
        : reservations.length === 0
        ? h(
            "div",
            { className: "pk-empty" },
            h(IconList, { size: 32, color: "var(--text-muted)" }),
            h("p", null, "No reservations yet."),
            h(Button, { href: "reserve.html", fullWidth: false }, "Reserve a Space")
          )
        : h(
            "div",
            { style: { display: "flex", flexDirection: "column", gap: 12 } },
            reservations.map((r) =>
              h(
                Card,
                { key: r.id },
                h(
                  "div",
                  { className: "pk-row", style: { marginBottom: 10 } },
                  h("strong", null, r.plateNumber),
                  h(Badge, { tone: TONE[r.status] || "muted" }, r.status.replace("_", " "))
                ),
                h("div", { className: "pk-list-item-sub" }, `${fmt(r.startTime)} → ${fmt(r.endTime)}`),
                r.status === "active"
                  ? h(
                      "div",
                      { style: { marginTop: 12 } },
                      h(Button, { variant: "danger", fullWidth: false, disabled: busyId === r.id, onClick: () => cancel(r.id) }, "Cancel")
                    )
                  : null
              )
            )
          )
    ),
    h(BottomNav, { active: "reservations" })
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(h(ReservationsPage));
