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
} from "lucide-react";

function NavBar() {
  return (
    <nav className="fixed top-0 z-50 w-full border-b border-white/5 bg-[#0a1628]/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
        <Link href="/" className="flex items-baseline gap-0.5">
          <span className="font-serif text-lg font-bold tracking-tight text-white">
            MojaPonuda
          </span>
          <span className="font-serif text-lg font-bold text-[#3b82f6]">.ba</span>
        </Link>

        <div className="hidden items-center gap-8 sm:flex">
          <a href="#problem" className="text-[13px] text-[#94a3b8] transition-colors hover:text-white">
            Problem
          </a>
          <a href="#kako-radi" className="text-[13px] text-[#94a3b8] transition-colors hover:text-white">
            Kako radi
          </a>
          <a href="#rjesenje" className="text-[13px] text-[#94a3b8] transition-colors hover:text-white">
            Mogućnosti
          </a>
          <a href="#cijene" className="text-[13px] text-[#94a3b8] transition-colors hover:text-white">
            Cijene
          </a>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/login"
            className="text-[13px] font-medium text-[#94a3b8] transition-colors hover:text-white"
          >
            Prijava
          </Link>
          <Link
            href="/signup"
            className="rounded-lg bg-[#3b82f6] px-5 py-2 text-[13px] font-semibold text-white transition-colors hover:bg-[#2563eb]"
          >
            Počnite besplatno
          </Link>
        </div>
      </div>
    </nav>
  );
}

function HeroSection() {
  return (
    <section className="relative overflow-hidden bg-[#0a1628] px-6 pb-20 pt-28 sm:pb-32 sm:pt-36">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(59,130,246,0.1)_0%,_transparent_60%)]" />

      <div className="relative z-10 mx-auto max-w-6xl">
        <div className="mx-auto max-w-3xl text-center">
          <p className="mb-5 font-mono text-[11px] font-semibold uppercase tracking-[0.25em] text-[#3b82f6]">
            Platforma za javne nabavke BiH
          </p>

          <h1 className="font-serif text-4xl font-bold leading-[1.1] tracking-tight text-white sm:text-5xl lg:text-6xl">
            Pripremite ponudu
            <br />
            <span className="text-[#3b82f6]">bez grešaka.</span>
          </h1>

          <p className="mx-auto mt-6 max-w-xl text-base leading-relaxed text-[#94a3b8] sm:text-lg">
            Jedna platforma za dokumente, ponude i tržišnu inteligenciju.
            Prestanite gubiti ugovore zbog administrativnih grešaka.
          </p>

          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              href="/signup"
              className="inline-flex items-center gap-2 rounded-lg bg-[#3b82f6] px-8 py-3.5 text-sm font-semibold text-white shadow-lg shadow-blue-500/20 transition-all hover:bg-[#2563eb] hover:shadow-blue-500/30"
            >
              Počnite besplatno
              <ArrowRight className="size-4" />
            </Link>
            <a
              href="#kako-radi"
              className="inline-flex items-center gap-2 rounded-lg border border-[#1e3a5f] px-8 py-3.5 text-sm font-semibold text-[#94a3b8] transition-all hover:border-[#3b82f6]/40 hover:text-white"
            >
              Pogledajte kako radi
              <ChevronDown className="size-4" />
            </a>
          </div>

          <p className="mt-4 font-mono text-[11px] text-[#64748b]">
            Besplatno za prve 3 ponude. Bez kreditne kartice.
          </p>
        </div>

        {/* Product Mockup Frame */}
        <div className="relative mx-auto mt-16 max-w-5xl">
          <div className="overflow-hidden rounded-xl border border-[#1e3a5f]/60 bg-[#111d33] shadow-2xl shadow-black/40">
            {/* Browser chrome */}
            <div className="flex items-center gap-2 border-b border-[#1e3a5f]/60 bg-[#0a1628] px-4 py-3">
              <div className="flex gap-1.5">
                <div className="size-2.5 rounded-full bg-[#1e3a5f]" />
                <div className="size-2.5 rounded-full bg-[#1e3a5f]" />
                <div className="size-2.5 rounded-full bg-[#1e3a5f]" />
              </div>
              <div className="mx-auto flex h-6 w-72 items-center justify-center rounded-md bg-[#0f1d32] font-mono text-[10px] text-[#64748b]">
                app.mojaponuda.ba/dashboard
              </div>
            </div>
            {/* Dashboard preview content */}
            <div className="p-6">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <div className="h-6 w-48 rounded bg-[#1e3a5f]/50" />
                  <div className="mt-2 h-3 w-32 rounded bg-[#1e3a5f]/30" />
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-4">
                {[
                  { label: "Dokumenti", val: "24", color: "text-blue-400", icon: FileText },
                  { label: "Ponude", val: "8", color: "text-amber-400", icon: Briefcase },
                  { label: "Tenderi", val: "1,247", color: "text-emerald-400", icon: Search },
                  { label: "Odluke", val: "3,891", color: "text-purple-400", icon: BarChart3 },
                ].map((s) => (
                  <div
                    key={s.label}
                    className="rounded-lg border border-[#1e3a5f]/60 bg-[#0a1628]/50 p-4"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] text-[#64748b]">{s.label}</span>
                      <s.icon className={`size-3.5 ${s.color}`} />
                    </div>
                    <p className="mt-2 font-mono text-2xl font-bold text-white">{s.val}</p>
                  </div>
                ))}
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-5">
                <div className="rounded-lg border border-[#1e3a5f]/60 bg-[#0a1628]/50 p-4 sm:col-span-3">
                  <div className="mb-3 h-4 w-28 rounded bg-[#1e3a5f]/50" />
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="mb-2 flex items-center gap-3">
                      <div className={`size-2 rounded-full ${i === 1 ? "bg-amber-400" : i === 2 ? "bg-blue-400" : "bg-emerald-400"}`} />
                      <div className="h-3 flex-1 rounded bg-[#1e3a5f]/30" />
                      <div className="h-3 w-16 rounded bg-[#1e3a5f]/20" />
                    </div>
                  ))}
                </div>
                <div className="space-y-3 sm:col-span-2">
                  {[
                    { color: "border-blue-500/20 bg-blue-500/5", icon: Upload, iconColor: "text-blue-400" },
                    { color: "border-emerald-500/20 bg-emerald-500/5", icon: Search, iconColor: "text-emerald-400" },
                  ].map((a, i) => (
                    <div key={i} className={`rounded-lg border p-3 ${a.color}`}>
                      <div className="flex items-center gap-3">
                        <a.icon className={`size-4 ${a.iconColor}`} />
                        <div className="h-3 w-24 rounded bg-[#1e3a5f]/30" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
          {/* Fade at bottom */}
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-[#0a1628] to-transparent" />
        </div>
      </div>
    </section>
  );
}

const PROBLEMS = [
  {
    icon: FolderSearch,
    title: "Dokumenta svuda",
    description:
      "Uvjerenje o registraciji u jednom folderu, potvrda o porezu u emailu, garancija negdje na desktopu. Svaki tender — isto traženje ispočetka.",
  },
  {
    icon: Clock,
    title: "Rokovi koji iznenađuju",
    description:
      "Dokument istekne usred pripreme ponude. Nema ko da upozori. Saznate tek kad je kasno.",
  },
  {
    icon: EyeOff,
    title: "Ne znate gdje stojite",
    description:
      "Ko pobjeđuje, po kojim cijenama, koji tenderi dolaze? Radite na slijepo dok konkurencija koristi podatke.",
  },
] as const;

function ProblemSection() {
  return (
    <section id="problem" className="bg-[#f8fafc] px-6 py-24">
      <div className="mx-auto max-w-6xl">
        <p className="text-center font-mono text-[11px] font-semibold uppercase tracking-[0.25em] text-[#3b82f6]">
          Problem
        </p>
        <h2 className="mt-4 text-center font-serif text-3xl font-bold tracking-tight text-[#0f172a] sm:text-4xl">
          Priprema ponude ne bi trebala biti najteži dio posla.
        </h2>
        <p className="mx-auto mt-4 max-w-2xl text-center text-base text-[#64748b]">
          Većina firmi u BiH i dalje priprema ponude ručno — i plaća cijenu za to.
        </p>

        <div className="mt-16 grid gap-6 sm:grid-cols-3">
          {PROBLEMS.map((p) => (
            <div
              key={p.title}
              className="rounded-xl border border-[#e2e8f0] bg-white p-6 shadow-sm transition-shadow hover:shadow-md"
            >
              <div className="flex size-11 items-center justify-center rounded-lg bg-red-50">
                <p.icon className="size-5 text-red-500" />
              </div>
              <h3 className="mt-4 font-serif text-lg font-bold text-[#0f172a]">
                {p.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-[#64748b]">
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
    step: "01",
    title: "Uploadujte dokumente",
    description: "Jednom uploadujte sva dokumenta firme. Sistem prati rokove i upozorava prije isteka.",
    icon: Upload,
    color: "bg-blue-500/10 text-blue-400",
  },
  {
    step: "02",
    title: "Pripremite ponudu",
    description: "AI analizira tendersku dokumentaciju i generiše checklist. Vi samo priložite dokumente.",
    icon: LayoutDashboard,
    color: "bg-amber-500/10 text-amber-400",
  },
  {
    step: "03",
    title: "Pobjedite tender",
    description: "Iskoristite tržišnu inteligenciju da znate ko konkuriše i po kojim cijenama.",
    icon: TrendingUp,
    color: "bg-emerald-500/10 text-emerald-400",
  },
] as const;

function HowItWorksSection() {
  return (
    <section id="kako-radi" className="bg-[#0a1628] px-6 py-24">
      <div className="mx-auto max-w-6xl">
        <p className="text-center font-mono text-[11px] font-semibold uppercase tracking-[0.25em] text-[#3b82f6]">
          Kako radi
        </p>
        <h2 className="mt-4 text-center font-serif text-3xl font-bold tracking-tight text-white sm:text-4xl">
          Tri koraka do uspješne ponude.
        </h2>

        <div className="mt-16 grid gap-8 sm:grid-cols-3">
          {HOW_IT_WORKS.map((s, i) => (
            <div key={s.step} className="relative text-center">
              <div className={`mx-auto flex size-14 items-center justify-center rounded-2xl ${s.color.split(" ")[0]}`}>
                <s.icon className={`size-6 ${s.color.split(" ")[1]}`} />
              </div>
              <span className="mt-4 block font-mono text-[11px] font-bold uppercase tracking-widest text-[#3b82f6]">
                Korak {s.step}
              </span>
              <h3 className="mt-2 font-serif text-xl font-bold text-white">
                {s.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-[#94a3b8]">
                {s.description}
              </p>
              {i < HOW_IT_WORKS.length - 1 && (
                <ChevronRight className="absolute -right-4 top-6 hidden size-5 text-[#1e3a5f] sm:block" />
              )}
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
    title: "Trezor dokumenata",
    description:
      "Centralizirano skladište svih dokumenata vaše firme. Automatsko praćenje isteka — upozorenje 60, 30 i 7 dana prije.",
    details: [
      "Upload jednom, koristite na svakom tenderu",
      "Automatska upozorenja za istek dokumenata",
      "Pregled, preuzimanje i organizacija po tipu",
    ],
  },
  {
    icon: LayoutDashboard,
    title: "Radni prostor za ponude",
    description:
      "Svaki tender ima dedicirani workspace. AI analizira dokumentaciju i generiše checklist obaveznih dokumenata.",
    details: [
      "AI-generisan checklist zahtjeva",
      "Povezivanje dokumenata iz trezora",
      "Praćenje statusa i izvoz PDF paketa",
    ],
  },
  {
    icon: TrendingUp,
    title: "Tržišna inteligencija",
    description:
      "Historijski podaci o pobjednicima, cijenama i naručiocima. Planirani tenderi prije javne objave.",
    details: [
      "Ko pobjeđuje i po kojim cijenama",
      "Analiza naručilaca i konkurenata",
      "Nadolazeći tenderi iz planova nabavki",
    ],
  },
] as const;

function SolutionSection() {
  return (
    <section id="rjesenje" className="bg-[#f8fafc] px-6 py-24">
      <div className="mx-auto max-w-6xl">
        <p className="text-center font-mono text-[11px] font-semibold uppercase tracking-[0.25em] text-[#3b82f6]">
          Mogućnosti
        </p>
        <h2 className="mt-4 text-center font-serif text-3xl font-bold tracking-tight text-[#0f172a] sm:text-4xl">
          Sve što vam treba. Na jednom mjestu.
        </h2>

        <div className="mt-16 space-y-20">
          {FEATURES.map((f, i) => (
            <div
              key={f.title}
              className={`flex flex-col items-center gap-12 lg:flex-row ${
                i % 2 === 1 ? "lg:flex-row-reverse" : ""
              }`}
            >
              {/* Mockup placeholder */}
              <div className="flex-1">
                <div className="overflow-hidden rounded-xl border border-[#e2e8f0] bg-white shadow-lg">
                  <div className="flex items-center gap-1.5 border-b border-[#f1f5f9] px-4 py-2.5">
                    <div className="size-2 rounded-full bg-[#e2e8f0]" />
                    <div className="size-2 rounded-full bg-[#e2e8f0]" />
                    <div className="size-2 rounded-full bg-[#e2e8f0]" />
                  </div>
                  <div className="bg-[#0a1628] p-6">
                    <div className="mb-3 flex items-center gap-3">
                      <div className="flex size-8 items-center justify-center rounded-lg bg-[#3b82f6]/10">
                        <f.icon className="size-4 text-[#3b82f6]" />
                      </div>
                      <div className="h-4 w-32 rounded bg-[#1e3a5f]/50" />
                    </div>
                    {[1, 2, 3, 4].map((row) => (
                      <div key={row} className="mb-2 flex items-center gap-3">
                        <div className={`size-2 rounded-full ${row <= 2 ? "bg-emerald-400" : row === 3 ? "bg-amber-400" : "bg-[#1e3a5f]"}`} />
                        <div className="h-3 flex-1 rounded bg-[#1e3a5f]/30" style={{ maxWidth: `${70 + row * 5}%` }} />
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Text */}
              <div className="flex-1">
                <div className="flex size-11 items-center justify-center rounded-lg bg-[#3b82f6]/10">
                  <f.icon className="size-5 text-[#3b82f6]" />
                </div>
                <h3 className="mt-4 font-serif text-2xl font-bold text-[#0f172a]">
                  {f.title}
                </h3>
                <p className="mt-3 text-base leading-relaxed text-[#64748b]">
                  {f.description}
                </p>
                <ul className="mt-5 space-y-2.5">
                  {f.details.map((d) => (
                    <li key={d} className="flex items-center gap-3">
                      <CheckCircle className="size-4 shrink-0 text-[#3b82f6]" />
                      <span className="text-sm text-[#334155]">{d}</span>
                    </li>
                  ))}
                </ul>
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
    { value: "3x", label: "Brža priprema ponude" },
    { value: "0", label: "Propuštenih rokova" },
    { value: "100%", label: "Dokumenata na jednom mjestu" },
    { value: "24/7", label: "Pristup platformi" },
  ];

  return (
    <section className="bg-[#0a1628] px-6 py-20">
      <div className="mx-auto grid max-w-5xl gap-8 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="text-center">
            <p className="font-mono text-4xl font-bold tracking-tight text-[#3b82f6]">
              {s.value}
            </p>
            <p className="mt-2 text-sm text-[#94a3b8]">{s.label}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function TestimonialSection() {
  return (
    <section className="bg-[#f1f5f9] px-6 py-24">
      <div className="mx-auto max-w-3xl text-center">
        <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.25em] text-[#3b82f6]">
          Iskustva korisnika
        </p>
        <div className="mt-10 rounded-xl border border-[#e2e8f0] bg-white p-8 shadow-sm sm:p-12">
          <p className="font-serif text-lg leading-relaxed text-[#334155] italic sm:text-xl">
            &ldquo;Prije MojaPonude, priprema jedne ponude nam je trajala 3-4
            dana. Sad nam treba dan, a nismo propustili nijedan rok otkad
            koristimo platformu. Za firmu koja učestvuje na 15-20 tendera
            godišnje, to je ogromna ušteda.&rdquo;
          </p>
          <div className="mt-8 flex items-center justify-center gap-4">
            <div className="flex size-12 items-center justify-center rounded-full bg-[#3b82f6]/10 font-serif text-lg font-bold text-[#3b82f6]">
              M
            </div>
            <div className="text-left">
              <p className="font-semibold text-[#0f172a]">Mirza Hodžić</p>
              <p className="text-sm text-[#64748b]">
                Direktor, Gradnja Plus d.o.o. Zenica
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

const PRICING_FEATURES = [
  "Trezor dokumenata s upozorenjima za istek",
  "Radni prostor za svaki tender",
  "AI analiza tenderske dokumentacije",
  "Automatski checklist obaveznih dokumenata",
  "Izvoz PDF paketa ponude",
  "Pretraga i praćenje aktivnih tendera",
  "Tržišna analitika — pobjednici, cijene, trendovi",
  "Planirane nabavke — tenderi prije objave",
] as const;

function PricingSection() {
  return (
    <section id="cijene" className="bg-[#0a1628] px-6 py-24">
      <div className="mx-auto max-w-6xl">
        <p className="text-center font-mono text-[11px] font-semibold uppercase tracking-[0.25em] text-[#3b82f6]">
          Cijene
        </p>
        <h2 className="mt-4 text-center font-serif text-3xl font-bold tracking-tight text-white sm:text-4xl">
          Jednostavno i transparentno.
        </h2>

        <div className="mx-auto mt-16 grid max-w-4xl gap-6 lg:grid-cols-2">
          {/* Free */}
          <div className="rounded-xl border border-[#1e3a5f] bg-[#111d33] p-8">
            <h3 className="font-serif text-lg font-bold text-white">Besplatno</h3>
            <div className="mt-3 flex items-baseline gap-1">
              <span className="font-mono text-4xl font-bold text-white">0</span>
              <span className="text-sm text-[#64748b]">EUR / mjesečno</span>
            </div>
            <p className="mt-3 text-sm text-[#94a3b8]">
              Testirajte platformu bez obaveza.
            </p>
            <ul className="mt-6 space-y-3">
              {[
                "Do 3 ponude",
                "Trezor dokumenata",
                "Pretraga tendera",
                "Osnovna analitika",
              ].map((f) => (
                <li key={f} className="flex items-center gap-3">
                  <CheckCircle className="size-4 shrink-0 text-[#64748b]" />
                  <span className="text-sm text-[#cbd5e1]">{f}</span>
                </li>
              ))}
            </ul>
            <Link
              href="/signup"
              className="mt-8 flex w-full items-center justify-center rounded-lg border border-[#1e3a5f] py-3 text-sm font-semibold text-[#94a3b8] transition-all hover:border-[#3b82f6]/40 hover:text-white"
            >
              Registrujte se
            </Link>
          </div>

          {/* Pro */}
          <div className="relative rounded-xl border-2 border-[#3b82f6]/40 bg-[#111d33] p-8 shadow-lg shadow-blue-500/5">
            <span className="absolute -top-3 right-6 rounded-full bg-[#3b82f6] px-3 py-1 font-mono text-[10px] font-bold uppercase tracking-wider text-white">
              Najpopularnije
            </span>
            <h3 className="font-serif text-lg font-bold text-white">
              MojaPonuda Pro
            </h3>
            <div className="mt-3 flex items-baseline gap-1">
              <span className="font-mono text-4xl font-bold text-white">80</span>
              <span className="text-sm text-[#64748b]">EUR / mjesečno</span>
            </div>
            <p className="mt-3 text-sm text-[#94a3b8]">
              Sve za ozbiljnu pripremu ponuda.
            </p>
            <ul className="mt-6 space-y-3">
              {PRICING_FEATURES.map((f) => (
                <li key={f} className="flex items-center gap-3">
                  <CheckCircle className="size-4 shrink-0 text-[#3b82f6]" />
                  <span className="text-sm text-[#cbd5e1]">{f}</span>
                </li>
              ))}
            </ul>
            <Link
              href="/signup"
              className="mt-8 flex w-full items-center justify-center gap-2 rounded-lg bg-[#3b82f6] py-3 text-sm font-semibold text-white shadow-lg shadow-blue-500/20 transition-all hover:bg-[#2563eb]"
            >
              Počnite besplatno
              <ArrowRight className="size-4" />
            </Link>
            <p className="mt-3 text-center font-mono text-[10px] text-[#64748b]">
              Bez ugovora. Otkazivanje u bilo kojem trenutku.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

const FAQ_ITEMS = [
  {
    q: "Da li moram platiti odmah?",
    a: "Ne. Registracija je besplatna i dobijate 3 besplatne ponude. Pretplata je potrebna tek kad potrošite besplatne ponude.",
  },
  {
    q: "Koji dokumenti se mogu uploadovati?",
    a: "PDF i slike (PNG, JPG) do 10MB. Uvjerenja o registraciji, potvrde o porezu, garancije, licence — sve što vam treba za ponude.",
  },
  {
    q: "Kako radi AI analiza?",
    a: "AI čita tendersku dokumentaciju i automatski generiše checklist obaveznih dokumenata. Identificira rizike i zahtjeve koje ne smijete propustiti.",
  },
  {
    q: "Odakle dolaze podaci o tenderima?",
    a: "Podaci se dohvaćaju iz javnog BiH e-Procurement portala (ejn.gov.ba) i ažuriraju se svakodnevno.",
  },
  {
    q: "Mogu li otkazati pretplatu?",
    a: "Da, u svakom trenutku. Bez ugovora, bez penala. Vaši podaci ostaju dostupni do kraja tekućeg perioda.",
  },
  {
    q: "Da li su moji podaci sigurni?",
    a: "Da. Koristimo Supabase s Row Level Security — svaka firma vidi samo svoje podatke. Dokumenti su enkriptirani u skladištu.",
  },
] as const;

function FAQSection() {
  return (
    <section className="bg-[#f8fafc] px-6 py-24">
      <div className="mx-auto max-w-3xl">
        <p className="text-center font-mono text-[11px] font-semibold uppercase tracking-[0.25em] text-[#3b82f6]">
          FAQ
        </p>
        <h2 className="mt-4 text-center font-serif text-3xl font-bold tracking-tight text-[#0f172a] sm:text-4xl">
          Česta pitanja
        </h2>

        <div className="mt-12 space-y-4">
          {FAQ_ITEMS.map((item) => (
            <details
              key={item.q}
              className="group rounded-xl border border-[#e2e8f0] bg-white shadow-sm"
            >
              <summary className="flex cursor-pointer items-center justify-between px-6 py-4 text-sm font-semibold text-[#0f172a] [&::-webkit-details-marker]:hidden">
                {item.q}
                <Plus className="size-4 shrink-0 text-[#94a3b8] transition-transform group-open:hidden" />
                <Minus className="hidden size-4 shrink-0 text-[#3b82f6] transition-transform group-open:block" />
              </summary>
              <div className="border-t border-[#f1f5f9] px-6 pb-4 pt-3">
                <p className="text-sm leading-relaxed text-[#64748b]">
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
    <section className="bg-[#0a1628] px-6 py-24">
      <div className="mx-auto max-w-3xl text-center">
        <h2 className="font-serif text-3xl font-bold tracking-tight text-white sm:text-4xl lg:text-5xl">
          Spremni za sljedeći tender?
        </h2>
        <p className="mx-auto mt-4 max-w-lg text-base text-[#94a3b8]">
          Pridružite se firmama koje pripremaju ponude pametnije, brže i bez
          grešaka.
        </p>
        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link
            href="/signup"
            className="inline-flex items-center gap-2 rounded-lg bg-[#3b82f6] px-10 py-4 text-sm font-semibold text-white shadow-lg shadow-blue-500/20 transition-all hover:bg-[#2563eb]"
          >
            Počnite besplatno
            <ArrowRight className="size-4" />
          </Link>
        </div>
        <p className="mt-4 font-mono text-[11px] text-[#64748b]">
          3 ponude besplatno. Bez kreditne kartice.
        </p>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="border-t border-[#1e3a5f]/40 bg-[#070f1e] px-6 py-10">
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-col items-center justify-between gap-6 sm:flex-row">
          <div>
            <div className="flex items-baseline gap-0.5">
              <span className="font-serif text-sm font-bold text-[#94a3b8]">
                MojaPonuda
              </span>
              <span className="font-serif text-sm font-bold text-[#3b82f6]">
                .ba
              </span>
            </div>
            <p className="mt-1 text-[11px] text-[#475569]">
              Platforma za upravljanje ponudama u javnim nabavkama
            </p>
          </div>

          <div className="flex items-center gap-6">
            <Link
              href="/privacy"
              className="text-xs text-[#64748b] transition-colors hover:text-[#94a3b8]"
            >
              Politika privatnosti
            </Link>
            <Link
              href="/terms"
              className="text-xs text-[#64748b] transition-colors hover:text-[#94a3b8]"
            >
              Uvjeti korištenja
            </Link>
          </div>
        </div>

        <div className="mt-8 border-t border-[#1e3a5f]/30 pt-6 text-center">
          <p className="font-mono text-[11px] text-[#475569]">
            &copy; {new Date().getFullYear()} MojaPonuda.ba. Sva prava zadržana.
          </p>
        </div>
      </div>
    </footer>
  );
}

export function LandingPage() {
  return (
    <div className="min-h-screen">
      <NavBar />
      <HeroSection />
      <ProblemSection />
      <HowItWorksSection />
      <SolutionSection />
      <StatsSection />
      <TestimonialSection />
      <PricingSection />
      <FAQSection />
      <FinalCTA />
      <Footer />
    </div>
  );
}
