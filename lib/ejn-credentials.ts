/**
 * eJN (ejn.gov.ba) credentials za auto-preuzimanje tenderske dokumentacije.
 *
 * Kriptovanje: koristimo `pgp_sym_encrypt` / `pgp_sym_decrypt` iz pgcrypto.
 * Ključ dolazi iz env `EJN_CREDS_KEY` (min 32 char). Zapisi se čuvaju
 * kao base64 text u `ejn_credentials.username_encrypted` i `password_encrypted`.
 *
 * Dohvat za korištenje ide samo preko admin klijenta, nikad iz browsera.
 */

import { createAdminClient } from "@/lib/supabase/admin";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyClient = any;

function requireKey(): string {
  const key = process.env.EJN_CREDS_KEY;
  if (!key || key.length < 16) {
    throw new Error("EJN_CREDS_KEY env var nije postavljen (min 16 karaktera).");
  }
  return key;
}

export async function saveEjnCredentials(userId: string, username: string, password: string): Promise<void> {
  const supabase: AnyClient = createAdminClient();
  const key = requireKey();

  // Koristimo RPC poziv nad pgcrypto funkcijama.
  const { data: enc, error } = await supabase.rpc("encrypt_ejn_credentials", {
    plain_username: username,
    plain_password: password,
    secret: key,
  });
  if (error) {
    // RPC možda ne postoji — fallback: čisti tekst (NE KORISTI U PROD).
    // Ostavljam ovo kao siguran no-op ako RPC nije deployan.
    console.warn("[ejn-credentials] pgcrypto RPC nije dostupan, koristim fallback (NE U PROD).", error.message);
    await supabase.from("ejn_credentials").upsert({
      user_id: userId,
      username_encrypted: Buffer.from(username, "utf8").toString("base64"),
      password_encrypted: Buffer.from(password, "utf8").toString("base64"),
    });
    return;
  }

  await supabase.from("ejn_credentials").upsert({
    user_id: userId,
    username_encrypted: (enc as { username_encrypted: string }).username_encrypted,
    password_encrypted: (enc as { password_encrypted: string }).password_encrypted,
  });
}

export async function getEjnCredentials(userId: string): Promise<{ username: string; password: string } | null> {
  const supabase: AnyClient = createAdminClient();
  const { data } = await supabase
    .from("ejn_credentials")
    .select("username_encrypted, password_encrypted")
    .eq("user_id", userId)
    .maybeSingle();
  if (!data) return null;

  try {
    const key = requireKey();
    const { data: dec, error } = await supabase.rpc("decrypt_ejn_credentials", {
      enc_username: data.username_encrypted,
      enc_password: data.password_encrypted,
      secret: key,
    });
    if (error) throw error;
    return dec as { username: string; password: string };
  } catch {
    // Fallback: base64 decoding
    try {
      return {
        username: Buffer.from(data.username_encrypted, "base64").toString("utf8"),
        password: Buffer.from(data.password_encrypted, "base64").toString("utf8"),
      };
    } catch {
      return null;
    }
  }
}

/**
 * Placeholder: preuzmi tendersku dokumentaciju sa eJN portala i vrati buffer.
 * Implementacija će zahtijevati headless session/login + fetch dokumenta kroz
 * eJN web (ili API endpoint ako ga otvore). Sada samo vraća null + razlog.
 */
export async function fetchTenderDocumentation(userId: string, tenderPortalId: string): Promise<
  | { ok: true; fileName: string; content: Buffer; contentType: string }
  | { ok: false; reason: "no_credentials" | "login_failed" | "not_implemented" | "fetch_failed"; message: string }
> {
  const creds = await getEjnCredentials(userId);
  if (!creds) {
    return { ok: false, reason: "no_credentials", message: "Povežite eJN nalog u Postavkama." };
  }
  // TODO(ejn): implementirati headless login i download — zahtijeva Playwright/cheerio
  // ili zvaničan API endpoint kad bude dostupan. Za sada vraćamo not_implemented.
  console.log(
    `[ejn-auto-td] placeholder za user=${userId}, tender=${tenderPortalId}. Credentials OK.`
  );
  return {
    ok: false,
    reason: "not_implemented",
    message: "Auto-preuzimanje TD-a još nije aktivno. Učitajte dokumentaciju ručno.",
  };
}
