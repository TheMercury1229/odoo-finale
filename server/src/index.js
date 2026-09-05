import express from "express";
import { toNodeHandler } from "better-auth/node";
import { auth } from "./lib/auth.js";
import envVars from "./config/env.js";
import cors from "cors";
import contactsRouter from "./routes/contacts.route.js";
import productsRouter from "./routes/products.route.js";
import chartOfAccountsRouter from "./routes/chart-of-accounts.route.js";
import journalsRouter from "./routes/journals.route.js";
import journalEntriesRouter from "./routes/journal-entries.route.js";
import purchaseOrdersRouter from "./routes/purchase-orders.route.js";
import vendorBillsRouter from "./routes/vendor-bills.route.js";
import paymentsRouter from "./routes/payments.route.js";
import salesOrdersRouter from "./routes/sales-orders.route.js";
import customerInvoicesRouter from "./routes/customer-invoices.route.js";
import reportsRouter from "./routes/reports.route.js";
const port = process.env.PORT || 5000;
const app = express();
app.use(
  cors({
    origin: envVars.CLIENT_URL,
    credentials: true,
    allowedHeaders: ["Content-Type", "Authorization"],
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  }),
);
app.all("/api/auth/{*any}", toNodeHandler(auth));
app.use(express.json());
app.use("/api/contacts", contactsRouter);
app.use("/api/products", productsRouter);
app.use("/api/chart-of-accounts", chartOfAccountsRouter);
app.use("/api/journals", journalsRouter);
app.use("/api/journal-entries", journalEntriesRouter);
app.use("/api/purchase-orders", purchaseOrdersRouter);
app.use("/api/vendor-bills", vendorBillsRouter);
app.use("/api/payments", paymentsRouter);
app.use("/api/sales-orders", salesOrdersRouter);
app.use("/api/customer-invoices", customerInvoicesRouter);
app.use("/api/reports", reportsRouter);
app.get("/", (req, res) => {
  res.send("Hello World!");
});
app.use((error, req, res, next) => {
  console.error(error);
  return res.status(500).json({ error: "Internal server error" });
});
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
