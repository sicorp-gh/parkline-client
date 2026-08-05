import ReactDOM from "https://esm.sh/react-dom@18.3.1/client";
import { h, useState } from "../shared.js";
import { Button, Card, Field, BottomNav, ErrorBanner, IconLogout } from "../shared.js";
import { requireAuth, currentUser, currentVehicles, updateSession, clearSession } from "../auth.js";
import { api } from "../api.js";

if (!requireAuth()) {
  throw new Error("redirecting to login");
}

const user = currentUser();

function ProfilePage() {
  const [vehicles, setVehicles] = useState(currentVehicles());
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ plateNumber: "", make: "", model: "", color: "" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function addVehicle(e) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const vehicle = await api.addVehicle(form);
      const next = [...vehicles, vehicle];
      setVehicles(next);
      updateSession({ vehicles: next });
      setForm({ plateNumber: "", make: "", model: "", color: "" });
      setAdding(false);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function removeVehicle(id) {
    try {
      await api.deleteVehicle(id);
      const next = vehicles.filter((v) => v.id !== id);
      setVehicles(next);
      updateSession({ vehicles: next });
    } catch (err) {
      setError(err.message);
    }
  }

  async function logout() {
    try {
      await api.logout();
    } catch {
      // best-effort -- clear the local session regardless
    }
    clearSession();
    location.href = "login.html";
  }

  return h(
    "div",
    { className: "pk-shell" },
    h(
      "div",
      { className: "pk-page" },
      h(
        "div",
        { style: { display: "flex", flexDirection: "column", alignItems: "center", gap: 8, marginTop: 8 } },
        h("img", { className: "pk-avatar", src: "assets/user.png", alt: "" }),
        h("h1", { className: "pk-title-xl", style: { fontSize: 20 } }, user?.name || "Driver"),
        h("p", { className: "pk-hint", style: { margin: 0 } }, user?.email)
      ),

      h(ErrorBanner, { message: error }),

      h(
        Card,
        null,
        h("div", { className: "pk-field-label", style: { marginBottom: 10 } }, "Account"),
        h(
          "div",
          { style: { display: "flex", flexDirection: "column", gap: 8 } },
          h("div", { className: "pk-row" }, h("span", { className: "pk-list-item-sub" }, "Name"), h("span", null, user?.name)),
          h("div", { className: "pk-row" }, h("span", { className: "pk-list-item-sub" }, "Email"), h("span", null, user?.email)),
          h("div", { className: "pk-row" }, h("span", { className: "pk-list-item-sub" }, "Phone"), h("span", null, user?.phone || "—"))
        )
      ),

      h(
        Card,
        null,
        h(
          "div",
          { className: "pk-row", style: { marginBottom: 10 } },
          h("span", { className: "pk-field-label" }, "Vehicles"),
          h(Button, { variant: "ghost", fullWidth: false, onClick: () => setAdding((a) => !a) }, adding ? "Cancel" : "+ Add")
        ),
        vehicles.length === 0 && !adding ? h("p", { className: "pk-hint" }, "No vehicles yet.") : null,
        h(
          "div",
          { style: { display: "flex", flexDirection: "column", gap: 10 } },
          vehicles.map((v) =>
            h(
              "div",
              { key: v.id, className: "pk-list-item" },
              h("img", { src: "assets/car.png", alt: "", style: { width: 36, height: 36 } }),
              h(
                "div",
                { className: "pk-list-item-body" },
                h("div", { className: "pk-list-item-title" }, v.plateNumber),
                h("div", { className: "pk-list-item-sub" }, [v.make, v.model, v.color].filter(Boolean).join(" · ") || "No details")
              ),
              h(Button, { variant: "ghost", fullWidth: false, onClick: () => removeVehicle(v.id) }, "Remove")
            )
          )
        ),
        adding
          ? h(
              "form",
              { onSubmit: addVehicle, style: { display: "flex", flexDirection: "column", gap: 10, marginTop: 14 } },
              h(Field, { label: "Plate number", value: form.plateNumber, required: true, onChange: (e) => setForm((f) => ({ ...f, plateNumber: e.target.value })) }),
              h(
                "div",
                { style: { display: "flex", gap: 10 } },
                h(Field, { label: "Make", value: form.make, onChange: (e) => setForm((f) => ({ ...f, make: e.target.value })) }),
                h(Field, { label: "Model", value: form.model, onChange: (e) => setForm((f) => ({ ...f, model: e.target.value })) })
              ),
              h(Field, { label: "Color", value: form.color, onChange: (e) => setForm((f) => ({ ...f, color: e.target.value })) }),
              h(Button, { type: "submit", loading: busy, fullWidth: false }, "Save Vehicle")
            )
          : null
      ),

      h(Button, { variant: "secondary", onClick: logout }, h(IconLogout, { size: 18, style: { marginRight: 8 } }), "Log Out")
    ),
    h(BottomNav, { active: "profile" })
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(h(ProfilePage));
