import { Router } from "express";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { body, validationResult } from "express-validator";
import { query } from "../db.js";
import { signToken } from "../utils/token.js";
import { authRequired } from "../middleware/auth.js";
import { logActivity } from "../utils/activity.js";

const router = Router();
const ROLES = ["admin", "procurement_officer", "manager", "vendor"];

function userPayload(u) {
  return {
    id: u.id,
    email: u.email,
    name: u.name,
    role: u.role,
    vendorId: u.vendor_id,
    createdAt: u.created_at,
  };
}

const registerRules = [
  body("email").isEmail().withMessage("Invalid email address").normalizeEmail(),
  body("password").isLength({ min: 8, max: 128 }).withMessage("Password must be at least 8 characters"),
  body("name").trim().isLength({ min: 1, max: 128 }).withMessage("Name is required"),
  body("role").optional().isIn(ROLES),
];

router.post("/register", registerRules, async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ error: errors.array()[0].msg });
  }
  const { email, password, name } = req.body;
  const role = req.body.role && ROLES.includes(req.body.role) ? req.body.role : "procurement_officer";
  if (role === "admin") {
    return res.status(400).json({ error: "Cannot self-register as admin" });
  }
  try {
    const exists = await query(`SELECT id FROM users WHERE email = $1`, [email]);
    if (exists.rows[0]) {
      return res.status(409).json({ error: "Email already registered" });
    }
    const passwordHash = await bcrypt.hash(password, 12);
    const { rows } = await query(
      `INSERT INTO users (email, password_hash, name, role) VALUES ($1, $2, $3, $4)
       RETURNING id, email, name, role, vendor_id, created_at`,
      [email, passwordHash, name.trim(), role],
    );
    const user = rows[0];
    await logActivity(user.id, "user", user.id, "registered", { email });
    const token = signToken(user.id);
    return res.status(201).json({ token, user: userPayload(user) });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "Registration failed" });
  }
});

router.post(
  "/login",
  [
    body("email").isEmail().withMessage("Invalid email address").normalizeEmail(),
    body("password").isLength({ min: 1, max: 128 }),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: errors.array()[0].msg });
    }
    const { email, password } = req.body;
    const { rows } = await query(
      `SELECT id, email, password_hash, name, role, vendor_id, created_at FROM users WHERE email = $1`,
      [email],
    );
    const user = rows[0];
    if (!user) return res.status(401).json({ error: "Invalid email or password" });
    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok) return res.status(401).json({ error: "Invalid email or password" });
    await logActivity(user.id, "user", user.id, "logged_in");
    const token = signToken(user.id);
    return res.json({ token, user: userPayload(user) });
  },
);

router.get("/me", authRequired, (req, res) => {
  return res.json({ user: userPayload(req.user) });
});

router.post(
  "/forgot-password",
  [body("email").isEmail().withMessage("Invalid email address").normalizeEmail()],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: errors.array()[0].msg });
    }
    const { email } = req.body;
    const { rows } = await query(`SELECT id FROM users WHERE email = $1`, [email]);
    if (rows[0]) {
      const token = crypto.randomBytes(32).toString("hex");
      const expires = new Date(Date.now() + 3600000);
      await query(
        `UPDATE users SET reset_token = $1, reset_token_expires = $2 WHERE id = $3`,
        [token, expires, rows[0].id],
      );
      if (process.env.NODE_ENV !== "production") {
        console.log(`[Reset token for ${email}]: ${token}`);
      }
    }
    return res.json({ message: "If that email exists, reset instructions were sent." });
  },
);

router.post(
  "/reset-password",
  [
    body("token").isLength({ min: 32, max: 64 }),
    body("password").isLength({ min: 8, max: 128 }).withMessage("Password must be at least 8 characters"),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: errors.array()[0].msg });
    }
    const { token, password } = req.body;
    const { rows } = await query(
      `SELECT id FROM users WHERE reset_token = $1 AND reset_token_expires > NOW()`,
      [token],
    );
    if (!rows[0]) return res.status(400).json({ error: "Invalid or expired reset token" });
    const passwordHash = await bcrypt.hash(password, 12);
    await query(
      `UPDATE users SET password_hash = $1, reset_token = NULL, reset_token_expires = NULL WHERE id = $2`,
      [passwordHash, rows[0].id],
    );
    return res.json({ message: "Password updated successfully" });
  },
);

export default router;
