# Urban Furniture Accounting

Urban Furniture is a full-stack accounting system for managing contacts, products, accounting masters, purchases, sales, payments, budgets, and financial reports.

The application is organized as two packages:

- `client`: Next.js 16 frontend with React, TypeScript, shadcn/ui, Tailwind CSS, and React Query.
- `server`: Express API with Better Auth, Drizzle ORM, PostgreSQL, and Zod validation.

## Features

### Master data

- Contacts: customers, vendors, and combined contacts
- Products: goods, services, and combos
- Chart of Accounts
- Journals
- Analytic Accounts
- Budgets

### Transactions

- Purchase Orders
- Vendor Bills generated from confirmed Purchase Orders
- Sales Orders
- Customer Invoices generated from confirmed Sales Orders
- Cash and bank payments
- Manual Journal Entries with balanced debit and credit lines

### Reports

- Balance Sheet
- Profit and Loss
- Budget Performance
- Stock and Inventory valuation

### Access roles

- **Admin**: manages users, master data, transactions, archives, and reports.
- **Accountant**: creates master data, records transactions, and views reports.
- **Contact**: accesses their own portal invoices and bills and records payments.

## Requirements

- Node.js 20 or newer
- pnpm 11
- PostgreSQL database

The repository does not have a root package manifest. Install dependencies separately in `client` and `server`.

## Configuration

### Server environment

Create `server/.env`:

```env
PORT=5000
CLIENT_URL=http://localhost:3000
DATABASE_URL=postgresql://USER:PASSWORD@HOST:5432/DATABASE
BETTER_AUTH_SECRET=replace-with-a-long-random-secret
BETTER_AUTH_URL=http://localhost:5000
```

`DATABASE_URL` must point to a PostgreSQL database. Do not commit credentials or production secrets.

### Client environment

Create `client/.env`:

```env
NEXT_PUBLIC_API_URL=http://localhost:5000
BETTER_AUTH_URL=http://localhost:5000
```

UploadThing variables are required only when using profile-image uploads:

```env
UPLOADTHING_TOKEN=replace-with-your-uploadthing-token
UPLOADTHING_IS_DEV=true
```

## Installation

```bash
cd server
pnpm install

cd ../client
pnpm install
```

## Database setup

From the `server` directory, push the Drizzle schema to PostgreSQL:

```bash
pnpm db:push
```

Seed the Urban Furniture organization, admin account, standard accounts, and journals:

```bash
pnpm seed
```

The seed script is idempotent for the standard organization records. The default seed credentials are defined by `SEED_ADMIN_EMAIL` and `SEED_ADMIN_PASSWORD` when provided by the environment; otherwise the script uses its built-in development defaults.

## Run locally

Start the API in one terminal:

```bash
cd server
pnpm dev
```

Start the frontend in another terminal:

```bash
cd client
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000). The API runs at [http://localhost:5000](http://localhost:5000).

For a production-style frontend run:

```bash
cd client
pnpm build
pnpm start
```

## Testing and validation

Run the server tests:

```bash
cd server
pnpm test
```

Build the client:

```bash
cd client
pnpm build
```

The server tests use Node's built-in test runner. Database-backed tests require a reachable PostgreSQL database containing the seeded Urban Furniture records.

## Project layout

```text
.
├── client/
│   ├── src/app/                 Next.js routes and layouts
│   ├── src/components/         Dashboard, portal, auth, and UI components
│   ├── src/components/primitives/ Shared page/table/status primitives
│   └── src/lib/                Auth, API, permissions, formatting, and utilities
├── server/
│   ├── src/controllers/        Request handlers and report calculations
│   ├── src/db/                 Auth and domain schemas
│   ├── src/middleware/          Auth, organization, portal, and validation middleware
│   ├── src/routes/              Express route definitions
│   ├── src/services/            Accounting and journal-posting services
│   ├── src/validators/          Zod request schemas
│   └── src/scripts/             Database seed scripts
└── README.md
```

## Accounting flow

1. Create contacts, products, accounts, journals, analytic accounts, and budgets.
2. Create and confirm a Purchase Order.
3. Generate a Vendor Bill from the confirmed Purchase Order.
4. Register a cash or bank payment against the bill.
5. Create and confirm a Sales Order.
6. Generate a Customer Invoice from the confirmed Sales Order.
7. Register a cash or bank payment against the invoice.
8. Review journal entries and financial, budget, and stock reports.

Transactions are organization-scoped and journal posting validates balanced double-entry lines before persistence.

## API areas

The server exposes authenticated routes for:

- `/api/contacts`
- `/api/products`
- `/api/chart-of-accounts`
- `/api/analytic-accounts`
- `/api/budgets`
- `/api/journals`
- `/api/journal-entries`
- `/api/purchase-orders`
- `/api/vendor-bills`
- `/api/sales-orders`
- `/api/customer-invoices`
- `/api/payments`
- `/api/reports`
- `/api/portal`
- `/api/auth`

## Development notes

- Keep business rules and accounting calculations in the server layer.
- Use the shared primitives in `client/src/components/primitives` for new page headers, data tables, status badges, and form actions.
- Keep foreign-key values as IDs for API submission, but always render the resolved human-readable name in the UI.
- Never commit `.env` files, database credentials, authentication secrets, or upload tokens.
