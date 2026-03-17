"use client";

import { Suspense, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import type { EmailOtpType } from "@supabase/supabase-js";
import { CheckCircle2, Loader2, MailWarning } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";

const redirectErrorMessages: Record<string, string> = {
  otp_expired:
    "Link je istekao ili je već otvoren. Ako koristite Outlook, otvorite najnoviji email ili pošaljite novi signup link.",
  access_denied: "Pristup potvrdi email adrese nije uspio. Pokušajte ponovo iz najnovijeg emaila.",
};

function translateError(code: string | null, fallback?: string | null): string {
  if (code && redirectErrorMessages[code]) {
    return redirectErrorMessages[code];
  }

  if (fallback) {
    return fallback;
  }

  return "Potvrda email adrese nije uspjela. Pokušajte ponovo iz najnovijeg emaila.";
}

function getSafeNext(next: string | null): string {
  if (!next || !next.startsWith("/")) {
    return "/onboarding";
  }

  return next;
}

function getOtpType(value: string | null): EmailOtpType {
  const allowedTypes: EmailOtpType[] = [
    "signup",
    "invite",
    "magiclink",
    "recovery",
    "email_change",
    "email",
  ];

  if (value && allowedTypes.includes(value as EmailOtpType)) {
    return value as EmailOtpType;
  }

  return "email";
}

function ConfirmEmailContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const tokenHash = searchParams.get("token_hash");
  const type = getOtpType(searchParams.get("type"));
  const next = getSafeNext(searchParams.get("next"));
  const initialError = useMemo(() => {
    const code = searchParams.get("error_code") ?? searchParams.get("error");
    const description = searchParams.get("error_description");

    if (!code && !description) {
      return null;
    }

    return translateError(code, description);
  }, [searchParams]);

  async function handleConfirm() {
    if (!tokenHash) {
      setError("Link za potvrdu nije potpun. Otvorite najnoviji email i pokušajte ponovo.");
      return;
    }

    setError(null);
    setLoading(true);

    const supabase = createClient();
    const { error: verifyError } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type,
    });

    if (verifyError) {
      setError(translateError(verifyError.code ?? null, verifyError.message));
      setLoading(false);
      return;
    }

    setSuccess(true);
    router.push(next);
    router.refresh();
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-12">
      <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-xl shadow-blue-500/5 sm:p-10">
        <div className="mb-6 flex justify-center">
          <div className={`rounded-full p-4 ${success ? "bg-emerald-50" : "bg-blue-50"}`}>
            {success ? (
              <CheckCircle2 className="size-12 text-emerald-500" />
            ) : (
              <MailWarning className="size-12 text-blue-600" />
            )}
          </div>
        </div>

        <h1 className="font-heading text-2xl font-bold text-slate-900">
          {success ? "Email je potvrđen" : "Potvrdite email adresu"}
        </h1>
        <p className="mt-3 text-sm leading-6 text-slate-500">
          {success
            ? "Preusmjeravamo vas dalje..."
            : "Radi sigurnosti potvrda se izvršava tek kada vi kliknete dugme ispod. Ovo smanjuje problem sa Outlook i Safe Links automatskim otvaranjem email linka."}
        </p>

        {(error ?? initialError) ? (
          <div className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4 text-left text-sm font-medium text-red-600">
            {error ?? initialError}
          </div>
        ) : null}

        <div className="mt-8 space-y-3">
          <Button
            type="button"
            onClick={handleConfirm}
            className="h-12 w-full rounded-full bg-primary text-base font-bold text-white shadow-lg shadow-blue-500/30 transition-all hover:bg-blue-700 hover:shadow-blue-500/40"
            disabled={loading || success}
          >
            {loading ? <Loader2 className="mr-2 size-5 animate-spin" /> : null}
            Potvrdite email
          </Button>

          <Link
            href="/login"
            className="block text-sm font-semibold text-slate-500 transition-colors hover:text-primary"
          >
            Nazad na prijavu
          </Link>
        </div>
      </div>
    </div>
  );
}

function ConfirmEmailFallback() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-12">
      <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-xl shadow-blue-500/5 sm:p-10">
        <div className="mb-6 flex justify-center">
          <div className="rounded-full bg-blue-50 p-4">
            <Loader2 className="size-12 animate-spin text-blue-600" />
          </div>
        </div>

        <h1 className="font-heading text-2xl font-bold text-slate-900">
          Pripremamo potvrdu email adrese
        </h1>
        <p className="mt-3 text-sm leading-6 text-slate-500">
          Sačekajte trenutak dok učitamo podatke iz linka za potvrdu.
        </p>
      </div>
    </div>
  );
}

export default function ConfirmEmailPage() {
  return (
    <Suspense fallback={<ConfirmEmailFallback />}>
      <ConfirmEmailContent />
    </Suspense>
  );
}
