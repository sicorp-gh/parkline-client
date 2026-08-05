const express = require("express");
const path = require("path");

const authRoutes = require("./routes/auth");
const vehicleRoutes = require("./routes/vehicles");
const reservationRoutes = require("./routes/reservations");
const parkingRoutes = require("./routes/parking");
const syncRoutes = require("./routes/sync");

const app = express();
app.use(express.json());

app.get("/api/health", (req, res) => res.json({ status: "ok" }));

// Mounted first at /api so its GET /reservations/active (unauthenticated,
// called server-to-server by the edge unit) is matched before
// reservationRoutes' authenticated GET /:id below -- otherwise "active" would
// be treated as a reservation id and 401 instead.
app.use("/api", syncRoutes);

app.use("/api/auth", authRoutes);
app.use("/api/vehicles", vehicleRoutes);
app.use("/api/reservations", reservationRoutes);
app.use("/api/parking", parkingRoutes);

// Same-origin static frontend -- express.static serves public/index.html for
// GET / automatically, and every other page (login.html, home.html, ...) by
// its own filename, matching the multi-page (no client-side router) layout.
app.use(express.static(path.join(__dirname, "public")));

app.use("/api", (req, res) => res.status(404).json({ error: "Not found" }));

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Parkline server listening on :${PORT}`);
});
