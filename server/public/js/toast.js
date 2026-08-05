// Same esm.sh CDN-import pattern shared.js uses for React -- this app has no
// build step, so there's nowhere to run `npm install` or bundle a stylesheet.
// The CSS link is injected here instead of pasted into every *.html file.
import { Notyf } from "https://esm.sh/notyf@3.10.0";

if (!document.getElementById("notyf-css")) {
  const link = document.createElement("link");
  link.id = "notyf-css";
  link.rel = "stylesheet";
  link.href = "https://esm.sh/notyf@3.10.0/notyf.min.css";
  document.head.appendChild(link);
}

const notyf = new Notyf({
  duration: 4000,
  position: { x: "center", y: "top" },
  dismissible: true,
  types: [
    { type: "success", background: "#16a34a", icon: false },
    { type: "error",   background: "#dc2626", icon: false },
    { type: "info",    background: "#4361ee", icon: false },
  ],
});

export function notifySuccess(message) { notyf.success(message); }
export function notifyError(message) { notyf.error(message); }
export function notifyInfo(message) { notyf.open({ type: "info", message }); }
