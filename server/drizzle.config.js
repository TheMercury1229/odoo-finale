import "dotenv/config";
import { defineConfig } from "drizzle-kit";
import envVars from "./src/config/env.js";

export default defineConfig({
  out: "./drizzle",
  schema: "./src/db/schema.js",
  dialect: "postgresql",
  dbCredentials: {
    url: envVars.DATABASE_URL,
  },
});
