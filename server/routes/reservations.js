const express = require("express");
const crypto = require("crypto");

const db = require("../lib/db");
const { requireAuth } = require("../lib/auth");

const router = express.Router();
router.use(requireAuth);

router.get("/", (req, res) => {
  const mine = db
    .readAll("reservations")
    .filter((r) => r.userId === req.userId)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  res.json(mine);
});

router.post("/", async (req, res) => {
  const { plateNumber, bayId, startTime, endTime } = req.body || {};
  if (!plateNumber || !startTime || !endTime) {
    return res.status(400).json({ error: "plateNumber, startTime and endTime are required" });
  }

  const normalizedPlate = String(plateNumber).trim().toUpperCase();
  const myVehicle = db
    .readAll("vehicles")
    .find((v) => v.userId === req.userId && v.plateNumber === normalizedPlate);
  if (!myVehicle) {
    return res.status(400).json({ error: "That plate isn't registered on your account" });
  }

  const start = new Date(startTime);
  const end = new Date(endTime);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || start >= end) {
    return res.status(400).json({ error: "startTime must be before endTime" });
  }

  const user = db.readAll("users").find((u) => u.id === req.userId);

  const reservation = {
    id: crypto.randomUUID(),
    userId: req.userId,
    plateNumber: normalizedPlate,
    userName: user ? user.name : "",
    bayId: bayId || null,
    startTime: start.toISOString(),
    endTime: end.toISOString(),
    status: "active",
    createdAt: new Date().toISOString(),
  };

  const reservations = db.readAll("reservations");
  reservations.push(reservation);
  await db.writeAll("reservations", reservations);
  res.status(201).json(reservation);
});

router.patch("/:id", async (req, res) => {
  const { status } = req.body || {};
  if (!["active", "cancelled", "completed"].includes(status)) {
    return res.status(400).json({ error: "status must be one of active, cancelled, completed" });
  }

  const reservations = db.readAll("reservations");
  const reservation = reservations.find((r) => r.id === req.params.id && r.userId === req.userId);
  if (!reservation) return res.status(404).json({ error: "Reservation not found" });

  reservation.status = status;
  await db.writeAll("reservations", reservations);
  res.json(reservation);
});

module.exports = router;
