import { Router } from "express";
import { authRequired, requireRoles } from "../middleware/auth.js";
import { query } from "../db.js";

const router = Router();

router.get("/", authRequired, requireRoles("admin"), async (_req, res) => {
  const { rows } = await query(
    `SELECT id, email, name, role, vendor_id, created_at FROM users ORDER BY created_at DESC`,
  );
  return res.json({ users: rows.map((u) => ({
    id: u.id, email: u.email, name: u.name, role: u.role, vendorId: u.vendor_id, createdAt: u.created_at,
  })) });
});

router.patch("/:id/role", authRequired, requireRoles("admin"), async (req, res) => {
  const { role } = req.body;
  const allowed = ["admin", "procurement_officer", "manager", "vendor"];
  if (!allowed.includes(role)) return res.status(400).json({ error: "Invalid role" });
  const { rows } = await query(
    `UPDATE users SET role = $1 WHERE id = $2 RETURNING id, email, name, role, vendor_id`,
    [role, req.params.id],
  );
  if (!rows[0]) return res.status(404).json({ error: "User not found" });
  return res.json({ user: rows[0] });
});

export default router;
