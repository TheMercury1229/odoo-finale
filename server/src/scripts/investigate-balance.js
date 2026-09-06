import "dotenv/config";
import db from "../config/db.js";
import { sql } from "drizzle-orm";

async function investigate() {
  console.log("=== STEP 1: Check all journal entries for debit vs credit sum ===");
  const unbalancedEntries = await db.execute(sql`
    SELECT 
      je.id,
      je.reference,
      je.source_type,
      je.source_id,
      je.organization_id,
      COALESCE(SUM(jel.debit), 0) as total_debit,
      COALESCE(SUM(jel.credit), 0) as total_credit,
      COALESCE(SUM(jel.debit), 0) - COALESCE(SUM(jel.credit), 0) as diff
    FROM journal_entry je
    LEFT JOIN journal_entry_line jel ON je.id = jel.journal_entry_id
    GROUP BY je.id, je.reference, je.source_type, je.source_id, je.organization_id
    HAVING ABS(COALESCE(SUM(jel.debit), 0) - COALESCE(SUM(jel.credit), 0)) > 0.001
  `);
  console.log("Unbalanced entries count:", unbalancedEntries.rows.length);
  if (unbalancedEntries.rows.length > 0) {
    console.table(unbalancedEntries.rows);
  } else {
    console.log("-> Zero unbalanced entries! Every journal entry individually has Sum(Debit) === Sum(Credit).");
  }

  console.log("\n=== STEP 2: Grand total debits and credits across ALL lines in org ===");
  const allLinesTotal = await db.execute(sql`
    SELECT 
      COALESCE(SUM(jel.debit), 0) as grand_total_debit,
      COALESCE(SUM(jel.credit), 0) as grand_total_credit,
      COALESCE(SUM(jel.debit), 0) - COALESCE(SUM(jel.credit), 0) as grand_diff
    FROM journal_entry_line jel
  `);
  console.table(allLinesTotal.rows);

  console.log("\n=== STEP 3: Check Capital account lines & running balances ===");
  const capitalLines = await db.execute(sql`
    SELECT 
      coa.id,
      coa.name,
      coa.type,
      COALESCE(SUM(jel.debit), 0) as total_debit,
      COALESCE(SUM(jel.credit), 0) as total_credit,
      COUNT(jel.id) as line_count
    FROM chart_of_accounts coa
    LEFT JOIN journal_entry_line jel ON coa.id = jel.account_id
    WHERE coa.type IN ('capital')
    GROUP BY coa.id, coa.name, coa.type
  `);
  console.table(capitalLines.rows);

  console.log("\n=== STEP 4: Check Totals by Account Type ===");
  const typeTotals = await db.execute(sql`
    SELECT 
      coa.type,
      COALESCE(SUM(jel.debit), 0) as total_debit,
      COALESCE(SUM(jel.credit), 0) as total_credit,
      CASE 
        WHEN coa.type IN ('asset', 'expense') THEN COALESCE(SUM(jel.debit), 0) - COALESCE(SUM(jel.credit), 0)
        ELSE COALESCE(SUM(jel.credit), 0) - COALESCE(SUM(jel.debit), 0)
      END as net_balance
    FROM chart_of_accounts coa
    LEFT JOIN journal_entry_line jel ON coa.id = jel.account_id
    GROUP BY coa.type
    ORDER BY coa.type
  `);
  console.table(typeTotals.rows);

  console.log("\n=== STEP 5: Check All Accounts with balances ===");
  const accountBalances = await db.execute(sql`
    SELECT 
      coa.id,
      coa.name,
      coa.type,
      COALESCE(SUM(jel.debit), 0) as total_debit,
      COALESCE(SUM(jel.credit), 0) as total_credit,
      CASE 
        WHEN coa.type IN ('asset', 'expense') THEN COALESCE(SUM(jel.debit), 0) - COALESCE(SUM(jel.credit), 0)
        ELSE COALESCE(SUM(jel.credit), 0) - COALESCE(SUM(jel.debit), 0)
      END as balance
    FROM chart_of_accounts coa
    LEFT JOIN journal_entry_line jel ON coa.id = jel.account_id
    GROUP BY coa.id, coa.name, coa.type
    ORDER BY coa.type, coa.name
  `);
  console.table(accountBalances.rows);

  process.exit(0);
}

investigate().catch((err) => {
  console.error("Error:", err);
  process.exit(1);
});
