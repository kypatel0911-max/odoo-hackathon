import { Router } from "express";
import { authRequired, requireRoles } from "../middleware/auth.js";
import { query } from "../db.js";

const router = Router();

router.get("/", authRequired, requireRoles("admin", "procurement_officer", "manager"), async (req, res) => {
  const limit = Math.min(Number(req.query.limit) || 50, 200);
  const { rows } = await query(
    `SELECT a.*, u.name AS user_name, u.email AS user_email
     FROM activity_logs a LEFT JOIN users u ON u.id = a.user_id
     ORDER BY a.created_at DESC LIMIT $1`,
    [limit],
  );
  return res.json({ activities: rows });
});

export default router;
