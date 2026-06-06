import express from "express";
import cors from "cors";
import path from "path";
import fs from "fs";
import authRoutes from "./routes/auth.js";
import userRoutes from "./routes/users.js";
import vendorRoutes from "./routes/vendors.js";
import rfqRoutes from "./routes/rfqs.js";
import quotationRoutes from "./routes/quotations.js";
import approvalRoutes from "./routes/approvals.js";
import purchaseOrderRoutes from "./routes/purchaseOrders.js";
import invoiceRoutes from "./routes/invoices.js";
import dashboardRoutes from "./routes/dashboard.js";
import activityRoutes from "./routes/activities.js";
import notificationRoutes from "./routes/notifications.js";
import reportRoutes from "./routes/reports.js";

export function createApp() {
  const app = express();
  const clientUrl = process.env.CLIENT_URL || "http://localhost:5173";
  app.use(
    cors({
      origin: clientUrl.split(",").map((s) => s.trim()),
      credentials: true,
    }),
  );
  app.use(express.json({ limit: "2mb" }));

  const uploadDir = path.resolve(
    process.env.UPLOAD_DIR || path.join(process.cwd(), "uploads"),
  );
  if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
  app.use("/uploads", express.static(uploadDir));

  app.get("/api/health", (_req, res) => res.json({ ok: true, app: "VendorBridge" }));

  app.use("/api/auth", authRoutes);
  app.use("/api/users", userRoutes);
  app.use("/api/vendors", vendorRoutes);
  app.use("/api/rfqs", rfqRoutes);
  app.use("/api/quotations", quotationRoutes);
  app.use("/api/approvals", approvalRoutes);
  app.use("/api/purchase-orders", purchaseOrderRoutes);
  app.use("/api/invoices", invoiceRoutes);
  app.use("/api/dashboard", dashboardRoutes);
  app.use("/api/activities", activityRoutes);
  app.use("/api/notifications", notificationRoutes);
  app.use("/api/reports", reportRoutes);

  return app;
}
