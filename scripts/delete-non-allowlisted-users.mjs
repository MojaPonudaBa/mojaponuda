/**
 * Briše SVE auth korisnike osim admin računa i 3 test računa:
 *   - marin.kolenda@outlook.com
 *   - test1@tendersistem.com
 *   - test2@tendersistem.com
 *   - test3@tendersistem.com
 *
 * DRY-RUN je podrazumijevano. Pokreni sa flag-om --apply za stvarno brisanje.
 *
 *   node scripts/delete-non-allowlisted-users.mjs           # samo lista
 *   node scripts/delete-non-allowlisted-users.mjs --apply   # stvarno brise
 */
import fs from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";

const apply = process.argv.includes("--apply");

function loadEnv(name) {
  const p = path.join(process.cwd(), name);
  if (!fs.existsSync(p)) return;
  for (const raw of fs.readFileSync(p, "utf8").split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const i = line.indexOf("=");
    if (i === -1) continue;
    const k = line.slice(0, i).trim();
    let v = line.slice(i + 1).trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
    if (!(k in process.env)) process.env[k] = v;
  }
}
loadEnv(".env.local");
loadEnv(".env");

const s = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

const KEEP = new Set([
  "marin.kolenda@outlook.com",
  "test1@tendersistem.com",
  "test2@tendersistem.com",
  "test3@tendersistem.com",
].map((e) => e.toLowerCase()));

async function listAll() {
  const all = [];
  let page = 1;
  const perPage = 200;
  for (;;) {
    const { data, error } = await s.auth.admin.listUsers({ page, perPage });
    if (error) throw error;
    all.push(...(data?.users ?? []));
    if ((data?.users ?? []).length < perPage) break;
    page += 1;
  }
  return all;
}

async function main() {
  const users = await listAll();
  const toDelete = users.filter((u) => !KEEP.has((u.email ?? "").toLowerCase()));
  const kept = users.filter((u) => KEEP.has((u.email ?? "").toLowerCase()));

  console.log(`Total users:      ${users.length}`);
  console.log(`Keep (${kept.length}):`);
  for (const u of kept) console.log(`  KEEP   ${u.email}  (${u.id})`);
  console.log(`\nWill delete (${toDelete.length}):`);
  for (const u of toDelete) console.log(`  DELETE ${u.email}  (${u.id})`);

  if (!apply) {
    console.log("\n[DRY-RUN] Re-run with --apply to actually delete.");
    return;
  }

  console.log(`\nApplying deletions...`);
  let ok = 0;
  let fail = 0;
  for (const u of toDelete) {
    const { error } = await s.auth.admin.deleteUser(u.id);
    if (error) {
      console.error(`  FAIL   ${u.email}: ${error.message}`);
      fail += 1;
    } else {
      console.log(`  done   ${u.email}`);
      ok += 1;
    }
  }
  console.log(`\nDeleted: ${ok}   Failed: ${fail}`);
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
