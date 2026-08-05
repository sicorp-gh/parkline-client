const express = require("express");
const db = require("../lib/db");
const { requireAuth } = require("../lib/auth");

const router = express.Router();
router.use(requireAuth);

// Lets the driver app poll for entrance activity on its own plates -- welcome
// / reservation-confirmed / no-vacancy notifications all come from here.
// Scoped by plate rather than trusting anything client-supplied, since these
// events were pushed by the edge unit for whichever plate the camera read.
router.get("/access-events", (req, res) => {
  const myPlates = new Set(
    db.readAll("vehicles").filter((v) => v.userId === req.userId).map((v) => v.plateNumber)
  );
  const events = db.readAll("accessEvents").filter((e) => myPlates.has(e.plateNumber));
  res.json(events.slice(0, 20));
});

module.exports = router;
