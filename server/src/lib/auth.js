import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import db from "../config/db.js"; // your drizzle instance
import envVars from "../config/env.js";
import { admin, organization } from "better-auth/plugins";
import { ac, accountantRole, adminRole, contactRole } from "./permissions.js";

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
  }),
  emailAndPassword: {
    enabled: true,
  },
  trustedOrigins: [envVars.CLIENT_URL],
  plugins: [
    admin({
      ac,
      roles: {
        admin: adminRole,
        accountant: accountantRole,
        contact: contactRole,
      },
      defaultRole: "contact",
    }),
    organization({
      ac,
      roles: {
        admin: adminRole,
        accountant: accountantRole,
        contact: contactRole,
      },
      allowUserToCreateOrganization: false, // single seeded org only
      creatorRole: "admin",
    }),
  ],
});
