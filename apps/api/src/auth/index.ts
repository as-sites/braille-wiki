import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { apiKey } from "@better-auth/api-key";
import { account, apikey, db, session, user, verification } from "@braille-wiki/db";

export const auth = betterAuth({
  secret: process.env.BETTER_AUTH_SECRET,

  database: drizzleAdapter(db, {
    provider: "pg",
    schema: {
      user,
      session,
      account,
      verification,
      apikey,
    },
  }),

  emailAndPassword: {
    enabled: true,
  },

  user: {
    additionalFields: {
      role: {
        type: "string",
        required: false,
        defaultValue: "editor",
        input: false,
      },
    },
  },

  session: {
    cookieCache: {
      enabled: true,
      maxAge: 5 * 60, // 5 minutes
    },
  },

  advanced: {
    cookies: {
      session_token: {
        attributes: {
          sameSite: "lax",
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
        },
      },
    },
  },

  trustedOrigins: process.env.ADMIN_ORIGIN
    ? [process.env.ADMIN_ORIGIN]
    : ["http://localhost:5173"],

  plugins: [apiKey()],
});

export type Auth = typeof auth;
