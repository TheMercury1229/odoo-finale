import "dotenv/config";
import { drizzle } from "drizzle-orm/node-postgres";
import envVars from "./env.js";

const db = drizzle(envVars.DATABASE_URL);
export default db;
