import ReactDOM from "https://esm.sh/react-dom@18.3.1/client";
import { h, useState, useEffect } from "../shared.js";
import { Button, Card, Header, ErrorBanner, IconMapPin, IconClock } from "../shared.js";
import { requireAuth, currentVehicles } from "../auth.js";
import { api } from "../api.js";
import { queueOutbox } from "../store.js";

if (!requireAuth()) {
  throw new Error("redirecting to login");
}

const vehicles = currentVehicles();

function defaultStart() {
  const d = new Date(Date.now() + 15 * 60000);
  d.setSeconds(0, 0);
  return d.toISOString().slice(0, 16);
}

function defaultEnd() {
  const d = new Date(Date.now() + 4 * 60 * 60000);
  d.setSeconds(0, 0);
  return d.toISOString().slice(0, 16);
}

function ReservePage() {
  const [plateNumber, setPlateNumber] = useState(vehicles[0]?.plateNumber || "");
  const [startTime, setStartTime] = useState(defaultStart());
  const [endTime, setEndTime] = useState(defaultEnd());
  const [bays, setBays] = useState([]);
  const [bayId, setBayId] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api.getBays().then(setBays).catch(() => {});
  }, []);

  const vehicle = vehicles.find((v) => v.plateNumber === plateNumber);

  async function onSubmit(e) {
    e.preventDefault();
    setError("");

    if (vehicles.length === 0) {
      setError("Add a vehicle in your profile before reserving a space.");
      return;
    }

    const payload = { plateNumber, bayId: bayId || null, startTime: new Date(startTime).toISOString(), endTime: new Date(endTime).toISOString() };
    setLoading(true);

    try {
      const reservation = await api.createReservation(payload);
      sessionStorage.setItem("parkline_last_reservation", JSON.stringify(reservation));
      location.href = "reservation.html";
    } catch (err) {
      if (err.offline) {
        queueOutbox("createReservation", payload);
        sessionStorage.setItem(
          "parkline_last_reservation",
          JSON.stringify({ ...payload, id: `pending-${Date.now()}`, userName: "", status: "active", pendingSync: true })
        );
        location.href = "reservation.html";
        return;
      }
      setError(err.message);
      setLoading(false);
    }
  }

  return h(
    "div",
    { className: "pk-shell" },
    h(Header, { title: "Reserve a Space", backHref: "home.html" }),
    h(
      "form",
      { className: "pk-page pk-page--no-nav", onSubmit },
      h(ErrorBanner, { message: error }),

      h(
        Card,
        null,
        h("div", { className: "pk-field-label", style: { marginBottom: 10 } }, "Vehicle"),
        vehicles.length === 0
          ? h("p", { className: "pk-hint" }, "No vehicles on your account yet — add one from your profile.")
          : h(
              "div",
              { style: { display: "flex", flexDirection: "column", gap: 10 } },
              vehicles.map((v) =>
                h(
                  "label",
                  { key: v.id, className: `pk-vehicle-chip${v.plateNumber === plateNumber ? " pk-vehicle-chip--active" : ""}` },
                  h("input", {
                    type: "radio",
                    name: "vehicle",
                    style: { display: "none" },
                    checked: v.plateNumber === plateNumber,
                    onChange: () => setPlateNumber(v.plateNumber),
                  }),
                  h("img", { src: "assets/car.png", alt: "" }),
                  h(
                    "span",
                    null,
                    h("div", { className: "pk-vehicle-chip-plate" }, v.plateNumber),
                    h("div", { className: "pk-vehicle-chip-sub" }, [v.make, v.model, v.color].filter(Boolean).join(" · ") || "No details")
                  )
                )
              )
            )
      ),

      h(
        Card,
        null,
        h("div", { className: "pk-field-label", style: { marginBottom: 10 } }, "When"),
        h(
          "div",
          { style: { display: "flex", flexDirection: "column", gap: 12 } },
          h("label", { className: "pk-field" }, h("span", { className: "pk-field-label" }, "Arrive"), h("input", { className: "pk-field-input", style: { background: "var(--surface-alt)", borderRadius: 12, padding: "10px 12px" }, type: "datetime-local", value: startTime, required: true, onChange: (e) => setStartTime(e.target.value) })),
          h("label", { className: "pk-field" }, h("span", { className: "pk-field-label" }, "Leave by"), h("input", { className: "pk-field-input", style: { background: "var(--surface-alt)", borderRadius: 12, padding: "10px 12px" }, type: "datetime-local", value: endTime, required: true, onChange: (e) => setEndTime(e.target.value) })),
          h(
            "label",
            { className: "pk-field" },
            h("span", { className: "pk-field-label" }, "Preferred bay (optional)"),
            h(
              "select",
              { className: "pk-field-input", style: { background: "var(--surface-alt)", borderRadius: 12, padding: "10px 12px" }, value: bayId, onChange: (e) => setBayId(e.target.value) },
              h("option", { value: "" }, "No preference"),
              bays.map((b) => h("option", { key: b.label, value: b.label, disabled: b.status === "occupied" }, `${b.label} — ${b.status}`))
            )
          )
        )
      ),

      h(
        Card,
        { className: "" },
        h(
          "div",
          { className: "pk-row" },
          h("span", { className: "pk-list-item-icon" }, h(IconMapPin, { size: 20 })),
          h(
            "span",
            null,
            h("div", { style: { fontWeight: 800 } }, plateNumber || "Select a vehicle"),
            h("div", { className: "pk-list-item-sub" }, vehicle ? [vehicle.make, vehicle.model].filter(Boolean).join(" ") : "Smart Parking Facility")
          ),
          h(IconClock, { size: 20, color: "var(--text-muted)" })
        )
      ),

      h(Button, { type: "submit", loading, disabled: vehicles.length === 0 }, "Confirm Reservation")
    )
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(h(ReservePage));
