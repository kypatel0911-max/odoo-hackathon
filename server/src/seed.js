import bcrypt from "bcryptjs";
import { query } from "./db.js";

export async function seedDatabase() {
  const { rows } = await query(`SELECT COUNT(*)::int AS c FROM users`);
  if (rows[0].c > 0) return;

  const hash = await bcrypt.hash("Password123!", 12);

  const users = [
    { email: "admin@vendorbridge.com", name: "System Admin", role: "admin" },
    { email: "officer@vendorbridge.com", name: "Priya Sharma", role: "procurement_officer" },
    { email: "manager@vendorbridge.com", name: "Raj Mehta", role: "manager" },
  ];

  for (const u of users) {
    await query(
      `INSERT INTO users (email, password_hash, name, role) VALUES ($1, $2, $3, $4)`,
      [u.email, hash, u.name, u.role],
    );
  }

  const vendorRows = [
    {
      name: "TechSupply India Pvt Ltd",
      category: "IT Equipment",
      gst: "27AABCT1234F1Z5",
      email: "sales@techsupply.in",
      phone: "+91 9876543210",
      contact: "Amit Kumar",
      rating: 4.5,
    },
    {
      name: "OfficeMart Solutions",
      category: "Office Supplies",
      gst: "29AABCO5678G1Z3",
      email: "orders@officemart.com",
      phone: "+91 9876543211",
      contact: "Sneha Patel",
      rating: 4.2,
    },
    {
      name: "BuildPro Materials",
      category: "Construction",
      gst: "24AABCB9012H1Z7",
      email: "info@buildpro.in",
      phone: "+91 9876543212",
      contact: "Vikram Singh",
      rating: 3.8,
    },
  ];

  const vendorIds = [];
  for (const v of vendorRows) {
    const { rows: vr } = await query(
      `INSERT INTO vendors (name, category, gst_number, email, phone, contact_person, status, rating, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, 'active', $7, 1) RETURNING id`,
      [v.name, v.category, v.gst, v.email, v.phone, v.contact, v.rating],
    );
    vendorIds.push(vr[0].id);
  }

  await query(
    `INSERT INTO users (email, password_hash, name, role, vendor_id) VALUES ($1, $2, $3, 'vendor', $4)`,
    ["vendor@techsupply.in", hash, "Amit Kumar (Vendor)", vendorIds[0]],
  );

  await query(
    `INSERT INTO users (email, password_hash, name, role, vendor_id) VALUES ($1, $2, $3, 'vendor', $4)`,
    ["vendor@officemart.com", hash, "Sneha Patel (Vendor)", vendorIds[1]],
  );

  const deadline = new Date();
  deadline.setDate(deadline.getDate() + 14);

  const { rows: rfqRows } = await query(
    `INSERT INTO rfqs (title, description, deadline, status, created_by)
     VALUES ($1, $2, $3, 'published', 2) RETURNING id`,
    [
      "Office Laptops & Monitors Q2",
      "Procurement of Dell laptops and 24-inch monitors for the Bangalore office expansion.",
      deadline.toISOString().slice(0, 10),
    ],
  );
  const rfqId = rfqRows[0].id;

  const { rows: itemRows } = await query(
    `INSERT INTO rfq_items (rfq_id, product_name, description, quantity, unit) VALUES
     ($1, 'Dell Latitude Laptop', '16GB RAM, 512GB SSD', 10, 'units'),
     ($1, '24-inch LED Monitor', 'Full HD, adjustable stand', 20, 'units')
     RETURNING id`,
    [rfqId],
  );

  for (const vid of vendorIds) {
    await query(`INSERT INTO rfq_vendors (rfq_id, vendor_id) VALUES ($1, $2)`, [rfqId, vid]);
  }

  const quotes = [
    { vendorId: vendorIds[0], total: 920000, delivery: 10, notes: "Includes 3-year warranty and onsite support." },
    { vendorId: vendorIds[1], total: 875000, delivery: 7, notes: "Fastest delivery with bulk discount applied." },
    { vendorId: vendorIds[2], total: 810000, delivery: 14, notes: "Lowest price; standard manufacturer warranty." },
  ];

  for (const q of quotes) {
    const unitPrice = Math.round(q.total / 30);
    const { rows: qRows } = await query(
      `INSERT INTO quotations (rfq_id, vendor_id, unit_price, total_price, delivery_days, notes, status)
       VALUES ($1, $2, $3, $4, $5, $6, 'submitted') RETURNING id`,
      [rfqId, q.vendorId, unitPrice, q.total, q.delivery, q.notes],
    );
    for (const item of itemRows) {
      const lineTotal = Math.round((q.total / 30) * Number(item.quantity));
      await query(
        `INSERT INTO quotation_items (quotation_id, rfq_item_id, unit_price, total_price)
         VALUES ($1, $2, $3, $4)`,
        [qRows[0].id, item.id, Math.round(lineTotal / Number(item.quantity)), lineTotal],
      );
    }
  }

  const { rows: bestQuote } = await query(
    `SELECT id FROM quotations WHERE rfq_id = $1 ORDER BY total_price ASC LIMIT 1`,
    [rfqId],
  );

  await query(`UPDATE quotations SET status = 'selected' WHERE id = $1`, [bestQuote[0].id]);
  await query(
    `UPDATE quotations SET status = 'rejected' WHERE rfq_id = $1 AND id != $2`,
    [rfqId, bestQuote[0].id],
  );

  const { rows: approvalRows } = await query(
    `INSERT INTO approvals (rfq_id, quotation_id, status) VALUES ($1, $2, 'pending') RETURNING id`,
    [rfqId, bestQuote[0].id],
  );

  await query(
    `INSERT INTO approval_timeline (approval_id, action, remarks, actor_id) VALUES ($1, 'submitted', 'Lowest price selected for approval', 2)`,
    [approvalRows[0].id],
  );

  await query(
    `UPDATE rfqs SET status = 'pending_approval', selected_quotation_id = $1 WHERE id = $2`,
    [bestQuote[0].id, rfqId],
  );

  await query(
    `INSERT INTO notifications (user_id, title, message, type, entity_type, entity_id)
     VALUES (3, 'Approval Required', 'RFQ "Office Laptops & Monitors Q2" needs your approval', 'approval', 'approval', $1)`,
    [approvalRows[0].id],
  );

  console.log("Seed data created. Demo accounts use password: Password123!");
}
