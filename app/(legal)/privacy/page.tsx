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
        Nazad na početnu
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
            MojaPonuda.ba (&quot;mi&quot;, &quot;naša platforma&quot;) posvećena je zaštiti
            privatnosti svojih korisnika. Ova politika objašnjava kako
            prikupljamo, koristimo i štitimo vaše podatke.
          </p>
        </section>

        <section>
          <h2 className="font-serif text-lg font-bold text-foreground">
            2. Podaci koje prikupljamo
          </h2>
          <p className="mt-2">
            Prikupljamo podatke koje nam dobrovoljno pružite: email adresa, ime
            firme, JIB, kontakt informacije, te dokumenti koje uploadujete u
            Document Vault. Automatski prikupljamo tehničke podatke o korištenju
            platforme.
          </p>
        </section>

        <section>
          <h2 className="font-serif text-lg font-bold text-foreground">
            3. Korištenje podataka
          </h2>
          <p className="mt-2">
            Vaše podatke koristimo isključivo za pružanje usluga platforme:
            upravljanje dokumentima, pripremu ponuda i tržišnu analitiku. Ne
            prodajemo i ne dijelimo vaše podatke s trećim stranama bez vašeg
            pristanka.
          </p>
        </section>

        <section>
          <h2 className="font-serif text-lg font-bold text-foreground">
            4. Sigurnost podataka
          </h2>
          <p className="mt-2">
            Koristimo industrijsko šifriranje (TLS/SSL) za prijenos podataka i
            Supabase infrastrukturu s Row Level Security za skladištenje. Vaši
            dokumenti su dostupni samo vama.
          </p>
        </section>

        <section>
          <h2 className="font-serif text-lg font-bold text-foreground">
            5. Kontakt
          </h2>
          <p className="mt-2">
            Za pitanja o privatnosti kontaktirajte nas na: info@mojaponuda.ba
          </p>
        </section>
      </div>
    </div>
  );
}
