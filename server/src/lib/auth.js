import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import db from "../config/db.js"; // your drizzle instance
import * as schema from "../db/schema.js";
import { member } from "../db/schema.js";
import envVars from "../config/env.js";
import { admin, organization } from "better-auth/plugins";
import { ac, accountantRole, adminRole, contactRole } from "./permissions.js";

import { sendInvitationEmail } from "./email.js";

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
    schema,
  }),
  emailAndPassword: {
    enabled: true,
  },
  databaseHooks: {
    user: {
      create: {
        // before: async () => ({ data: { role: "admin" } }),
        after: async (createdUser) => {
          await db.insert(member).values({
            id: `member_${createdUser.id}`,
            organizationId: "org_urban_furniture",
            userId: createdUser.id,
            role: createdUser.role || "contact",
            createdAt: new Date(),
          });
        },
      },
    },
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
      async sendInvitationEmail(data) {
        const clientBase =
          process.env.APP_URL || envVars.CLIENT_URL || "http://localhost:3000";
        const inviteLink = `${clientBase}/accept-invite?id=${data.id}`;
        await sendInvitationEmail({
          to: data.email,
          inviterName: data.inviter?.user?.name || data.inviter?.user?.email,
          organizationName: data.organization?.name || "Urban Furniture",
          inviteLink,
        });
      },
    }),
  ],
});
