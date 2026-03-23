import Link from "next/link";
import {
  FolderSearch,
  Clock,
  Shield,
  LayoutDashboard,
  TrendingUp,
  CheckCircle,
  ArrowRight,
  ChevronDown,
  BarChart3,
  FileText,
  Briefcase,
  Search,
} from "lucide-react";

interface LandingPageProps {
  isLoggedIn?: boolean;
}

function NavBar({ isLoggedIn }: { isLoggedIn?: boolean }) {
  return (
    <nav className="fixed top-0 z-50 w-full border-b border-slate-200/80 bg-white/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
        <Link href="/" className="flex items-center gap-2 group">
          <div className="size-8 rounded-lg bg-primary text-white flex items-center justify-center font-bold text-xl shadow-lg shadow-blue-500/30 group-hover:scale-105 transition-transform">
            M
          </div>
          <div className="flex items-baseline">
            <span className="font-heading text-xl font-bold tracking-tight text-slate-900">
              MojaPonuda
            </span>
            <span className="font-heading text-xl font-bold text-primary">.ba</span>
          </div>
        </Link>

        <div className="hidden items-center gap-8 md:flex">
          <a href="#problem" className="text-sm font-semibold text-slate-600 transition-colors hover:text-primary">
            Problem
          </a>
          <a href="#kako-radi" className="text-sm font-semibold text-slate-600 transition-colors hover:text-primary">
            Kako radi
          </a>
          <a href="#primjer" className="text-sm font-semibold text-slate-600 transition-colors hover:text-primary">
            Kako izgleda
          </a>
          <a href="#cijene" className="text-sm font-semibold text-slate-600 transition-colors hover:text-primary">
            Cijene
          </a>
        </div>

        <div className="flex items-center gap-4">
          {isLoggedIn ? (
            <Link
              href="/dashboard"
              className="rounded-full bg-primary px-5 py-2.5 text-sm font-bold text-white transition-all hover:bg-blue-700 hover:shadow-lg hover:shadow-blue-500/30 hover:-translate-y-0.5"
            >
              Otvori Dashboard
            </Link>
          ) : (
            <>
              <Link
                href="/login"
                className="hidden text-sm font-bold text-slate-600 transition-colors hover:text-primary sm:block"
              >
                Prijava
              </Link>
              <Link
                href="/signup"
                className="rounded-full bg-slate-900 px-5 py-2.5 text-sm font-bold text-white transition-all hover:bg-primary hover:shadow-lg hover:shadow-blue-500/30 hover:-translate-y-0.5"
              >
                Isprobaj besplatno
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}

// ... inside HeroSection ...

const HERO_FLOW = [
  {
    icon: Search,
    title: "Pronalazak tendera",
    description: "Svakodnevno pronalazimo i filtriramo tendere za vašu djelatnost.",
  },
  {
    icon: Clock,
    title: "Obavijesti",
    description: "Dobijete obavijest čim se pojavi nova relevantna prilika.",
  },
  {
    icon: FileText,
    title: "Prijava i dokumentacija",
    description: "Jasan pregled šta treba predati i provjera dokumentacije.",
  },
  {
    icon: BarChart3,
    title: "Analiza tržišta i konkurencije",
    description: "Vidite gdje se isplati prijaviti i ko dobija poslove.",
  },
] as const;

function HeroSection({ isLoggedIn }: { isLoggedIn?: boolean }) {
  return (
    <section className="relative overflow-hidden bg-white px-6 pb-20 pt-32 sm:pb-32 sm:pt-40">
      <div className="absolute inset-0 -z-10 bg-[linear-gradient(to_right,#f1f5f9_1px,transparent_1px),linear-gradient(to_bottom,#f1f5f9_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)]" />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[500px] bg-blue-500/10 blur-[120px] rounded-full -z-10" />
      
      <div className="relative mx-auto max-w-7xl">
        <div className="mx-auto max-w-5xl text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-blue-100 bg-blue-50/50 px-4 py-1.5 mb-8 animate-fade-in-up">
            <span className="flex size-2 rounded-full bg-blue-500 animate-pulse shadow-[0_0_10px_rgba(59,130,246,0.5)]" />
            <span className="text-xs font-bold uppercase tracking-wide text-blue-700">
              MojaPonuda.ba za firme koje prate javne nabavke u BiH
            </span>
          </div>

          <h1 className="font-heading text-5xl font-extrabold leading-[1.08] tracking-tight text-slate-900 sm:text-6xl lg:text-7xl mb-8">
            Vaš digitalni asistent <br className="hidden sm:block" />
            za javne nabavke
          </h1>

          <p className="mx-auto max-w-3xl text-lg leading-relaxed text-slate-600 sm:text-xl mb-6">
            Pronalazi tendere za vašu firmu, šalje obavijesti, vodi vas kroz prijavu i daje uvid u tržište i konkurenciju — na jednom mjestu.
          </p>

          <p className="mx-auto max-w-2xl text-base font-semibold text-slate-800 sm:text-lg mb-10">
            Imate pregled nad tenderima koji su za vašu firmu — bez ručnog traženja.
          </p>

          <div className="flex flex-col justify-center gap-4 sm:flex-row sm:items-center">
            <a
              href="#primjer"
              className="inline-flex h-14 items-center justify-center gap-2 rounded-full bg-primary px-8 text-base font-bold text-white shadow-xl shadow-blue-500/30 transition-all hover:bg-blue-700 hover:shadow-2xl hover:shadow-blue-500/40 hover:-translate-y-1"
            >
              Pogledajte kako izgleda
              <ArrowRight className="size-4" />
            </a>
            <Link
              href={isLoggedIn ? "/dashboard" : "/signup"}
              className="inline-flex h-14 items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-8 text-base font-bold text-slate-700 shadow-sm transition-all hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900"
            >
              Otvorite prvi pregled tendera
            </Link>
          </div>

          <div className="mt-6 flex items-center justify-center gap-6 text-sm text-slate-500">
            <div className="flex items-center gap-2">
              <CheckCircle className="size-4 text-blue-500" />
              <span>Prvi pregled relevantnih tendera bez komplikacija</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="size-4 text-blue-500" />
              <span>Bez kreditne kartice</span>
            </div>
          </div>

          <div className="mt-14 grid gap-4 text-left md:grid-cols-2 xl:grid-cols-4">
            {HERO_FLOW.map((item) => (
              <div
                key={item.title}
                className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-sm shadow-slate-200/50"
              >
                <div className="mb-4 flex size-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-700">
                  <item.icon className="size-6" />
                </div>
                <h3 className="font-heading text-lg font-bold text-slate-900">
                  {item.title}
                </h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  {item.description}
                </p>
              </div>
            ))}
          </div>

          <div className="mt-8 rounded-[2rem] border border-slate-200 bg-slate-900 px-8 py-7 text-left text-white shadow-2xl shadow-slate-300/20">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-blue-200">
              Kao da imate osobu koja prati tendere za vas
            </p>
            <p className="mt-3 max-w-3xl text-lg leading-8 text-slate-200">
              Bez ručnog pretraživanja, bez propuštenih objava i bez gubljenja vremena.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

const PROBLEMS = [
  {
    icon: FolderSearch,
    title: "Premalo pravih prilika u fokusu",
    description:
      "Većina firmi se prijavljuje na premalo tendera koji zaista imaju smisla za njihov profil i kapacitet.",
  },
  {
    icon: Clock,
    title: "Relevantne objave prođu nezapaženo",
    description:
      "Nova prilika se pojavi, ali je primijetite kasno ili tek kada je rok već preblizu za kvalitetnu pripremu.",
  },
  {
    icon: Shield,
    title: "Vrijeme odlazi na pogrešne tendera",
    description:
      "Vrijeme se troši na prijave koje nemaju smisla, dok bolja prilika ostaje po strani bez jasnog pregleda tržišta.",
  },
] as const;

function ProblemSection() {
  return (
    <section id="problem" className="bg-white px-6 py-24 sm:py-32 border-t border-slate-100">
      <div className="mx-auto max-w-7xl">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="font-heading text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
            Problem nije u prijavi — <span className="text-primary">nego u odabiru.</span>
          </h2>
          <p className="mt-4 text-lg text-slate-600">
            Većina firmi se prijavljuje na premalo ili pogrešne tendere. Relevantne prilike često prođu nezapaženo, a vrijeme se troši na one koje nemaju smisla.
          </p>
        </div>

        <div className="grid gap-8 sm:grid-cols-3">
          {PROBLEMS.map((p) => (
            <div
              key={p.title}
              className="relative rounded-[2rem] border border-slate-100 bg-slate-50/50 p-8 transition-all hover:bg-white hover:shadow-xl hover:shadow-slate-200/40 hover:-translate-y-1 hover:border-slate-200 group"
            >
              <div className="mb-6 flex size-14 items-center justify-center rounded-2xl bg-white border border-slate-100 text-slate-400 shadow-sm group-hover:scale-110 group-hover:border-blue-100 group-hover:bg-blue-50 group-hover:text-blue-600 transition-all duration-300">
                <p.icon className="size-7" />
              </div>
              <h3 className="mb-3 font-heading text-xl font-bold text-slate-900 group-hover:text-blue-900 transition-colors">
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
    title: "Vidite sve relevantne tendere na jednom mjestu",
    description: "Pregled je složen oko vaše djelatnosti, lokacije i tipa ugovora koji za vas ima smisla.",
    icon: LayoutDashboard,
  },
  {
    title: "Reagirate odmah kada se pojavi nova prilika",
    description: "Ne čekate ručnu provjeru portala. Bitna objava dolazi do vas čim se pojavi.",
    icon: Clock,
  },
  {
    title: "Birate gdje se isplati prijaviti",
    description: "Lakše razlikujete tender koji izgleda zanimljivo od tendera koji zaista odgovara vašoj firmi.",
    icon: TrendingUp,
  },
  {
    title: "Ne gubite vrijeme na nerelevantne prijave",
    description: "Fokus ostaje na prilikama koje nose realnu vrijednost, umjesto na pretrazi i provjeri bez kraja.",
    icon: Shield,
  },
] as const;

function HowItWorksSection() {
  return (
    <section id="kako-radi" className="bg-slate-50 px-6 py-24 sm:py-32 relative overflow-hidden">
      <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-slate-200 to-transparent" />
      <div className="absolute bottom-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-slate-200 to-transparent" />
      
      <div className="mx-auto max-w-7xl relative z-10">
        <div className="text-center max-w-3xl mx-auto mb-20">
          <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 mb-6">
             <span className="text-xs font-bold uppercase tracking-wide text-slate-500">
              Šta se mijenja
             </span>
          </div>
          <h2 className="font-heading text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
            Kada imate <span className="text-primary">jasan pregled tržišta</span>
          </h2>
          <p className="mt-4 text-lg text-slate-600">
            Pregled, brzina reakcije i selekcija prilika postaju operativna prednost, a ne svakodnevna improvizacija.
          </p>
        </div>

        <div className="grid gap-8 md:grid-cols-2 xl:grid-cols-4">
          {HOW_IT_WORKS.map((s) => (
            <div key={s.title} className="relative bg-white rounded-[2rem] p-8 border border-slate-200 shadow-sm transition-all hover:shadow-xl hover:shadow-slate-200/50 hover:-translate-y-1">
              <div className="mb-6 flex items-center justify-between">
                <div className="flex size-14 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
                  <s.icon className="size-7" />
                </div>
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

const PRACTICE_TENDER = {
  title: "Nabavka mrežne opreme i sigurnosnih licenci za gradski data centar",
  authority: "Grad Sarajevo",
  deadline: "28.03.2026.",
  estimatedValue: "185.000 KM",
  reasons: [
    "Djelatnost: IT oprema i mreže",
    "Lokacija: Sarajevo",
    "Tip ugovora: Robe",
  ],
  checklist: [
    "Tehnička specifikacija i usklađenost ponude",
    "Izjava ponuđača i osnovni uslovi sposobnosti",
    "Dokaz o ovlaštenju ili partnerskom statusu proizvođača",
    "Rokovi za pitanja i finalnu predaju",
  ],
} as const;

function PracticeSection() {
  return (
    <section id="primjer" className="bg-white px-6 py-24 sm:py-32 border-t border-slate-100">
      <div className="mx-auto max-w-7xl">
        <div className="max-w-3xl mb-16">
          <h2 className="font-heading text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
            Kako to izgleda <span className="text-primary">u praksi</span>
          </h2>
          <p className="mt-4 text-lg text-slate-600">
            Jedan tender, jasan razlog zašto odgovara i pregled onoga što treba pripremiti.
          </p>
        </div>

        <div className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="rounded-[2rem] border border-slate-200 bg-white p-8 shadow-xl shadow-slate-200/40">
            <div className="flex flex-wrap items-center gap-3 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
              <span className="rounded-full border border-blue-100 bg-blue-50 px-3 py-1 text-blue-700">
                Preporučeni tender
              </span>
              <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-slate-600">
                Rok: {PRACTICE_TENDER.deadline}
              </span>
            </div>

            <h3 className="mt-6 font-heading text-3xl font-bold text-slate-900">
              {PRACTICE_TENDER.title}
            </h3>

            <div className="mt-6 grid gap-4 sm:grid-cols-3">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                  Naručilac
                </p>
                <p className="mt-2 text-sm font-semibold text-slate-900">
                  {PRACTICE_TENDER.authority}
                </p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                  Procijenjena vrijednost
                </p>
                <p className="mt-2 text-sm font-semibold text-slate-900">
                  {PRACTICE_TENDER.estimatedValue}
                </p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                  Tip ugovora
                </p>
                <p className="mt-2 text-sm font-semibold text-slate-900">
                  {PRACTICE_TENDER.reasons[2].replace("Tip ugovora: ", "")}
                </p>
              </div>
            </div>

            <div className="mt-8 rounded-[1.5rem] border border-emerald-100 bg-emerald-50/70 p-6">
              <p className="text-sm font-semibold uppercase tracking-[0.16em] text-emerald-800">
                Zašto vam je relevantan
              </p>
              <div className="mt-4 flex flex-wrap gap-3">
                {PRACTICE_TENDER.reasons.map((reason) => (
                  <span
                    key={reason}
                    className="rounded-full border border-emerald-200 bg-white px-3 py-1.5 text-sm font-medium text-emerald-900"
                  >
                    {reason}
                  </span>
                ))}
              </div>
            </div>
          </div>

          <div className="rounded-[2rem] border border-slate-200 bg-slate-900 p-8 text-white shadow-xl shadow-slate-300/20">
            <div className="flex size-14 items-center justify-center rounded-2xl bg-white/10 text-blue-200">
              <Briefcase className="size-7" />
            </div>
            <h3 className="mt-6 font-heading text-2xl font-bold">
              Kada odlučite da se prijavite — znate šta treba
            </h3>
            <p className="mt-3 text-base leading-7 text-slate-300">
              Dobijete jasan početni pregled zahtjeva i dokumentacije, bez nagađanja i vraćanja na početak.
            </p>
            <div className="mt-8 space-y-4">
              {PRACTICE_TENDER.checklist.map((item) => (
                <div key={item} className="flex items-start gap-3 rounded-2xl border border-white/10 bg-white/5 p-4">
                  <CheckCircle className="mt-0.5 size-5 shrink-0 text-blue-200" />
                  <span className="text-sm leading-6 text-slate-200">{item}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

const FEATURES = [
  {
    icon: LayoutDashboard,
    title: "Vidite gdje se tržište otvara",
    description:
      "Vidite gdje se pojavljuju prilike i koji segment tržišta vrijedi ozbiljno pratiti za vašu firmu.",
    details: [
      "Pregled aktivnih i planiranih prilika",
      "Fokus na djelatnost i tržišni signal",
      "Brže odlučivanje gdje vrijedi uložiti vrijeme",
    ],
  },
  {
    icon: TrendingUp,
    title: "Vidite ko dobija poslove",
    description:
      "Ne donosite odluke naslijepo. Imate uvid ko pobjeđuje, gdje pobjeđuje i kakav je obrazac na tržištu.",
    details: [
      "Pregled pobjednika i obrazaca dodjele",
      "Brže prepoznavanje ozbiljnih konkurenata",
      "Bolja procjena gdje imate realnu šansu",
    ],
  },
  {
    icon: BarChart3,
    title: "Donosite odluke na osnovu podataka",
    description:
      "Više od liste tendera: pregled tržišta i konkurencije postaje dio vašeg svakodnevnog odlučivanja.",
    details: [
      "Gdje se isplati prijaviti",
      "Kako se tržište kreće",
      "Šta dolazi prije nego što konkurencija reaguje",
    ],
  },
] as const;

function SolutionSection() {
  return (
    <section id="analitika" className="bg-white px-6 py-24 sm:py-32 overflow-hidden border-t border-slate-100">
      <div className="mx-auto max-w-7xl">
        <div className="text-center max-w-3xl mx-auto mb-20">
          <h2 className="font-heading text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
            Više od <span className="text-primary">liste tendera</span>
          </h2>
          <p className="mt-4 text-lg text-slate-600">
            Vidite ko dobija poslove, gdje se pojavljuju prilike i kako se tržište kreće. Donosite odluke na osnovu stvarnih podataka.
          </p>
        </div>

        <div className="grid gap-8 lg:grid-cols-3">
          {FEATURES.map((f) => (
            <div
              key={f.title}
              className="rounded-[2rem] border border-slate-200 bg-slate-50/60 p-8 shadow-sm transition-all hover:-translate-y-1 hover:bg-white hover:shadow-xl hover:shadow-slate-200/40"
            >
              <div className="inline-flex size-14 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-lg shadow-blue-500/20">
                <f.icon className="size-7" />
              </div>
              <h3 className="mt-8 font-heading text-2xl font-bold text-slate-900">
                {f.title}
              </h3>
              <p className="mt-4 text-base leading-7 text-slate-600">
                {f.description}
              </p>
              <div className="mt-8 space-y-3">
                {f.details.map((d) => (
                  <div key={d} className="flex items-start gap-3 rounded-xl border border-slate-200 bg-white p-4">
                    <CheckCircle className="mt-0.5 size-5 shrink-0 text-blue-600" />
                    <span className="text-sm font-medium leading-6 text-slate-700">{d}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function StatsSection() {
  const cards = [
    {
      icon: Shield,
      title: "Kada odlučite da se prijavite — znate šta treba",
      description:
        "Pregled zahtjeva i dokumentacije, jasno i bez nagađanja.",
      items: [
        "Jasan početni pregled dokumentacije",
        "Manje vraćanja na tender i ručne provjere",
        "Više kontrole prije konačne prijave",
      ],
    },
    {
      icon: Clock,
      title: "Ne morate provjeravati portale svaki dan",
      description:
        "Dobijete obavijest čim se pojavi novi tender za vašu djelatnost.",
      items: [
        "Brža reakcija na novu priliku",
        "Manje ručne pretrage i praćenja rokova",
        "Pregled važnih objava na jednom mjestu",
      ],
    },
  ];

  return (
    <section className="bg-slate-900 px-6 py-24 text-white relative overflow-hidden">
      <div className="absolute inset-0 bg-blue-600/10" />
      <div className="mx-auto max-w-7xl relative z-10">
        <div className="grid gap-8 lg:grid-cols-2">
          {cards.map((card) => (
            <div key={card.title} className="rounded-[2rem] border border-white/10 bg-white/5 p-8 backdrop-blur-sm">
              <div className="flex size-14 items-center justify-center rounded-2xl bg-white/10 text-blue-200">
                <card.icon className="size-7" />
              </div>
              <h3 className="mt-6 font-heading text-2xl font-bold text-white">
                {card.title}
              </h3>
              <p className="mt-3 text-base leading-7 text-slate-300">
                {card.description}
              </p>
              <div className="mt-8 space-y-3">
                {card.items.map((item) => (
                  <div key={item} className="flex items-start gap-3 rounded-xl border border-white/10 bg-white/5 p-4">
                    <CheckCircle className="mt-0.5 size-5 shrink-0 text-blue-200" />
                    <span className="text-sm leading-6 text-slate-200">{item}</span>
                  </div>
                ))}
              </div>
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
            Paketi za firme koje žele <span className="text-primary">pregled i kontrolu</span>
          </h2>
          <p className="mt-4 text-lg text-slate-600">
            Odaberite paket prema obimu rada, broju tendera i nivou uvida koji vam je potreban.
          </p>
        </div>

        <div className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-3 lg:items-start">
          {/* Osnovni */}
          <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm hover:shadow-md transition-shadow">
            <h3 className="font-heading text-xl font-bold text-slate-900">Osnovni</h3>
            <p className="mt-2 text-sm text-slate-500 h-10">Za firme koje žele pratiti prilike i imati osnovnu kontrolu dokumentacije.</p>
            <div className="mt-6 flex items-baseline gap-1">
              <span className="font-heading text-4xl font-bold text-slate-900">50</span>
              <span className="text-sm font-medium text-slate-500">KM / mj.</span>
            </div>
            <div className="mt-8 space-y-4">
              {[
                "Besplatan profil firme",
                "Vidite signale za nove prilike",
                "Pronađeni tenderi blizu vas",
                "Osnovni uvid u tržište",
              ].map((f) => (
                <div key={f} className="flex items-start gap-3">
                  <CheckCircle className="size-5 shrink-0 text-slate-400" />
                  <span className="text-slate-600 text-sm">{f}</span>
                </div>
              ))}
            </div>
            <Link
              href="/signup"
              className="mt-8 flex w-full items-center justify-center rounded-full border border-slate-300 bg-white py-3 text-sm font-semibold text-slate-700 transition-all hover:bg-slate-50"
            >
              Odaberi Osnovni
            </Link>
          </div>

          {/* Puni - Istaknut */}
          <div className="relative rounded-3xl border-2 border-primary bg-white p-8 shadow-2xl shadow-blue-500/10 transform scale-105 z-10">
            <div className="absolute -top-4 inset-x-0 flex justify-center">
              <span className="rounded-full bg-primary px-4 py-1 text-xs font-bold uppercase tracking-wider text-white">
                Najčešći izbor
              </span>
            </div>
            <h3 className="font-heading text-xl font-bold text-slate-900">Puni Paket</h3>
            <p className="mt-2 text-sm text-slate-500 h-10">Za firme koje redovno apliciraju i ne žele izgubiti tender zbog propusta.</p>
            <div className="mt-6 flex items-baseline gap-1">
              <span className="font-heading text-5xl font-bold text-slate-900">100</span>
              <span className="text-sm font-medium text-slate-500">KM / mj.</span>
            </div>
            <div className="mt-8 space-y-4">
              {[
                "Vidite sve tendere za vašu firmu",
                "Email obavijesti o novim poslovima",
                "Objašnjenje relevantnosti tendera",
                "Priprema ponude po potrebi (15 KM)",
                "Bez rizika propuštenih prilika",
              ].map((f) => (
                <div key={f} className="flex items-start gap-3">
                  <CheckCircle className="size-5 shrink-0 text-primary" />
                  <span className="text-slate-700 font-medium text-sm">{f}</span>
                </div>
              ))}
            </div>
            <Link
              href="/signup"
              className="mt-8 flex w-full items-center justify-center rounded-full bg-primary py-3.5 text-sm font-bold text-white transition-all hover:bg-blue-700 hover:shadow-lg hover:shadow-blue-500/30"
            >
              Isprobaj besplatno
            </Link>
          </div>

          {/* Agencijski */}
          <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm hover:shadow-md transition-shadow">
            <h3 className="font-heading text-xl font-bold text-slate-900">Agencijski</h3>
            <p className="mt-2 text-sm text-slate-500 h-10">Za konsultante i agencije koje vode više firmi i trebaju odvojenu kontrolu po klijentu.</p>
            <div className="mt-6 flex items-baseline gap-1">
              <span className="font-heading text-4xl font-bold text-slate-900">250</span>
              <span className="text-sm font-medium text-slate-500">KM / mj.</span>
            </div>
            <div className="mt-8 space-y-4">
              {[
                "Sve funkcionalnosti Pro paketa",
                "Upravljanje s više profilnih firmi",
                "Napredna analiza tržišta",
                "Poseban pristup podršci",
                "Idealno za agencije i konsultante",
              ].map((f) => (
                <div key={f} className="flex items-start gap-3">
                  <CheckCircle className="size-5 shrink-0 text-slate-400" />
                  <span className="text-slate-600 text-sm">{f}</span>
                </div>
              ))}
            </div>
            <Link
              href="/signup"
              className="mt-8 flex w-full items-center justify-center rounded-full border border-slate-300 bg-white py-3 text-sm font-semibold text-slate-700 transition-all hover:bg-slate-50"
            >
              Kontaktirajte nas
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
    a: "Podržani su svi standardni formate (PDF, JPG, PNG, DOCX) veličine do 20MB. Za najbolju AI ekstrakciju preporučujemo PDF format sa prepoznatim tekstom.",
  },
  {
    q: "Koliko su moji podaci sigurni?",
    a: "Koristimo bankovne standarde enkripcije (AES-256) za čuvanje dokumenata. Vaša baza ponuda i dokumenata je izolirana od ostalih korisnika.",
  },
  {
    q: "Kako AI pronalazi uslove u tenderu?",
    a: "Platforma izdvaja najvažnije zahtjeve iz tendera i prikazuje ih za pregled. Vi zadržavate završnu kontrolu i potvrđujete šta je zaista spremno za slanje.",
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
          Pronalazi, filtrira i prati tendere za vašu firmu — i vodi vas kroz prijavu.
        </h2>
        <p className="mx-auto mt-6 max-w-xl text-lg text-slate-300">
          Pregled tržišta, relevantne prilike i jasniji sljedeći korak na jednom mjestu.
        </p>
        <div className="mt-10 flex justify-center">
          <Link
            href="/signup"
            className="inline-flex h-14 items-center justify-center gap-2 rounded-full bg-white px-8 text-base font-bold text-slate-900 transition-all hover:bg-slate-100 hover:scale-105"
          >
            Pogledajte prvi pregled tendera
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
              2023 Sva prava zadržana.
            </p>
          </div>

          <div>
            <h4 className="font-bold text-slate-900 mb-4">Kompanija</h4>
            <ul className="space-y-2 text-sm text-slate-600">
              <li><Link href="/about" className="hover:text-primary">O nama</Link></li>
              <li><Link href="/blog" className="hover:text-primary">Blog</Link></li>
              <li><Link href="/contact" className="hover:text-primary">Kontakt</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="font-bold text-slate-900 mb-4">Pravno</h4>
            <ul className="space-y-2 text-sm text-slate-600">
              <li><Link href="/privacy" className="hover:text-primary">Politika privatnosti</Link></li>
              <li><Link href="/terms" className="hover:text-primary">Uslovi korištenja</Link></li>
              <li><Link href="/cookies" className="hover:text-primary">Kolačići</Link></li>
            </ul>
          </div>
        </div>
        
        <div className="border-t border-slate-100 pt-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-sm text-slate-400">
            © {new Date().getFullYear()} MojaPonuda.ba. Sva prava zadržana.
          </p>
          <div className="flex items-center gap-6">
             {/* Social icons placeholder */}
          </div>
        </div>
      </div>
    </footer>
  );
}

export function LandingPage({ isLoggedIn }: LandingPageProps) {
  return (
    <div className="min-h-screen bg-white font-sans selection:bg-blue-100 selection:text-blue-900">
      <NavBar isLoggedIn={isLoggedIn} />
      <HeroSection isLoggedIn={isLoggedIn} />
      <ProblemSection />
      <HowItWorksSection />
      <PracticeSection />
      <SolutionSection />
      <StatsSection />
      <PricingSection />
      <FAQSection />
      <FinalCTA />
      <Footer />
    </div>
  );
}
