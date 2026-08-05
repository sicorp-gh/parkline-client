// The four endpoints admin/api's cloud_sync.py already expects at CLOUD_API_URL
// (see admin/api/app/services/cloud_sync.py). Field names/shapes here must match
// what that code reads/sends exactly -- it's already written and won't change.
//
// Called server-to-server by the edge unit (via httpx), not from a browser, so
// no auth is enforced here -- same posture admin/api itself takes for its
// barrier-open call (see admin/README.md's "what's a placeholder" section).
// Add a shared secret before this ever runs somewhere untrusted can reach it.

const express = require("express");
const db = require("../lib/db");

const router = express.Router();

const MAX_ACCESS_EVENTS = 200;

router.get("/reservations/active", (req, res) => {
  const now = new Date();
  const active = db
    .readAll("reservations")
    .filter((r) => r.status === "active" && new Date(r.endTime) >= now)
    .map((r) => ({
      id: r.id,
      plate_number: r.plateNumber,
      user_name: r.userName,
      bay_id: r.bayId,
      start_time: r.startTime,
      end_time: r.endTime,
      status: r.status,
    }));
  res.json(active);
});

router.get("/users/registered", (req, res) => {
  const users = db.readAll("users");
  const byId = new Map(users.map((u) => [u.id, u]));
  const registered = db.readAll("vehicles").map((v) => ({
    plate_number: v.plateNumber,
    user_name: byId.get(v.userId)?.name || "",
  }));
  res.json(registered);
});

router.post("/sync/occupancy", async (req, res) => {
  const { label, status, confidence, timestamp } = req.body || {};
  if (!label || !status) {
    return res.status(400).json({ error: "label and status are required" });
  }

  const bays = db.readAll("bays");
  let bay = bays.find((b) => b.label === label);
  if (!bay) {
    bay = { label };
    bays.push(bay);
  }
  bay.status = status;
  bay.confidence = confidence != null ? String(confidence) : null;
  bay.lastUpdated = timestamp || new Date().toISOString();

  await db.writeAll("bays", bays);
  res.status(204).end();
});

router.post("/sync/access-event", async (req, res) => {
  const { plate_number, action, reason, timestamp } = req.body || {};
  if (!action) return res.status(400).json({ error: "action is required" });

  const events = db.readAll("accessEvents");
  events.unshift({
    plateNumber: plate_number || null,
    action,
    reason: reason || null,
    timestamp: timestamp || new Date().toISOString(),
  });
  await db.writeAll("accessEvents", events.slice(0, MAX_ACCESS_EVENTS));
  res.status(204).end();
});

module.exports = router;
