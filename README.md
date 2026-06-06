# VendorBridge — Procurement & Vendor Management ERP

Full-stack ERP for procurement workflows: **vendors**, **RFQs**, **quotations**, **approvals**, **purchase orders**, and **invoices** — with role-based access, PostgreSQL, PDF invoices, email automation, and AI vendor recommendations.

Built for the Odoo Hackathon with focus on **database design**, **modular architecture**, **input validation**, and **clean UI**.

## Project Structure

```
vendorbridge/
├── client/                 # React + Tailwind + Axios
│   └── src/
│       ├── pages/          # 18 screens (auth, dashboard, vendors, RFQs, etc.)
│       ├── components/     # Layout, UI, Charts
│       ├── services/       # Axios API client
│       └── context/        # Auth context
├── server/                 # Node.js + Express
│   └── src/
│       ├── routes/         # API modules (auth, vendors, rfqs, etc.)
│       ├── middleware/     # JWT auth + role guards
│       ├── config/         # App configuration
│       ├── utils/          # PDF, email, AI recommendation, audit
│       └── db.js           # PostgreSQL schema + queries
└── database/
    └── schema.sql          # MySQL schema (reference design)
```

## MVP Priority (Build Order)

| Priority | Module | Status |
|----------|--------|--------|
| **High** | Authentication & Role Management | ✅ |
| **High** | Vendor Management | ✅ |
| **High** | RFQ Management | ✅ |
| **High** | Quotation Management | ✅ |
| **High** | Approval Workflow | ✅ |
| **High** | Purchase Order Generation | ✅ |
| **High** | Invoice Generation (PDF + Email) | ✅ |
| **Medium** | Dashboard & Analytics | ✅ |
| **Medium** | Notifications | ✅ |
| **Medium** | Reports | ✅ |

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 18, Vite, Tailwind CSS, React Router, **Axios**, **Recharts** |
| Backend | Node.js, Express, express-validator |
| Database | **PostgreSQL** (runtime) + **MySQL schema** (`database/schema.sql`) |
| Auth | JWT + bcrypt |
| PDF | PDFKit |
| Email | Nodemailer (RFQ invites, PO alerts, invoices) |

## User Roles

| Role | Capabilities |
|------|--------------|
| **Admin** | Manage users, vendors, view analytics |
| **Procurement Officer** | Create RFQs, compare quotes, generate POs & invoices |
| **Manager** | Approve/reject procurement requests |
| **Vendor** | Submit quotations, track RFQs, view POs |

## Workflow

```
Login → Create RFQ → Assign Vendors → Vendor submits quotation
  → Compare quotations (AI recommendation) → Manager approval
  → Generate PO → Generate Invoice → Print/Email → Activity Logs & Reports
```

## Extra Features (Hackathon Differentiators)

- **AI Vendor Recommendation** — Weighted scoring on price (40%), delivery (30%), rating (30%)
- **Smart Analytics** — Monthly spend, approval trends, vendor performance charts
- **Email Automation** — RFQ invitations, PO notifications, invoice emails
- **Audit Trail** — Every action logged with user, entity, and timestamp

## Quick Start

### 1. PostgreSQL

```bash
docker compose up -d
# Or: createdb vendorbridge
```

### 2. Backend

```bash
cd server
cp .env.example .env
npm install
npm run dev
```

API: **http://127.0.0.1:4000**

### 3. Frontend

```bash
cd client
npm install
npm run dev
```

Open **http://localhost:5173**

## Demo Accounts

Password: **`Password123!`**

| Email | Role |
|-------|------|
| admin@vendorbridge.com | Admin |
| officer@vendorbridge.com | Procurement Officer |
| manager@vendorbridge.com | Manager |
| vendor@techsupply.in | Vendor |

A **sample RFQ with 3 quotations** is seeded on first run — demo compare → approve → PO → invoice immediately.

## API Modules

| Endpoint | Description |
|----------|-------------|
| `/api/auth` | Login, signup, forgot/reset password |
| `/api/vendors` | Vendor CRUD & search |
| `/api/rfqs` | RFQ lifecycle, attachments, vendor assignment |
| `/api/quotations` | Submit, compare, **AI recommendation** |
| `/api/approvals` | Approve/reject with timeline |
| `/api/purchase-orders` | Auto PO numbers, GST tax |
| `/api/invoices` | Generate, PDF download, print, email |
| `/api/dashboard` | Analytics cards |
| `/api/activities` | Audit logs |
| `/api/notifications` | Real-time alerts |
| `/api/reports` | Charts, CSV export |

## Environment Variables

```env
PORT=4000
DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:5432/vendorbridge
JWT_SECRET=your-secret-min-16-chars
CLIENT_URL=http://localhost:5173

# Optional SMTP for email automation
SMTP_HOST=
SMTP_PORT=587
SMTP_USER=
SMTP_PASS=
```

Without SMTP, emails are logged to the server console in development.
