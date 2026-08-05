import ReactDOM from "https://esm.sh/react-dom@18.3.1/client";
import { h, useState, useEffect, useMemo } from "../shared.js";
import { Button, Card, BottomNav, IconSearch, IconFilter, Badge } from "../shared.js";
import { requireAuth } from "../auth.js";
import { api } from "../api.js";
import { loadWithCache, cacheSet } from "../store.js";

if (!requireAuth()) {
  throw new Error("redirecting to login");
}

const POLL_MS = 1000;

function timeAgo(iso) {
  if (!iso) return "never";
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.round(diffMs / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.round(mins / 60);
  return `${hours} hr ago`;
}

function HomePage() {
  const [bays, setBays] = useState(null);
  const [cachedAt, setCachedAt] = useState(null);
  const [query, setQuery] = useState("");

  useEffect(() => {
    loadWithCache("bays", api.getBays, {
      onCache: (data, at) => {
        setBays(data);
        setCachedAt(at);
      },
      onFresh: (data) => {
        setBays(data);
        setCachedAt(new Date().toISOString());
      },
    }).catch(() => {});

    // Keep polling after the initial load so bay availability stays current
    // without the driver having to pull-to-refresh or relaunch the app.
    const id = setInterval(() => {
      api.getBays()
        .then((data) => {
          cacheSet("bays", data);
          setBays(data);
          setCachedAt(new Date().toISOString());
        })
        .catch(() => {});
    }, POLL_MS);
    return () => clearInterval(id);
  }, []);

  const filtered = useMemo(() => {
    if (!bays) return [];
    if (!query.trim()) return bays;
    return bays.filter((b) => b.label.toLowerCase().includes(query.toLowerCase()));
  }, [bays, query]);

  const vacant = bays ? bays.filter((b) => b.status === "vacant").length : null;
  const occupied = bays ? bays.filter((b) => b.status === "occupied").length : null;

  return h(
    "div",
    { className: "pk-shell" },
    h(
      "div",
      { className: "pk-page" },
      h(
        "div",
        { className: "pk-row" },
        h(
          "div",
          null,
          h("p", { className: "pk-subtitle", style: { margin: 0 } }, "Find Station for"),
          h("h1", { className: "pk-title-xl" }, "Parking")
        ),
        h("a", { href: "profile.html" }, h("img", { className: "pk-avatar", style: { width: 48, height: 48 }, src: "assets/user.png", alt: "Profile" }))
      ),

      h(
        "div",
        { className: "pk-row", style: { gap: 10 } },
        h(
          "span",
          { className: "pk-field-control", style: { flex: 1 } },
          h(IconSearch, { size: 18, color: "var(--text-muted)" }),
          h("input", {
            className: "pk-field-input",
            placeholder: "Search bays…",
            value: query,
            onChange: (e) => setQuery(e.target.value),
          })
        ),
        h(
          "button",
          { className: "pk-header-back", type: "button", "aria-label": "Filter" },
          h(IconFilter, { size: 18 })
        )
      ),

      h(
        "div",
        { className: "pk-stat-row" },
        h(
          "div",
          { className: "pk-stat" },
          h("div", { className: "pk-stat-value" }, vacant ?? "–"),
          h("div", { className: "pk-stat-label" }, "Vacant")
        ),
        h(
          "div",
          { className: "pk-stat" },
          h("div", { className: "pk-stat-value" }, occupied ?? "–"),
          h("div", { className: "pk-stat-label" }, "Occupied")
        ),
        h(
          "div",
          { className: "pk-stat" },
          h("div", { className: "pk-stat-value" }, bays ? bays.length : "–"),
          h("div", { className: "pk-stat-label" }, "Total bays")
        )
      ),
      h("p", { className: "pk-hint", style: { margin: 0 } }, `Availability as of last sync — ${timeAgo(cachedAt)}`),

      h(Button, { href: "reserve.html" }, "Reserve a Space"),

      h(
        Card,
        null,
        h("div", { className: "pk-row", style: { marginBottom: 10 } }, h("strong", null, "Bays")),
        !bays
          ? h("p", { className: "pk-hint" }, "Loading…")
          : filtered.length === 0
          ? h("p", { className: "pk-hint" }, "No bays found.")
          : h(
              "div",
              { style: { display: "flex", flexDirection: "column", gap: 12 } },
              filtered.map((b) =>
                h(
                  "div",
                  { key: b.label, className: "pk-row" },
                  h("span", null, b.label),
                  h(Badge, { tone: b.status === "vacant" ? "success" : b.status === "occupied" ? "danger" : "muted" }, b.status)
                )
              )
            )
      )
    ),
    h(BottomNav, { active: "home" })
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(h(HomePage));
