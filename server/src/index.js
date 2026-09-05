import express from "express";
import { toNodeHandler } from "better-auth/node";
import { auth } from "./lib/auth.js";
import envVars from "./config/env.js";
import cors from "cors";
const port = process.env.PORT || 5000;
const app = express();
app.all("/api/auth/{*any}", toNodeHandler(auth));
app.use(
  cors({
    origin: envVars.CLIENT_URL,
    credentials: true,
    allowedHeaders: ["Content-Type", "Authorization"],
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  }),
);
app.use(express.json());
app.get("/", (req, res) => {
  res.send("Hello World!");
});
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
