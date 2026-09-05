import { createAuthClient } from "better-auth/react";
import { adminClient, organizationClient } from "better-auth/client/plugins";
import { ac, adminRole, accountantRole, contactRole } from "./permissions";
export const authClient = createAuthClient({
  baseURL: process.env.BETTER_AUTH_URL || "http://localhost:5000",
  emailAndPassword: {
    enabled: true,
  },
  plugins: [
    adminClient({
      ac,
      roles: {
        admin: adminRole,
        accountant: accountantRole,
        contact: contactRole,
      },
    }),
    organizationClient({
      ac,
      roles: {
        admin: adminRole,
        accountant: accountantRole,
        contact: contactRole,
      },
    }),
  ],
});
