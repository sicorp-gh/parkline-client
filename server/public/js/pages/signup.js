import ReactDOM from "https://esm.sh/react-dom@18.3.1/client";
import { h, useState } from "../shared.js";
import { Button, Field, ErrorBanner, Header } from "../shared.js";
import { api } from "../api.js";
import { getToken, setSession } from "../auth.js";

if (getToken()) {
  location.replace("home.html");
}

function SignupPage() {
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
    plateNumber: "",
    make: "",
    model: "",
    color: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function set(key) {
    return (e) => setForm((f) => ({ ...f, [key]: e.target.value }));
  }

  async function onSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const { token, user, vehicles } = await api.signup(form);
      setSession({ token, user, vehicles });
      location.href = "home.html";
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  }

  return h(
    "div",
    { className: "pk-shell" },
    h(Header, { title: "Create Account", backHref: "login.html" }),
    h(
      "div",
      { className: "pk-page pk-page--no-nav" },
      h(
        "form",
        { className: "pk-card", onSubmit, style: { display: "flex", flexDirection: "column", gap: 14 } },
        h(ErrorBanner, { message: error }),
        h(Field, { label: "Full name", value: form.name, required: true, onChange: set("name") }),
        h(Field, { label: "Email", type: "email", value: form.email, required: true, onChange: set("email") }),
        h(Field, { label: "Phone (optional)", type: "tel", value: form.phone, onChange: set("phone") }),
        h(Field, { label: "Password", type: "password", value: form.password, required: true, onChange: set("password") }),
        h("div", { className: "pk-hint", style: { textAlign: "left", margin: "6px 0 -6px", fontWeight: 700, color: "var(--text)" } }, "Your vehicle"),
        h(Field, { label: "Plate number", value: form.plateNumber, required: true, onChange: set("plateNumber") }),
        h(
          "div",
          { style: { display: "flex", gap: 10 } },
          h(Field, { label: "Make (optional)", value: form.make, onChange: set("make") }),
          h(Field, { label: "Model (optional)", value: form.model, onChange: set("model") })
        ),
        h(Field, { label: "Color (optional)", value: form.color, onChange: set("color") }),
        h(Button, { type: "submit", loading }, "Sign Up")
      ),
      h(
        "p",
        { className: "pk-hint" },
        "Already have an account? ",
        h("a", { className: "pk-link", href: "login.html" }, "Log in")
      )
    )
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(h(SignupPage));
