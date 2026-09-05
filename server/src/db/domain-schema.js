import { relations, sql } from "drizzle-orm";
import {
  pgTable,
  text,
  timestamp,
  boolean,
  numeric,
  integer,
  date,
  pgEnum,
  index,
  uniqueIndex,
  check,
} from "drizzle-orm/pg-core";
import { user, organization } from "./auth-schema.js"; // your existing file

export const contactTypeEnum = pgEnum("contact_type", [
  "customer",
  "vendor",
  "both",
]);
export const productTypeEnum = pgEnum("product_type", [
  "goods",
  "service",
  "combo",
]);
export const accountTypeEnum = pgEnum("account_type", [
  "asset",
  "liability",
  "income",
  "expense",
  "capital",
]);
export const journalTypeEnum = pgEnum("journal_type", [
  "sales",
  "purchase",
  "bank",
  "cash",
]);
export const docStatusEnum = pgEnum("doc_status", [
  "draft",
  "confirmed", // PO/SO confirmed, or Bill/Invoice posted
  "paid",
  "partially_paid",
  "cancelled",
]);
export const paymentMethodEnum = pgEnum("payment_method", ["cash", "bank"]);
export const paymentDirectionEnum = pgEnum("payment_direction", [
  "inbound",
  "outbound",
]);

/* -------------------------------------------------------------------------- */
/* MASTER DATA                                                                 */
/* -------------------------------------------------------------------------- */

export const contact = pgTable(
  "contact",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    // Nullable + SET NULL: a contact can exist with no portal login at all,
    // and losing the login must never take the business record down with it.
    userId: text("user_id").references(() => user.id, { onDelete: "set null" }),
    name: text("name").notNull(),
    type: contactTypeEnum("type").notNull(),
    email: text("email"),
    mobile: text("mobile"),
    addressCity: text("address_city"),
    addressState: text("address_state"),
    addressPincode: text("address_pincode"),
    profileImageUrl: text("profile_image_url"),

    isArchived: boolean("is_archived").default(false).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (t) => [
    index("contact_org_idx").on(t.organizationId),
    index("contact_user_idx").on(t.userId),
    // A user should back at most one contact record.
    uniqueIndex("contact_user_uidx").on(t.userId),
    index("contact_type_idx").on(t.type),
    index("contact_archived_idx").on(t.isArchived),
  ],
);

export const product = pgTable(
  "product",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    type: productTypeEnum("type").notNull(),
    salesPrice: numeric("sales_price", { precision: 14, scale: 2 }).notNull(),
    costPrice: numeric("cost_price", { precision: 14, scale: 2 }).notNull(),
    category: text("category"),
    isArchived: boolean("is_archived").default(false).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (t) => [
    index("product_org_idx").on(t.organizationId),
    index("product_archived_idx").on(t.isArchived),
    index("product_category_idx").on(t.category),
  ],
);

export const chartOfAccounts = pgTable(
  "chart_of_accounts",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    type: accountTypeEnum("type").notNull(),
    isArchived: boolean("is_archived").default(false).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [
    index("coa_org_idx").on(t.organizationId),
    // Prevent duplicate "Cash" accounts inside the same org.
    uniqueIndex("coa_org_name_uidx").on(t.organizationId, t.name),
    index("coa_type_idx").on(t.type),
  ],
);

export const journal = pgTable(
  "journal",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    type: journalTypeEnum("type").notNull(),
    defaultAccountId: text("default_account_id").references(
      () => chartOfAccounts.id,
      {
        onDelete: "restrict",
      },
    ),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [
    index("journal_org_idx").on(t.organizationId),
    uniqueIndex("journal_org_name_uidx").on(t.organizationId, t.name),
  ],
);

/* -------------------------------------------------------------------------- */
/* ANALYTICS & BUDGETING                                                      */
/* -------------------------------------------------------------------------- */

export const analyticTypeEnum = pgEnum("analytic_type", ["income", "expense"]);

export const analyticAccount = pgTable(
  "analytic_account",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    type: analyticTypeEnum("type").notNull(),
    isArchived: boolean("is_archived").default(false).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [
    index("analytic_org_idx").on(t.organizationId),
    uniqueIndex("analytic_org_name_uidx").on(t.organizationId, t.name),
  ],
);

export const budgetStatusEnum = pgEnum("budget_status", [
  "draft",
  "confirmed",
  "revised",
  "cancelled",
]);

export const budget = pgTable(
  "budget",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    name: text("name").notNull(), // e.g. "January 2026", revision appends " Revised"
    periodStart: date("period_start").notNull(),
    periodEnd: date("period_end").notNull(),
    responsibleContactId: text("responsible_contact_id")
      .notNull()
      .references(() => contact.id, { onDelete: "restrict" }), // NOTE: contact, not user
    analyticAccountId: text("analytic_account_id")
      .notNull()
      .references(() => analyticAccount.id, { onDelete: "restrict" }),
    committedAmount: numeric("committed_amount", { precision: 14, scale: 2 }).notNull(),
    status: budgetStatusEnum("status").default("draft").notNull(),
    // Self-referential: set when this row is a revision of another budget.
    revisionOfId: text("revision_of_id").references(() => budget.id, {
      onDelete: "set null",
    }),
    createdBy: text("created_by")
      .notNull()
      .references(() => user.id, { onDelete: "restrict" }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [
    index("budget_org_idx").on(t.organizationId),
    index("budget_analytic_idx").on(t.analyticAccountId),
    index("budget_status_idx").on(t.status),
    index("budget_revision_idx").on(t.revisionOfId),
  ],
);

/* -------------------------------------------------------------------------- */
/* DOUBLE-ENTRY CORE                                                           */
/* -------------------------------------------------------------------------- */

export const journalEntry = pgTable(
  "journal_entry",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    journalId: text("journal_id")
      .notNull()
      .references(() => journal.id, { onDelete: "restrict" }),
    date: date("date").notNull(),
    reference: text("reference"), // e.g. invoice/bill number, human-readable
    // Polymorphic-ish link back to whatever created this entry (bill/invoice/payment/manual).
    sourceType: text("source_type").notNull(), // 'vendor_bill' | 'customer_invoice' | 'payment' | 'manual'
    sourceId: text("source_id"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [
    index("je_org_idx").on(t.organizationId),
    index("je_journal_idx").on(t.journalId),
    index("je_source_idx").on(t.sourceType, t.sourceId),
    index("je_date_idx").on(t.date), // reports filter/group by date range constantly
  ],
);

export const journalEntryLine = pgTable(
  "journal_entry_line",
  {
    id: text("id").primaryKey(),
    journalEntryId: text("journal_entry_id")
      .notNull()
      .references(() => journalEntry.id, { onDelete: "cascade" }),
    accountId: text("account_id")
      .notNull()
      .references(() => chartOfAccounts.id, { onDelete: "restrict" }),
    contactId: text("contact_id").references(() => contact.id, {
      onDelete: "set null",
    }),
    analyticAccountId: text("analytic_account_id").references(
      () => analyticAccount.id,
      { onDelete: "set null" },
    ),
    debit: numeric("debit", { precision: 14, scale: 2 }).default("0").notNull(),
    credit: numeric("credit", { precision: 14, scale: 2 })
      .default("0")
      .notNull(),
  },
  (t) => [
    index("jel_entry_idx").on(t.journalEntryId),
    index("jel_account_idx").on(t.accountId), // reports GROUP BY account constantly
    index("jel_contact_idx").on(t.contactId),
    index("jel_analytic_idx").on(t.analyticAccountId),
    // A line is either a debit or a credit, never both, never neither.
    check(
      "jel_debit_xor_credit",
      sql`(${t.debit} > 0 AND ${t.credit} = 0) OR (${t.credit} > 0 AND ${t.debit} = 0)`,
    ),
  ],
);

/* -------------------------------------------------------------------------- */
/* PURCHASE FLOW                                                               */
/* -------------------------------------------------------------------------- */

export const purchaseOrder = pgTable(
  "purchase_order",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    poNumber: text("po_number").notNull(),
    vendorId: text("vendor_id")
      .notNull()
      .references(() => contact.id, { onDelete: "restrict" }),
    status: docStatusEnum("status").default("draft").notNull(),
    orderDate: date("order_date").notNull(),
    createdBy: text("created_by")
      .notNull()
      .references(() => user.id, { onDelete: "restrict" }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [
    index("po_org_idx").on(t.organizationId),
    uniqueIndex("po_org_number_uidx").on(t.organizationId, t.poNumber),
    index("po_vendor_idx").on(t.vendorId),
    index("po_status_idx").on(t.status),
  ],
);

export const purchaseOrderLine = pgTable(
  "purchase_order_line",
  {
    id: text("id").primaryKey(),
    purchaseOrderId: text("purchase_order_id")
      .notNull()
      .references(() => purchaseOrder.id, { onDelete: "cascade" }),
    productId: text("product_id")
      .notNull()
      .references(() => product.id, { onDelete: "restrict" }),
    analyticAccountId: text("analytic_account_id").references(
      () => analyticAccount.id,
      { onDelete: "set null" },
    ),
    quantity: numeric("quantity", { precision: 12, scale: 2 }).notNull(),
    unitPrice: numeric("unit_price", { precision: 14, scale: 2 }).notNull(),
  },
  (t) => [
    index("pol_po_idx").on(t.purchaseOrderId),
    index("pol_analytic_idx").on(t.analyticAccountId),
  ],
);

export const vendorBill = pgTable(
  "vendor_bill",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    purchaseOrderId: text("purchase_order_id")
      .notNull()
      .references(() => purchaseOrder.id, { onDelete: "restrict" }),
    vendorId: text("vendor_id")
      .notNull()
      .references(() => contact.id, { onDelete: "restrict" }),
    billNumber: text("bill_number").notNull(),
    vendorReference: text("vendor_reference"),
    invoiceDate: date("invoice_date").notNull(),
    dueDate: date("due_date"),
    totalAmount: numeric("total_amount", { precision: 14, scale: 2 }).notNull(),
    status: docStatusEnum("status").default("confirmed").notNull(),
    journalEntryId: text("journal_entry_id").references(() => journalEntry.id, {
      onDelete: "restrict",
    }),
    // Set when the AI-prefill feature is used; null for manual entry.
    sourceDocumentUrl: text("source_document_url"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [
    index("vb_org_idx").on(t.organizationId),
    uniqueIndex("vb_org_number_uidx").on(t.organizationId, t.billNumber),
    index("vb_vendor_idx").on(t.vendorId),
    index("vb_po_idx").on(t.purchaseOrderId),
    index("vb_status_idx").on(t.status),
  ],
);

/* -------------------------------------------------------------------------- */
/* SALES FLOW                                                                  */
/* -------------------------------------------------------------------------- */

export const salesOrder = pgTable(
  "sales_order",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    customerId: text("customer_id")
      .notNull()
      .references(() => contact.id, { onDelete: "restrict" }),
    soNumber: text("so_number").notNull(),
    status: docStatusEnum("status").default("draft").notNull(),
    orderDate: date("order_date").notNull(),
    createdBy: text("created_by")
      .notNull()
      .references(() => user.id, { onDelete: "restrict" }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [
    index("so_org_idx").on(t.organizationId),
    uniqueIndex("so_org_number_uidx").on(t.organizationId, t.soNumber),
    index("so_customer_idx").on(t.customerId),
    index("so_status_idx").on(t.status),
  ],
);

export const salesOrderLine = pgTable(
  "sales_order_line",
  {
    id: text("id").primaryKey(),
    salesOrderId: text("sales_order_id")
      .notNull()
      .references(() => salesOrder.id, { onDelete: "cascade" }),
    productId: text("product_id")
      .notNull()
      .references(() => product.id, { onDelete: "restrict" }),
    analyticAccountId: text("analytic_account_id").references(
      () => analyticAccount.id,
      { onDelete: "set null" },
    ),
    quantity: numeric("quantity", { precision: 12, scale: 2 }).notNull(),
    unitPrice: numeric("unit_price", { precision: 14, scale: 2 }).notNull(),
    taxAmount: numeric("tax_amount", { precision: 14, scale: 2 })
      .default("0")
      .notNull(),
  },
  (t) => [
    index("sol_so_idx").on(t.salesOrderId),
    index("sol_analytic_idx").on(t.analyticAccountId),
  ],
);

export const customerInvoice = pgTable(
  "customer_invoice",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    salesOrderId: text("sales_order_id")
      .notNull()
      .references(() => salesOrder.id, { onDelete: "restrict" }),
    customerId: text("customer_id")
      .notNull()
      .references(() => contact.id, { onDelete: "restrict" }),
    invoiceNumber: text("invoice_number").notNull(),
    invoiceDate: date("invoice_date").notNull(),
    dueDate: date("due_date"),
    totalAmount: numeric("total_amount", { precision: 14, scale: 2 }).notNull(),
    status: docStatusEnum("status").default("confirmed").notNull(),
    journalEntryId: text("journal_entry_id").references(() => journalEntry.id, {
      onDelete: "restrict",
    }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [
    index("ci_org_idx").on(t.organizationId),
    uniqueIndex("ci_org_number_uidx").on(t.organizationId, t.invoiceNumber),
    index("ci_customer_idx").on(t.customerId), // Contact-role portal filters on this constantly
    index("ci_so_idx").on(t.salesOrderId),
    index("ci_status_idx").on(t.status),
  ],
);

/* -------------------------------------------------------------------------- */
/* PAYMENTS (shared by both flows)                                             */
/* -------------------------------------------------------------------------- */

export const payment = pgTable(
  "payment",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    paymentNumber: text("payment_number").notNull(),
    direction: paymentDirectionEnum("direction").notNull(), // inbound = from customer, outbound = to vendor
    method: paymentMethodEnum("method").notNull(),
    amount: numeric("amount", { precision: 14, scale: 2 }).notNull(),
    date: date("date").notNull(),
    // Exactly one of these two is set, enforced below.
    vendorBillId: text("vendor_bill_id").references(() => vendorBill.id, {
      onDelete: "restrict",
    }),
    customerInvoiceId: text("customer_invoice_id").references(
      () => customerInvoice.id,
      {
        onDelete: "restrict",
      },
    ),
    journalEntryId: text("journal_entry_id").references(() => journalEntry.id, {
      onDelete: "restrict",
    }),
    recordedBy: text("recorded_by")
      .notNull()
      .references(() => user.id, { onDelete: "restrict" }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [
    index("payment_org_idx").on(t.organizationId),
    uniqueIndex("payment_org_number_uidx").on(t.organizationId, t.paymentNumber),
    index("payment_bill_idx").on(t.vendorBillId),
    index("payment_invoice_idx").on(t.customerInvoiceId),
    check(
      "payment_exactly_one_target",
      sql`(${t.vendorBillId} IS NOT NULL AND ${t.customerInvoiceId} IS NULL)
          OR (${t.vendorBillId} IS NULL AND ${t.customerInvoiceId} IS NOT NULL)`,
    ),
  ],
);

/* -------------------------------------------------------------------------- */
/* RELATIONS                                                                   */
/* -------------------------------------------------------------------------- */

export const contactRelations = relations(contact, ({ one, many }) => ({
  user: one(user, { fields: [contact.userId], references: [user.id] }),
  purchaseOrders: many(purchaseOrder),
  salesOrders: many(salesOrder),
  vendorBills: many(vendorBill),
  customerInvoices: many(customerInvoice),
}));

export const productRelations = relations(product, ({ many }) => ({
  purchaseOrderLines: many(purchaseOrderLine),
  salesOrderLines: many(salesOrderLine),
}));

export const chartOfAccountsRelations = relations(
  chartOfAccounts,
  ({ many }) => ({
    journalEntryLines: many(journalEntryLine),
    journalsDefaulting: many(journal),
  }),
);

export const journalRelations = relations(journal, ({ one, many }) => ({
  defaultAccount: one(chartOfAccounts, {
    fields: [journal.defaultAccountId],
    references: [chartOfAccounts.id],
  }),
  entries: many(journalEntry),
}));

export const journalEntryRelations = relations(
  journalEntry,
  ({ one, many }) => ({
    journal: one(journal, {
      fields: [journalEntry.journalId],
      references: [journal.id],
    }),
    lines: many(journalEntryLine),
  }),
);

export const journalEntryLineRelations = relations(
  journalEntryLine,
  ({ one }) => ({
    entry: one(journalEntry, {
      fields: [journalEntryLine.journalEntryId],
      references: [journalEntry.id],
    }),
    account: one(chartOfAccounts, {
      fields: [journalEntryLine.accountId],
      references: [chartOfAccounts.id],
    }),
    contact: one(contact, {
      fields: [journalEntryLine.contactId],
      references: [contact.id],
    }),
    analyticAccount: one(analyticAccount, {
      fields: [journalEntryLine.analyticAccountId],
      references: [analyticAccount.id],
    }),
  }),
);

export const analyticAccountRelations = relations(
  analyticAccount,
  ({ many }) => ({
    budgets: many(budget),
    journalEntryLines: many(journalEntryLine),
    purchaseOrderLines: many(purchaseOrderLine),
    salesOrderLines: many(salesOrderLine),
  }),
);

export const budgetRelations = relations(budget, ({ one, many }) => ({
  responsibleContact: one(contact, {
    fields: [budget.responsibleContactId],
    references: [contact.id],
  }),
  analyticAccount: one(analyticAccount, {
    fields: [budget.analyticAccountId],
    references: [analyticAccount.id],
  }),
  revisionOf: one(budget, {
    fields: [budget.revisionOfId],
    references: [budget.id],
    relationName: "budget_revisions",
  }),
  revisions: many(budget, {
    relationName: "budget_revisions",
  }),
  createdByUser: one(user, {
    fields: [budget.createdBy],
    references: [user.id],
  }),
}));

export const purchaseOrderRelations = relations(
  purchaseOrder,
  ({ one, many }) => ({
    vendor: one(contact, {
      fields: [purchaseOrder.vendorId],
      references: [contact.id],
    }),
    lines: many(purchaseOrderLine),
    bill: one(vendorBill, {
      fields: [purchaseOrder.id],
      references: [vendorBill.purchaseOrderId],
    }),
  }),
);

export const purchaseOrderLineRelations = relations(
  purchaseOrderLine,
  ({ one }) => ({
    order: one(purchaseOrder, {
      fields: [purchaseOrderLine.purchaseOrderId],
      references: [purchaseOrder.id],
    }),
    product: one(product, {
      fields: [purchaseOrderLine.productId],
      references: [product.id],
    }),
    analyticAccount: one(analyticAccount, {
      fields: [purchaseOrderLine.analyticAccountId],
      references: [analyticAccount.id],
    }),
  }),
);

export const vendorBillRelations = relations(vendorBill, ({ one, many }) => ({
  purchaseOrder: one(purchaseOrder, {
    fields: [vendorBill.purchaseOrderId],
    references: [purchaseOrder.id],
  }),
  vendor: one(contact, {
    fields: [vendorBill.vendorId],
    references: [contact.id],
  }),
  journalEntry: one(journalEntry, {
    fields: [vendorBill.journalEntryId],
    references: [journalEntry.id],
  }),
  payments: many(payment),
}));

export const salesOrderRelations = relations(salesOrder, ({ one, many }) => ({
  customer: one(contact, {
    fields: [salesOrder.customerId],
    references: [contact.id],
  }),
  lines: many(salesOrderLine),
  invoice: one(customerInvoice, {
    fields: [salesOrder.id],
    references: [customerInvoice.salesOrderId],
  }),
}));

export const salesOrderLineRelations = relations(salesOrderLine, ({ one }) => ({
  order: one(salesOrder, {
    fields: [salesOrderLine.salesOrderId],
    references: [salesOrder.id],
  }),
  product: one(product, {
    fields: [salesOrderLine.productId],
    references: [product.id],
  }),
  analyticAccount: one(analyticAccount, {
    fields: [salesOrderLine.analyticAccountId],
    references: [analyticAccount.id],
  }),
}));

export const customerInvoiceRelations = relations(
  customerInvoice,
  ({ one, many }) => ({
    salesOrder: one(salesOrder, {
      fields: [customerInvoice.salesOrderId],
      references: [salesOrder.id],
    }),
    customer: one(contact, {
      fields: [customerInvoice.customerId],
      references: [contact.id],
    }),
    journalEntry: one(journalEntry, {
      fields: [customerInvoice.journalEntryId],
      references: [journalEntry.id],
    }),
    payments: many(payment),
  }),
);

export const paymentRelations = relations(payment, ({ one }) => ({
  vendorBill: one(vendorBill, {
    fields: [payment.vendorBillId],
    references: [vendorBill.id],
  }),
  customerInvoice: one(customerInvoice, {
    fields: [payment.customerInvoiceId],
    references: [customerInvoice.id],
  }),
  journalEntry: one(journalEntry, {
    fields: [payment.journalEntryId],
    references: [journalEntry.id],
  }),
  recordedByUser: one(user, {
    fields: [payment.recordedBy],
    references: [user.id],
  }),
}));
