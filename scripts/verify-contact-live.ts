import { Pool, neonConfig } from "@neondatabase/serverless";
import ws from "ws";

neonConfig.webSocketConstructor = ws;
const TARGET = "https://chibuezemaxwell.vercel.app";

async function main() {
  console.log("=== STEP 16: CONTACT FORM LIVE TEST ===");

  const pageRes = await fetch(`${TARGET}/contact`);
  const html = await pageRes.text();

  const action0Match = html.match(/name="\$ACTION_1:0"\s+value="([^"]+)"/);
  const action1Match = html.match(/name="\$ACTION_1:1"\s+value="([^"]+)"/);
  const actionKeyMatch = html.match(/name="\$ACTION_KEY"\s+value="([^"]+)"/);

  if (!action0Match || !actionKeyMatch) {
    throw new Error("Could not find action hidden inputs in /contact");
  }

  const action0 = action0Match[1]!.replace(/&quot;/g, '"');
  const action1 = action1Match ? action1Match[1]!.replace(/&quot;/g, '"') : "";
  const actionKey = actionKeyMatch[1]!;
  const actionId = JSON.parse(action0).id;

  const formData = new FormData();
  formData.append("$ACTION_REF_1", "");
  formData.append("$ACTION_1:0", action0);
  if (action1) formData.append("$ACTION_1:1", action1);
  formData.append("$ACTION_KEY", actionKey);
  formData.append("name", "Phase 10 Level 10.4 Verifier");
  formData.append("email", "verifier@example.com");
  formData.append("organization", "Phase 10 Audit");
  formData.append("reason", "Consulting / Contract");
  formData.append("message", "Live production contact form verification test.");
  formData.append("honeypot", "");

  const submitRes = await fetch(`${TARGET}/contact`, {
    method: "POST",
    headers: {
      "Next-Action": actionId,
    },
    body: formData,
  });

  console.log("Submit status:", submitRes.status);
  const resText = await submitRes.text();
  console.log("Response text:", resText.slice(0, 150));

  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const rows = await pool.query(
    "SELECT id, name, email, status, ip_hash, reason FROM contact_submissions WHERE email = $1",
    ["verifier@example.com"],
  );

  console.log("Created row count in DB:", rows.rows.length);
  if (rows.rows.length > 0) {
    const row = rows.rows[0];
    console.log("Status:", row.status);
    console.log("IP hash present:", Boolean(row.ip_hash && row.ip_hash.length >= 32));
    console.log("Reason:", row.reason);

    // Clean up test row immediately per Step 16
    await pool.query("DELETE FROM contact_submissions WHERE id = $1", [row.id]);
    console.log("Cleaned up verification contact submission from DB.");
  }

  // Test honeypot
  const hpFormData = new FormData();
  hpFormData.append("$ACTION_REF_1", "");
  hpFormData.append("$ACTION_1:0", action0);
  if (action1) hpFormData.append("$ACTION_1:1", action1);
  hpFormData.append("$ACTION_KEY", actionKey);
  hpFormData.append("name", "Spam Bot");
  hpFormData.append("email", "spambot@example.com");
  hpFormData.append("message", "Buy cheap Rolex watches!");
  hpFormData.append("honeypot", "https://spam-site.com");

  const hpRes = await fetch(`${TARGET}/contact`, {
    method: "POST",
    headers: {
      "Next-Action": actionId,
    },
    body: hpFormData,
  });
  console.log("Honeypot submit status:", hpRes.status);
  const hpRows = await pool.query(
    "SELECT id, status FROM contact_submissions WHERE email = $1",
    ["spambot@example.com"],
  );
  console.log(
    "Honeypot row in DB:",
    hpRows.rows.length > 0 ? hpRows.rows[0].status : "none",
  );
  if (hpRows.rows.length > 0) {
    await pool.query("DELETE FROM contact_submissions WHERE id = $1", [
      hpRows.rows[0].id,
    ]);
    console.log("Cleaned up spam test row from DB.");
  }

  await pool.end();
}

main().catch((err) => {
  console.error("Error:", err);
  process.exit(1);
});
