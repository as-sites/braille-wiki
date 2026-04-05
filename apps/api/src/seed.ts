/**
 * Seed script — creates the initial admin user if the user table is empty.
 *
 * Run directly: npx tsx src/seed.ts
 * Or import and call seedAdmin() at server startup.
 *
 * Requires env vars: INITIAL_ADMIN_EMAIL, INITIAL_ADMIN_PASSWORD, DATABASE_URL, BETTER_AUTH_SECRET
 */
import { sql, db } from "@braille-docs/db";
import { auth } from "./auth/index";

export async function seedAdmin(): Promise<void> {
  const email = process.env.INITIAL_ADMIN_EMAIL;
  const password = process.env.INITIAL_ADMIN_PASSWORD;

  if (!email || !password) {
    console.log("[seed] INITIAL_ADMIN_EMAIL / INITIAL_ADMIN_PASSWORD not set — skipping.");
    return;
  }

  let userExists = false;
  try {
    const rows = await db.execute<{ id: string }>(
      sql`SELECT id FROM "user" WHERE email = ${email} LIMIT 1`,
    );
    userExists = rows.rows.length > 0;
  } catch (err: unknown) {
    const code = (err as any)?.cause?.code ?? (err as any)?.code;
    if (code === "42P01") {
      console.warn(
        "[seed] Database tables not found — run migrations first: pnpm --filter @braille-docs/db db:migrate",
      );
      return;
    }
    throw err;
  }

  if (userExists) {
    await db.execute(
      sql`UPDATE "user" SET role = 'admin' WHERE email = ${email}`,
    );
    console.log(`[seed] User ${email} already exists — ensured admin role.`);
    return;
  }

  console.log(`[seed] User ${email} not found. Creating initial admin.`);

  await auth.api.signUpEmail({
    body: { email, password, name: "Admin" },
  });

  await db.execute(
    sql`UPDATE "user" SET role = 'admin' WHERE email = ${email}`,
  );

  console.log("[seed] Initial admin user created.");
}

// Allow running directly: npx tsx src/seed.ts
if (process.argv[1]?.endsWith("seed.ts") || process.argv[1]?.endsWith("seed.js")) {
  seedAdmin().catch((err) => {
    console.error("[seed] Failed:", err);
    process.exit(1);
  });
}
