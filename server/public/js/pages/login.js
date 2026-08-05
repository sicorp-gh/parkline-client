import ReactDOM from "https://esm.sh/react-dom@18.3.1/client";
import { h, useState, React } from "../shared.js";
import { Button, Field, ErrorBanner } from "../shared.js";
import { api } from "../api.js";
import { getToken, setSession, afterLoginRedirect } from "../auth.js";

if (getToken()) {
  location.replace("home.html");
}

function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const { token, user, vehicles } = await api.login(email, password);
      setSession({ token, user, vehicles });
      afterLoginRedirect();
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  }

  return h(
    "div",
    { className: "pk-shell" },
    h(
      "div",
      { className: "pk-page pk-page--centered" },
      h(
        "div",
        { className: "pk-brand" },
        h("img", { src: "assets/logo.png", alt: "" }),
        h("span", null, "Parkline")
      ),
      h(
        "div",
        { style: { textAlign: "center", marginBottom: 8 } },
        h("h1", { className: "pk-title-xl" }, "Welcome back"),
        h("p", { className: "pk-subtitle" }, "Log in to reserve and manage your parking")
      ),
      h(
        "form",
        { className: "pk-card", onSubmit, style: { display: "flex", flexDirection: "column", gap: 14 } },
        h(ErrorBanner, { message: error }),
        h(Field, {
          label: "Email",
          type: "email",
          placeholder: "you@example.com",
          value: email,
          required: true,
          onChange: (e) => setEmail(e.target.value),
        }),
        h(Field, {
          label: "Password",
          type: "password",
          placeholder: "••••••••",
          value: password,
          required: true,
          onChange: (e) => setPassword(e.target.value),
        }),
        h(Button, { type: "submit", loading }, "Log In")
      ),
      h(
        "p",
        { className: "pk-hint" },
        "Don't have an account? ",
        h("a", { className: "pk-link", href: "signup.html" }, "Sign up")
      )
    )
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(h(LoginPage));
