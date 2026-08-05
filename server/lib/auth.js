const crypto = require("crypto");
const db = require("./db");

const TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  return { salt, hash };
}

function verifyPassword(password, salt, hash) {
  const candidate = crypto.scryptSync(password, salt, 64);
  const stored = Buffer.from(hash, "hex");
  if (candidate.length !== stored.length) return false;
  return crypto.timingSafeEqual(candidate, stored);
}

async function createSession(userId) {
  const token = crypto.randomBytes(32).toString("hex");
  const sessions = db.readAll("sessions");
  sessions.push({
    token,
    userId,
    expiresAt: new Date(Date.now() + TOKEN_TTL_MS).toISOString(),
  });
  await db.writeAll("sessions", sessions);
  return token;
}

function getUserIdForToken(token) {
  if (!token) return null;
  const session = db.readAll("sessions").find((s) => s.token === token);
  if (!session) return null;
  if (new Date(session.expiresAt) < new Date()) return null;
  return session.userId;
}

async function revokeSession(token) {
  const sessions = db.readAll("sessions").filter((s) => s.token !== token);
  await db.writeAll("sessions", sessions);
}

function requireAuth(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  const userId = getUserIdForToken(token);
  if (!userId) return res.status(401).json({ error: "Unauthorized" });
  req.userId = userId;
  req.token = token;
  next();
}

module.exports = {
  hashPassword,
  verifyPassword,
  createSession,
  getUserIdForToken,
  revokeSession,
  requireAuth,
};
