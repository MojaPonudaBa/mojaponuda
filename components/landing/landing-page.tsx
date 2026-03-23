"use client";

import Link from "next/link";
import {
  CheckCircle,
  ArrowRight,
  ChevronDown,
  X,
  Clock,
  Bell,
  FileText,
  TrendingUp,
  AlertTriangle,
  DollarSign,
  Zap,
  Bot,
} from "lucide-react";

interface LandingPageProps {
  isLoggedIn?: boolean;
}

// ─── Shared CTA ────────────────────────────────────────────────────────────
function PrimaryCTA({
  isLoggedIn,
  label = "Pronađi moje tendere",
  className = "",
}: {
  isLoggedIn?: boolean;
  label?: string;
  className?: string;
}) {
  return (
    <Link
      href={isLoggedIn ? "/dashboard" : "/signup"}
      className={`group inline-flex h-[3.5rem] items-center justify-center gap-2.5 rounded-full bg-primary px-8 text-base font-bold text-white shadow-xl shadow-blue-500/30 transition-all hover:bg-blue-700 hover:shadow-2xl hover:shadow-blue-500/40 hover:-translate-y-0.5 ${className}`}
    >
      {label}
      <ArrowRight className="size-5 transition-transform group-hover:translate-x-1" />
    </Link>
  );
}

// ─── NavBar ─────────────────────────────────────────────────────────────────
function NavBar({ isLoggedIn }: { isLoggedIn?: boolean }) {
  return (
    <nav className="fixed top-0 z-50 w-full border-b border-slate-200/80 bg-white/80 backdrop-blur-xl">
      <div className="mx-auto flex h-[4.5rem] max-w-7xl items-center justify-between px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2 group">
          <div className="size-10 rounded-xl bg-primary text-white flex items-center justify-center font-bold text-xl shadow-lg shadow-blue-500/30 group-hover:scale-105 transition-transform">
            M
          </div>
          <div className="flex items-baseline">
            <span className="font-heading text-xl font-bold tracking-tight text-slate-900">MojaPonuda</span>
            <span className="font-heading text-xl font-bold text-primary">.ba</span>
          </div>
        </Link>

        <div className="hidden items-center gap-8 md:flex">
          <a href="#kako-radi" className="text-base font-semibold text-slate-600 transition-colors hover:text-primary">Kako radi</a>
          <a href="#usporedba" className="text-base font-semibold text-slate-600 transition-colors hover:text-primary">Poređenje</a>
          <a href="#cijene" className="text-base font-semibold text-slate-600 transition-colors hover:text-primary">Cijene</a>
        </div>

        <div className="flex items-center gap-3">
          {isLoggedIn ? (
            <Link href="/dashboard" className="rounded-full bg-primary px-5 py-2.5 text-base font-bold text-white transition-all hover:bg-blue-700 hover:shadow-lg hover:shadow-blue-500/30 hover:-translate-y-0.5">
              Otvori Dashboard
            </Link>
          ) : (
            <>
              <Link href="/login" className="hidden text-base font-bold text-slate-600 transition-colors hover:text-primary sm:block">
                Prijava
              </Link>
              <Link href="/signup" className="rounded-full bg-slate-900 px-5 py-2.5 text-base font-bold text-white transition-all hover:bg-primary hover:shadow-lg hover:shadow-blue-500/30 hover:-translate-y-0.5">
                Isprobaj besplatno
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}

// ─── Hero ────────────────────────────────────────────────────────────────────
function HeroSection({ isLoggedIn }: { isLoggedIn?: boolean }) {
  return (
    <section className="relative overflow-hidden bg-white px-4 sm:px-6 pb-12 pt-28 sm:pb-16 sm:pt-36 border-b border-slate-200">
      <div className="absolute inset-0 -z-10 bg-[linear-gradient(to_right,#f1f5f9_1px,transparent_1px),linear-gradient(to_bottom,#f1f5f9_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)]" />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[500px] bg-blue-500/10 blur-[120px] rounded-full -z-10" />

      <div className="relative mx-auto max-w-4xl text-center">
        <div className="inline-flex items-center gap-2 rounded-full border border-blue-100 bg-blue-50/50 px-3 py-1.5 mb-5">
          <span className="flex size-2 rounded-full bg-blue-500 animate-pulse shadow-[0_0_10px_rgba(59,130,246,0.5)]" />
          <span className="text-[13px] font-bold uppercase tracking-wide text-blue-700">
            Javne nabavke u BiH — u jednom alatu
          </span>
        </div>

        <h1 className="font-heading text-4xl font-extrabold leading-[1.08] tracking-tight text-slate-900 sm:text-5xl lg:text-[4rem] mb-5">
          Više tendera. Brže prijave.<br className="hidden md:block" /> Manje odbijenica.
        </h1>

        <p className="mx-auto max-w-3xl text-[1.1rem] leading-relaxed text-slate-700 sm:text-[1.25rem] mb-7">
          Automatski <strong>pronalazimo</strong> najbolje tendere za vas, izdvajamo <strong>šta tačno treba predati</strong> i vodimo vas kroz prijavu — bez gubljenja vremena i <strong>bez grešaka</strong>.
        </p>

        {/* Digitalni zaposlenik blok */}
        <div className="mx-auto max-w-2xl mb-8 flex items-start gap-4 rounded-2xl bg-blue-50/50 border border-blue-100/80 p-5 text-left transition-colors hover:bg-blue-50">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-600">
            <Bot className="size-6" />
          </div>
          <p className="text-base leading-snug text-slate-700 mt-0.5">
            Sistem radi ono što inače radi zaposlenik: prati tendere, filtrira najbolje za vas i vodi vas kroz prijavu bez propuštenih dokumenata.
          </p>
        </div>

        {/* CTA */}
        <div className="flex flex-col items-center justify-center gap-3 w-full max-w-sm mx-auto sm:max-w-none">
          <PrimaryCTA 
            isLoggedIn={isLoggedIn} 
            className="w-full sm:w-auto h-[3.75rem] sm:px-12 text-lg shadow-2xl shadow-blue-500/40 border border-blue-600" 
          />
          <p className="text-[14px] font-medium text-slate-600 rounded-full bg-blue-50/50 px-4 py-1.5 border border-blue-100/50 whitespace-nowrap mt-1">
            Postoje aktivni tenderi za vašu firmu — provjerite za <span className="font-bold text-slate-800">30 sekundi</span>
          </p>
        </div>

        {/* Subtle Micro-UI Teaser */}
        <div className="mx-auto mt-16 max-w-2xl relative select-none">
          <div className="absolute inset-0 bg-gradient-to-b from-blue-50 to-transparent -z-10 rounded-3xl blur-2xl opacity-50" />
          
          <div className="relative flex flex-col gap-4 rounded-[1.5rem] border border-slate-200/60 bg-white/60 p-5 shadow-2xl shadow-slate-200/50 backdrop-blur-xl sm:p-6 text-left hover:shadow-blue-500/10 transition-shadow">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3.5">
                <div className="relative flex size-11 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-400 to-emerald-500 text-white shadow-lg shadow-emerald-500/20">
                  <div className="absolute -right-1 -top-1 size-3.5 rounded-full border-2 border-white bg-red-500 shadow-sm animate-pulse" />
                  <Zap className="size-5" />
                </div>
                <div>
                  <p className="text-[15px] font-bold text-slate-900 leading-none">Pronađen tender za vas</p>
                  <p className="text-[13px] font-medium text-slate-500 mt-1.5 flex items-center gap-1.5">
                    <CheckCircle className="size-3.5 text-emerald-500" />
                    Sistem detektovao poklapanje usluga: 98%
                  </p>
                </div>
              </div>
              <span className="text-[12px] font-bold text-slate-400 hidden sm:block">Upravo sad</span>
            </div>

            <div className="flex flex-col gap-2.5 px-1 py-1">
              <div className="h-3 w-3/4 animate-pulse rounded-full bg-slate-100" />
              <div className="h-3 w-1/2 animate-pulse rounded-full bg-slate-100" />
            </div>

            <div className="mt-2 flex flex-wrap gap-2">
              <span className="rounded-lg bg-blue-50/80 px-3 py-1.5 text-[12px] font-extrabold text-blue-600 border border-blue-100/50"># IT Oprema i Usluge</span>
              <span className="rounded-lg bg-amber-50/80 px-3 py-1.5 text-[12px] font-extrabold text-amber-600 border border-amber-100/50">Vrijednost: 120.000 KM</span>
              <span className="rounded-lg bg-slate-50/80 px-3 py-1.5 text-[12px] font-extrabold text-slate-500 border border-slate-200/50 flex items-center gap-1">
                <Clock className="size-3.5" />
                Rok: 14 dana
              </span>
            </div>
          </div>
        </div>

        {/* 3 Metric-driven Cards */}
        <div className="mt-14 grid gap-5 text-left md:grid-cols-3">
          {[
            { metric: "3x", title: "više tendera", desc: "Sistem filtrira tržište i izdvaja samo one prilike koje bi vjerovatno propustili ručnim radom." },
            { metric: "10x", title: "brža priprema", desc: "Automatska analiza obimne dokumentacije uklanja desetine sati dosadnog ručnog čitanja." },
            { metric: "2x", title: "veća zarada", desc: "Bez propuštenih prilika i bez odbačenih prijava zbog sitnih birokratskih previda." },
          ].map((item) => (
             <div key={item.title} className="flex flex-col gap-2 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition-all hover:shadow-md hover:-translate-y-1">
               <div className="flex items-baseline gap-2">
                 <span className="font-heading text-[2.5rem] font-extrabold tracking-tight text-blue-600">{item.metric}</span>
               </div>
               <span className="text-[1.125rem] font-bold text-slate-900 leading-tight">{item.title}</span>
               <p className="text-[15px] text-slate-600 leading-relaxed mt-1">{item.desc}</p>
             </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── Kako Radi ───────────────────────────────────────────────────────────────
function HowItWorksSection() {
  const steps = [
    {
      icon: Zap,
      title: "Pronalazak tendera",
      desc: "Skeniramo portale i filtriramo tendere occursano prema vašoj djelatnosti i lokaciji.",
    },
    {
      icon: Bell,
      title: "Obavijest na email",
      desc: "Čim se pojavi novi tender za vas — odmah dobijate jasan email sažetak.",
    },
    {
      icon: FileText,
      title: "Jasni zahtjevi",
      desc: "Odmah vidite koje tačno dokumente i uvjerenja trebate skupiti za prijavu.",
    },
    {
      icon: CheckCircle,
      title: "Priprema bez greške",
      desc: "Vodimo vas korak-po-korak do predaje i upozoravamo vas na sve što nedostaje.",
    },
  ];

  return (
    <section id="kako-radi" className="bg-slate-50 px-4 sm:px-6 py-16 sm:py-20 border-b border-slate-200">
      <div className="mx-auto max-w-6xl">
        <div className="text-center mb-12">
          <h2 className="font-heading text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
            Kako radi
          </h2>
          <p className="mt-3 text-lg text-slate-700">4 pojednostavljena koraka od objave do pobjede na tenderu.</p>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {steps.map((s) => (
            <div key={s.title} className="relative rounded-2xl border border-white/60 bg-white p-6 sm:p-7 shadow-sm transition-all hover:shadow-md hover:-translate-y-0.5">
              <div className="flex size-12 items-center justify-center rounded-xl bg-blue-50 text-blue-600 mb-4">
                <s.icon className="size-6" />
              </div>
              <h3 className="font-heading text-lg font-bold leading-tight text-slate-900">{s.title}</h3>
              <p className="mt-2 text-base leading-relaxed text-slate-600">{s.desc}</p>
            </div>
          ))}
        </div>

        <div className="mt-10 flex justify-center">
          <PrimaryCTA className="h-[3.25rem] px-10 text-base shadow-md" />
        </div>
      </div>
    </section>
  );
}

// ─── Prije / Poslije ─────────────────────────────────────────────────────────
function BeforeAfterSection({ isLoggedIn }: { isLoggedIn?: boolean }) {
  return (
    <section id="usporedba" className="bg-white px-4 sm:px-6 py-16 sm:py-20 border-b border-slate-100">
      <div className="mx-auto max-w-5xl">
        <div className="text-center mb-12">
          <h2 className="font-heading text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
            Koliko vremena gubite na jedan tender?
          </h2>
          <p className="mt-3 text-lg text-slate-700">Praktična usporedba između ručnog rada i korištenja aplikacije.</p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Bez aplikacije */}
          <div className="rounded-3xl border border-red-100 bg-red-50/60 p-6 sm:p-8">
            <div className="flex items-center gap-4 mb-6">
              <div className="flex size-12 items-center justify-center rounded-xl bg-red-100 text-red-500">
                <X className="size-6" />
              </div>
              <div>
                <p className="text-[13px] font-bold uppercase tracking-wider text-red-600">Postojeći način</p>
                <p className="font-heading text-2xl font-bold text-slate-900">2–5 sati po tenderu</p>
              </div>
            </div>
            <ul className="space-y-4">
              {[
                "Ručno pretraživanje portala svaki dan",
                "Čitanje stotina stranica dokumentacije od nule",
                "Izvlačenje zahtjeva i dokumentacije",
                "Velika vjerovatnoća greške pri predaji ponude",
                "Propustit ćete javne nabavke",
              ].map((item) => (
                <li key={item} className="flex items-start gap-3 text-base text-slate-700">
                  <X className="mt-0.5 size-5 shrink-0 text-red-400" />
                  <span className="leading-snug">{item}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Sa aplikacijom */}
          <div className="rounded-3xl border border-emerald-200 bg-emerald-50/60 p-6 sm:p-8">
            <div className="flex items-center gap-4 mb-6">
              <div className="flex size-12 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600">
                <Zap className="size-6" />
              </div>
              <div>
                <p className="text-[13px] font-bold uppercase tracking-wider text-emerald-700">Sa aplikacijom</p>
                <p className="font-heading text-2xl font-bold text-slate-900">20–45 minuta ukupno</p>
              </div>
            </div>
            <ul className="space-y-4">
              {[
                "Dobijate tendere izabrane isključivo za vas",
                "Jasan pregled onoga što je kritično za tender",
                "Tačan spisak dokumentacije koja vam treba",
                "Sigurnosne provjere ispravnosti prije predaje",
                "Vidite tržište, analizu i konkurenciju",
              ].map((item) => (
                <li key={item} className="flex items-start gap-3 text-base text-slate-800 font-semibold">
                  <CheckCircle className="mt-0.5 size-5 shrink-0 text-emerald-600" />
                  <span className="leading-snug">{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Kvantifikacija */}
        <div className="mt-8 grid gap-5 sm:grid-cols-3">
          {[
            { value: "10–20h", label: "ušteda vremena svaki mjesec" },
            { value: "3×", label: "primijećenih tendera na vrijeme" },
            { value: "↓", label: "manje odbačenih ponuda zbog grešaka" },
          ].map((stat) => (
            <div key={stat.label} className="rounded-2xl border border-slate-200 bg-slate-50 p-5 text-center shadow-sm">
              <p className="font-heading text-3xl font-extrabold text-primary sm:text-4xl">{stat.value}</p>
              <p className="mt-2 text-[15px] font-semibold text-slate-700">{stat.label}</p>
            </div>
          ))}
        </div>

        <div className="mt-10 flex justify-center">
          <PrimaryCTA isLoggedIn={isLoggedIn} />
        </div>
      </div>
    </section>
  );
}

// ─── Novac blok ──────────────────────────────────────────────────────────────
function MoneySection({ isLoggedIn }: { isLoggedIn?: boolean }) {
  return (
    <section className="bg-slate-900 px-4 sm:px-6 py-16 sm:py-24 text-white relative overflow-hidden">
      <div className="absolute inset-0 opacity-20 -z-20 bg-[linear-gradient(to_right,#ffffff1a_1px,transparent_1px),linear-gradient(to_bottom,#ffffff1a_1px,transparent_1px)] bg-[size:3rem_3rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_80%,transparent_100%)]" />
      <div className="absolute top-0 right-0 h-[600px] w-[600px] -translate-y-1/2 translate-x-1/3 rounded-full bg-blue-500/20 blur-[120px] -z-10 mix-blend-screen" />
      <div className="absolute bottom-0 left-0 h-[500px] w-[500px] translate-y-1/3 -translate-x-1/3 rounded-full bg-emerald-500/10 blur-[100px] -z-10 mix-blend-screen" />
      <div className="absolute inset-0 bg-slate-900/40 -z-10 backdrop-blur-[1px]" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 size-[600px] rounded-full bg-primary/20 blur-[120px] -z-10" />

      <div className="relative z-10 mx-auto max-w-5xl">
        <div className="grid gap-12 lg:grid-cols-2 items-center">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 mb-6">
              <DollarSign className="size-4 text-blue-300" />
              <span className="text-[12px] font-bold uppercase tracking-wider text-blue-300">ROI</span>
            </div>
            <h2 className="font-heading text-3xl font-bold leading-tight sm:text-4xl lg:text-5xl">
              Jedan propušten tender košta više od cijele godine aplikacije.
            </h2>
            <p className="mt-5 text-lg text-slate-300 leading-relaxed">
              Firme gube poslove zbog bizarnih administrativnih grešaka koje se mogu spriječiti. Nevažeća potvrda, zaboravljen aneks... to više nije vaš problem.
            </p>

            <div className="mt-8 space-y-4">
              {[
                { icon: AlertTriangle, text: "Niste vidjeli tender jer ste zaboravili provjeriti" },
                { icon: Clock, text: "Ponuda kasni jer vam je ostalo premalo dana za pripremu" },
                { icon: FileText, text: "Uklonjeni ste sa tendera zbog jednog papira viška ili manjka" },
              ].map((item) => (
                <div key={item.text} className="flex items-center gap-4 rounded-xl border border-white/10 bg-white/5 p-4">
                  <item.icon className="size-6 shrink-0 text-red-400" />
                  <span className="text-base text-slate-200">{item.text}</span>
                </div>
              ))}
            </div>

            <div className="mt-8 rounded-xl border border-blue-500/30 bg-blue-600/20 p-5">
              <p className="text-lg font-bold text-white">MojaPonuda.ba sprječava ljudski faktor greške.</p>
              <p className="mt-1 text-base text-slate-300">
                Niste prisutni svaki dan? Mi pratimo za vas, neumorno.
              </p>
            </div>
          </div>

          <div className="rounded-[1.5rem] border border-white/10 bg-white/5 p-8 sm:p-10 backdrop-blur-sm shadow-2xl">
            <p className="text-[14px] font-bold uppercase tracking-wider text-blue-300 mb-6">Uvijek znate šta tačno fali za prijavu</p>
            <div className="space-y-3">
              {[
                { done: true, text: "Uvjerenje o izmirenim porezima" },
                { done: true, text: "Popunjena izjava o podobnosti" },
                { done: true, text: "Referentna lista (min. 3 proc.)" },
                { done: false, text: "Bankarska garancija ← hitno" },
                { done: true, text: "Tehnička specifikacija" },
                { done: false, text: "UJP potvrda (stara istekla)" },
              ].map((item) => (
                <div key={item.text} className={`flex items-center gap-3.5 rounded-xl p-4 transition-colors ${item.done ? "border border-white/10 bg-white/5" : "border border-red-500/40 bg-red-500/10 shadow-[0_0_15px_rgba(239,68,68,0.15)]"}`}>
                  {item.done
                    ? <CheckCircle className="size-5 shrink-0 text-emerald-400" />
                    : <AlertTriangle className="size-5 shrink-0 text-red-400" />
                  }
                  <span className={`text-[15px] sm:text-base ${item.done ? "text-white" : "text-red-300 font-bold"}`}>{item.text}</span>
                </div>
              ))}
            </div>
            <p className="mt-6 text-[14px] font-medium text-slate-400">Vizuelna indikacija rupa u papirologiji spašava zaradu.</p>
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── Pricing Section ─────────────────────────────────────────────────────────
function PricingSection({ isLoggedIn }: { isLoggedIn?: boolean }) {
  return (
    <section id="cijene" className="bg-slate-100 px-4 sm:px-6 py-16 sm:py-24 border-b border-slate-200">
      <div className="mx-auto max-w-6xl">
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-1.5 mb-5">
            <span className="text-[13px] font-bold text-slate-600 uppercase tracking-widest">Od 50 KM mjesečno</span>
          </div>
          <h2 className="font-heading text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
            Jasni paketi. Bez iznenađenja.
          </h2>
          <p className="mt-3 text-lg text-slate-700">Odaberite paket prema vašem obimu rada. Nema skrivenih troškova.</p>
        </div>

        <div className="mx-auto grid max-w-5xl gap-6 lg:grid-cols-3 lg:items-start lg:gap-8">
          {/* Osnovni */}
          <div className="rounded-[1.5rem] border border-slate-200 bg-white p-6 sm:p-8 shadow-sm hover:shadow-md transition-shadow">
            <h3 className="font-heading text-xl font-bold text-slate-900 sm:text-2xl">Osnovni</h3>
            <p className="mt-2 text-base text-slate-600 min-h-[44px]">Prati sve tendere. Plaćate jednokratno ako želite pripremu.</p>
            <div className="mt-5 flex items-baseline gap-1.5">
              <span className="font-heading text-4xl font-bold text-slate-900">49</span>
              <span className="text-base font-semibold text-slate-600">KM / mj.</span>
            </div>
            <p className="mt-1.5 text-[14px] text-amber-600 font-bold tracking-tight">+ 15 KM po svakoj pripremi ponude</p>
            <div className="mt-6 space-y-4">
              {[
                "Svi tenderi iz vaše djelatnosti",
                "Email obavijesti i pregledi",
                "Uvid u relevantnost dokumenta",
                "Priprema ponude dostupna",
              ].map((f) => (
                <div key={f} className="flex items-start gap-3 text-base text-slate-700">
                  <CheckCircle className="mt-0.5 size-5 shrink-0 text-slate-400" />
                  <span className="leading-snug">{f}</span>
                </div>
              ))}
            </div>
            <Link href={isLoggedIn ? "/dashboard" : "/signup"} className="mt-8 flex w-full h-[3.25rem] items-center justify-center rounded-xl border border-slate-300 bg-white px-6 text-base font-bold text-slate-800 transition-all hover:bg-slate-50 hover:shadow-sm">
              Odaberi ovaj paket
            </Link>
          </div>

          {/* Puni Paket — highlighted */}
          <div className="relative rounded-[1.5rem] border-2 border-primary bg-white p-6 sm:p-8 shadow-xl shadow-blue-500/10 lg:scale-[1.05] z-10 transition-transform lg:-mt-2">
            <div className="absolute -top-4 inset-x-0 flex justify-center">
              <span className="rounded-full bg-primary px-4 py-1.5 text-[12px] font-bold uppercase tracking-wider text-white">
                Najčešći izbor
              </span>
            </div>
            <h3 className="font-heading text-xl font-bold text-slate-900 sm:text-2xl">Puni Paket</h3>
            <p className="mt-2 text-base text-slate-600 min-h-[44px]">Predajete bez greške. Priprema uključena potpuno besplatno.</p>
            <div className="mt-5 flex items-baseline gap-1.5">
              <span className="font-heading text-5xl font-bold text-slate-900">99</span>
              <span className="text-base font-semibold text-slate-600">KM / mj.</span>
            </div>
            <p className="mt-1.5 text-[14px] text-emerald-600 font-bold tracking-tight">Konačna cijena, nema doplata</p>
            <div className="mt-6 space-y-4">
              {[
                "Sve iz Osnovnog paketa +",
                "Priprema ponuda je besplatna",
                "Ne plaćate naknade po tenderu",
                "Validacija i pronalazak grešaka",
                "Podrška i pregled konkurencije",
              ].map((f) => (
                <div key={f} className={`flex items-start gap-3 text-base ${f.startsWith("Sve iz") ? "text-slate-500 font-semibold" : "text-slate-800 font-bold"}`}>
                  <CheckCircle className={`mt-0.5 size-5 shrink-0 ${f.startsWith("Sve iz") ? "text-slate-400" : "text-primary"}`} />
                  <span className="leading-snug">{f}</span>
                </div>
              ))}
            </div>
            <Link href={isLoggedIn ? "/dashboard" : "/signup"} className="mt-8 flex w-full h-[3.5rem] items-center justify-center rounded-xl bg-primary px-6 text-[16px] font-bold text-white transition-all hover:bg-blue-700 hover:shadow-lg hover:shadow-blue-500/30">
              Počni bez limita
            </Link>
          </div>

          {/* Agencijski */}
          <div className="rounded-[1.5rem] border border-slate-200 bg-white p-6 sm:p-8 shadow-sm hover:shadow-md transition-shadow">
            <h3 className="font-heading text-xl font-bold text-slate-900 sm:text-2xl">Agencijski</h3>
            <p className="mt-2 text-base text-slate-600 min-h-[44px]">Za preduzeća i agencije koje paralelno vode veći broj firmi.</p>
            <div className="mt-5 flex items-baseline gap-1.5">
              <span className="font-heading text-4xl font-bold text-slate-900">149+</span>
              <span className="text-base font-semibold text-slate-600">KM / mj.</span>
            </div>
            <p className="mt-1.5 text-[14px] text-slate-500 font-bold tracking-tight">+25 KM za svaku dodatnu firmu</p>
            <div className="mt-6 space-y-4">
              {[
                "Sve pogodnosti Punog paketa",
                "Vođenje više firmi odjednom",
                "Zasebni logički profili",
                "Prioritetna kontrola svake firme",
              ].map((f) => (
                <div key={f} className={`flex items-start gap-3 text-base text-slate-700`}>
                  <CheckCircle className={`mt-0.5 size-5 shrink-0 text-slate-400`} />
                  <span className="leading-snug">{f}</span>
                </div>
              ))}
            </div>
            <Link href="/contact" className="mt-8 flex w-full h-[3.25rem] items-center justify-center rounded-xl border border-slate-300 bg-white px-6 text-base font-bold text-slate-800 transition-all hover:bg-slate-50 hover:shadow-sm">
              Kontakt za agencije
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── FAQ ─────────────────────────────────────────────────────────────────────
const FAQ_ITEMS = [
  {
    q: "Da li postoji ugovorna obaveza ili penali otkazivanja?",
    a: "Ne. Licenca se obnavlja isključivo mjesečno, a možete je otkazati u bilo koje vrijeme s jednim klikom.",
  },
  {
    q: "Šta ako nisam siguran da aplikacija donosi posao?",
    a: "Tokom prvog mjeseca aplikaciju možete prekinuti bez ijednog dodatnog pitanja ukoliko zaključite da vas ne ubrzava.",
  },
  {
    q: "Kakva je sigurnost mojih dokumenata?",
    a: "Koristimo bankovnu zaštitu (AES-256 enkripciju). Tuđa dokumenta su apsolutno obezbijeđena i nitko im ne može pristupiti.",
  },
  {
    q: "Da li vi pišete i printate moju ponudu?",
    a: "Ne. Vi kontrolirate svoju firmu i svoje dokumente, mi sluštite kao vodič koji nadzire da li nešto zaboravljate prije nego što papire stavite u kovertu i pošaljete ugovornom organu.",
  },
] as const;

function FAQSection() {
  return (
    <section className="bg-white px-4 sm:px-6 py-16 sm:py-20 border-b border-slate-100">
      <div className="mx-auto max-w-3xl">
        <h2 className="font-heading text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl text-center mb-10">
          Česta pitanja (FAQ)
        </h2>
        <div className="space-y-4">
          {FAQ_ITEMS.map((item) => (
            <details key={item.q} className="group rounded-2xl border border-slate-200 bg-slate-50 transition-colors hover:bg-slate-100">
              <summary className="flex cursor-pointer items-center justify-between p-5 sm:p-6 text-[1.125rem] font-bold text-slate-900 [&::-webkit-details-marker]:hidden focus:outline-none">
                {item.q}
                <ChevronDown className="size-6 text-slate-500 transition-transform group-open:-rotate-180" />
              </summary>
              <div className="px-5 pb-5 sm:px-6 sm:pb-6 pt-0">
                <p className="text-base leading-relaxed text-slate-700">{item.a}</p>
              </div>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── Final CTA ───────────────────────────────────────────────────────────────
function FinalCTA({ isLoggedIn }: { isLoggedIn?: boolean }) {
  return (
    <section className="relative overflow-hidden bg-slate-900 px-4 sm:px-6 py-20 sm:py-24 text-center">
      <div className="absolute inset-0 bg-primary/10" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 size-[800px] rounded-full bg-primary/20 blur-[120px] -z-10" />
      <div className="relative z-10 mx-auto max-w-3xl">
        <h2 className="font-heading text-3xl font-bold tracking-tight text-white sm:text-4xl">
          Počnite prije nego propustite sljedeći posao.
        </h2>
        <p className="mx-auto mt-5 max-w-2xl text-[1.125rem] text-slate-300 leading-relaxed font-medium">
          Besplatno se registrirajte i provjerite apsolutno sve aktivne tendere za vašu firmu – upravo sad.
        </p>
        <div className="mt-8 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
          <PrimaryCTA isLoggedIn={isLoggedIn} label="Pretraži za svoju firmu" className="!bg-white !text-slate-900 hover:!bg-slate-100 !shadow-white/10" />
          <p className="text-[14px] font-semibold text-slate-400">Bez ikakvih ugovora · Od 49 KM/mj</p>
        </div>
      </div>
    </section>
  );
}

// ─── Footer ──────────────────────────────────────────────────────────────────
function Footer() {
  return (
    <footer className="bg-slate-50 px-4 sm:px-6 py-10">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-col items-center justify-between gap-6 sm:flex-row">
          <div>
            <div className="flex items-baseline gap-1 justify-center sm:justify-start">
              <span className="font-heading text-xl font-bold text-slate-900">MojaPonuda</span>
              <span className="font-heading text-xl font-bold text-primary">.ba</span>
            </div>
            <p className="mt-1 text-[14px] font-semibold text-slate-500 text-center sm:text-left">© 2026 Sva prava zadržana.</p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-6 text-[15px] font-bold text-slate-600">
            <Link href="/privacy" className="hover:text-primary transition-colors">Politika privatnosti</Link>
            <Link href="/terms" className="hover:text-primary transition-colors">Uslovi korištenja</Link>
            <Link href="/contact" className="hover:text-primary transition-colors">Kontakt</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────
export function LandingPage({ isLoggedIn }: LandingPageProps) {
  return (
    <div className="min-h-screen">
      <NavBar isLoggedIn={isLoggedIn} />
      <HeroSection isLoggedIn={isLoggedIn} />
      <HowItWorksSection />
      <BeforeAfterSection isLoggedIn={isLoggedIn} />
      <MoneySection isLoggedIn={isLoggedIn} />
      <PricingSection isLoggedIn={isLoggedIn} />
      <FAQSection />
      <FinalCTA isLoggedIn={isLoggedIn} />
      <Footer />
    </div>
  );
}
