// Operator-only bootstrap. Never expose this script as a public web endpoint.
import { existsSync } from "node:fs";
import { createInterface } from "node:readline/promises";
import { Pool, neonConfig } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";
import ws from "ws";
import { z } from "zod";
import { hashPassword } from "../src/lib/auth/password";
import * as schema from "../src/lib/db/schema";

function secretQuestion(label: string): Promise<string> {
  const input = process.stdin;
  if (!input.isTTY || !process.stdout.isTTY)
    throw new Error(
      "Run setup in an interactive terminal so the password can stay hidden.",
    );
  process.stdout.write(label);
  return new Promise((resolve, reject) => {
    let value = "";
    const wasRaw = input.isRaw;
    const finish = (error?: Error) => {
      input.removeListener("data", onData);
      input.setRawMode(wasRaw);
      input.pause();
      process.stdout.write("\n");
      if (error) reject(error);
      else resolve(value);
    };
    const onData = (chunk: string) => {
      if (chunk.startsWith("\u001b")) return;
      for (const char of chunk) {
        if (char === "\u0003") return finish(new Error("Setup cancelled."));
        if (char === "\r" || char === "\n") return finish();
        if (char === "\u007f" || char === "\b") value = [...value].slice(0, -1).join("");
        else if (char >= " ") value += char;
      }
    };
    input.setEncoding("utf8");
    input.setRawMode(true);
    input.on("data", onData);
    input.resume();
  });
}

async function main() {
  if (existsSync(".env.local")) process.loadEnvFile(".env.local");
  if (!process.env.DATABASE_URL)
    throw new Error(
      "Database access is needed first. Connect Neon or configure DATABASE_URL in the ignored .env.local file.",
    );
  const prompt = createInterface({ input: process.stdin, output: process.stdout });
  const email = (process.env.ADMIN_EMAIL || (await prompt.question("Admin email: ")))
    .trim()
    .toLowerCase();
  prompt.close();
  if (!z.email().safeParse(email).success)
    throw new Error("Enter a valid email address.");
  let password = await secretQuestion("Choose a password (16+ characters; hidden): ");
  if (password.length < 16 || password.length > 1024)
    throw new Error("Choose a password between 16 and 1024 characters.");
  let confirmation = await secretQuestion("Confirm password (hidden): ");
  if (confirmation !== password)
    throw new Error("The passwords did not match. No account was changed.");
  const passwordHash = await hashPassword(password);
  password = confirmation = "";
  neonConfig.webSocketConstructor = ws;
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  try {
    const database = drizzle(pool, { schema });
    const created = await database
      .insert(schema.users)
      .values({ email, passwordHash, name: "Administrator", role: "ADMIN" })
      .onConflictDoNothing({ target: schema.users.email })
      .returning({ id: schema.users.id });
    if (!created.length)
      throw new Error(
        "An account already exists for that email. No password was changed; use the existing credentials or request a password reset.",
      );
    console.log(
      "Admin account created. Sign in at https://chibuezemaxwell.vercel.app/admin/login using your chosen email and password.",
    );
  } finally {
    await pool.end();
  }
}

main().catch((error: unknown) => {
  // Only our own setup errors are safe to show. Driver errors may contain SQL.
  const text = error instanceof Error ? error.message : "";
  const safe =
    /^(Run setup|Setup cancelled|Database access|Enter a valid|Choose a password|The passwords|An account already)/.test(
      text,
    );
  console.error(
    safe
      ? text
      : "Account setup failed. Check database access and try again. No password has been printed or saved to a file.",
  );
  process.exitCode = 1;
});
