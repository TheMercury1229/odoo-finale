import { randomUUID } from "node:crypto";
import { and, eq, inArray, sql } from "drizzle-orm";
import db from "../config/db.js";
import { auth } from "../lib/auth.js";
import {
  account,
  analyticAccount,
  budget,
  chartOfAccounts,
  contact,
  customerInvoice,
  journal,
  journalEntry,
  journalEntryLine,
  member,
  organization,
  payment,
  product,
  purchaseOrder,
  purchaseOrderLine,
  salesOrder,
  salesOrderLine,
  session,
  user,
  vendorBill,
} from "../db/schema.js";

// Controllers / Services to invoke real application logic
import {
  createPurchaseOrder,
  confirmPurchaseOrder,
  listPurchaseOrders,
} from "../controllers/purchase-orders.js";
import {
  createVendorBill,
  listVendorBills,
} from "../controllers/vendor-bills.js";
import {
  createSalesOrder,
  confirmSalesOrder,
  listSalesOrders,
} from "../controllers/sales-orders.js";
import {
  createCustomerInvoice,
  listCustomerInvoices,
} from "../controllers/customer-invoices.js";
import { recordPayment, listPayments } from "../controllers/payments.js";
import {
  createJournalEntry,
  listJournalEntries,
} from "../controllers/journal-entries.js";
import {
  createBudget,
  confirmBudget,
  reviseBudget,
  listBudgets,
} from "../controllers/budgets.js";
import { listContacts } from "../controllers/contacts.js";
import { listProducts } from "../controllers/products.js";
import {
  getBalanceSheet,
  getProfitLoss,
  getBudgetReport,
} from "../controllers/reports.js";

const ORGANIZATION_ID = "org_urban_furniture";
const UNIFORM_PASSWORD = "12345678";

// ---------------------------------------------------------------------------
// Standard Master Data Constants
// ---------------------------------------------------------------------------
const STANDARD_ACCOUNTS = [
  { id: "coa_bank", name: "Bank", type: "asset" },
  { id: "coa_cash", name: "Cash", type: "asset" },
  { id: "coa_debtors", name: "Debtors", type: "asset" },
  { id: "coa_creditors", name: "Creditors", type: "liability" },
  { id: "coa_sales_income", name: "Sales Income", type: "income" },
  { id: "coa_purchase_expense", name: "Purchase Expense", type: "expense" },
  { id: "coa_other_expense", name: "Other Expense", type: "expense" },
  { id: "coa_capital", name: "Capital", type: "capital" },
];

const STANDARD_JOURNALS = [
  {
    id: "journal_sales",
    name: "Sales",
    type: "sales",
    defaultAccountId: null,
  },
  {
    id: "journal_purchase",
    name: "Purchase",
    type: "purchase",
    defaultAccountId: null,
  },
  {
    id: "journal_bank",
    name: "Bank",
    type: "bank",
    defaultAccountId: "coa_bank",
  },
  {
    id: "journal_cash",
    name: "Cash",
    type: "cash",
    defaultAccountId: "coa_cash",
  },
];

const ANALYTIC_ACCOUNTS = [
  { id: "analytic_project_alpha", name: "Project Alpha", type: "expense" },
  {
    id: "analytic_warehouse_ops",
    name: "Warehouse Operations",
    type: "expense",
  },
  { id: "analytic_retail_div", name: "Retail Division", type: "income" },
  {
    id: "analytic_corp_clients",
    name: "Corporate Clients",
    type: "income",
  },
];

const SEED_CONTACTS = [
  // Vendors
  {
    name: "Azure Furniture Pvt Ltd",
    type: "vendor",
    email: "azure.furniture.india@gmail.com",
    mobile: "+91 98201 12345",
    city: "Mumbai",
    state: "Maharashtra",
    pincode: "400013",
    isArchived: false,
  },
  {
    name: "Sharma Wood Works",
    type: "vendor",
    email: "sharma.woodworks.ahmedabad@gmail.com",
    mobile: "+91 97245 67890",
    city: "Ahmedabad",
    state: "Gujarat",
    pincode: "380015",
    isArchived: false,
  },
  {
    name: "Metro Hardware Suppliers",
    type: "vendor",
    email: "metro.hardware.pune@gmail.com",
    mobile: "+91 98901 23456",
    city: "Pune",
    state: "Maharashtra",
    pincode: "411004",
    isArchived: false,
  },
  {
    name: "Rahul Sharma",
    type: "vendor",
    email: "rahul.sharma.artisan@gmail.com",
    mobile: "+91 98450 34567",
    city: "Bangalore",
    state: "Karnataka",
    pincode: "560034",
    isArchived: true, // Archived vendor
  },
  // Customers
  {
    name: "Nimesh Pathak",
    type: "customer",
    email: "nimesh.pathak.arch@gmail.com",
    mobile: "+91 98251 98765",
    city: "Ahmedabad",
    state: "Gujarat",
    pincode: "380054",
    isArchived: false,
  },
  {
    name: "Green Leaf Interiors",
    type: "customer",
    email: "greenleaf.interiors.blr@gmail.com",
    mobile: "+91 99002 87654",
    city: "Bangalore",
    state: "Karnataka",
    pincode: "560001",
    isArchived: false,
  },
  {
    name: "Patel Home Decor",
    type: "customer",
    email: "patel.homedecor.surat@gmail.com",
    mobile: "+91 98791 23890",
    city: "Surat",
    state: "Gujarat",
    pincode: "395007",
    isArchived: false,
  },
  {
    name: "Coastal Living Furnishings",
    type: "customer",
    email: "coastal.living.mum@gmail.com",
    mobile: "+91 98200 45678",
    city: "Mumbai",
    state: "Maharashtra",
    pincode: "400050",
    isArchived: true, // Archived customer
  },
  // Both
  {
    name: "Apex Living Solutions",
    type: "both",
    email: "apex.living.delhi@gmail.com",
    mobile: "+91 98110 56789",
    city: "Delhi",
    state: "Delhi",
    pincode: "110020",
    isArchived: false,
  },
  {
    name: "Royal Woods & Decor",
    type: "both",
    email: "royalwoods.hyderabad@gmail.com",
    mobile: "+91 98490 67890",
    city: "Hyderabad",
    state: "Telangana",
    pincode: "500034",
    isArchived: false,
  },
];

const SEED_PRODUCTS = [
  {
    name: "Office Chair",
    type: "goods",
    salesPrice: "8500.00",
    costPrice: "5200.00",
    category: "Chairs",
    isArchived: false,
  },
  {
    name: "Wooden Table",
    type: "goods",
    salesPrice: "15000.00",
    costPrice: "9500.00",
    category: "Tables",
    isArchived: false,
  },
  {
    name: "Luxury Sofa",
    type: "goods",
    salesPrice: "32000.00",
    costPrice: "21000.00",
    category: "Sofas",
    isArchived: false,
  },
  {
    name: "Dining Table",
    type: "goods",
    salesPrice: "24000.00",
    costPrice: "15500.00",
    category: "Tables",
    isArchived: false,
  },
  {
    name: "Bookshelf",
    type: "goods",
    salesPrice: "7500.00",
    costPrice: "4800.00",
    category: "Storage",
    isArchived: false,
  },
  {
    name: "Bed Frame",
    type: "goods",
    salesPrice: "28000.00",
    costPrice: "18000.00",
    category: "Beds",
    isArchived: false,
  },
  {
    name: "Coffee Table",
    type: "goods",
    salesPrice: "6200.00",
    costPrice: "3900.00",
    category: "Tables",
    isArchived: false,
  },
  {
    name: "Wardrobe",
    type: "goods",
    salesPrice: "38000.00",
    costPrice: "25000.00",
    category: "Storage",
    isArchived: false,
  },
  {
    name: "Vintage Bookshelf",
    type: "goods",
    salesPrice: "9200.00",
    costPrice: "6000.00",
    category: "Storage",
    isArchived: true, // Archived product
  },
  {
    name: "Furniture Assembly Service",
    type: "service",
    salesPrice: "1500.00",
    costPrice: "600.00",
    category: "Services",
    isArchived: false,
  },
  {
    name: "Delivery & Installation",
    type: "service",
    salesPrice: "2200.00",
    costPrice: "900.00",
    category: "Services",
    isArchived: false,
  },
];

// ---------------------------------------------------------------------------
// Helper: Application Controller Invocator
// ---------------------------------------------------------------------------
function callHandler(
  handler,
  {
    body = {},
    params = {},
    query = {},
    user: reqUser = null,
    orgId = ORGANIZATION_ID,
  } = {},
) {
  return new Promise((resolve, reject) => {
    let responded = false;
    const req = {
      organizationId: orgId,
      validatedBody: body,
      body,
      params,
      query,
      validatedQuery: query,
      session: reqUser ? { user: reqUser } : undefined,
    };
    const res = {
      statusCode: 200,
      status(code) {
        this.statusCode = code;
        return this;
      },
      json(data) {
        responded = true;
        if (this.statusCode >= 400) {
          const err = new Error(
            `API error (${this.statusCode}): ${JSON.stringify(data)}`,
          );
          err.statusCode = this.statusCode;
          err.response = data;
          return reject(err);
        }
        resolve(data);
      },
      send(data) {
        responded = true;
        if (this.statusCode >= 400) {
          return reject(
            new Error(`API error (${this.statusCode}): ${data}`),
          );
        }
        resolve(data);
      },
    };

    try {
      const result = handler(req, res, (err) => {
        if (err) return reject(err);
        if (!responded) resolve(null);
      });
      if (result && typeof result.then === "function") {
        result.catch((err) => {
          if (!responded) reject(err);
        });
      }
    } catch (err) {
      reject(err);
    }
  });
}

// ---------------------------------------------------------------------------
// Helper: Better-Auth Programmatic User Creation & Role Setting
// ---------------------------------------------------------------------------
async function ensureBetterAuthUser({ email, password, name, role }) {
  const normalizedEmail = email.toLowerCase().trim();

  // Check if user already exists
  const [existingUser] = await db
    .select()
    .from(user)
    .where(eq(user.email, normalizedEmail))
    .limit(1);

  let userId;
  if (existingUser) {
    try {
      // Test if password matches uniform password
      await auth.api.signInEmail({
        body: { email: normalizedEmail, password },
      });
      userId = existingUser.id;
    } catch {
      // Re-create user via signUpEmail so password hashing & credentials match
      await db.delete(user).where(eq(user.id, existingUser.id));
      const res = await auth.api.signUpEmail({
        body: { email: normalizedEmail, password, name },
      });
      userId = res.user.id;
    }
  } else {
    const res = await auth.api.signUpEmail({
      body: { email: normalizedEmail, password, name },
    });
    userId = res.user.id;
  }

  // 1. Update role and emailVerified
  await db
    .update(user)
    .set({ role, emailVerified: true })
    .where(eq(user.id, userId));

  // 2. Ensure member row linking them to the single seeded organization
  const [existingMember] = await db
    .select()
    .from(member)
    .where(
      and(
        eq(member.userId, userId),
        eq(member.organizationId, ORGANIZATION_ID),
      ),
    )
    .limit(1);

  if (existingMember) {
    await db
      .update(member)
      .set({ role })
      .where(eq(member.id, existingMember.id));
  } else {
    await db.insert(member).values({
      id: `member_${userId}`,
      organizationId: ORGANIZATION_ID,
      userId,
      role,
      createdAt: new Date(),
    });
  }

  return { id: userId, email: normalizedEmail, name, role };
}

// ---------------------------------------------------------------------------
// Foreign-Key-Safe Clean Wipe
// ---------------------------------------------------------------------------
async function cleanExistingData() {
  console.log("--> Cleaning existing transactional and domain data in foreign-key safe order...");

  // 1. Payments (depends on bill, invoice, journal entry)
  await db.delete(payment).where(eq(payment.organizationId, ORGANIZATION_ID));

  // 2. Vendor Bills & Customer Invoices (depends on PO/SO and journal entry)
  await db.delete(vendorBill).where(eq(vendorBill.organizationId, ORGANIZATION_ID));
  await db.delete(customerInvoice).where(eq(customerInvoice.organizationId, ORGANIZATION_ID));

  // 3. Sales Order Lines & Sales Orders
  const existingSos = await db
    .select({ id: salesOrder.id })
    .from(salesOrder)
    .where(eq(salesOrder.organizationId, ORGANIZATION_ID));
  if (existingSos.length > 0) {
    const soIds = existingSos.map((s) => s.id);
    await db.delete(salesOrderLine).where(inArray(salesOrderLine.salesOrderId, soIds));
  }
  await db.delete(salesOrder).where(eq(salesOrder.organizationId, ORGANIZATION_ID));

  // 4. Purchase Order Lines & Purchase Orders
  const existingPos = await db
    .select({ id: purchaseOrder.id })
    .from(purchaseOrder)
    .where(eq(purchaseOrder.organizationId, ORGANIZATION_ID));
  if (existingPos.length > 0) {
    const poIds = existingPos.map((p) => p.id);
    await db.delete(purchaseOrderLine).where(inArray(purchaseOrderLine.purchaseOrderId, poIds));
  }
  await db.delete(purchaseOrder).where(eq(purchaseOrder.organizationId, ORGANIZATION_ID));

  // 5. Budgets (clear self-referential revisionOfId first)
  await db
    .update(budget)
    .set({ revisionOfId: null })
    .where(eq(budget.organizationId, ORGANIZATION_ID));
  await db.delete(budget).where(eq(budget.organizationId, ORGANIZATION_ID));

  // 6. Journal Entry Lines & Journal Entries
  const existingJes = await db
    .select({ id: journalEntry.id })
    .from(journalEntry)
    .where(eq(journalEntry.organizationId, ORGANIZATION_ID));
  if (existingJes.length > 0) {
    const jeIds = existingJes.map((j) => j.id);
    await db.delete(journalEntryLine).where(inArray(journalEntryLine.journalEntryId, jeIds));
  }
  await db.delete(journalEntry).where(eq(journalEntry.organizationId, ORGANIZATION_ID));

  // 7. Contacts and their linked portal users (preserve admin & accountant users)
  const existingContacts = await db
    .select({ id: contact.id, userId: contact.userId })
    .from(contact)
    .where(eq(contact.organizationId, ORGANIZATION_ID));

  const portalUserIds = existingContacts.map((c) => c.userId).filter(Boolean);
  await db.delete(contact).where(eq(contact.organizationId, ORGANIZATION_ID));

  if (portalUserIds.length > 0) {
    await db.delete(user).where(inArray(user.id, portalUserIds));
  }

  // 8. Products
  await db.delete(product).where(eq(product.organizationId, ORGANIZATION_ID));

  // 9. Analytic Accounts
  await db.delete(analyticAccount).where(eq(analyticAccount.organizationId, ORGANIZATION_ID));

  console.log("--> Database transactional and domain data cleaned successfully.");
}

// ---------------------------------------------------------------------------
// Main Seeding Flow
// ---------------------------------------------------------------------------
async function seedDatabase() {
  console.log("================================================================================");
  console.log("🚀 STARTING REALISTIC DATA SEEDING SCRIPT");
  console.log("================================================================================");

  // 1. Clean previous transactional & seeded domain records
  await cleanExistingData();

  // 2. Seed / Ensure Organization
  console.log("\n[1/7] Ensuring Organization...");
  const [org] = await db
    .insert(organization)
    .values({
      id: ORGANIZATION_ID,
      name: "Urban Furniture",
      slug: "urban-furniture",
      createdAt: new Date("2026-01-01T00:00:00.000Z"),
    })
    .onConflictDoUpdate({
      target: organization.slug,
      set: { name: "Urban Furniture" },
    })
    .returning();
  console.log(`✓ Organization: ${org.name} (${org.id})`);

  // 3. Seed Core Internal Users (Admin & Accountant) via Better-Auth
  console.log("\n[2/7] Seeding Core Internal Users via Better-Auth API...");
  const adminUser = await ensureBetterAuthUser({
    email: "admin@urbanfurniture.com",
    password: UNIFORM_PASSWORD,
    name: "Urban Furniture Admin",
    role: "admin",
  });
  console.log(`✓ Admin: ${adminUser.email} (role: ${adminUser.role})`);

  const accountantUser = await ensureBetterAuthUser({
    email: "accountant@urbanfurniture.com",
    password: UNIFORM_PASSWORD,
    name: "Sanjay Singhania",
    role: "accountant",
  });
  console.log(`✓ Accountant: ${accountantUser.email} (role: ${accountantUser.role})`);

  // 4. Seed Chart of Accounts & Standard Journals
  console.log("\n[3/7] Seeding Chart of Accounts, Journals & Analytic Accounts...");
  for (const acc of STANDARD_ACCOUNTS) {
    await db
      .insert(chartOfAccounts)
      .values({ ...acc, organizationId: ORGANIZATION_ID })
      .onConflictDoUpdate({
        target: chartOfAccounts.id,
        set: { name: acc.name, type: acc.type },
      });
  }
  console.log(`✓ Seeded ${STANDARD_ACCOUNTS.length} Chart of Accounts accounts.`);

  for (const j of STANDARD_JOURNALS) {
    await db
      .insert(journal)
      .values({ ...j, organizationId: ORGANIZATION_ID })
      .onConflictDoUpdate({
        target: journal.id,
        set: {
          name: j.name,
          defaultAccountId: j.defaultAccountId,
          type: j.type,
        },
      });
  }
  console.log(`✓ Seeded ${STANDARD_JOURNALS.length} Standard Journals.`);

  const createdAnalytics = [];
  for (const a of ANALYTIC_ACCOUNTS) {
    const [row] = await db
      .insert(analyticAccount)
      .values({
        id: a.id,
        name: a.name,
        type: a.type,
        organizationId: ORGANIZATION_ID,
        isArchived: false,
      })
      .onConflictDoUpdate({
        target: analyticAccount.id,
        set: { name: a.name, type: a.type, isArchived: false },
      })
      .returning();
    createdAnalytics.push(row);
  }
  console.log(`✓ Seeded ${createdAnalytics.length} Analytic Accounts.`);

  // 5. Seed Contacts & their Better-Auth Portal Users
  console.log("\n[4/7] Seeding Contacts & Portal Logins via Better-Auth API...");
  const allContacts = [];
  for (const item of SEED_CONTACTS) {
    // 1. Create Portal User via BetterAuth
    const portalUser = await ensureBetterAuthUser({
      email: item.email,
      password: UNIFORM_PASSWORD,
      name: item.name,
      role: "contact",
    });

    // 2. Insert Contact Record
    const contactId = `contact_${randomUUID()}`;
    const [c] = await db
      .insert(contact)
      .values({
        id: contactId,
        organizationId: ORGANIZATION_ID,
        name: item.name,
        type: item.type,
        email: item.email,
        mobile: item.mobile,
        addressCity: item.city,
        addressState: item.state,
        addressPincode: item.pincode,
        isArchived: item.isArchived,
      })
      .returning();

    // 3. Link Contact to User (per explicit requirement: set contact.userId AFTER both exist)
    await db
      .update(contact)
      .set({ userId: portalUser.id })
      .where(eq(contact.id, c.id));

    c.userId = portalUser.id;
    allContacts.push(c);
  }

  const archivedContacts = allContacts.filter((c) => c.isArchived);
  const activeContacts = allContacts.filter((c) => !c.isArchived);
  console.log(`✓ Seeded ${allContacts.length} Contacts (${activeContacts.length} active, ${archivedContacts.length} archived).`);
  console.log(`✓ Every contact has a linked portal user account with password "${UNIFORM_PASSWORD}".`);

  // 6. Seed Products
  console.log("\n[5/7] Seeding Products...");
  const allProducts = [];
  for (const p of SEED_PRODUCTS) {
    const [row] = await db
      .insert(product)
      .values({
        id: `prod_${randomUUID()}`,
        organizationId: ORGANIZATION_ID,
        name: p.name,
        type: p.type,
        salesPrice: p.salesPrice,
        costPrice: p.costPrice,
        category: p.category,
        isArchived: p.isArchived,
      })
      .returning();
    allProducts.push(row);
  }
  const activeProducts = allProducts.filter((p) => !p.isArchived);
  const archivedProducts = allProducts.filter((p) => p.isArchived);
  console.log(`✓ Seeded ${allProducts.length} Products (${activeProducts.length} active, ${archivedProducts.length} archived).`);

  // 7. Seed Transactions using Real Application Logic
  console.log("\n[6/7] Generating Transactional Data Across 60-90 Day Timeline...");

  // Active Vendors and Customers for transactions
  const activeVendors = activeContacts.filter((c) => c.type === "vendor" || c.type === "both");
  const activeCustomers = activeContacts.filter((c) => c.type === "customer" || c.type === "both");
  const goodsProducts = activeProducts.filter((p) => p.type === "goods");
  const expenseAnalytics = createdAnalytics.filter((a) => a.type === "expense");
  const incomeAnalytics = createdAnalytics.filter((a) => a.type === "income");

  // -------------------------------------------------------------------------
  // A. Purchase Chains (18 completed chains)
  // -------------------------------------------------------------------------
  console.log("   -> Creating 18 Purchase chains (PO -> Confirm -> Vendor Bill -> Payments)...");
  const purchaseDates = [
    { po: "2026-06-12", bill: "2026-06-15", pay: "2026-06-22", payType: "full", method: "bank" },
    { po: "2026-06-20", bill: "2026-06-23", pay: "2026-07-02", payType: "full", method: "bank" },
    { po: "2026-06-28", bill: "2026-07-01", pay: "2026-07-08", payType: "full", method: "cash" },
    { po: "2026-07-05", bill: "2026-07-08", pay: "2026-07-16", payType: "full", method: "bank" },
    { po: "2026-07-11", bill: "2026-07-14", pay: "2026-07-25", payType: "full", method: "bank" },
    { po: "2026-07-18", bill: "2026-07-21", pay: "2026-07-29", payType: "full", method: "cash" },
    { po: "2026-07-24", bill: "2026-07-27", pay: "2026-08-04", payType: "full", method: "bank" },
    { po: "2026-07-30", bill: "2026-08-02", pay: "2026-08-11", payType: "full", method: "bank" },
    { po: "2026-08-05", bill: "2026-08-08", pay: "2026-08-18", payType: "full", method: "bank" },
    { po: "2026-08-12", bill: "2026-08-15", pay: "2026-08-22", payType: "full", method: "cash" },
    { po: "2026-08-18", bill: "2026-08-21", pay: "2026-08-28", payType: "full", method: "bank" },
    // 4 partial payments
    { po: "2026-08-22", bill: "2026-08-25", pay: "2026-08-31", payType: "partial", pct: 0.5, method: "bank" },
    { po: "2026-08-25", bill: "2026-08-28", pay: "2026-09-02", payType: "partial", pct: 0.6, method: "bank" },
    { po: "2026-08-28", bill: "2026-08-31", pay: "2026-09-04", payType: "partial", pct: 0.45, method: "cash" },
    { po: "2026-08-30", bill: "2026-09-02", pay: "2026-09-05", payType: "partial", pct: 0.5, method: "bank" },
    // 3 unpaid
    { po: "2026-09-01", bill: "2026-09-03", payType: "unpaid" },
    { po: "2026-09-02", bill: "2026-09-04", payType: "unpaid" },
    { po: "2026-09-03", bill: "2026-09-05", payType: "unpaid" },
  ];

  let purchaseChainCount = 0;
  let vendorBillPaymentCount = { full: 0, partial: 0, unpaid: 0 };

  for (let i = 0; i < purchaseDates.length; i++) {
    const d = purchaseDates[i];
    const vendor = activeVendors[i % activeVendors.length];

    // Pick 1 to 3 items
    const numLines = (i % 3) + 1;
    const lines = [];
    for (let l = 0; l < numLines; l++) {
      const prod = goodsProducts[(i + l) % goodsProducts.length];
      const qty = ((i + l) % 5) + 2;
      // Unit price near costPrice (± 3%)
      const baseCost = Number(prod.costPrice);
      const variance = ((i * 7 + l * 13) % 7) - 3;
      const unitPrice = Math.max(100, Math.round(baseCost * (1 + variance / 100)));

      // ~35% lines tagged with expense analytic account
      let analyticAccountId = null;
      if ((i + l) % 3 === 0) {
        analyticAccountId = expenseAnalytics[(i + l) % expenseAnalytics.length].id;
      }

      lines.push({
        productId: prod.id,
        quantity: qty,
        unitPrice,
        analyticAccountId,
      });
    }

    // 1. Create PO
    const createdPo = await callHandler(createPurchaseOrder, {
      body: {
        vendorId: vendor.id,
        orderDate: d.po,
        lines,
      },
      user: adminUser,
    });

    // 2. Confirm PO
    await callHandler(confirmPurchaseOrder, {
      params: { id: createdPo.id },
      user: adminUser,
    });

    // 3. Create Vendor Bill
    const createdBill = await callHandler(createVendorBill, {
      body: {
        purchaseOrderId: createdPo.id,
        vendorReference: `VR-${createdPo.poNumber}`,
        invoiceDate: d.bill,
        dueDate: d.bill,
      },
      user: adminUser,
    });

    // 4. Payment
    if (d.payType === "full") {
      await callHandler(recordPayment, {
        body: {
          targetType: "vendor_bill",
          targetId: createdBill.id,
          method: d.method,
          amount: Number(createdBill.totalAmount),
          date: d.pay,
          note: `Payment for ${createdBill.billNumber}`,
        },
        user: accountantUser,
      });
      vendorBillPaymentCount.full++;
    } else if (d.payType === "partial") {
      const partAmount = Math.round(Number(createdBill.totalAmount) * d.pct * 100) / 100;
      await callHandler(recordPayment, {
        body: {
          targetType: "vendor_bill",
          targetId: createdBill.id,
          method: d.method,
          amount: partAmount,
          date: d.pay,
          note: `Partial payment for ${createdBill.billNumber}`,
        },
        user: accountantUser,
      });
      vendorBillPaymentCount.partial++;
    } else {
      vendorBillPaymentCount.unpaid++;
    }

    purchaseChainCount++;
  }
  console.log(`   ✓ Successfully executed ${purchaseChainCount} Purchase chains (${vendorBillPaymentCount.full} full, ${vendorBillPaymentCount.partial} partial, ${vendorBillPaymentCount.unpaid} unpaid).`);

  // -------------------------------------------------------------------------
  // B. Sales Chains (22 completed chains)
  // -------------------------------------------------------------------------
  console.log("   -> Creating 22 Sales chains (SO -> Confirm -> Customer Invoice -> Payments)...");
  const salesDates = [
    { so: "2026-06-14", inv: "2026-06-16", pay: "2026-06-20", payType: "full", method: "bank" },
    { so: "2026-06-22", inv: "2026-06-24", pay: "2026-06-30", payType: "full", method: "bank" },
    { so: "2026-06-29", inv: "2026-07-01", pay: "2026-07-05", payType: "full", method: "cash" },
    { so: "2026-07-04", inv: "2026-07-06", pay: "2026-07-12", payType: "full", method: "bank" },
    { so: "2026-07-09", inv: "2026-07-11", pay: "2026-07-18", payType: "full", method: "bank" },
    { so: "2026-07-14", inv: "2026-07-16", pay: "2026-07-23", payType: "full", method: "cash" },
    { so: "2026-07-19", inv: "2026-07-21", pay: "2026-07-28", payType: "full", method: "bank" },
    { so: "2026-07-25", inv: "2026-07-27", pay: "2026-08-03", payType: "full", method: "bank" },
    { so: "2026-07-31", inv: "2026-08-02", pay: "2026-08-09", payType: "full", method: "bank" },
    { so: "2026-08-06", inv: "2026-08-08", pay: "2026-08-15", payType: "full", method: "cash" },
    { so: "2026-08-11", inv: "2026-08-13", pay: "2026-08-20", payType: "full", method: "bank" },
    { so: "2026-08-16", inv: "2026-08-18", pay: "2026-08-25", payType: "full", method: "bank" },
    { so: "2026-08-20", inv: "2026-08-22", pay: "2026-08-29", payType: "full", method: "bank" },
    // 6 partial
    { so: "2026-08-23", inv: "2026-08-25", pay: "2026-08-30", payType: "partial", pct: 0.5, method: "bank" },
    { so: "2026-08-26", inv: "2026-08-28", pay: "2026-09-01", payType: "partial", pct: 0.6, method: "bank" },
    { so: "2026-08-27", inv: "2026-08-29", pay: "2026-09-02", payType: "partial", pct: 0.4, method: "cash" },
    { so: "2026-08-29", inv: "2026-08-31", pay: "2026-09-03", payType: "partial", pct: 0.5, method: "bank" },
    { so: "2026-08-31", inv: "2026-09-02", pay: "2026-09-04", payType: "partial", pct: 0.7, method: "bank" },
    { so: "2026-09-01", inv: "2026-09-03", pay: "2026-09-05", payType: "partial", pct: 0.5, method: "cash" },
    // 3 unpaid
    { so: "2026-09-02", inv: "2026-09-04", payType: "unpaid" },
    { so: "2026-09-03", inv: "2026-09-05", payType: "unpaid" },
    { so: "2026-09-04", inv: "2026-09-05", payType: "unpaid" },
  ];

  let salesChainCount = 0;
  let customerInvoicePaymentCount = { full: 0, partial: 0, unpaid: 0 };

  for (let i = 0; i < salesDates.length; i++) {
    const d = salesDates[i];
    const customer = activeCustomers[i % activeCustomers.length];

    // Pick 1 to 3 items
    const numLines = (i % 3) + 1;
    const lines = [];
    for (let l = 0; l < numLines; l++) {
      const prod = activeProducts[(i + l) % activeProducts.length];
      const qty = ((i + l) % 4) + 1;
      const baseSales = Number(prod.salesPrice);
      const variance = ((i * 11 + l * 7) % 7) - 3;
      const unitPrice = Math.max(100, Math.round(baseSales * (1 + variance / 100)));

      // Tax: ~50% with 0 tax, ~50% with 5% or 18% tax
      let taxAmount = 0;
      if (i % 2 === 1) {
        const rate = (i + l) % 2 === 0 ? 0.05 : 0.18;
        taxAmount = Math.round(qty * unitPrice * rate * 100) / 100;
      }

      // ~35% lines tagged with income analytic account
      let analyticAccountId = null;
      if ((i + l) % 3 === 0) {
        analyticAccountId = incomeAnalytics[(i + l) % incomeAnalytics.length].id;
      }

      lines.push({
        productId: prod.id,
        quantity: qty,
        unitPrice,
        taxAmount,
        analyticAccountId,
      });
    }

    // 1. Create SO
    const createdSo = await callHandler(createSalesOrder, {
      body: {
        customerId: customer.id,
        orderDate: d.so,
        lines,
      },
      user: adminUser,
    });

    // 2. Confirm SO
    await callHandler(confirmSalesOrder, {
      params: { id: createdSo.id },
      user: adminUser,
    });

    // 3. Create Customer Invoice
    const createdInvoice = await callHandler(createCustomerInvoice, {
      body: {
        salesOrderId: createdSo.id,
        invoiceDate: d.inv,
        dueDate: d.inv,
      },
      user: adminUser,
    });

    // 4. Payment
    if (d.payType === "full") {
      await callHandler(recordPayment, {
        body: {
          targetType: "customer_invoice",
          targetId: createdInvoice.id,
          method: d.method,
          amount: Number(createdInvoice.totalAmount),
          date: d.pay,
          note: `Payment for ${createdInvoice.invoiceNumber}`,
        },
        user: accountantUser,
      });
      customerInvoicePaymentCount.full++;
    } else if (d.payType === "partial") {
      const partAmount = Math.round(Number(createdInvoice.totalAmount) * d.pct * 100) / 100;
      await callHandler(recordPayment, {
        body: {
          targetType: "customer_invoice",
          targetId: createdInvoice.id,
          method: d.method,
          amount: partAmount,
          date: d.pay,
          note: `Partial payment for ${createdInvoice.invoiceNumber}`,
        },
        user: accountantUser,
      });
      customerInvoicePaymentCount.partial++;
    } else {
      customerInvoicePaymentCount.unpaid++;
    }

    salesChainCount++;
  }
  console.log(`   ✓ Successfully executed ${salesChainCount} Sales chains (${customerInvoicePaymentCount.full} full, ${customerInvoicePaymentCount.partial} partial, ${customerInvoicePaymentCount.unpaid} unpaid).`);

  // -------------------------------------------------------------------------
  // C. Manual Journal Entries (6 balanced entries)
  // -------------------------------------------------------------------------
  console.log("   -> Creating 6 realistic manual journal entries...");
  const manualEntries = [
    {
      date: "2026-06-15",
      reference: "Opening Capital Infusion",
      journalId: "journal_bank",
      lines: [
        { accountId: "coa_bank", debit: 500000, credit: 0 },
        { accountId: "coa_capital", debit: 0, credit: 500000 },
      ],
    },
    {
      date: "2026-06-25",
      reference: "Petty Cash Top-up June",
      journalId: "journal_cash",
      lines: [
        { accountId: "coa_cash", debit: 25000, credit: 0 },
        { accountId: "coa_bank", debit: 0, credit: 25000 },
      ],
    },
    {
      date: "2026-07-15",
      reference: "Office Rent & Warehouse Facility",
      journalId: "journal_bank",
      lines: [
        {
          accountId: "coa_other_expense",
          analyticAccountId: "analytic_warehouse_ops",
          debit: 35000,
          credit: 0,
        },
        { accountId: "coa_bank", debit: 0, credit: 35000 },
      ],
    },
    {
      date: "2026-07-31",
      reference: "Bank Interest Received Q1",
      journalId: "journal_bank",
      lines: [
        { accountId: "coa_bank", debit: 4250, credit: 0 },
        { accountId: "coa_sales_income", debit: 0, credit: 4250 },
      ],
    },
    {
      date: "2026-08-10",
      reference: "Petty Cash Top-up August",
      journalId: "journal_cash",
      lines: [
        { accountId: "coa_cash", debit: 20000, credit: 0 },
        { accountId: "coa_bank", debit: 0, credit: 20000 },
      ],
    },
    {
      date: "2026-08-28",
      reference: "Workshop Equipment Maintenance",
      journalId: "journal_bank",
      lines: [
        {
          accountId: "coa_other_expense",
          analyticAccountId: "analytic_project_alpha",
          debit: 18500,
          credit: 0,
        },
        { accountId: "coa_bank", debit: 0, credit: 18500 },
      ],
    },
  ];

  for (const je of manualEntries) {
    await callHandler(createJournalEntry, {
      body: je,
      user: accountantUser,
    });
  }
  console.log(`   ✓ Successfully posted ${manualEntries.length} Manual Journal Entries.`);

  // -------------------------------------------------------------------------
  // D. Budgets (4 Budgets: 2 Draft, 1 Confirmed, 1 Revised)
  // -------------------------------------------------------------------------
  console.log("   -> Creating and managing Budgets...");
  // 1. Confirmed -> Revised Budget
  const budget1 = await callHandler(createBudget, {
    body: {
      name: "Q3 Retail Expansion",
      periodStart: "2026-07-01",
      periodEnd: "2026-09-30",
      responsibleContactId: activeContacts[0].id,
      analyticAccountId: "analytic_retail_div",
      committedAmount: 150000.0,
    },
    user: adminUser,
  });
  await callHandler(confirmBudget, {
    params: { id: budget1.id },
    user: adminUser,
  });
  const revisedBudget1 = await callHandler(reviseBudget, {
    params: { id: budget1.id },
    body: { committedAmount: 180000.0 },
    user: adminUser,
  });
  console.log(`   ✓ Budget 1: "${budget1.name}" confirmed & revised to ₹180,000.00 (Original: revised, Revision: confirmed).`);

  // 2. Confirmed Budget
  const budget2 = await callHandler(createBudget, {
    body: {
      name: "Warehouse Operations Q3",
      periodStart: "2026-07-01",
      periodEnd: "2026-09-30",
      responsibleContactId: activeContacts[1].id,
      analyticAccountId: "analytic_warehouse_ops",
      committedAmount: 100000.0,
    },
    user: adminUser,
  });
  await callHandler(confirmBudget, {
    params: { id: budget2.id },
    user: adminUser,
  });
  console.log(`   ✓ Budget 2: "${budget2.name}" confirmed.`);

  // 3. Draft Budget 1
  const budget3 = await callHandler(createBudget, {
    body: {
      name: "Corporate Furnishing Pilot",
      periodStart: "2026-08-01",
      periodEnd: "2026-09-30",
      responsibleContactId: activeContacts[2].id,
      analyticAccountId: "analytic_corp_clients",
      committedAmount: 85000.0,
    },
    user: adminUser,
  });
  console.log(`   ✓ Budget 3: "${budget3.name}" created (status: draft).`);

  // 4. Draft Budget 2
  const budget4 = await callHandler(createBudget, {
    body: {
      name: "Project Alpha R&D",
      periodStart: "2026-09-01",
      periodEnd: "2026-10-31",
      responsibleContactId: activeContacts[3].id,
      analyticAccountId: "analytic_project_alpha",
      committedAmount: 60000.0,
    },
    user: adminUser,
  });
  console.log(`   ✓ Budget 4: "${budget4.name}" created (status: draft).`);

  // -------------------------------------------------------------------------
  // 8. Verification & Reporting
  // -------------------------------------------------------------------------
  console.log("\n[7/7] Running Application Verification & Gathering Metrics...");

  // Spot-check real list APIs
  const contactListRes = await callHandler(listContacts, { query: { includeArchived: "true" } });
  const productListRes = await callHandler(listProducts, { query: { includeArchived: "true" } });
  const poListRes = await callHandler(listPurchaseOrders);
  const soListRes = await callHandler(listSalesOrders);
  const billListRes = await callHandler(listVendorBills);
  const invoiceListRes = await callHandler(listCustomerInvoices);
  const budgetListRes = await callHandler(listBudgets);
  const jeListRes = await callHandler(listJournalEntries);

  // Financial Reports
  const balanceSheet = await callHandler(getBalanceSheet, { query: { asOf: "2026-09-06" } });
  const profitLoss = await callHandler(getProfitLoss, { query: { from: "2026-06-01", to: "2026-09-06" } });
  const budgetReport = await callHandler(getBudgetReport, { query: { asOf: "2026-09-06" } });

  console.log("\n================================================================================");
  console.log("📊 SEEDING SUMMARY REPORT");
  console.log("================================================================================");

  console.log("\n1. MASTER DATA");
  const loadedContacts = contactListRes.contacts || [];
  const loadedProducts = productListRes.products || [];
  const loadedJes = jeListRes.journalEntries || [];
  const loadedBudgets = budgetListRes.budgets || [];

  console.log(`   • Contacts: ${loadedContacts.length} total (${activeContacts.length} active, ${archivedContacts.length} archived)`);
  console.log(`   • Products: ${loadedProducts.length} total (${activeProducts.length} active, ${archivedProducts.length} archived)`);
  console.log(`   • Chart of Accounts: ${STANDARD_ACCOUNTS.length} accounts`);
  console.log(`   • Journals: ${STANDARD_JOURNALS.length} journals`);
  console.log(`   • Analytic Accounts: ${createdAnalytics.length} accounts`);

  console.log("\n2. TRANSACTIONAL CHAINS");
  console.log(`   • Purchase Orders: ${poListRes.purchaseOrders.length} confirmed`);
  console.log(`   • Vendor Bills: ${billListRes.vendorBills.length} bills`);
  console.log(`     - Fully Paid: ${vendorBillPaymentCount.full}`);
  console.log(`     - Partially Paid: ${vendorBillPaymentCount.partial}`);
  console.log(`     - Unpaid: ${vendorBillPaymentCount.unpaid}`);
  console.log(`   • Sales Orders: ${soListRes.salesOrders.length} confirmed`);
  console.log(`   • Customer Invoices: ${invoiceListRes.customerInvoices.length} invoices`);
  console.log(`     - Fully Paid: ${customerInvoicePaymentCount.full}`);
  console.log(`     - Partially Paid: ${customerInvoicePaymentCount.partial}`);
  console.log(`     - Unpaid: ${customerInvoicePaymentCount.unpaid}`);
  console.log(`   • Manual Journal Entries: ${manualEntries.length} entries (Total double-entry entries in system: ${loadedJes.length})`);

  console.log("\n3. BUDGETS");
  const budgetStatuses = loadedBudgets.reduce((acc, b) => {
    acc[b.status] = (acc[b.status] || 0) + 1;
    return acc;
  }, {});
  console.log(`   • Total Budgets: ${loadedBudgets.length}`);
  console.log(`     - Draft: ${budgetStatuses.draft || 0}`);
  console.log(`     - Confirmed: ${budgetStatuses.confirmed || 0}`);
  console.log(`     - Revised: ${budgetStatuses.revised || 0}`);

  console.log("\n4. BUDGET REPORT METRICS (Real Achieved Amounts from Tagged Transactions)");
  for (const b of budgetReport) {
    console.log(`   • [${b.status.toUpperCase()}] ${b.budgetName} (${b.analyticAccountName})`);
    console.log(`     Planned: ₹${b.committedAmount.toLocaleString()} | Achieved: ₹${b.actualAmount.toLocaleString()} (${b.percentUsed}%) | Variance: ₹${b.variance.toLocaleString()}`);
  }

  console.log("\n5. FINANCIAL STATEMENT INTEGRITY");
  console.log(`   • Balance Sheet (As of 2026-09-06):`);
  console.log(`     - Total Assets: ₹${balanceSheet.totalAssets.toLocaleString()}`);
  console.log(`     - Total Liabilities: ₹${balanceSheet.totalLiabilities.toLocaleString()}`);
  console.log(`     - Total Capital: ₹${balanceSheet.totalCapital.toLocaleString()}`);
  console.log(`     - Total Liabilities & Capital: ₹${balanceSheet.totalLiabilitiesAndCapital.toLocaleString()}`);
  const bsBalanced = Math.abs(balanceSheet.totalAssets - balanceSheet.totalLiabilitiesAndCapital) < 0.01;
  console.log(`     - Balance Sheet Check: ${bsBalanced ? "✅ BALANCED (Assets = Liabilities + Capital)" : "❌ UNBALANCED"}`);

  console.log(`   • Profit & Loss Statement (2026-06-01 to 2026-09-06):`);
  console.log(`     - Total Income: ₹${profitLoss.totalIncome.toLocaleString()}`);
  console.log(`     - Total Expenses: ₹${profitLoss.totalExpenses.toLocaleString()}`);
  console.log(`     - Net Profit: ₹${profitLoss.netProfit.toLocaleString()}`);

  console.log("\n================================================================================");
  console.log("🔐 USER LOGIN CREDENTIALS TABLE");
  console.log("================================================================================");
  console.log("All seeded users use the exact same uniform password: " + UNIFORM_PASSWORD);
  console.log("--------------------------------------------------------------------------------");
  console.log("| Role       | Name                         | Email                                     | Password |");
  console.log("--------------------------------------------------------------------------------");
  console.log(`| admin      | ${adminUser.name.padEnd(28)} | ${adminUser.email.padEnd(41)} | ${UNIFORM_PASSWORD} |`);
  console.log(`| accountant | ${accountantUser.name.padEnd(28)} | ${accountantUser.email.padEnd(41)} | ${UNIFORM_PASSWORD} |`);
  for (const c of allContacts) {
    console.log(`| contact    | ${c.name.padEnd(28)} | ${c.email.padEnd(41)} | ${UNIFORM_PASSWORD} |`);
  }
  console.log("--------------------------------------------------------------------------------");
  console.log("\n✨ Database seeding completed successfully!\n");
}

try {
  await seedDatabase();
  process.exit(0);
} catch (error) {
  console.error("\n❌ Database seed failed:", error);
  process.exit(1);
}
