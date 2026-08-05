// No build step: React comes straight from a CDN as a native ES module, and
// every component is written with React.createElement (aliased `h`) instead
// of JSX, since JSX needs a compiler this setup deliberately doesn't have.
// Same approach admin/dashboard's old dashboard-web/ used before it grew a
// build step -- see admin/README.md.
import React from "https://esm.sh/react@18.3.1";

export { React };
export const h = React.createElement;
export const { useState, useEffect, useMemo } = React;

// ---- icons (hand-rolled, Feather-style line icons to match ui/mobile.png) ----

function svg(children, viewBox = "0 0 24 24") {
  return ({ size = 22, color = "currentColor", style }) =>
    h(
      "svg",
      { width: size, height: size, viewBox, fill: "none", stroke: color, strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round", style },
      children
    );
}

export const IconBack = svg([h("path", { key: 1, d: "M15 18l-6-6 6-6" })]);

export const IconSearch = svg([
  h("circle", { key: 1, cx: 11, cy: 11, r: 7 }),
  h("path", { key: 2, d: "M21 21l-4.3-4.3" }),
]);

export const IconFilter = svg([
  h("line", { key: 1, x1: 4, y1: 6, x2: 20, y2: 6 }),
  h("line", { key: 2, x1: 4, y1: 12, x2: 20, y2: 12 }),
  h("line", { key: 3, x1: 4, y1: 18, x2: 20, y2: 18 }),
  h("circle", { key: 4, cx: 9, cy: 6, r: 1.6, fill: "currentColor" }),
  h("circle", { key: 5, cx: 15, cy: 12, r: 1.6, fill: "currentColor" }),
  h("circle", { key: 6, cx: 9, cy: 18, r: 1.6, fill: "currentColor" }),
]);

export const IconHome = svg([
  h("path", { key: 1, d: "M3 10.5L12 3l9 7.5" }),
  h("path", { key: 2, d: "M5 9.5V20a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1V9.5" }),
]);

export const IconList = svg([
  h("line", { key: 1, x1: 9, y1: 6, x2: 20, y2: 6 }),
  h("line", { key: 2, x1: 9, y1: 12, x2: 20, y2: 12 }),
  h("line", { key: 3, x1: 9, y1: 18, x2: 20, y2: 18 }),
  h("line", { key: 4, x1: 4, y1: 6, x2: 4.01, y2: 6 }),
  h("line", { key: 5, x1: 4, y1: 12, x2: 4.01, y2: 12 }),
  h("line", { key: 6, x1: 4, y1: 18, x2: 4.01, y2: 18 }),
]);

export const IconUser = svg([
  h("circle", { key: 1, cx: 12, cy: 8, r: 3.5 }),
  h("path", { key: 2, d: "M5.5 21v-1.5A5.5 5.5 0 0 1 11 14h2a5.5 5.5 0 0 1 5.5 5.5V21" }),
]);

export const IconMapPin = svg([
  h("path", { key: 1, d: "M20 10.5c0 6-8 11.5-8 11.5s-8-5.5-8-11.5a8 8 0 0 1 16 0z" }),
  h("circle", { key: 2, cx: 12, cy: 10.5, r: 2.6 }),
]);

export const IconCheck = svg([h("path", { key: 1, d: "M5 12.5l4.5 4.5L19 7" })]);

export const IconClock = svg([
  h("circle", { key: 1, cx: 12, cy: 12, r: 8.5 }),
  h("path", { key: 2, d: "M12 7.5V12l3 2" }),
]);

export const IconLogout = svg([
  h("path", { key: 1, d: "M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" }),
  h("path", { key: 2, d: "M16 17l5-5-5-5" }),
  h("line", { key: 3, x1: 21, y1: 12, x2: 9, y2: 12 }),
]);

// ---- layout / form primitives ----

export function Header({ title, backHref, right }) {
  return h(
    "header",
    { className: "pk-header" },
    backHref
      ? h("a", { className: "pk-header-back", href: backHref, "aria-label": "Back" }, h(IconBack, {}))
      : h("span", { className: "pk-header-back pk-header-back--spacer" }),
    h("h1", { className: "pk-header-title" }, title),
    right ? h("div", { className: "pk-header-right" }, right) : h("span", { className: "pk-header-back pk-header-back--spacer" })
  );
}

export function Card({ children, style, className = "" }) {
  return h("div", { className: `pk-card ${className}`.trim(), style }, children);
}

export function Button({ children, onClick, href, variant = "primary", type = "button", disabled = false, loading = false, fullWidth = true }) {
  const className = `pk-btn pk-btn--${variant}${fullWidth ? " pk-btn--full" : ""}`;
  const label = loading ? "Please wait…" : children;
  if (href && !disabled) {
    return h("a", { className, href }, label);
  }
  return h("button", { className, type, onClick, disabled: disabled || loading }, label);
}

export function Field({ label, icon, ...inputProps }) {
  return h(
    "label",
    { className: "pk-field" },
    label ? h("span", { className: "pk-field-label" }, label) : null,
    h(
      "span",
      { className: "pk-field-control" },
      icon ? h("span", { className: "pk-field-icon" }, h(icon, { size: 18 })) : null,
      h("input", { className: "pk-field-input", ...inputProps })
    )
  );
}

export function Badge({ tone = "muted", children }) {
  return h("span", { className: `pk-badge pk-badge--${tone}` }, children);
}

export function StatusCircle({ tone = "success", icon }) {
  return h(
    "div",
    { className: `pk-status-circle pk-status-circle--${tone}` },
    h("div", { className: "pk-status-circle-ring" }, h("div", { className: "pk-status-circle-inner" }, h(icon || IconCheck, { size: 40, color: "#fff" })))
  );
}

const NAV_ITEMS = [
  { key: "home", href: "home.html", label: "Home", icon: IconHome },
  { key: "reservations", href: "reservations.html", label: "Trips", icon: IconList },
  { key: "profile", href: "profile.html", label: "Profile", icon: IconUser },
];

export function BottomNav({ active }) {
  return h(
    "nav",
    { className: "pk-bottom-nav" },
    NAV_ITEMS.map((item) =>
      h(
        "a",
        { key: item.key, href: item.href, className: `pk-bottom-nav-item${item.key === active ? " pk-bottom-nav-item--active" : ""}` },
        h(item.icon, { size: 22 }),
        h("span", null, item.label)
      )
    )
  );
}

export function ErrorBanner({ message }) {
  if (!message) return null;
  return h("div", { className: "pk-error" }, message);
}

export function Spinner() {
  return h("div", { className: "pk-spinner" });
}
