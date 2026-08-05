const express = require("express");
const crypto = require("crypto");

const db = require("../lib/db");
const auth = require("../lib/auth");

const router = express.Router();

function publicUser(user) {
  return { id: user.id, name: user.name, email: user.email, phone: user.phone || null };
}

function vehiclesFor(userId) {
  return db.readAll("vehicles").filter((v) => v.userId === userId);
}

router.post("/signup", async (req, res) => {
  const { name, email, password, phone, plateNumber, make, model, color } = req.body || {};

  if (!name || !email || !password || !plateNumber) {
    return res.status(400).json({ error: "name, email, password and plateNumber are required" });
  }

  const normalizedEmail = String(email).trim().toLowerCase();
  const normalizedPlate = String(plateNumber).trim().toUpperCase();

  const users = db.readAll("users");
  if (users.some((u) => u.email === normalizedEmail)) {
    return res.status(409).json({ error: "An account with this email already exists" });
  }

  const vehicles = db.readAll("vehicles");
  if (vehicles.some((v) => v.plateNumber === normalizedPlate)) {
    return res.status(409).json({ error: `Plate '${normalizedPlate}' is already registered` });
  }

  const { salt, hash } = auth.hashPassword(password);
  const user = {
    id: crypto.randomUUID(),
    name: String(name).trim(),
    email: normalizedEmail,
    phone: phone ? String(phone).trim() : null,
    passwordSalt: salt,
    passwordHash: hash,
    createdAt: new Date().toISOString(),
  };
  users.push(user);
  await db.writeAll("users", users);

  const vehicle = {
    id: crypto.randomUUID(),
    userId: user.id,
    plateNumber: normalizedPlate,
    make: make || null,
    model: model || null,
    color: color || null,
    createdAt: new Date().toISOString(),
  };
  vehicles.push(vehicle);
  await db.writeAll("vehicles", vehicles);

  const token = await auth.createSession(user.id);
  res.status(201).json({ token, user: publicUser(user), vehicles: [vehicle] });
});

router.post("/login", async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) {
    return res.status(400).json({ error: "email and password are required" });
  }

  const normalizedEmail = String(email).trim().toLowerCase();
  const user = db.readAll("users").find((u) => u.email === normalizedEmail);
  if (!user || !auth.verifyPassword(password, user.passwordSalt, user.passwordHash)) {
    return res.status(401).json({ error: "Incorrect email or password" });
  }

  const token = await auth.createSession(user.id);
  res.json({ token, user: publicUser(user), vehicles: vehiclesFor(user.id) });
});

router.post("/logout", auth.requireAuth, async (req, res) => {
  await auth.revokeSession(req.token);
  res.status(204).end();
});

router.get("/me", auth.requireAuth, (req, res) => {
  const user = db.readAll("users").find((u) => u.id === req.userId);
  if (!user) return res.status(404).json({ error: "User not found" });
  res.json({ user: publicUser(user), vehicles: vehiclesFor(user.id) });
});

module.exports = router;
