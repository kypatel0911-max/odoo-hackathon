import { query } from "../db.js";

export async function logActivity(userId, entityType, entityId, action, details = {}) {
  await query(
    `INSERT INTO activity_logs (user_id, entity_type, entity_id, action, details)
     VALUES ($1, $2, $3, $4, $5)`,
    [userId, entityType, entityId, action, JSON.stringify(details)],
  );
}

export async function notifyUser(userId, title, message, type = "info", entityType = null, entityId = null) {
  await query(
    `INSERT INTO notifications (user_id, title, message, type, entity_type, entity_id)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [userId, title, message, type, entityType, entityId],
  );
}

export async function notifyRole(role, title, message, type = "info", entityType = null, entityId = null) {
  const { rows } = await query(`SELECT id FROM users WHERE role = $1`, [role]);
  for (const u of rows) {
    await notifyUser(u.id, title, message, type, entityType, entityId);
  }
}
