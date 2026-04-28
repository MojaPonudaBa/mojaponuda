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
        Nazad na početnu
      </Link>

      <h1 className="font-serif text-3xl font-bold tracking-tight">
        Uvjeti korištenja
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
            Korištenjem platforme Tendersistem.com prihvatate ove uvjete
            korištenja. Ako se ne slažete s ovim uvjetima, molimo vas da ne
            koristite platformu.
          </p>
        </section>

        <section>
          <h2 className="font-serif text-lg font-bold text-foreground">
            2. Opis usluge
          </h2>
          <p className="mt-2">
            Tendersistem.com je SaaS platforma za upravljanje ponudama u javnim
            nabavkama u Bosni i Hercegovini. Platforma pruža alate za
            upravljanje dokumentima, pripremu ponuda, pretragu tendera i tržišnu
            analitiku.
          </p>
        </section>

        <section>
          <h2 className="font-serif text-lg font-bold text-foreground">
            3. Korisnički nalog
          </h2>
          <p className="mt-2">
            Odgovorni ste za sigurnost svog naloga i lozinke. Tendersistem.com ne
            snosi odgovornost za gubitke nastale zbog neovlaštenog pristupa
            vašem nalogu.
          </p>
        </section>

        <section>
          <h2 className="font-serif text-lg font-bold text-foreground">
            4. Pretplata i plaćanje
          </h2>
          <p className="mt-2">
            Pretplata se naplaćuje mjesečno putem Lemon Squeezy platnog
            procesora. Možete otkazati pretplatu u bilo kojem trenutku.
            Besplatni trial uključuje do 3 ponude.
          </p>
        </section>

        <section>
          <h2 className="font-serif text-lg font-bold text-foreground">
            5. Ograničenje odgovornosti
          </h2>
          <p className="mt-2">
            Tendersistem.com je alat za pomoć u pripremi ponuda i ne garantira
            uspjeh na tenderima. Automatska analiza je informativnog karaktera i ne
            zamjenjuje pravni savjet. Korisnik je odgovoran za tačnost i
            kompletnost svoje ponude.
          </p>
        </section>

        <section>
          <h2 className="font-serif text-lg font-bold text-foreground">
            6. Kontakt
          </h2>
          <p className="mt-2">
            Za pitanja o uvjetima korištenja kontaktirajte nas na:
            info@tendersistem.com
          </p>
        </section>
      </div>
    </div>
  );
}

