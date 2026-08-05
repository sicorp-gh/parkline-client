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
  if (user.active === false) {
    return res.status(403).json({ error: "This account has been deactivated" });
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

// Email is deliberately not editable here -- it's the login identifier and
// changing it safely needs re-verification, which is out of scope for now.
router.patch("/me", auth.requireAuth, async (req, res) => {
  const { name, phone } = req.body || {};
  const users = db.readAll("users");
  const user = users.find((u) => u.id === req.userId);
  if (!user) return res.status(404).json({ error: "User not found" });

  if (name !== undefined) {
    const trimmed = String(name).trim();
    if (!trimmed) return res.status(400).json({ error: "Name can't be empty" });
    user.name = trimmed;
  }
  if (phone !== undefined) {
    user.phone = phone ? String(phone).trim() : null;
  }

  await db.writeAll("users", users);
  // The edge's registered-users cache derives user_name live from this same
  // users+vehicles join every pull cycle (see sync.js /users/registered) --
  // no separate push needed for a profile edit to reach it.
  res.json({ user: publicUser(user), vehicles: vehiclesFor(user.id) });
});

router.post("/change-password", auth.requireAuth, async (req, res) => {
  const { currentPassword, newPassword } = req.body || {};
  if (!currentPassword || !newPassword) {
    return res.status(400).json({ error: "currentPassword and newPassword are required" });
  }
  if (String(newPassword).length < 8) {
    return res.status(400).json({ error: "New password must be at least 8 characters" });
  }

  const users = db.readAll("users");
  const user = users.find((u) => u.id === req.userId);
  if (!user) return res.status(404).json({ error: "User not found" });

  if (!auth.verifyPassword(currentPassword, user.passwordSalt, user.passwordHash)) {
    return res.status(401).json({ error: "Current password is incorrect" });
  }

  const { salt, hash } = auth.hashPassword(newPassword);
  user.passwordSalt = salt;
  user.passwordHash = hash;
  await db.writeAll("users", users);

  // Kick out any other device that had a session -- keeps this one signed in.
  await auth.revokeAllSessionsForUser(user.id, req.token);
  res.status(204).end();
});

// Soft delete, not a hard erase: keeps the account's history intact (it's
// still "their" data) but stops it being usable -- login is blocked, every
// vehicle drops out of the edge's registered-users list on the next pull
// (see sync.js /users/registered filtering out inactive users), and every
// active reservation is cancelled so the edge frees those bays immediately
// (see cloud_sync._pull_reference_data's stale-reservation handling).
router.post("/deactivate", auth.requireAuth, async (req, res) => {
  const { password } = req.body || {};
  const users = db.readAll("users");
  const user = users.find((u) => u.id === req.userId);
  if (!user) return res.status(404).json({ error: "User not found" });

  if (!password || !auth.verifyPassword(password, user.passwordSalt, user.passwordHash)) {
    return res.status(401).json({ error: "Password is incorrect" });
  }

  user.active = false;
  user.deactivatedAt = new Date().toISOString();
  await db.writeAll("users", users);

  const reservations = db.readAll("reservations");
  let changedReservations = false;
  for (const r of reservations) {
    if (r.userId === user.id && r.status === "active") {
      r.status = "cancelled";
      changedReservations = true;
    }
  }
  if (changedReservations) await db.writeAll("reservations", reservations);

  await auth.revokeAllSessionsForUser(user.id);
  res.status(204).end();
});

module.exports = router;
