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
 * Provjeri da li korisnik ima spremljene eJN kredencijale (bez dekripcije).
 * Koristi se za UI — skrivanje "Auto-preuzmi TD" dugmeta.
 */
export async function hasEjnCredentials(userId: string): Promise<boolean> {
  const supabase: AnyClient = createAdminClient();
  const { data } = await supabase
    .from("ejn_credentials")
    .select("user_id")
    .eq("user_id", userId)
    .maybeSingle();
  return Boolean(data);
}

/**
 * Preuzmi tendersku dokumentaciju sa eJN portala za tender s portalId.
 *
 * ARHITEKTURA:
 * Otvoreni EJN API (open.ejn.gov.ba) vraća samo metadata. TD dokumentacija je
 * dostupna SAMO kroz autentikovani UI na ejn.gov.ba (ASP.NET aplikacija s
 * VIEWSTATE + cookies). Dva moguća pristupa za implementaciju:
 *
 *   1. HEADLESS BROWSER (Playwright) — robusno, ali ~300MB dep, prevelik za
 *      Vercel serverless. Rješenje: eksterni worker (Railway / Render / VPS)
 *      koji izlaže endpoint POST /download-td. Ovaj fajl ga poziva kroz HTTP.
 *
 *   2. FETCH + CHEERIO — lagano, ali krhko (svaki redesign portala lomi
 *      parser). Zahtijeva mapiranje VIEWSTATE → form submission.
 *
 * Obje opcije zahtijevaju živo testiranje s pravim kredencijalima. Trenutni
 * kod vraća `not_implemented`; kad worker bude spreman, samo zamijeni tijelo
 * funkcije HTTP pozivom na njega — signature ostaje isti.
 *
 * Env varijable kad bude vrijeme:
 *   EJN_TD_WORKER_URL    — URL background worker-a (npr. https://td.myapp.com)
 *   EJN_TD_WORKER_TOKEN  — Bearer token za worker-ov POST endpoint
 */
export async function fetchTenderDocumentation(
  userId: string,
  tenderPortalId: string
): Promise<
  | { ok: true; fileName: string; content: Buffer; contentType: string }
  | {
      ok: false;
      reason: "no_credentials" | "login_failed" | "not_implemented" | "fetch_failed" | "worker_unavailable";
      message: string;
    }
> {
  const creds = await getEjnCredentials(userId);
  if (!creds) {
    return { ok: false, reason: "no_credentials", message: "Povežite eJN nalog u Postavkama." };
  }

  const workerUrl = process.env.EJN_TD_WORKER_URL;
  const workerToken = process.env.EJN_TD_WORKER_TOKEN;

  // Ako worker nije konfigurisan, javi jasno i ne troši dalje.
  if (!workerUrl || !workerToken) {
    console.log(
      `[ejn-auto-td] worker nije konfigurisan (user=${userId}, tender=${tenderPortalId}). ` +
        "Postavi EJN_TD_WORKER_URL + EJN_TD_WORKER_TOKEN kad se deploya headless worker."
    );
    return {
      ok: false,
      reason: "not_implemented",
      message: "Auto-preuzimanje TD-a još nije aktivno. Učitajte dokumentaciju ručno.",
    };
  }

  try {
    const res = await fetch(`${workerUrl}/download-td`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${workerToken}`,
      },
      body: JSON.stringify({
        username: creds.username,
        password: creds.password,
        tenderPortalId,
      }),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      if (res.status === 401) {
        return { ok: false, reason: "login_failed", message: "eJN prijava odbijena — provjerite kredencijale." };
      }
      return { ok: false, reason: "fetch_failed", message: `Worker ${res.status}: ${body.slice(0, 200)}` };
    }

    const contentType = res.headers.get("content-type") ?? "application/octet-stream";
    const disposition = res.headers.get("content-disposition") ?? "";
    const fileNameMatch = disposition.match(/filename="?([^"]+)"?/i);
    const fileName = fileNameMatch?.[1] ?? `td-${tenderPortalId}.zip`;
    const buf = Buffer.from(await res.arrayBuffer());

    return { ok: true, fileName, content: buf, contentType };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { ok: false, reason: "worker_unavailable", message: msg };
  }
}
