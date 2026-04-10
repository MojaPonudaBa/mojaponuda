import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { createClient } from "@supabase/supabase-js";

const projectRoot = process.cwd();
const targetEmails = [
  "marin.kolenda@outlook.com",
  "admin@tendersistem.com",
  "elektronski.pretinac@gmail.com",
];

function loadEnvFile(fileName) {
  const envPath = path.join(projectRoot, fileName);

  if (!fs.existsSync(envPath)) {
    return;
  }

  const content = fs.readFileSync(envPath, "utf8");

  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();

    if (!line || line.startsWith("#")) {
      continue;
    }

    const separatorIndex = line.indexOf("=");

    if (separatorIndex === -1) {
      continue;
    }

    const key = line.slice(0, separatorIndex).trim();
    let value = line.slice(separatorIndex + 1).trim();

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    if (!(key in process.env)) {
      process.env[key] = value;
    }
  }
}

loadEnvFile(".env.local");
loadEnvFile(".env");

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error(
    "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY. Add them to .env.local or current shell environment before running this script."
  );
}

const admin = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function listAllUsers() {
  const users = [];
  let page = 1;
  const perPage = 200;

  while (true) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage });

    if (error) {
      throw error;
    }

    const pageUsers = data?.users ?? [];
    users.push(...pageUsers);

    if (pageUsers.length < perPage) {
      break;
    }

    page += 1;
  }

  return users;
}

async function main() {
  const users = await listAllUsers();
  const normalizedTargets = new Set(targetEmails.map((email) => email.toLowerCase()));
  const usersToDelete = users.filter((user) => {
    const email = user.email?.trim().toLowerCase();
    return email ? normalizedTargets.has(email) : false;
  });
  const foundEmails = new Set(
    usersToDelete
      .map((user) => user.email?.trim().toLowerCase())
      .filter(Boolean)
  );

  if (usersToDelete.length === 0) {
    console.log("No matching users found.");
    return;
  }

  for (const user of usersToDelete) {
    const { error } = await admin.auth.admin.deleteUser(user.id);

    if (error) {
      throw error;
    }

    console.log(`Deleted ${user.email} (${user.id})`);
  }

  for (const email of targetEmails) {
    if (!foundEmails.has(email.toLowerCase())) {
      console.log(`Not found ${email}`);
    }
  }
}

main().catch((error) => {
  console.error("Failed to delete test users:", error);
  process.exitCode = 1;
});

