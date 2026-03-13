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
      className={`flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-slate-50 text-slate-400 w-full relative overflow-hidden group ${aspect ? aspect : 'aspect-[4/3]'} ${width || ''} ${height || ''}`}
    >
      <div className="absolute inset-0 bg-slate-100/50 opacity-0 group-hover:opacity-100 transition-opacity" />
      <ImageIcon className="mb-3 size-10 text-slate-300 group-hover:text-blue-400 transition-colors" />
      <span className="text-sm font-bold text-slate-500 text-center px-6 relative z-10">{text}</span>
      <span className="text-[10px] font-mono text-slate-400 mt-2 bg-white/50 px-2 py-1 rounded-md border border-slate-200">1920x1080px</span>
    </div>
  );
}

function NavBar() {
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
          <a href="#rjesenje" className="text-sm font-semibold text-slate-600 transition-colors hover:text-primary">
            Platforma
          </a>
          <a href="#cijene" className="text-sm font-semibold text-slate-600 transition-colors hover:text-primary">
            Cijene
          </a>
        </div>

        <div className="flex items-center gap-4">
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
        </div>
      </div>
    </nav>
  );
}

function HeroSection() {
  return (
    <section className="relative overflow-hidden bg-white px-6 pb-20 pt-32 sm:pb-32 sm:pt-40">
      {/* Background Elements */}
      <div className="absolute inset-0 -z-10 bg-[linear-gradient(to_right,#f1f5f9_1px,transparent_1px),linear-gradient(to_bottom,#f1f5f9_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)]" />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[500px] bg-blue-500/10 blur-[120px] rounded-full -z-10" />
      
      <div className="relative mx-auto max-w-7xl">
        <div className="text-center max-w-4xl mx-auto">
          <div className="inline-flex items-center gap-2 rounded-full border border-blue-100 bg-blue-50/50 px-4 py-1.5 mb-8 animate-fade-in-up">
            <span className="flex size-2 rounded-full bg-blue-500 animate-pulse shadow-[0_0_10px_rgba(59,130,246,0.5)]" />
            <span className="text-xs font-bold uppercase tracking-wide text-blue-700">
              Nova era javnih nabavki u BiH
            </span>
          </div>

          <h1 className="font-heading text-5xl font-extrabold leading-[1.1] tracking-tight text-slate-900 sm:text-6xl lg:text-7xl mb-8">
            Pobjeđujte na tenderima, <br className="hidden sm:block" />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-blue-400 relative">
              bez administrativnog stresa.
              <svg className="absolute w-full h-3 -bottom-1 left-0 text-blue-200 -z-10" viewBox="0 0 100 10" preserveAspectRatio="none">
                <path d="M0 5 Q 50 10 100 5" stroke="currentColor" strokeWidth="8" fill="none" />
              </svg>
            </span>
          </h1>

          <p className="mx-auto max-w-2xl text-lg leading-relaxed text-slate-600 sm:text-xl mb-10">
            Sveobuhvatna platforma za upravljanje dokumentacijom, AI analizu tenderskih uslova i praćenje tržišta javnih nabavki.
          </p>

          <div className="flex flex-col justify-center gap-4 sm:flex-row sm:items-center">
            <Link
              href="/signup"
              className="inline-flex h-14 items-center justify-center gap-2 rounded-full bg-primary px-8 text-base font-bold text-white shadow-xl shadow-blue-500/30 transition-all hover:bg-blue-700 hover:shadow-2xl hover:shadow-blue-500/40 hover:-translate-y-1"
            >
              Započnite besplatno
              <ArrowRight className="size-4" />
            </Link>
            <a
              href="#kako-radi"
              className="inline-flex h-14 items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-8 text-base font-bold text-slate-700 shadow-sm transition-all hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900"
            >
              <PlayCircle className="size-5 text-slate-400" />
              Pogledajte demo
            </a>
          </div>
          <div className="mt-6 flex items-center justify-center gap-6 text-sm text-slate-500">
            <div className="flex items-center gap-2">
              <CheckCircle className="size-4 text-blue-500" />
              <span>14 dana besplatno</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="size-4 text-blue-500" />
              <span>Bez kreditne kartice</span>
            </div>
          </div>
        </div>

        <div className="mt-20 mx-auto max-w-6xl px-4">
          <div className="relative rounded-2xl border border-slate-200/60 bg-white/50 p-2 shadow-2xl backdrop-blur-sm">
            <div className="absolute -inset-1 rounded-3xl bg-gradient-to-b from-blue-500/10 to-transparent opacity-50 blur-2xl -z-10" />
            <div className="overflow-hidden rounded-xl bg-slate-50 border border-slate-100 shadow-inner relative aspect-[16/9]">
               <ImagePlaceholder 
                 text="MAIN DASHBOARD UI: Modern SaaS Dashboard showing 'Active Tenders' table, metrics cards (70% win rate), vibrant blue sidebar, clean white background, Inter font." 
                 aspect="aspect-[16/9]" 
               />
               
               {/* Floating UI Elements Mockup */}
               <div className="absolute -right-12 top-12 w-64 rounded-xl border border-slate-100 bg-white p-4 shadow-xl shadow-slate-200/50 hidden lg:block animate-float-slow">
                 <div className="flex items-center gap-3 mb-3">
                   <div className="size-8 rounded-full bg-emerald-100 flex items-center justify-center">
                     <TrendingUp className="size-4 text-emerald-600" />
                   </div>
                   <div>
                     <p className="text-xs text-slate-500 font-medium">Win Rate</p>
                     <p className="text-lg font-bold text-slate-900">72.4%</p>
                   </div>
                 </div>
                 <div className="h-1 w-full bg-slate-100 rounded-full overflow-hidden">
                   <div className="h-full w-[72%] bg-emerald-500" />
                 </div>
               </div>

               <div className="absolute -left-8 bottom-20 w-72 rounded-xl border border-slate-100 bg-white p-4 shadow-xl shadow-slate-200/50 hidden lg:block animate-float-slower">
                 <div className="flex items-center gap-3">
                   <div className="size-10 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600">
                     <Clock className="size-5" />
                   </div>
                   <div>
                     <p className="text-sm font-bold text-slate-900">Rok ističe uskoro</p>
                     <p className="text-xs text-slate-500">Nabavka računarske opreme</p>
                   </div>
                   <span className="ml-auto text-xs font-bold text-red-500 bg-red-50 px-2 py-1 rounded-md">2 dana</span>
                 </div>
               </div>
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
    <section id="problem" className="bg-white px-6 py-24 sm:py-32 border-t border-slate-100">
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
    step: "01",
    title: "Centralizujte dokumentaciju",
    description: "Spremite sve dokumente firme u siguran trezor. Sistem automatski prepoznaje rokove važenja i šalje vam obavijesti 60, 30 i 7 dana prije isteka.",
    icon: Upload,
  },
  {
    step: "02",
    title: "AI analizira tender za vas",
    description: "Uploadujte tendersku dokumentaciju. Naš AI algoritam u sekundi čita tekst, pronalazi sve uslove kvalifikacije i generiše interaktivnu checklistu.",
    icon: LayoutDashboard,
  },
  {
    step: "03",
    title: "Sklapanje ponude i analiza",
    description: "Sistem uparuje zahtjeve sa vašim dokumentima u trezoru. Pomoću podataka sa tržišta, optimizujte cijenu i izvezite savršenu ponudu.",
    icon: TrendingUp,
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
              Jednostavan proces
             </span>
          </div>
          <h2 className="font-heading text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
            Kako MojaPonuda <span className="text-primary">ubrzava proces</span>
          </h2>
          <p className="mt-4 text-lg text-slate-600">
            Od pronalaska tendera do slanja gotove ponude u 3 jednostavna koraka.
          </p>
        </div>

        <div className="grid gap-8 lg:grid-cols-3">
          {HOW_IT_WORKS.map((s) => (
            <div key={s.step} className="relative bg-white rounded-[2rem] p-8 border border-slate-200 shadow-sm transition-all hover:shadow-xl hover:shadow-slate-200/50 hover:-translate-y-1">
              <div className="mb-6 flex items-center justify-between">
                <div className="flex size-14 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
                  <s.icon className="size-7" />
                </div>
                <span className="text-6xl font-heading font-black text-slate-100 select-none">
                  {s.step}
                </span>
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
    imagePrompt: "UI MOCKUP: Document Vault interface. Clean white table with document list. Status badges (Valid/Expired). Filter sidebar. Blue primary color accents. High fidelity.",
  },
  {
    icon: LayoutDashboard,
    title: "AI Radni Prostor",
    description:
      "Nema više ručnog podvlačenja uslova markerom. Naš AI čita dokumentaciju i stvara tačnu listu svega što vam treba.",
    details: [
      "Automatska ekstrakcija uslova",
      "Interaktivna checklist-a",
      "Generisanje finalnog paketa",
    ],
    imagePrompt: "UI MOCKUP: Bid Workspace. Split screen. Left side: PDF viewer with highlighted text. Right side: Checklist with 'Requirement Met' checkmarks. Modern, clean.",
  },
  {
    icon: TrendingUp,
    title: "Tržišna Inteligencija",
    description:
      "Podaci pobjeđuju. Analizirajte historiju pobjeda, prosječne cijene i budžetirane nabavke prije nego što budu objavljene.",
    details: [
      "Baza dodijeljenih ugovora",
      "Profili naručilaca i konkurencije",
      "Predikcija pobjedničke cijene",
    ],
    imagePrompt: "UI MOCKUP: Analytics Dashboard. Bar charts showing monthly revenue. Pie chart for category distribution. Competitor list with win rates. Professional data viz.",
  },
] as const;

function SolutionSection() {
  return (
    <section id="rjesenje" className="bg-white px-6 py-24 sm:py-32 overflow-hidden">
      <div className="mx-auto max-w-7xl">
        <div className="text-center max-w-3xl mx-auto mb-24">
          <h2 className="font-heading text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
            Sve što vam treba, <span className="text-primary">na jednom mjestu</span>
          </h2>
        </div>

        <div className="space-y-32">
          {FEATURES.map((f) => (
            <div
              key={f.title}
              className={`flex flex-col gap-12 lg:items-center lg:flex-row ${
                f.icon === TrendingUp ? "lg:flex-row-reverse" : ""
              }`}
            >
              <div className="flex-1 space-y-8">
                <div className="inline-flex size-14 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-lg shadow-blue-500/30">
                  <f.icon className="size-7" />
                </div>
                <h3 className="font-heading text-3xl font-bold text-slate-900">
                  {f.title}
                </h3>
                <p className="text-lg leading-relaxed text-slate-600">
                  {f.description}
                </p>
                <div className="grid gap-4 sm:grid-cols-1">
                  {f.details.map((d) => (
                    <div key={d} className="flex items-center gap-3 bg-slate-50 p-3 rounded-xl border border-slate-100">
                      <div className="size-6 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                        <CheckCircle className="size-3.5 text-blue-600" />
                      </div>
                      <span className="text-base font-medium text-slate-700">{d}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex-1 w-full relative group">
                <div className={`absolute top-1/2 -translate-y-1/2 ${f.icon === TrendingUp ? '-right-12' : '-left-12'} size-[500px] rounded-full bg-blue-500/5 blur-[100px] -z-10`} />
                <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl transition-transform duration-500 group-hover:scale-[1.02]">
                  <div className="absolute top-0 inset-x-0 h-8 bg-slate-100 border-b border-slate-200 flex items-center px-4 gap-2">
                    <div className="size-2.5 rounded-full bg-red-400/50" />
                    <div className="size-2.5 rounded-full bg-amber-400/50" />
                    <div className="size-2.5 rounded-full bg-emerald-400/50" />
                  </div>
                  <div className="pt-8 bg-slate-50">
                    <ImagePlaceholder text={f.imagePrompt} aspect="aspect-[4/3]" />
                  </div>
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
    <section className="bg-slate-900 px-6 py-24 text-white relative overflow-hidden">
      <div className="absolute inset-0 bg-blue-600/10" />
      <div className="mx-auto max-w-7xl relative z-10">
        <div className="grid gap-12 sm:grid-cols-2 lg:grid-cols-4">
          {stats.map((s, i) => (
            <div key={i} className="text-center sm:text-left">
              <p className="font-heading text-5xl font-extrabold lg:text-6xl tracking-tight text-white">
                {s.value}
              </p>
              <p className="mt-2 text-lg font-medium text-blue-200">{s.label}</p>
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

        <div className="mx-auto grid max-w-5xl gap-8 lg:grid-cols-2 lg:items-center">
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
          <div className="relative rounded-3xl border-2 border-primary bg-white p-8 shadow-2xl shadow-blue-500/10">
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

export function LandingPage() {
  return (
    <div className="min-h-screen bg-white font-sans selection:bg-blue-100 selection:text-blue-900">
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
