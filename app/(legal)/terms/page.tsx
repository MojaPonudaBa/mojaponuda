import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function TermsPage() {
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
        Uvjeti koriÅ¡tenja
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Posljednja izmjena: mart 2026.
      </p>

      <div className="mt-8 space-y-6 text-sm leading-relaxed text-muted-foreground">
        <section>
          <h2 className="font-serif text-lg font-bold text-foreground">
            1. Prihvatanje uvjeta
          </h2>
          <p className="mt-2">
            KoriÅ¡tenjem platforme TenderSistem.com prihvatate ove uvjete
            koriÅ¡tenja. Ako se ne slaÅ¾ete s ovim uvjetima, molimo vas da ne
            koristite platformu.
          </p>
        </section>

        <section>
          <h2 className="font-serif text-lg font-bold text-foreground">
            2. Opis usluge
          </h2>
          <p className="mt-2">
            TenderSistem.com je SaaS platforma za upravljanje ponudama u javnim
            nabavkama u Bosni i Hercegovini. Platforma pruÅ¾a alate za
            upravljanje dokumentima, pripremu ponuda, pretragu tendera i trÅ¾iÅ¡nu
            analitiku.
          </p>
        </section>

        <section>
          <h2 className="font-serif text-lg font-bold text-foreground">
            3. KorisniÄki nalog
          </h2>
          <p className="mt-2">
            Odgovorni ste za sigurnost svog naloga i lozinke. TenderSistem.com ne
            snosi odgovornost za gubitke nastale zbog neovlaÅ¡tenog pristupa
            vaÅ¡em nalogu.
          </p>
        </section>

        <section>
          <h2 className="font-serif text-lg font-bold text-foreground">
            4. Pretplata i plaÄ‡anje
          </h2>
          <p className="mt-2">
            Pretplata se naplaÄ‡uje mjeseÄno putem Lemon Squeezy platnog
            procesora. MoÅ¾ete otkazati pretplatu u bilo kojem trenutku.
            Besplatni trial ukljuÄuje do 3 ponude.
          </p>
        </section>

        <section>
          <h2 className="font-serif text-lg font-bold text-foreground">
            5. OgraniÄenje odgovornosti
          </h2>
          <p className="mt-2">
            TenderSistem.com je alat za pomoÄ‡ u pripremi ponuda i ne garantira
            uspjeh na tenderima. AI analiza je informativnog karaktera i ne
            zamjenjuje pravni savjet. Korisnik je odgovoran za taÄnost i
            kompletnost svoje ponude.
          </p>
        </section>

        <section>
          <h2 className="font-serif text-lg font-bold text-foreground">
            6. Kontakt
          </h2>
          <p className="mt-2">
            Za pitanja o uvjetima koriÅ¡tenja kontaktirajte nas na:
            info@tendersistem.com
          </p>
        </section>
      </div>
    </div>
  );
}

