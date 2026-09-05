import express from "express";
import { toNodeHandler } from "better-auth/node";
import { auth } from "./lib/auth.js";
import envVars from "./config/env.js";
import cors from "cors";
import contactsRouter from "./routes/contacts.route.js";
import productsRouter from "./routes/products.route.js";
import chartOfAccountsRouter from "./routes/chart-of-accounts.route.js";
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
