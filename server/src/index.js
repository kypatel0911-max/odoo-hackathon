import "dotenv/config";
import { createServer } from "http";
import { createApp } from "./app.js";
import { connectDb } from "./db.js";
import { seedDatabase } from "./seed.js";

const PORT = Number(process.env.PORT || 4000);
const DATABASE_URL = process.env.DATABASE_URL;
const JWT_SECRET = process.env.JWT_SECRET;

if (!DATABASE_URL) {
  console.error("Missing DATABASE_URL (PostgreSQL connection string)");
  process.exit(1);
}
if (!JWT_SECRET || JWT_SECRET.length < 16) {
  console.error("JWT_SECRET must be set and at least 16 characters");
  process.exit(1);
}

await connectDb(DATABASE_URL);
await seedDatabase();

const app = createApp();
const httpServer = createServer(app);

httpServer.listen(PORT, "0.0.0.0", () => {
  console.log(`VendorBridge API http://127.0.0.1:${PORT}`);
});
