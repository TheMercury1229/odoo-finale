import { eq, and } from "drizzle-orm";
import { hashPassword } from "better-auth/crypto";
import db from "../config/db.js";
import {
  account,
  chartOfAccounts,
  journal,
  member,
  organization,
  user,
} from "../db/schema.js";

const organizationId = "org_urban_furniture";
const adminId = "user_urban_furniture_admin";
const adminEmail = process.env.SEED_ADMIN_EMAIL || "admin@urbanfurniture.local";
const adminPassword = process.env.SEED_ADMIN_PASSWORD || "UrbanFurniture123!";
const createdAt = new Date();

const accounts = [
  { id: "coa_bank", name: "Bank", type: "asset" },
  { id: "coa_purchase_expense", name: "Purchase Expense", type: "expense" },
  { id: "coa_debtors", name: "Debtors", type: "asset" },
  { id: "coa_creditors", name: "Creditors", type: "liability" },
  { id: "coa_sales_income", name: "Sales Income", type: "income" },
  { id: "coa_cash", name: "Cash", type: "asset" },
  { id: "coa_other_expense", name: "Other Expense", type: "expense" },
  { id: "coa_capital", name: "Capital", type: "capital" },
];

const journals = [
  { id: "journal_sales", name: "Sales", type: "sales", defaultAccountId: null },
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

async function seedDatabase() {
  const password = await hashPassword(adminPassword);

  await db.transaction(async (tx) => {
    await tx
      .insert(organization)
      .values({
        id: organizationId,
        name: "Urban Furniture",
        slug: "urban-furniture",
        createdAt,
      })
      .onConflictDoUpdate({
        target: organization.slug,
        set: { name: "Urban Furniture" },
      });

    await tx
      .insert(user)
      .values({
        id: adminId,
        name: "Urban Furniture Admin",
        email: adminEmail,
        role: "admin",
        emailVerified: true,
        createdAt,
        updatedAt: createdAt,
      })
      .onConflictDoUpdate({
        target: user.email,
        set: { role: "admin", emailVerified: true },
      });

    await tx
      .insert(account)
      .values({
        id: "account_urban_furniture_admin",
        issuer: "credential",
        accountId: adminId,
        providerId: "credential",
        userId: adminId,
        password,
        createdAt,
        updatedAt: createdAt,
      })
      .onConflictDoNothing();

    await tx
      .insert(member)
      .values({
        id: "member_urban_furniture_admin",
        organizationId,
        userId: adminId,
        role: "admin",
        createdAt,
      })
      .onConflictDoUpdate({
        target: member.id,
        set: { organizationId, userId: adminId, role: "admin" },
      });

    for (const item of accounts) {
      await tx
        .insert(chartOfAccounts)
        .values({ ...item, organizationId })
        .onConflictDoUpdate({
          target: chartOfAccounts.id,
          set: { name: item.name, type: item.type },
        });
    }

    for (const item of journals) {
      await tx
        .insert(journal)
        .values({ ...item, organizationId })
        .onConflictDoUpdate({
          target: [journal.organizationId, journal.type],
          set: { name: item.name, defaultAccountId: item.defaultAccountId },
        });
    }
  });

  console.log("Database seeded successfully.");
}

try {
  await seedDatabase();
} catch (error) {
  console.error("Database seed failed:", error);
  process.exitCode = 1;
}
