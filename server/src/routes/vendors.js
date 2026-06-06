import { Router } from "express";
import { body, validationResult } from "express-validator";
import { authRequired, requireRoles } from "../middleware/auth.js";
import { query } from "../db.js";
import { logActivity } from "../utils/activity.js";

const router = Router();

router.get("/", authRequired, async (req, res) => {
  const { search, category, status } = req.query;
  let sql = `SELECT v.*, u.name AS created_by_name FROM vendors v LEFT JOIN users u ON u.id = v.created_by WHERE 1=1`;
  const params = [];
  if (search) {
    params.push(`%${search}%`);
    sql += ` AND (v.name ILIKE $${params.length} OR v.email ILIKE $${params.length} OR v.gst_number ILIKE $${params.length})`;
  }
  if (category) {
    params.push(category);
    sql += ` AND v.category = $${params.length}`;
  }
  if (status) {
    params.push(status);
    sql += ` AND v.status = $${params.length}`;
  }
  sql += ` ORDER BY v.name ASC`;
  const { rows } = await query(sql, params);
  return res.json({ vendors: rows });
});

router.get("/categories", authRequired, async (_req, res) => {
  const { rows } = await query(`SELECT DISTINCT category FROM vendors ORDER BY category`);
  return res.json({ categories: rows.map((r) => r.category) });
});

router.get("/:id", authRequired, async (req, res) => {
  const { rows } = await query(`SELECT * FROM vendors WHERE id = $1`, [req.params.id]);
  if (!rows[0]) return res.status(404).json({ error: "Vendor not found" });
  return res.json({ vendor: rows[0] });
});

router.post(
  "/",
  authRequired,
  requireRoles("admin", "procurement_officer"),
  [
    body("name").trim().isLength({ min: 1, max: 200 }),
    body("email").isEmail().withMessage("Invalid email address"),
    body("category").optional().trim().isLength({ max: 100 }),
    body("gstNumber").optional().trim().isLength({ max: 20 }),
    body("phone").optional().trim().isLength({ max: 20 }),
    body("address").optional().trim(),
    body("contactPerson").optional().trim().isLength({ max: 128 }),
    body("status").optional().isIn(["active", "inactive", "pending"]),
    body("rating").optional().isFloat({ min: 0, max: 5 }),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ error: errors.array()[0].msg });
    const { name, email, category, gstNumber, phone, address, contactPerson, status, rating } = req.body;
    const { rows } = await query(
      `INSERT INTO vendors (name, category, gst_number, email, phone, address, contact_person, status, rating, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *`,
      [
        name.trim(),
        category || "General",
        gstNumber || "",
        email,
        phone || "",
        address || "",
        contactPerson || "",
        status || "active",
        rating ?? 0,
        req.userId,
      ],
    );
    await logActivity(req.userId, "vendor", rows[0].id, "created", { name });
    return res.status(201).json({ vendor: rows[0] });
  },
);

router.patch(
  "/:id",
  authRequired,
  requireRoles("admin", "procurement_officer"),
  async (req, res) => {
    const fields = ["name", "category", "gst_number", "email", "phone", "address", "contact_person", "status", "rating"];
    const map = { gstNumber: "gst_number", contactPerson: "contact_person" };
    const sets = [];
    const params = [];
    for (const [k, v] of Object.entries(req.body)) {
      const col = map[k] || k;
      if (fields.includes(col) && v !== undefined) {
        params.push(v);
        sets.push(`${col} = $${params.length}`);
      }
    }
    if (!sets.length) return res.status(400).json({ error: "No fields to update" });
    params.push(req.params.id);
    const { rows } = await query(
      `UPDATE vendors SET ${sets.join(", ")} WHERE id = $${params.length} RETURNING *`,
      params,
    );
    if (!rows[0]) return res.status(404).json({ error: "Vendor not found" });
    await logActivity(req.userId, "vendor", rows[0].id, "updated");
    return res.json({ vendor: rows[0] });
  },
);

export default router;
