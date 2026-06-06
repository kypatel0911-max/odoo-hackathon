import { Router } from "express";
import { authRequired } from "../middleware/auth.js";
import { query } from "../db.js";

const router = Router();

router.get("/", authRequired, async (req, res) => {
  const { unreadOnly } = req.query;
  let sql = `SELECT * FROM notifications WHERE user_id = $1`;
  if (unreadOnly === "true") sql += ` AND read = FALSE`;
  sql += ` ORDER BY created_at DESC LIMIT 50`;
  const { rows } = await query(sql, [req.userId]);
  const unread = await query(`SELECT COUNT(*)::int AS c FROM notifications WHERE user_id = $1 AND read = FALSE`, [req.userId]);
  return res.json({ notifications: rows, unreadCount: unread.rows[0].c });
});

router.patch("/:id/read", authRequired, async (req, res) => {
  await query(`UPDATE notifications SET read = TRUE WHERE id = $1 AND user_id = $2`, [req.params.id, req.userId]);
  return res.json({ ok: true });
});

router.post("/read-all", authRequired, async (req, res) => {
  await query(`UPDATE notifications SET read = TRUE WHERE user_id = $1`, [req.userId]);
  return res.json({ ok: true });
});

export default router;
