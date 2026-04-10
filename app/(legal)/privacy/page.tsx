import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-16">
      <Link
        href="/"
        className="mb-8 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Nazad na poÄetnu
      </Link>

      <h1 className="font-serif text-3xl font-bold tracking-tight">
        Politika privatnosti
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Posljednja izmjena: mart 2026.
      </p>

      <div className="mt-8 space-y-6 text-sm leading-relaxed text-muted-foreground">
        <section>
          <h2 className="font-serif text-lg font-bold text-foreground">
            1. Uvod
          </h2>
          <p className="mt-2">
            TenderSistem.com (&quot;mi&quot;, &quot;naÅ¡a platforma&quot;) posveÄ‡ena je zaÅ¡titi
            privatnosti svojih korisnika. Ova politika objaÅ¡njava kako
            prikupljamo, koristimo i Å¡titimo vaÅ¡e podatke.
          </p>
        </section>

        <section>
          <h2 className="font-serif text-lg font-bold text-foreground">
            2. Podaci koje prikupljamo
          </h2>
          <p className="mt-2">
            Prikupljamo podatke koje nam dobrovoljno pruÅ¾ite: email adresa, ime
            firme, JIB, kontakt informacije, te dokumenti koje uploadujete u
            Document Vault. Automatski prikupljamo tehniÄke podatke o koriÅ¡tenju
            platforme.
          </p>
        </section>

        <section>
          <h2 className="font-serif text-lg font-bold text-foreground">
            3. KoriÅ¡tenje podataka
          </h2>
          <p className="mt-2">
            VaÅ¡e podatke koristimo iskljuÄivo za pruÅ¾anje usluga platforme:
            upravljanje dokumentima, pripremu ponuda i trÅ¾iÅ¡nu analitiku. Ne
            prodajemo i ne dijelimo vaÅ¡e podatke s treÄ‡im stranama bez vaÅ¡eg
            pristanka.
          </p>
        </section>

        <section>
          <h2 className="font-serif text-lg font-bold text-foreground">
            4. Sigurnost podataka
          </h2>
          <p className="mt-2">
            Koristimo industrijsko Å¡ifriranje (TLS/SSL) za prijenos podataka i
            Supabase infrastrukturu s Row Level Security za skladiÅ¡tenje. VaÅ¡i
            dokumenti su dostupni samo vama.
          </p>
        </section>

        <section>
          <h2 className="font-serif text-lg font-bold text-foreground">
            5. Kontakt
          </h2>
          <p className="mt-2">
            Za pitanja o privatnosti kontaktirajte nas na: info@tendersistem.com
          </p>
        </section>
      </div>
    </div>
  );
}

