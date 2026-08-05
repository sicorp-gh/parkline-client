const express = require("express");
const crypto = require("crypto");

const db = require("../lib/db");
const { requireAuth } = require("../lib/auth");

const router = express.Router();
router.use(requireAuth);

router.get("/", (req, res) => {
  const mine = db.readAll("vehicles").filter((v) => v.userId === req.userId);
  res.json(mine);
});

router.post("/", async (req, res) => {
  const { plateNumber, make, model, color } = req.body || {};
  if (!plateNumber) return res.status(400).json({ error: "plateNumber is required" });

  const normalizedPlate = String(plateNumber).trim().toUpperCase();
  const vehicles = db.readAll("vehicles");
  if (vehicles.some((v) => v.plateNumber === normalizedPlate)) {
    return res.status(409).json({ error: `Plate '${normalizedPlate}' is already registered` });
  }

  const vehicle = {
    id: crypto.randomUUID(),
    userId: req.userId,
    plateNumber: normalizedPlate,
    make: make || null,
    model: model || null,
    color: color || null,
    createdAt: new Date().toISOString(),
  };
  vehicles.push(vehicle);
  await db.writeAll("vehicles", vehicles);
  res.status(201).json(vehicle);
});

router.delete("/:id", async (req, res) => {
  const vehicles = db.readAll("vehicles");
  const vehicle = vehicles.find((v) => v.id === req.params.id && v.userId === req.userId);
  if (!vehicle) return res.status(404).json({ error: "Vehicle not found" });

  await db.writeAll("vehicles", vehicles.filter((v) => v.id !== vehicle.id));
  res.status(204).end();
});

module.exports = router;
