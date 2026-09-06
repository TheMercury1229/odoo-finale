# Urban Furniture &mdash; Enterprise Double-Entry Accounting System

> A full-stack, enterprise-grade accounting and ERP platform engineered for **Urban Furniture**. Features strict double-entry ledger enforcement, comprehensive master data lifecycle management, full purchase-to-pay and order-to-cash transactional workflows, automated financial reporting (Balance Sheet, P&L, Budgets, Stock Valuation), multi-role RBAC, and a dedicated self-service customer/vendor portal with email-based onboarding.

---

## Table of Contents

1. [System Overview](#system-overview)
2. [Key Capabilities & Modules](#key-capabilities--modules)
3. [Technology Stack](#technology-stack)
4. [Role-Based Access Control (RBAC) Matrix](#role-based-access-control-rbac-matrix)
5. [Core Accounting Principles & Invariants](#core-accounting-principles--invariants)
6. [Transactional Lifecycles & State Machines](#transactional-lifecycles--state-machines)
7. [Contact Portal & Email Invitation Flow](#contact-portal--email-invitation-flow)
8. [Financial & Operational Reports](#financial--operational-reports)
9. [Project Architecture & Directory Structure](#project-architecture--directory-structure)
10. [Prerequisites & System Requirements](#prerequisites--system-requirements)
11. [Environment Configuration](#environment-configuration)
12. [Installation & Quick Start](#installation--quick-start)
13. [Default Seed Credentials](#default-seed-credentials)
14. [REST API Reference](#rest-api-reference)
15. [Testing & Build Validation](#testing--build-validation)

---

## System Overview

Urban Furniture Accounting is built to fulfill the financial, operational, and reporting requirements of a modern manufacturing and retail enterprise. Built from the ground up to prevent data drift and accounting discrepancies:

- **Mathematical Integrity**: Enforces double-entry ledger invariants (`Sum(Debits) == Sum(Credits)`) on every automated and manual transaction before persistence.
- **Master Data Lifecycle**: Centralized governance for Contacts, Products, Chart of Accounts, Journals, Analytic Accounts, and Budgets with soft-archiving and audit tracking.
- **Commercial Lifecycles**: Seamless conversions from Purchase Orders to Vendor Bills and Sales Orders to Customer Invoices, with integrated payment reconciliations.
- **Financial Intelligence**: Real-time generation of Balance Sheets, Profit & Loss statements, Budget vs. Actual variance reports, and FIFO/Average Inventory Stock valuations.
- **Client & Vendor Collaboration**: Secure self-service portal empowering customers and vendors to inspect their bills/invoices and submit payments directly.

---

## Key Capabilities & Modules

### 1. Master Data Management
- **Contacts**: Supports `Customer`, `Vendor`, and `Both (Customer & Vendor)`. Includes profile avatar upload (via UploadThing), full postal addresses, soft archiving with instant portal access revocation, and an interactive **"Invite to Portal"** toggle.
- **Products**: Classifications for `Goods` (storable, tracked inventory), `Services` (non-stock, consulting/labor), and `Combos`. Supports sales price, cost price, categories, and inventory movement logs.
- **Chart of Accounts (COA)**: Hierarchical account classification across `Asset`, `Liability`, `Capital` (Equity), `Income`, and `Expense`.
- **Journals**: Dedicated books of original entry for `Sales`, `Purchase`, `Bank`, `Cash`, and `General Operations`, mapped to default GL clearing accounts.
- **Analytic Accounts**: Multi-dimensional cost centers and profit centers (e.g., Project Alpha, Retail Division, Warehouse Operations) for operational expenditure tracking.
- **Budgets**: Financial planning periods with versioning and revision history (Draft &rarr; Confirmed &rarr; Revised &rarr; Cancelled) and variance tracking against real ledger postings.

### 2. Purchase-to-Pay (P2P) Flow
1. **Purchase Order**: Create multi-line procurement orders with real-time tax and subtotal calculations.
2. **Confirmation**: Locks the PO into a read-only confirmed state.
3. **Vendor Bill Generation**: One-click generation of a draft Vendor Bill pre-populated with confirmed lines, quantities, and prices.
4. **Bill Confirmation & Ledger Posting**: Automatically posts double-entry journal lines (Debit Expense/Inventory, Credit Creditors/Accounts Payable).
5. **Payment Registration**: Register full or partial cash/bank payments, creating balanced journal entries and advancing status from `Unpaid` to `Partially Paid` or `Paid`.

### 3. Order-to-Cash (O2C) Flow
1. **Sales Order**: Quotations and sales orders referencing customer records, storable products, and custom pricing.
2. **Order Confirmation**: Locks order specifications and reserves inventory.
3. **Customer Invoice Generation**: Generates official tax invoices from confirmed SO lines.
4. **Invoice Confirmation & Ledger Posting**: Automatically posts double-entry lines (Debit Debtors/Accounts Receivable, Credit Sales Revenue).
5. **Payment Collection**: Record customer receipts via Bank or Cash, reconciling receivables in real-time.

### 4. Self-Service Contact Portal
- Dedicated portal views at `/portal/invoices` and `/portal/bills`.
- Strict multi-tenant isolation: contacts can **only** query and view their own financial documents.
- Online payment submission against outstanding invoices and bills.
- Integrated onboarding: uninvited contacts receive an email invitation containing a secure token, onboard via `/accept-invite`, set their credentials, and are automatically linked to their master data record.

---

## Technology Stack

| Layer | Technologies | Description |
| :--- | :--- | :--- |
| **Frontend Framework** | Next.js 16 (App Router), React 19, TypeScript | Server Components, Client Hooks, Turbopack, Fast Refresh |
| **UI & Styling** | Tailwind CSS, shadcn/ui, Base UI, Lucide Icons | Responsive modern layout, accessible components, dark/light theme |
| **State & Data Fetching** | TanStack React Query v5, React Hook Form, Zod | Optimistic updates, automatic cache invalidation, client-side validation |
| **Backend Runtime** | Node.js (v20+), Express.js (ESM) | REST API, modular router architecture, centralized error handling |
| **Authentication & RBAC** | Better Auth (`organization` & `admin` plugins) | Session cookies, organization memberships, granular role access control |
| **Database & ORM** | PostgreSQL (Neon compatible), Drizzle ORM | Type-safe schema definitions, relational joins, automated migrations |
| **Email Delivery** | Resend API + Terminal Fallback Logger | HTML invite dispatching with automated local console link fallback |
| **File Storage** | UploadThing | Secure asset and avatar image uploads |

---

## Role-Based Access Control (RBAC) Matrix

The system defines three core organization roles using Better Auth access control:

| Capability / Area | Admin (Owner) | Accountant (Invoicing User) | Contact (Customer / Vendor) |
| :--- | :---: | :---: | :---: |
| **User & Staff Management** | Full Control | No Access | No Access |
| **Master Data (Create / Edit)** | Yes | Yes | No Access |
| **Master Data (Soft Archive)** | Yes | No Access | No Access |
| **Purchase & Sales Orders** | Full Control | Full Control | No Access |
| **Vendor Bills & Customer Invoices** | Full Control | Full Control | View Own Only |
| **Payment Registration** | Full Control | Full Control | Pay Own Invoices/Bills |
| **Manual Journal Entries** | Full Control | Full Control | No Access |
| **Budgets & Analytic Accounts** | Full Control | Full Control | No Access |
| **Financial Reports (Balance Sheet, P&L)** | Full Access | Full Access | No Access |
| **Portal Access (`/portal/*`)** | Re-routed to Admin | Re-routed to Dashboard | Full Access (Scoped) |
| **Dispatch Portal Invitations** | Yes | Yes | No Access |

---

## Core Accounting Principles & Invariants

Urban Furniture Accounting enforces enterprise GAAP double-entry rules:

### 1. Zero-Variance Balance Invariant
Every transaction that affects the General Ledger passes through the centralized `postJournalEntry` service. Before writing to PostgreSQL, the engine validates:
$$\sum \text{Debits} - \sum \text{Credits} = 0.00$$
If the difference between total debits and credits exceeds `0.01` (due to rounding or invalid inputs), the transaction is aborted with a strict database rollback.

### 2. Standard Transaction Postings

#### Vendor Bill Confirmation:
- **Debit**: Expense Account (or Inventory Clearing)
- **Credit**: Accounts Payable (`coa_creditors`)

#### Vendor Bill Payment:
- **Debit**: Accounts Payable (`coa_creditors`)
- **Credit**: Bank Account (`coa_bank`) or Cash (`coa_cash`)

#### Customer Invoice Confirmation:
- **Debit**: Accounts Receivable (`coa_debtors`)
- **Credit**: Sales Revenue Account (`coa_sales`)

#### Customer Invoice Payment:
- **Debit**: Bank Account (`coa_bank`) or Cash (`coa_cash`)
- **Credit**: Accounts Receivable (`coa_debtors`)

### 3. Balance Sheet Identity
The Balance Sheet calculation guarantees mathematical balance at all times:
$$\text{Total Assets} = \text{Total Liabilities} + \text{Total Capital} + \text{Net Profit / (Loss)}$$
Net Profit or Loss is derived dynamically from all income and expense lines in the general ledger and automatically injected into Equity/Capital reserves.

---

## Transactional Lifecycles & State Machines

All commercial records (Purchase Orders, Sales Orders, Vendor Bills, Customer Invoices, Budgets) adhere to strict state machines with stage-gated action buttons:

```mermaid
stateDiagram-v2
    [*] --> Draft : Create Record
    Draft --> Confirmed : Confirm
    Draft --> Cancelled : Cancel
    Confirmed --> Invoiced : Generate Bill / Invoice
    Confirmed --> Cancelled : Cancel (Prior to Payment)
    Invoiced --> PartiallyPaid : Partial Payment
    PartiallyPaid --> Paid : Full Payment
    Invoiced --> Paid : Full Payment
    Confirmed --> Revised : Revise (Budgets Only)
    Revised --> Confirmed : Confirm Revision
    Cancelled --> [*]
    Paid --> [*]
```

### Action Button Rules:
- **Fresh Unsaved Record**: Displays only `Save`, `Create`, and `Back`. Destructive actions (`Confirm`, `Cancel`, `Revise`) are hidden until persisted.
- **Draft State**: Displays `Save Changes`, `Confirm`, and `Cancel`.
- **Confirmed State**: Read-only form protection. Displays action triggers (e.g. `Create Bill`, `Register Payment`, `Revise`) and `Cancel`. Direct field tampering is prevented.
- **Paid / Cancelled State**: Fully locked against further modifications.

---

## Contact Portal & Email Invitation Flow

Urban Furniture implements an onboarding experience for external customers and vendors:

```mermaid
sequenceDiagram
    autonumber
    actor Admin as Admin / Accountant
    participant API as Express API
    participant BA as Better Auth
    participant Mail as Resend / Terminal
    actor Contact as Customer / Vendor
    participant Web as Next.js Client

    Admin->>API: Create Contact (Switch "Invite to Portal" ON)
    API->>BA: createInvitation({ email, role: 'contact' })
    BA->>Mail: sendInvitationEmail(inviteLink)
    Mail-->>Contact: Receive invitation with secure link
    Contact->>Web: Open /accept-invite?id={invitationId}
    Web->>API: GET /api/contacts/public-invitation?id={id}
    API-->>Web: Return company name, inviter, and email
    Contact->>Web: Enter Password & Submit
    Web->>BA: signUp.email({ email, password })
    Web->>BA: organization.acceptInvitation({ invitationId })
    Web->>API: POST /api/contacts/link-user
    API-->>Web: Link user.id to contact.userId
    Web-->>Contact: Redirect to /portal/invoices
```

### Key Onboarding Features:
1. **Toggleable Invite Switch**: Contact Master data can be saved with or without portal access. Enabling the switch displays the email field and triggers the invite.
2. **Public Invitation Endpoint**: Unauthenticated invitees can load invitation metadata via `GET /api/contacts/public-invitation?id=...` without getting blocked by session guards.
3. **Resend & Console Fallback**: If `RESEND_API_KEY` is not provided in development, the full invitation URL is printed in the server console with a clean ASCII banner.
4. **Table Actions**: The Contacts table displays live portal badges (`Active`, `Invite Pending`, `Not Invited`) and provides an inline **"Resend"** button.

---

## Financial & Operational Reports

Navigate to `/reports` in the dashboard to access four analytics engines:

1. **Balance Sheet**:
   - Compares Assets vs. Liabilities & Capital.
   - Categorizes current assets (Bank, Cash, Debtors), fixed assets, payables (Creditors), and equity.
   - Integrates unallocated Net Profit/Loss directly into Capital.
2. **Profit & Loss (P&L)**:
   - Tracks Operating Revenue, Cost of Goods Sold (COGS), Gross Profit, Operating Expenses, and Net Margin.
   - Filterable by custom date ranges.
3. **Budget Performance**:
   - Compares budgeted amounts against practical general ledger actuals.
   - Displays variance in absolute currency (₹) and percentage completion.
4. **Stock Valuation & Inventory**:
   - Computes stock on hand, incoming quantities from POs, outgoing quantities from SOs, unit valuation, and total inventory asset value.

---

## Project Architecture & Directory Structure

```text
odoo-finale/
├── client/                              # Next.js 16 Frontend
│   ├── src/
│   │   ├── app/                         # App Router pages and layouts
│   │   │   ├── (auth)/                  # Sign-in, sign-up, forgot-password
│   │   │   ├── (dashboard)/             # Master data, transactions, reports
│   │   │   ├── accept-invite/           # Public invitation onboarding page
│   │   │   ├── portal/                  # Contact self-service portal
│   │   │   └── profile/                 # Universal user profile page
│   │   ├── components/
│   │   │   ├── dashboard/               # Contacts, PO, SO, Bills, Reports UI
│   │   │   ├── portal/                  # Portal navigation, invoice viewer
│   │   │   ├── primitives/              # Reusable data tables, headers, badges
│   │   │   └── ui/                      # shadcn/ui & Base UI component library
│   │   ├── lib/
│   │   │   ├── auth.ts                  # Better Auth React client configuration
│   │   │   ├── axios.ts                 # Configured Axios instance with credentials
│   │   │   ├── permissions.ts           # Client-side access control matrix
│   │   │   └── use-user-permissions.ts  # Role authorization hook
│   │   └── proxy.ts                     # Route middleware & session protection
│   └── package.json
│
├── server/                              # Express.js & Drizzle Backend
│   ├── src/
│   │   ├── config/
│   │   │   ├── db.js                    # PostgreSQL connection pool
│   │   │   └── env.js                   # Zod-validated environment variables
│   │   ├── controllers/                 # REST controllers (Contacts, PO, SO, Reports)
│   │   ├── db/
│   │   │   ├── auth-schema.js           # Better Auth tables (user, session, invitation)
│   │   │   ├── domain-schema.js         # Accounting tables (contact, invoice, ledger)
│   │   │   └── schema.js                # Unified schema re-export
│   │   ├── lib/
│   │   │   ├── auth.js                  # Better Auth server configuration
│   │   │   ├── email.js                 # Resend client + console fallback
│   │   │   └── permissions.js           # Server-side organization access rules
│   │   ├── middleware/                  # Organization scoping & Zod validation
│   │   ├── routes/                      # Express route mounts
│   │   ├── scripts/
│   │   │   └── seed-db.js               # Idempotent realistic enterprise database seeder
│   │   ├── services/
│   │   │   └── journal.js               # Double-entry ledger invariant engine
│   │   └── validators/                  # Zod validation schemas for request bodies
│   └── package.json
│
└── README.md
```

---

## Prerequisites & System Requirements

- **Node.js**: `v20.0.0` or higher
- **Package Manager**: `pnpm` (`v9.0.0` or `v11.x`)
- **Database**: PostgreSQL database instance (`v14` or higher, or Neon serverless PostgreSQL)

---

## Environment Configuration

### 1. Server Configuration (`server/.env`)

Create `server/.env` with the following variables:

```env
# Server Port & CORS Client Origin
PORT=5000
CLIENT_URL=http://localhost:3000

# PostgreSQL Connection String (Neon or Local Postgres)
DATABASE_URL=postgresql://user:password@ep-sample-pool.region.neon.tech/neondb?sslmode=require

# Better Auth Configuration
BETTER_AUTH_SECRET=generate-a-32-character-random-secret-key-here
BETTER_AUTH_URL=http://localhost:5000

# Optional: Resend API Key for Live Email Delivery
# (If left blank, invitations are logged to the terminal console)
RESEND_API_KEY=re_your_resend_api_key_here
EMAIL_FROM=Urban Furniture <onboarding@resend.dev>
```

### 2. Client Configuration (`client/.env`)

Create `client/.env` with the following variables:

```env
# Backend Base URL (Points to Express server)
NEXT_PUBLIC_API_URL=http://localhost:5000
BETTER_AUTH_URL=http://localhost:5000

# Optional: UploadThing for Profile Avatars
UPLOADTHING_TOKEN=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
UPLOADTHING_IS_DEV=true
```

---

## Installation & Quick Start

### 1. Clone & Install Dependencies

```bash
# Clone the repository
git clone https://github.com/your-username/odoo-finale.git
cd odoo-finale

# Install server dependencies
cd server
pnpm install

# Install client dependencies
cd ../client
pnpm install
```

### 2. Push Database Schema

From the `server` directory, push the Drizzle schema to your PostgreSQL database:

```bash
cd ../server
pnpm db:push
```

### 3. Seed Master Data & Transactions

Populate Urban Furniture's organization, Chart of Accounts, standard journals, products, contacts, and transactions:

```bash
pnpm seed
```

### 4. Start Development Servers

Run the backend and frontend in separate terminals:

**Terminal 1 (Backend API):**
```bash
cd server
pnpm dev
# Running on http://localhost:5000
```

**Terminal 2 (Frontend Client):**
```bash
cd client
pnpm dev
# Running on http://localhost:3000
```

Visit **[http://localhost:3000](http://localhost:3000)** in your browser.

---

## Default Seed Credentials

All seeded test users share the uniform password: `12345678`

| Persona / Role | Email Address | Password | Description |
| :--- | :--- | :---: | :--- |
| **Business Owner / Admin** | `admin@urbanfurniture.com` | `12345678` | Complete system control, user management, archives, reports |
| **Invoicing Accountant** | `accountant@urbanfurniture.com` | `12345678` | Master data creation, commercial orders, bill/invoice posting |
| **Vendor Contact (Portal)** | `azure.furniture.india@gmail.com` | `12345678` | Vendor portal access to inspect vendor bills and payments |
| **Customer Contact (Portal)**| `nimesh.pathak.arch@gmail.com` | `12345678` | Customer portal access to view customer invoices and pay |

---

## REST API Reference

All domain endpoints are prefixed with `/api` and require an authenticated organization session (except public invitation routes):

### Contacts & Portal Access
- `GET /api/contacts` &mdash; List contacts with filters (search, view, includeArchived, portalStatus).
- `POST /api/contacts` &mdash; Create contact (optional portal invite).
- `GET /api/contacts/:id` &mdash; Retrieve single contact with portal details.
- `PATCH /api/contacts/:id` &mdash; Update contact information.
- `POST /api/contacts/:id/invite` &mdash; Dispatch or resend portal invitation email.
- `PATCH /api/contacts/:id/archive` &mdash; Soft-archive contact and ban linked portal user.
- `PATCH /api/contacts/:id/unarchive` &mdash; Restore contact and unban portal user.
- `GET /api/contacts/public-invitation?id={id}` &mdash; **Public**: Lookup invitation metadata.
- `POST /api/contacts/link-user` &mdash; Link authenticated user session to contact record.

### Procurement (P2P)
- `GET /api/purchase-orders` &mdash; List purchase orders.
- `POST /api/purchase-orders` &mdash; Create purchase order.
- `POST /api/purchase-orders/:id/confirm` &mdash; Lock and confirm purchase order.
- `POST /api/vendor-bills` &mdash; Create vendor bill from purchase order.
- `POST /api/vendor-bills/:id/confirm` &mdash; Confirm bill & post balanced journal entry.

### Sales & Distribution (O2C)
- `GET /api/sales-orders` &mdash; List sales orders.
- `POST /api/sales-orders` &mdash; Create sales order.
- `POST /api/sales-orders/:id/confirm` &mdash; Confirm sales order.
- `POST /api/customer-invoices` &mdash; Create customer invoice from sales order.
- `POST /api/customer-invoices/:id/confirm` &mdash; Confirm invoice & post balanced journal entry.

### Payments & General Ledger
- `POST /api/payments` &mdash; Record payment against invoice/bill with double-entry posting.
- `GET /api/journal-entries` &mdash; Audit trail of all double-entry ledger lines.
- `POST /api/journal-entries` &mdash; Create manual journal entry with balance enforcement.

### Financial Reports
- `GET /api/reports/balance-sheet` &mdash; Generates mathematically balanced balance sheet.
- `GET /api/reports/profit-loss` &mdash; Generates P&L income statement with gross/net margins.
- `GET /api/reports/budget` &mdash; Budgeted vs. actual variance analysis.
- `GET /api/reports/stock` &mdash; Inventory quantities and stock valuation.

---

## Testing & Build Validation

### Running Backend Unit & Service Tests
From the `server` directory:
```bash
pnpm test
```
The test suite utilizes Node's native test runner to validate ledger invariants, account scoping, and controller responses.

### Building Frontend for Production
From the `client` directory:
```bash
pnpm build
pnpm start
```
Validates TypeScript compilation, App Router page generation, and bundle optimization.

---

## License

This project was developed for the **Urban Furniture: Accounting System** hackathon problem statement. Distributed under the MIT License.
