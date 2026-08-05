import ReactDOM from "https://esm.sh/react-dom@18.3.1/client";
import { h, useState } from "../shared.js";
import { Button, Card, Field, BottomNav, ErrorBanner, IconLogout, IconList } from "../shared.js";
import { requireAuth, currentUser, currentVehicles, updateSession, clearSession } from "../auth.js";
import { api } from "../api.js";
import { notifySuccess, notifyError, notifyInfo } from "../toast.js";

if (!requireAuth()) {
  throw new Error("redirecting to login");
}

const user = currentUser();

// ---- Edit profile (name, phone) ------------------------------------------
// Email isn't editable here -- it's the login identifier and changing it
// safely needs re-verification, which this app doesn't have.

function EditProfileForm({ onDone }) {
  const [name, setName] = useState(user?.name || "");
  const [phone, setPhone] = useState(user?.phone || "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(e) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const { user: updated } = await api.updateProfile({ name, phone });
      updateSession({ user: updated });
      notifySuccess("Profile updated.");
      onDone();
    } catch (err) {
      setError(err.message);
      notifyError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return h(
    "form",
    { onSubmit: submit, style: { display: "flex", flexDirection: "column", gap: 10, marginTop: 14 } },
    h(ErrorBanner, { message: error }),
    h(Field, { label: "Full name", value: name, required: true, onChange: (e) => setName(e.target.value) }),
    h(Field, { label: "Phone", type: "tel", value: phone, onChange: (e) => setPhone(e.target.value) }),
    h(
      "div",
      { style: { display: "flex", gap: 10 } },
      h(Button, { type: "submit", loading: busy, fullWidth: false }, "Save"),
      h(Button, { type: "button", variant: "secondary", fullWidth: false, onClick: onDone }, "Cancel")
    )
  );
}

// ---- Change password -------------------------------------------------------

function ChangePasswordForm({ onDone }) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(e) {
    e.preventDefault();
    setError("");
    if (newPassword !== confirmPassword) {
      setError("New passwords don't match.");
      return;
    }
    setBusy(true);
    try {
      await api.changePassword({ currentPassword, newPassword });
      notifySuccess("Password changed. Other devices have been signed out.");
      onDone();
    } catch (err) {
      setError(err.message);
      notifyError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return h(
    "form",
    { onSubmit: submit, style: { display: "flex", flexDirection: "column", gap: 10, marginTop: 14 } },
    h(ErrorBanner, { message: error }),
    h(Field, { label: "Current password", type: "password", value: currentPassword, required: true, onChange: (e) => setCurrentPassword(e.target.value) }),
    h(Field, { label: "New password", type: "password", value: newPassword, required: true, minLength: 8, onChange: (e) => setNewPassword(e.target.value) }),
    h(Field, { label: "Confirm new password", type: "password", value: confirmPassword, required: true, onChange: (e) => setConfirmPassword(e.target.value) }),
    h(
      "div",
      { style: { display: "flex", gap: 10 } },
      h(Button, { type: "submit", loading: busy, fullWidth: false }, "Change Password"),
      h(Button, { type: "button", variant: "secondary", fullWidth: false, onClick: onDone }, "Cancel")
    )
  );
}

// ---- Deactivate account -----------------------------------------------------

function DeactivateForm({ onDone }) {
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(e) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      await api.deactivateAccount(password);
      notifyInfo("Your account has been deactivated.");
      clearSession();
      location.href = "login.html";
    } catch (err) {
      setError(err.message);
      notifyError(err.message);
      setBusy(false);
    }
  }

  return h(
    "form",
    { onSubmit: submit, style: { display: "flex", flexDirection: "column", gap: 10, marginTop: 14 } },
    h(ErrorBanner, { message: error }),
    h("p", { className: "pk-hint" }, "This cancels any active reservations, signs you out everywhere, and removes your vehicles from the facility's registered-driver list. Enter your password to confirm."),
    h(Field, { label: "Password", type: "password", value: password, required: true, onChange: (e) => setPassword(e.target.value) }),
    h(
      "div",
      { style: { display: "flex", gap: 10 } },
      h(Button, { type: "submit", variant: "danger", loading: busy, fullWidth: false }, "Deactivate My Account"),
      h(Button, { type: "button", variant: "secondary", fullWidth: false, onClick: onDone }, "Cancel")
    )
  );
}

function ProfilePage() {
  const [vehicles, setVehicles] = useState(currentVehicles());
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ plateNumber: "", make: "", model: "", color: "" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [section, setSection] = useState(null); // null | "edit" | "password" | "deactivate"

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
      notifySuccess("Vehicle added.");
    } catch (err) {
      setError(err.message);
      notifyError(err.message);
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
      notifySuccess("Vehicle removed.");
    } catch (err) {
      setError(err.message);
      notifyError(err.message);
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

  const toggle = (name) => () => setSection((s) => (s === name ? null : name));

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
        h(
          "div",
          { className: "pk-row", style: { marginBottom: section === "edit" ? 0 : 10 } },
          h("span", { className: "pk-field-label" }, "Account"),
          h(Button, { variant: "ghost", fullWidth: false, onClick: toggle("edit") }, section === "edit" ? "Cancel" : "Edit")
        ),
        section === "edit"
          ? h(EditProfileForm, { onDone: () => setSection(null) })
          : h(
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

      h(
        Card,
        null,
        h(
          "a",
          { className: "pk-row", href: "reservations.html", style: { textDecoration: "none", color: "inherit" } },
          h(
            "span",
            { style: { display: "flex", alignItems: "center", gap: 10 } },
            h(IconList, { size: 18, color: "var(--text-muted)" }),
            h("span", { className: "pk-field-label" }, "Parking History")
          ),
          h("span", { className: "pk-hint" }, "View →")
        )
      ),

      h(
        Card,
        null,
        h("div", { className: "pk-field-label", style: { marginBottom: section === "password" ? 0 : 10 } }, "Security"),
        section === "password"
          ? h(ChangePasswordForm, { onDone: () => setSection(null) })
          : h(Button, { variant: "ghost", fullWidth: false, onClick: toggle("password") }, "Change Password")
      ),

      h(Button, { variant: "secondary", onClick: logout }, h(IconLogout, { size: 18, style: { marginRight: 8 } }), "Log Out"),

      h(
        Card,
        { style: { borderColor: "var(--danger, #dc2626)" } },
        h("div", { className: "pk-field-label", style: { marginBottom: section === "deactivate" ? 0 : 10 } }, "Danger Zone"),
        section === "deactivate"
          ? h(DeactivateForm, { onDone: () => setSection(null) })
          : h(Button, { variant: "danger", fullWidth: false, onClick: toggle("deactivate") }, "Deactivate Account")
      )
    ),
    h(BottomNav, { active: "profile" })
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(h(ProfilePage));
