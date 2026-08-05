import ReactDOM from "https://esm.sh/react-dom@18.3.1/client";
import { h } from "../shared.js";
import { Button, Card, Header, StatusCircle, IconCheck, Badge } from "../shared.js";
import { requireAuth } from "../auth.js";

if (!requireAuth()) {
  throw new Error("redirecting to login");
}

const raw = sessionStorage.getItem("parkline_last_reservation");
if (!raw) {
  location.replace("reservations.html");
}
const reservation = raw ? JSON.parse(raw) : null;

function fmt(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}

function ReservationPage() {
  if (!reservation) return null;

  return h(
    "div",
    { className: "pk-shell" },
    h(Header, { title: "Reservation", backHref: "home.html" }),
    h(
      "div",
      { className: "pk-page pk-page--no-nav", style: { alignItems: "center", textAlign: "center" } },
      h(StatusCircle, { tone: "success", icon: IconCheck }),
      h("h1", { className: "pk-title-xl" }, reservation.pendingSync ? "Reservation Queued" : "Reservation Confirmed"),
      h(
        "p",
        { className: "pk-subtitle" },
        reservation.pendingSync
          ? "You're offline — this will be sent as soon as you're back online."
          : "Show up within your reserved window. Entry is authenticated automatically at the barrier."
      ),

      h(
        Card,
        { style: { width: "100%", textAlign: "left" } },
        h(
          "div",
          { className: "pk-row", style: { marginBottom: 14 } },
          h("span", { style: { fontSize: 22, fontWeight: 800, letterSpacing: "0.04em" } }, reservation.plateNumber || reservation.plate_number),
          h(Badge, { tone: reservation.pendingSync ? "muted" : "success" }, reservation.pendingSync ? "pending sync" : reservation.status)
        ),
        h(
          "div",
          { style: { display: "flex", flexDirection: "column", gap: 8 } },
          h(
            "div",
            { className: "pk-row" },
            h("span", { className: "pk-list-item-sub" }, "Arrive"),
            h("span", null, fmt(reservation.startTime))
          ),
          h(
            "div",
            { className: "pk-row" },
            h("span", { className: "pk-list-item-sub" }, "Leave by"),
            h("span", null, fmt(reservation.endTime))
          ),
          reservation.bayId
            ? h(
                "div",
                { className: "pk-row" },
                h("span", { className: "pk-list-item-sub" }, "Preferred bay"),
                h("span", null, reservation.bayId)
              )
            : null
        )
      ),

      h(Button, { href: "home.html" }, "Back to Home")
    )
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(h(ReservationPage));
