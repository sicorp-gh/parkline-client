const fs = require("fs");
const path = require("path");

const DATA_DIR = path.join(__dirname, "..", "data");

const COLLECTIONS = {
  users: "users.json",
  vehicles: "vehicles.json",
  reservations: "reservations.json",
  bays: "bays.json",
  accessEvents: "access_events.json",
  sessions: "sessions.json",
};

const writeQueues = {};

function ensureFile(filename) {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  const full = path.join(DATA_DIR, filename);
  if (!fs.existsSync(full)) fs.writeFileSync(full, "[]", "utf8");
  return full;
}

function readAll(name) {
  const filename = COLLECTIONS[name];
  if (!filename) throw new Error(`Unknown collection: ${name}`);
  const full = ensureFile(filename);
  const raw = fs.readFileSync(full, "utf8");
  try {
    return JSON.parse(raw || "[]");
  } catch {
    return [];
  }
}

// Queued so overlapping async writes to the same file can't interleave and
// corrupt it -- fine at this project's scale, avoids pulling in a real DB.
function writeAll(name, rows) {
  const filename = COLLECTIONS[name];
  if (!filename) throw new Error(`Unknown collection: ${name}`);
  const full = ensureFile(filename);
  const prev = writeQueues[name] || Promise.resolve();
  const next = prev.then(() => fs.promises.writeFile(full, JSON.stringify(rows, null, 2), "utf8"));
  writeQueues[name] = next.catch(() => {});
  return next;
}

module.exports = { readAll, writeAll };
