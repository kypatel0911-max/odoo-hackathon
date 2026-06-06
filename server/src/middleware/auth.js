import { verifyToken } from "../utils/token.js";
import { query } from "../db.js";

export async function authRequired(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) {
    return res.status(401).json({ error: "Missing token" });
  }
  try {
    const payload = verifyToken(token);
    const { rows } = await query(
      `SELECT id, email, name, role, vendor_id, created_at FROM users WHERE id = $1`,
      [payload.sub],
    );
    if (!rows[0]) return res.status(401).json({ error: "User not found" });
    req.user = rows[0];
    req.userId = rows[0].id;
    return next();
  } catch {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}

export function requireRoles(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ error: "Insufficient permissions" });
    }
    return next();
  };
}
