import Link from "next/link";
import {
  FolderSearch,
  Clock,
  EyeOff,
  Shield,
  LayoutDashboard,
  TrendingUp,
  CheckCircle,
  ArrowRight,
  ChevronDown,
  Upload,
  BarChart3,
  FileText,
  Briefcase,
  Search,
  ChevronRight,
  Minus,
  Plus,
  PlayCircle,
  ImageIcon
} from "lucide-react";

function ImagePlaceholder({ text, width, height, aspect }: { text: string, width?: string, height?: string, aspect?: string }) {
  return (
    <div 
      className={`flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-slate-100 text-slate-400 w-full ${aspect ? aspect : 'aspect-[4/3]'} ${width || ''} ${height || ''}`}
    >
      <ImageIcon className="mb-2 size-8 text-slate-300" />
      <span className="text-sm font-medium text-slate-500 text-center px-4">{text}</span>
      <span className="text-xs text-slate-400 mt-1">Prompt placeholder</span>
    </div>
  );
}

function NavBar() {
  return (
    <nav className="fixed top-0 z-50 w-full border-b border-slate-200 bg-white/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
        <Link href="/" className="flex items-baseline gap-0.5">
          <span className="font-heading text-xl font-bold tracking-tight text-slate-900">
            MojaPonuda
          </span>
          <span className="font-heading text-xl font-bold text-primary">.ba</span>
        </Link>

        <div className="hidden items-center gap-8 md:flex">
          <a href="#problem" className="text-sm font-medium text-slate-600 transition-colors hover:text-primary">
            Problem
          </a>
          <a href="#kako-radi" className="text-sm font-medium text-slate-600 transition-colors hover:text-primary">
            Kako radi
          </a>
          <a href="#rjesenje" className="text-sm font-medium text-slate-600 transition-colors hover:text-primary">
            Platforma
          </a>
          <a href="#cijene" className="text-sm font-medium text-slate-600 transition-colors hover:text-primary">
            Cijene
          </a>
        </div>

        <div className="flex items-center gap-4">
          <Link
            href="/login"
            className="hidden text-sm font-medium text-slate-600 transition-colors hover:text-primary sm:block"
          >
            Prijava
          </Link>
          <Link
            href="/signup"
            className="rounded-full bg-primary px-5 py-2 text-sm font-semibold text-white transition-all hover:bg-blue-700 hover:shadow-md hover:-translate-y-0.5"
          >
            Isprobaj besplatno
          </Link>
        </div>
      </div>
    </nav>
  );
}

function HeroSection() {
  return (
    <section className="relative overflow-hidden bg-slate-50 px-6 pb-20 pt-32 sm:pb-24 sm:pt-40">
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#e2e8f0_1px,transparent_1px),linear-gradient(to_bottom,#e2e8f0_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] opacity-50" />
      
      <div className="relative mx-auto max-w-7xl">
        <div className="text-center max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-3 py-1 mb-8">
            <span className="flex size-2 rounded-full bg-primary animate-pulse" />
            <span className="text-xs font-semibold text-primary">
              Nova era javnih nabavki u BiH
            </span>
          </div>

          <h1 className="font-heading text-4xl font-extrabold leading-[1.1] tracking-tight text-slate-900 sm:text-5xl lg:text-6xl">
            Pobjeđujte na tenderima, 
            <br />
            <span className="text-primary">bez administrativnog stresa.</span>
          </h1>

          <p className="mt-6 text-lg leading-relaxed text-slate-600 sm:text-xl">
            Sveobuhvatna platforma za upravljanje dokumentacijom, AI analizu tenderskih uslova i praćenje tržišta javnih nabavki.
          </p>

          <div className="mt-10 flex flex-col justify-center gap-4 sm:flex-row sm:items-center">
            <Link
              href="/signup"
              className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-primary px-8 text-base font-semibold text-white shadow-lg shadow-blue-500/30 transition-all hover:bg-blue-700 hover:shadow-blue-500/40 hover:-translate-y-0.5"
            >
              Započnite besplatno
              <ArrowRight className="size-4" />
            </Link>
            <a
              href="#kako-radi"
              className="inline-flex h-12 items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-8 text-base font-semibold text-slate-700 transition-all hover:border-slate-300 hover:bg-slate-50"
            >
              <PlayCircle className="size-5 text-slate-400" />
              Pogledajte demo
            </a>
          </div>
          <p className="mt-4 text-sm text-slate-500">Nije potrebna kreditna kartica. 14 dana besplatno.</p>
        </div>

        <div className="mt-16 mx-auto max-w-5xl">
          <div className="relative rounded-2xl border border-slate-200 bg-white p-2 shadow-2xl">
            <div className="absolute -inset-0.5 rounded-2xl bg-gradient-to-b from-blue-500/20 to-transparent opacity-50 blur-xl -z-10" />
            <div className="overflow-hidden rounded-xl bg-slate-50 border border-slate-100">
               <ImagePlaceholder text="Dashboard Mockup (Tenders list, stats, clean white/blue UI)" aspect="aspect-[16/9]" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

const PROBLEMS = [
  {
    icon: FolderSearch,
    title: "Dokumentacija rasuta po folderima",
    description:
      "Uvjerenje o registraciji u jednom folderu, potvrda o porezu u emailu, garancija na desktopu. Gubitak vremena na svakom novom tenderu.",
  },
  {
    icon: Clock,
    title: "Propušteni rokovi isteka",
    description:
      "Dokument istekne usred pripreme ponude, a da niste primijetili. Rezultat? Diskvalifikacija zbog banalnog administrativnog propusta.",
  },
  {
    icon: EyeOff,
    title: "Nedostatak uvida u tržište",
    description:
      "Ne znate po kojim cijenama vaša konkurencija pobjeđuje, niti koji naručioci najčešće raspisuju tendere za vaše usluge.",
  },
] as const;

function ProblemSection() {
  return (
    <section id="problem" className="bg-white px-6 py-24 sm:py-32">
      <div className="mx-auto max-w-7xl">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="font-heading text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
            Priprema ponude ne bi trebala biti <span className="text-primary">noćna mora.</span>
          </h2>
          <p className="mt-4 text-lg text-slate-600">
            Većina firmi u BiH gubi ugovore ne zbog cijene ili kvaliteta, već zbog papirologije i nedostatka informacija.
          </p>
        </div>

        <div className="grid gap-8 sm:grid-cols-3">
          {PROBLEMS.map((p, i) => (
            <div
              key={p.title}
              className="relative rounded-2xl border border-slate-100 bg-slate-50 p-8 transition-all hover:shadow-lg hover:shadow-slate-200/50 hover:-translate-y-1"
            >
              <div className="mb-6 flex size-14 items-center justify-center rounded-xl bg-blue-100 text-primary">
                <p.icon className="size-6" />
              </div>
              <h3 className="mb-3 font-heading text-xl font-bold text-slate-900">
                {p.title}
              </h3>
              <p className="text-base leading-relaxed text-slate-600">
                {p.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

const HOW_IT_WORKS = [
  {
    step: "1",
    title: "Centralizujte dokumentaciju",
    description: "Spremite sve dokumente firme u siguran trezor. Sistem automatski prepoznaje rokove važenja i šalje vam obavijesti 60, 30 i 7 dana prije isteka.",
    icon: Upload,
  },
  {
    step: "2",
    title: "AI analizira tender za vas",
    description: "Uploadujte tendersku dokumentaciju. Naš AI algoritam u sekundi čita tekst, pronalazi sve uslove kvalifikacije i generiše interaktivnu checklistu.",
    icon: LayoutDashboard,
  },
  {
    step: "3",
    title: "Sklapanje ponude i analiza",
    description: "Sistem uparuje zahtjeve sa vašim dokumentima u trezoru. Pomoću podataka sa tržišta, optimizujte cijenu i izvezite savršenu ponudu.",
    icon: TrendingUp,
  },
] as const;

function HowItWorksSection() {
  return (
    <section id="kako-radi" className="bg-slate-50 px-6 py-24 sm:py-32">
      <div className="mx-auto max-w-7xl">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="font-heading text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
            Kako MojaPonuda <span className="text-primary">ubrzava proces</span>
          </h2>
          <p className="mt-4 text-lg text-slate-600">
            Od pronalaska tendera do slanja gotove ponude u 3 jednostavna koraka.
          </p>
        </div>

        <div className="grid gap-8 lg:grid-cols-3">
          {HOW_IT_WORKS.map((s, i) => (
            <div key={s.step} className="relative bg-white rounded-2xl p-8 border border-slate-200 shadow-sm">
              <div className="absolute -top-5 left-8 flex size-10 items-center justify-center rounded-full bg-primary font-heading text-lg font-bold text-white shadow-lg shadow-blue-500/30">
                {s.step}
              </div>
              <div className="mt-4 mb-6 flex h-12 items-center text-primary">
                <s.icon className="size-8" />
              </div>
              <h3 className="mb-3 font-heading text-xl font-bold text-slate-900">
                {s.title}
              </h3>
              <p className="text-base leading-relaxed text-slate-600">
                {s.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

const FEATURES = [
  {
    icon: Shield,
    title: "Trezor Dokumenata",
    description:
      "Vaša arhiva na autopilotu. Svi certifikati, bilansi i uvjerenja na jednom mjestu sa pametnim podsjetnicima za obnovu.",
    details: [
      "Upload jednom, koristite svugdje",
      "Automatski podsjetnici za istek",
      "Kategorizacija i pretraga",
    ],
    imagePrompt: "App interface showing a clean 'Document Vault' with folders, lists of PDF files, and small green/yellow/red badges indicating expiry status.",
  },
  {
    icon: LayoutDashboard,
    title: "AI Radni Prostor",
    description:
      "Nema više ručnog podvlačenja uslova markerom. Naš AI čita dokumentaciju i stvara tačnu listu svega što vam treba.",
    details: [
      "Automatska ekstrakcija uslova iz PDF/Word-a",
      "Interaktivna provjera (checklist)",
      "Generisanje finalnog PDF paketa",
    ],
    imagePrompt: "App interface showing an AI scanning a legal document on the left, and a neat checklist of requirements on the right.",
  },
  {
    icon: TrendingUp,
    title: "Tržišna Inteligencija",
    description:
      "Podaci pobjeđuju. Analizirajte historiju pobjeda, prosječne cijene i budžetirane nabavke prije nego što budu objavljene.",
    details: [
      "Baza svih dodijeljenih ugovora",
      "Profili naručilaca i konkurencije",
      "Predikcija pobjedničke cijene",
    ],
    imagePrompt: "App interface showing data analytics, beautiful modern charts (bar, line), list of top competitors, white and blue styling.",
  },
] as const;

function SolutionSection() {
  return (
    <section id="rjesenje" className="bg-white px-6 py-24 sm:py-32 overflow-hidden">
      <div className="mx-auto max-w-7xl">
        <div className="text-center max-w-3xl mx-auto mb-20">
          <h2 className="font-heading text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
            Sve što vam treba, <span className="text-primary">na jednom mjestu</span>
          </h2>
        </div>

        <div className="space-y-32">
          {FEATURES.map((f, i) => (
            <div
              key={f.title}
              className={`flex flex-col gap-12 lg:items-center lg:flex-row ${
                i % 2 === 1 ? "lg:flex-row-reverse" : ""
              }`}
            >
              <div className="flex-1 space-y-6">
                <div className="inline-flex size-12 items-center justify-center rounded-xl bg-blue-50 text-primary">
                  <f.icon className="size-6" />
                </div>
                <h3 className="font-heading text-3xl font-bold text-slate-900">
                  {f.title}
                </h3>
                <p className="text-lg leading-relaxed text-slate-600">
                  {f.description}
                </p>
                <ul className="mt-8 space-y-4">
                  {f.details.map((d) => (
                    <li key={d} className="flex items-center gap-3">
                      <CheckCircle className="size-5 text-primary" />
                      <span className="text-base text-slate-700">{d}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="flex-1 w-full relative">
                <div className={`absolute top-1/2 -translate-y-1/2 ${i % 2 === 0 ? '-right-12' : '-left-12'} size-[400px] rounded-full bg-blue-100/50 blur-3xl -z-10`} />
                <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 shadow-xl">
                  <ImagePlaceholder text={f.title + " Illustration"} aspect="aspect-[4/3]" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function StatsSection() {
  const stats = [
    { value: "70%", label: "Manje vremena po ponudi" },
    { value: "0", label: "Administrativnih grešaka" },
    { value: "100%", label: "Dokumenata na sigurnom" },
    { value: "24/7", label: "Monitoring tržišta" },
  ];

  return (
    <section className="bg-primary px-6 py-20 text-white">
      <div className="mx-auto max-w-7xl">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {stats.map((s, i) => (
            <div key={i} className="text-center sm:text-left sm:border-l sm:border-blue-400 sm:pl-8">
              <p className="font-heading text-4xl font-bold lg:text-5xl">
                {s.value}
              </p>
              <p className="mt-2 text-base font-medium text-blue-100">{s.label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function PricingSection() {
  return (
    <section id="cijene" className="bg-slate-50 px-6 py-24 sm:py-32">
      <div className="mx-auto max-w-7xl">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="font-heading text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
            Jednostavne i <span className="text-primary">transparentne cijene</span>
          </h2>
          <p className="mt-4 text-lg text-slate-600">
            Odaberite plan koji odgovara veličini vašeg poslovanja.
          </p>
        </div>

        <div className="mx-auto grid max-w-4xl gap-8 lg:grid-cols-2 lg:items-center">
          {/* Starter */}
          <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
            <h3 className="font-heading text-xl font-bold text-slate-900">Starter</h3>
            <p className="mt-2 text-sm text-slate-500">Za male firme koje tek kreću sa tenderima.</p>
            <div className="mt-6 flex items-baseline gap-1">
              <span className="font-heading text-4xl font-bold text-slate-900">0</span>
              <span className="text-sm font-medium text-slate-500">BAM / mjesečno</span>
            </div>
            <div className="mt-8 space-y-4">
              {[
                "Do 3 ponude mjesečno",
                "Trezor dokumenata",
                "Pretraga tendera",
                "Osnovna analitika",
              ].map((f) => (
                <div key={f} className="flex items-start gap-3">
                  <CheckCircle className="size-5 shrink-0 text-slate-400" />
                  <span className="text-slate-600">{f}</span>
                </div>
              ))}
            </div>
            <Link
              href="/signup"
              className="mt-8 flex w-full items-center justify-center rounded-full border border-slate-300 bg-white py-3 text-sm font-semibold text-slate-700 transition-all hover:bg-slate-50"
            >
              Kreni besplatno
            </Link>
          </div>

          {/* Pro */}
          <div className="relative rounded-3xl border-2 border-primary bg-white p-8 shadow-xl shadow-blue-500/10">
            <div className="absolute -top-4 inset-x-0 flex justify-center">
              <span className="rounded-full bg-primary px-4 py-1 text-xs font-bold uppercase tracking-wider text-white">
                Najpopularnije
              </span>
            </div>
            <h3 className="font-heading text-xl font-bold text-slate-900">Profesional</h3>
            <p className="mt-2 text-sm text-slate-500">Puna snaga platforme za redovne ponuđače.</p>
            <div className="mt-6 flex items-baseline gap-1">
              <span className="font-heading text-5xl font-bold text-slate-900">150</span>
              <span className="text-sm font-medium text-slate-500">BAM / mjesečno</span>
            </div>
            <div className="mt-8 space-y-4">
              {[
                "Neograničen broj ponuda",
                "Neograničen trezor dokumenata",
                "AI analiza tendera i ekstrakcija",
                "Automatsko generisanje checkliste",
                "Napredna tržišna analitika",
                "Upozorenja o rokovima važenja",
              ].map((f) => (
                <div key={f} className="flex items-start gap-3">
                  <CheckCircle className="size-5 shrink-0 text-primary" />
                  <span className="text-slate-700 font-medium">{f}</span>
                </div>
              ))}
            </div>
            <Link
              href="/signup"
              className="mt-8 flex w-full items-center justify-center rounded-full bg-primary py-3.5 text-sm font-bold text-white transition-all hover:bg-blue-700 hover:shadow-lg hover:shadow-blue-500/30"
            >
              Odaberi Profesional
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

const FAQ_ITEMS = [
  {
    q: "Da li postoji ugovorna obaveza?",
    a: "Ne. Licenca se obnavlja mjesečno i možete je otkazati u bilo kojem trenutku. Vaši podaci će biti sačuvani, ali će platforma preći u read-only mod po isteku pretplate.",
  },
  {
    q: "Koji formati dokumenata su podržani u Trezoru?",
    a: "Sistem podržava sve standardne formate (PDF, JPG, PNG, DOCX) veličine do 20MB. Za najbolju AI ekstrakciju preporučujemo PDF format sa prepoznatim tekstom.",
  },
  {
    q: "Koliko su moji podaci sigurni?",
    a: "Koristimo bankovne standarde enkripcije (AES-256) za čuvanje dokumenata. Vaša baza ponuda i dokumenata je izolirana od ostalih korisnika.",
  },
  {
    q: "Kako AI pronalazi uslove u tenderu?",
    a: "Naš algoritam je istreniran specifično na bh. zakonodavstvu o javnim nabavkama (ZJN). Prepoznaje ključne riječi, tražene certifikate i obrasce iz standardnih šablona Agencije.",
  },
] as const;

function FAQSection() {
  return (
    <section className="bg-white px-6 py-24 sm:py-32">
      <div className="mx-auto max-w-3xl">
        <div className="text-center mb-16">
          <h2 className="font-heading text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
            Često postavljana pitanja
          </h2>
        </div>

        <div className="space-y-4">
          {FAQ_ITEMS.map((item) => (
            <details
              key={item.q}
              className="group rounded-xl border border-slate-200 bg-slate-50 transition-colors hover:bg-slate-100"
            >
              <summary className="flex cursor-pointer items-center justify-between p-6 text-base font-semibold text-slate-900 [&::-webkit-details-marker]:hidden">
                {item.q}
                <ChevronDown className="size-5 text-slate-500 transition-transform group-open:-rotate-180" />
              </summary>
              <div className="px-6 pb-6 pt-0">
                <p className="text-base leading-relaxed text-slate-600">
                  {item.a}
                </p>
              </div>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}

function FinalCTA() {
  return (
    <section className="relative overflow-hidden bg-slate-900 px-6 py-32">
      <div className="absolute inset-0 bg-primary/10" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 size-[600px] rounded-full bg-primary/20 blur-[100px] -z-10" />
      
      <div className="relative z-10 mx-auto max-w-3xl text-center">
        <h2 className="font-heading text-3xl font-bold tracking-tight text-white sm:text-4xl lg:text-5xl">
          Spremni za pobjeđivanje na tenderima?
        </h2>
        <p className="mx-auto mt-6 max-w-xl text-lg text-slate-300">
          Pridružite se modernim kompanijama koje automatizuju proces javnih nabavki.
        </p>
        <div className="mt-10 flex justify-center">
          <Link
            href="/signup"
            className="inline-flex h-14 items-center justify-center gap-2 rounded-full bg-white px-8 text-base font-bold text-slate-900 transition-all hover:bg-slate-100 hover:scale-105"
          >
            Isprobajte 14 dana besplatno
            <ArrowRight className="size-5" />
          </Link>
        </div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="border-t border-slate-200 bg-white px-6 py-12">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-col items-center justify-between gap-6 sm:flex-row">
          <div>
            <div className="flex items-baseline gap-0.5">
              <span className="font-heading text-xl font-bold text-slate-900">
                MojaPonuda
              </span>
              <span className="font-heading text-xl font-bold text-primary">
                .ba
              </span>
            </div>
            <p className="mt-2 text-sm text-slate-500">
              © {new Date().getFullYear()} Sva prava zadržana.
            </p>
          </div>

          <div className="flex items-center gap-6">
            <Link
              href="/privacy"
              className="text-sm font-medium text-slate-500 transition-colors hover:text-slate-900"
            >
              Politika privatnosti
            </Link>
            <Link
              href="/terms"
              className="text-sm font-medium text-slate-500 transition-colors hover:text-slate-900"
            >
              Uslovi korištenja
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}

export function LandingPage() {
  return (
    <div className="min-h-screen bg-white">
      <NavBar />
      <HeroSection />
      <ProblemSection />
      <HowItWorksSection />
      <SolutionSection />
      <StatsSection />
      <PricingSection />
      <FAQSection />
      <FinalCTA />
      <Footer />
    </div>
  );
}
