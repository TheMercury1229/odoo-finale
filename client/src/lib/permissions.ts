import { createAccessControl } from "better-auth/plugins/access";
import { defaultStatements as orgStatements } from "better-auth/plugins/organization/access";
import { defaultStatements as adminStatements } from "better-auth/plugins/admin/access";

// Resources beyond the org defaults (member/invitation/organization/team)
// that our domain actually needs access-controlled.
const statement = {
  ...adminStatements,
  ...orgStatements,
  contact: ["view", "create", "update", "archive", "view_own"],
  product: ["create", "update", "archive"],
  chartOfAccounts: ["view", "create", "update", "archive"],
  journal: ["view", "create"],
  transaction: ["create", "confirm", "record_payment"], // PO/Bill, SO/Invoice
  report: ["view"],
} as const;

export const ac = createAccessControl(statement);

// Admin (Business Owner): full control, including archiving master data
// and managing users/org membership.
export const adminRole = ac.newRole({
  user: [
    "create",
    "list",
    "set-role",
    "ban",
    "impersonate",
    "delete",
    "set-password",
    "set-email",
    "get",
    "update",
  ],
  session: ["list", "revoke", "delete"],
  contact: ["view", "create", "update", "archive"],
  product: ["create", "update", "archive"],
  chartOfAccounts: ["view", "create", "update", "archive"],
  journal: ["view", "create"],
  transaction: ["create", "confirm", "record_payment"],
  report: ["view"],
  member: ["create", "update", "delete"],
  invitation: ["create", "cancel"],
});

// Invoicing User (Accountant): creates master data + records transactions
// + views reports — but does NOT archive master data (Admin-only per doc)
// and does NOT manage org membership.
export const accountantRole = ac.newRole({
  contact: ["view", "create", "update"],
  product: ["create", "update"],
  chartOfAccounts: ["view", "create", "update"],
  journal: ["view", "create"],
  transaction: ["create", "confirm", "record_payment"],
  report: ["view"],
});

// Contact (Customer/Vendor portal user): only their own invoices/bills,
// and can record a payment against them. No master data access at all.
export const contactRole = ac.newRole({
  contact: ["view_own"],
  transaction: ["record_payment"],
});
