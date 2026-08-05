const express = require("express");
const db = require("../lib/db");

const router = express.Router();

// Public, no auth: occupancy isn't sensitive, and the home screen wants to
// show it. Reflects whatever the edge unit last pushed via /api/sync/occupancy
// -- i.e. "as of last sync", not necessarily the live on-site state.
router.get("/bays", (req, res) => {
  res.json(db.readAll("bays"));
});

module.exports = router;
