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
      className={`group inline-flex h-[3.25rem] items-center justify-center gap-2 rounded-full bg-primary px-8 text-[15px] font-bold text-white shadow-xl shadow-blue-500/30 transition-all hover:bg-blue-700 hover:shadow-2xl hover:shadow-blue-500/40 hover:-translate-y-0.5 ${className}`}
    >
      {label}
      <ArrowRight className="size-[1.125rem] transition-transform group-hover:translate-x-1" />
    </Link>
  );
}

// ─── NavBar ─────────────────────────────────────────────────────────────────
function NavBar({ isLoggedIn }: { isLoggedIn?: boolean }) {
  return (
    <nav className="fixed top-0 z-50 w-full border-b border-slate-200/80 bg-white/80 backdrop-blur-xl">
      <div className="mx-auto flex h-[4.5rem] max-w-7xl items-center justify-between px-6">
        <Link href="/" className="flex items-center gap-2 group">
          <div className="size-9 rounded-xl bg-primary text-white flex items-center justify-center font-bold text-xl shadow-lg shadow-blue-500/30 group-hover:scale-105 transition-transform">
            M
          </div>
          <div className="flex items-baseline">
            <span className="font-heading text-xl font-bold tracking-tight text-slate-900">MojaPonuda</span>
            <span className="font-heading text-xl font-bold text-primary">.ba</span>
          </div>
        </Link>

        <div className="hidden items-center gap-8 md:flex">
          <a href="#kako-radi" className="text-[15px] font-semibold text-slate-600 transition-colors hover:text-primary">Kako radi</a>
          <a href="#usporedba" className="text-[15px] font-semibold text-slate-600 transition-colors hover:text-primary">Poređenje</a>
          <a href="#cijene" className="text-[15px] font-semibold text-slate-600 transition-colors hover:text-primary">Cijene</a>
        </div>

        <div className="flex items-center gap-3">
          {isLoggedIn ? (
            <Link href="/dashboard" className="rounded-full bg-primary px-5 py-2.5 text-[15px] font-bold text-white transition-all hover:bg-blue-700 hover:shadow-lg hover:shadow-blue-500/30 hover:-translate-y-0.5">
              Otvori Dashboard
            </Link>
          ) : (
            <>
              <Link href="/login" className="hidden text-[15px] font-bold text-slate-600 transition-colors hover:text-primary sm:block">
                Prijava
              </Link>
              <Link href="/signup" className="rounded-full bg-slate-900 px-5 py-2.5 text-[15px] font-bold text-white transition-all hover:bg-primary hover:shadow-lg hover:shadow-blue-500/30 hover:-translate-y-0.5">
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
    <section className="relative overflow-hidden bg-white px-6 pb-20 pt-32 sm:pb-24 sm:pt-44 border-b border-slate-200">
      <div className="absolute inset-0 -z-10 bg-[linear-gradient(to_right,#f1f5f9_1px,transparent_1px),linear-gradient(to_bottom,#f1f5f9_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)]" />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[500px] bg-blue-500/10 blur-[120px] rounded-full -z-10" />

      <div className="relative mx-auto max-w-4xl text-center">
        <div className="inline-flex items-center gap-2 rounded-full border border-blue-100 bg-blue-50/50 px-4 py-1.5 mb-8">
          <span className="flex size-2 rounded-full bg-blue-500 animate-pulse shadow-[0_0_10px_rgba(59,130,246,0.5)]" />
          <span className="text-[13px] font-bold uppercase tracking-wide text-blue-700">
            Javne nabavke u BiH — u jednom alatu
          </span>
        </div>

        <h1 className="font-heading text-4xl font-extrabold leading-[1.08] tracking-tight text-slate-900 sm:text-5xl lg:text-[4rem] mb-6">
          Više tendera. Brže prijave.<br className="hidden md:block" /> Manje odbijenica.
        </h1>

        <p className="mx-auto max-w-2xl text-[1.125rem] leading-relaxed text-slate-600 sm:text-[1.25rem] mb-8">
          Automatski <strong>pronalazimo</strong> najbolje tendere za vas, izdvajamo <strong>šta tačno treba predati</strong> i vodimo vas kroz prijavu — bez gubljenja vremena i <strong>bez grešaka</strong>.
        </p>

        {/* Digitalni zaposlenik blok */}
        <div className="mx-auto max-w-2xl mb-8 flex items-start gap-4 rounded-2xl bg-blue-50/50 border border-blue-100/80 p-5 text-left transition-colors hover:bg-blue-50">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-600">
            <Bot className="size-5" />
          </div>
          <p className="text-[14px] leading-relaxed text-slate-600 sm:text-[15px]">
            Sistem radi ono što inače radi zaposlenik: prati tendere, filtrira najbolje za vas i vodi vas kroz prijavu bez propuštenih dokumenata.
          </p>
        </div>

        {/* CTA */}
        <div className="flex flex-col items-center justify-center gap-3 w-full max-w-sm mx-auto sm:max-w-none">
          <PrimaryCTA 
            isLoggedIn={isLoggedIn} 
            className="w-full sm:w-auto h-16 sm:px-12 text-lg shadow-2xl shadow-blue-500/40 border border-blue-600" 
          />
          <p className="text-[13px] font-medium text-slate-500 rounded-full bg-blue-50/50 px-3 py-1 border border-blue-100/50 whitespace-nowrap">
            Postoje aktivni tenderi za vašu firmu — provjerite za <span className="font-bold text-slate-700">30 sekundi</span>
          </p>
        </div>

        {/* 3 Metric-driven Cards */}
        <div className="mt-16 grid gap-5 text-left md:grid-cols-3">
          {[
            { metric: "X%", title: "više relevantnih tendera", desc: "Sistem filtrira tržište i izdvaja samo prilike koje imaju smisla za vašu firmu." },
            { metric: "Yx", title: "brži pronalazak i priprema", desc: "Automatska analiza dokumentacije uklanja sate ručnog čitanja." },
            { metric: "Qx", title: "veća potencijalna zarada", desc: "Manje propuštenih prilika i manje odbijenih prijava zbog nepotpune dokumentacije." },
          ].map((item) => (
             <div key={item.title} className="flex flex-col gap-3 rounded-[1.5rem] border border-slate-200 bg-white px-5 py-6 shadow-sm transition-all hover:shadow-md hover:-translate-y-1">
               <div className="flex items-baseline gap-2">
                 <span className="font-heading text-4xl font-extrabold tracking-tight text-blue-600">{item.metric}</span>
               </div>
               <span className="text-[15px] font-bold text-slate-800 leading-tight">{item.title}</span>
               <p className="text-[14px] text-slate-500 leading-relaxed">{item.desc}</p>
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
      num: "01",
      title: "Pronalazak tendera",
      desc: "Svaki dan skeniramo portal i filtriramo tendere prema vašoj djelatnosti i lokaciji.",
    },
    {
      icon: Bell,
      num: "02",
      title: "Obavijest na email",
      desc: "Čim se pojavi tender za vas — dobijate email. Ne morate ručno provjeravati ništa.",
    },
    {
      icon: FileText,
      num: "03",
      title: "Pregled zahtjeva",
      desc: "Vidite šta tender traži, koje dokumente trebate i koliko je vremena ostalo.",
    },
    {
      icon: CheckCircle,
      num: "04",
      title: "Priprema ponude",
      desc: "Vodimo vas kroz svaki korak. Označimo šta nedostaje. Smanjujemo rizik odbijanja.",
    },
  ];

  return (
    <section id="kako-radi" className="bg-slate-100 px-6 py-20 sm:py-24 border-b border-slate-200">
      <div className="mx-auto max-w-6xl">
        <div className="text-center mb-14">
          <h2 className="font-heading text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl lg:text-5xl">
            Kako radi
          </h2>
          <p className="mt-3 text-[1.125rem] text-slate-600">4 koraka od objave do predaje ponude.</p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {steps.map((s) => (
            <div key={s.num} className="relative rounded-[1.75rem] border border-white/60 bg-white p-7 shadow-sm transition-all hover:shadow-lg hover:-translate-y-1">
              <span className="text-[13px] font-bold text-blue-500 tracking-widest">{s.num}</span>
              <div className="mt-3.5 flex size-12 items-center justify-center rounded-[1rem] bg-blue-50 text-blue-600">
                <s.icon className="size-6" />
              </div>
              <h3 className="mt-5 font-heading text-[1.125rem] font-bold leading-tight text-slate-900">{s.title}</h3>
              <p className="mt-2.5 text-[15px] leading-relaxed text-slate-600">{s.desc}</p>
            </div>
          ))}
        </div>

        <div className="mt-12 flex justify-center">
          <PrimaryCTA />
        </div>
      </div>
    </section>
  );
}

// ─── Prije / Poslije ─────────────────────────────────────────────────────────
function BeforeAfterSection({ isLoggedIn }: { isLoggedIn?: boolean }) {
  return (
    <section id="usporedba" className="bg-white px-6 py-20 sm:py-28 border-b border-slate-100">
      <div className="mx-auto max-w-5xl">
        <div className="text-center mb-14">
          <h2 className="font-heading text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl lg:text-5xl">
            Koliko vremena gubite na jedan tender?
          </h2>
          <p className="mt-3 text-[1.125rem] text-slate-600">Usporedba između ručnog rada i MojaPonuda.ba</p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Bez aplikacije */}
          <div className="rounded-[2rem] border border-red-100 bg-red-50/60 p-8 sm:p-10">
            <div className="flex items-center gap-3.5 mb-7">
              <div className="flex size-12 items-center justify-center rounded-[1rem] bg-red-100 text-red-500">
                <X className="size-6" />
              </div>
              <div>
                <p className="text-[13px] font-bold uppercase tracking-wider text-red-500">Bez aplikacije</p>
                <p className="font-heading text-[1.375rem] font-bold text-slate-900">2–5 sati po tenderu</p>
              </div>
            </div>
            <ul className="space-y-3.5">
              {[
                "Ručno pretraživanje portala svaki dan",
                "Čitanje cijele dokumentacije od nule",
                "Ne znate šta tačno treba priložiti",
                "Velika vjerovatnoća greške pri predaji",
                "Prilike prolaze nezapaženo",
              ].map((item) => (
                <li key={item} className="flex items-start gap-3 text-[15px] text-slate-600">
                  <X className="mt-[3px] size-5 shrink-0 text-red-400" />
                  {item}
                </li>
              ))}
            </ul>
          </div>

          {/* Sa aplikacijom */}
          <div className="rounded-[2rem] border border-emerald-200 bg-emerald-50/60 p-8 sm:p-10">
            <div className="flex items-center gap-3.5 mb-7">
              <div className="flex size-12 items-center justify-center rounded-[1rem] bg-emerald-100 text-emerald-600">
                <Zap className="size-6" />
              </div>
              <div>
                <p className="text-[13px] font-bold uppercase tracking-wider text-emerald-600">Sa aplikacijom</p>
                <p className="font-heading text-[1.375rem] font-bold text-slate-900">20–45 minuta po tenderu</p>
              </div>
            </div>
            <ul className="space-y-3.5">
              {[
                "Tenderi filtrirani automatski za vas",
                "Email obavijest čim se pojavi prilika",
                "Jasno navedeno šta treba predati",
                "Provjera dokumentacije prije slanja",
                "Vidite tržište i ko compete s vama",
              ].map((item) => (
                <li key={item} className="flex items-start gap-3 text-[15px] text-slate-700 font-medium">
                  <CheckCircle className="mt-[3px] size-5 shrink-0 text-emerald-500" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Kvantifikacija */}
        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          {[
            { value: "10–20h", label: "manje rada svaki mjesec" },
            { value: "3×", label: "više tendera koje na vrijeme vidite" },
            { value: "↓", label: "manje odbijenih ponuda zbog grešaka" },
          ].map((stat) => (
            <div key={stat.label} className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-5 text-center shadow-sm">
              <p className="font-heading text-3xl font-extrabold text-primary sm:text-4xl">{stat.value}</p>
              <p className="mt-1 text-[14px] font-medium text-slate-600">{stat.label}</p>
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
    <section className="bg-slate-900 px-6 py-20 sm:py-28 text-white relative overflow-hidden">
      <div className="absolute inset-0 bg-blue-600/10" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 size-[600px] rounded-full bg-primary/20 blur-[120px] -z-10" />

      <div className="relative z-10 mx-auto max-w-5xl">
        <div className="grid gap-12 lg:grid-cols-2 items-center">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 mb-6">
              <DollarSign className="size-4 text-blue-300" />
              <span className="text-[12px] font-bold uppercase tracking-wider text-blue-300">ROI</span>
            </div>
            <h2 className="font-heading text-3xl font-bold leading-tight sm:text-4xl lg:text-5xl">
              Jedan tender može vrijediti desetine hiljada KM.
            </h2>
            <p className="mt-5 text-[1.125rem] text-slate-300 leading-relaxed">
              Firme gube tendere zbog grešaka koje se mogu spriječiti. Propušten tender nije samo izgubljen posao — to je izgubljeni prihod koji je mogao biti vaš.
            </p>

            <div className="mt-8 space-y-3.5">
              {[
                { icon: AlertTriangle, text: "Niste vidjeli tender jer niste provjeravali taj dan" },
                { icon: Clock, text: "Zakasnili ste jer ste kasno saznali za rok" },
                { icon: FileText, text: "Ponuda odbijena jer je nedostajao dokument" },
              ].map((item) => (
                <div key={item.text} className="flex items-center gap-3.5 rounded-2xl border border-white/10 bg-white/5 p-4">
                  <item.icon className="size-5 shrink-0 text-red-400" />
                  <span className="text-[15px] text-slate-300">{item.text}</span>
                </div>
              ))}
            </div>

            <div className="mt-8 rounded-[1.5rem] border border-blue-500/30 bg-blue-600/20 p-5">
              <p className="text-[1.125rem] font-bold text-white">MojaPonuda.ba to sprječava.</p>
              <p className="mt-1 text-[15px] text-slate-300">
                Niste prisutni svaki dan? Ne morate biti. Mi smo.
              </p>
            </div>
          </div>

          <div className="rounded-[2.25rem] border border-white/10 bg-white/5 p-8 sm:p-10 backdrop-blur-sm">
            <p className="text-[14px] font-bold uppercase tracking-wider text-blue-300 mb-6">Vidite tačno šta trebate predati</p>
            <div className="space-y-3">
              {[
                { done: true, text: "Uvjerenje o porezu (PDV)" },
                { done: true, text: "Izjava o podobnosti" },
                { done: true, text: "Referentna lista (min. 3 proc.)" },
                { done: false, text: "Bankarska garancija ← nedostaje" },
                { done: true, text: "Tehnička specifikacija" },
                { done: false, text: "UJP potvrda ← nedostaje" },
              ].map((item) => (
                <div key={item.text} className={`flex items-center gap-3.5 rounded-2xl p-3.5 ${item.done ? "border border-white/5 bg-white/5" : "border border-red-500/30 bg-red-500/10"}`}>
                  {item.done
                    ? <CheckCircle className="size-5 shrink-0 text-emerald-400" />
                    : <AlertTriangle className="size-5 shrink-0 text-red-400" />
                  }
                  <span className={`text-[15px] ${item.done ? "text-slate-300" : "text-red-300 font-bold"}`}>{item.text}</span>
                </div>
              ))}
            </div>
            <p className="mt-5 text-[14px] text-slate-400">Vidite šta nedostaje — prije nego što je kasno.</p>
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── Pricing Section ─────────────────────────────────────────────────────────
function PricingSection({ isLoggedIn }: { isLoggedIn?: boolean }) {
  return (
    <section id="cijene" className="bg-slate-100 px-6 py-20 sm:py-28 border-b border-slate-200">
      <div className="mx-auto max-w-6xl">
        <div className="text-center mb-14">
          <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 mb-5">
            <span className="text-[13px] font-bold text-slate-500 uppercase tracking-widest">Od 50 KM mjesečno</span>
          </div>
          <h2 className="font-heading text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl lg:text-5xl">
            Jasni paketi. Bez iznenađenja.
          </h2>
          <p className="mt-3 text-[1.125rem] text-slate-600">Odaberite prema obimu rada. Bez dugoročnog ugovora.</p>
        </div>

        <div className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-3 lg:items-start lg:gap-8">
          {/* Osnovni */}
          <div className="rounded-[2rem] border border-white/60 bg-white p-8 sm:p-9 shadow-sm hover:shadow-md transition-shadow">
            <h3 className="font-heading text-xl font-bold text-slate-900 sm:text-2xl">Osnovni</h3>
            <p className="mt-2.5 text-[15px] text-slate-500 min-h-[40px]">Pratite prilike. Plaćate samo kad se prijavljujete.</p>
            <div className="mt-5 flex items-baseline gap-1">
              <span className="font-heading text-4xl font-bold text-slate-900 sm:text-5xl">49</span>
              <span className="text-[15px] font-medium text-slate-500">KM / mj.</span>
            </div>
            <p className="mt-1.5 text-[13px] text-amber-600 font-bold tracking-tight">+ 15 KM po svakoj pripremi ponude</p>
            <div className="mt-7 space-y-3.5">
              {[
                "Vidite sve tendere za vašu firmu",
                "Email kad izađe novi tender",
                "Vidite zašto je tender za vas",
                "Priprema ponude dostupna",
              ].map((f) => (
                <div key={f} className="flex items-start gap-3.5 text-[15px] text-slate-600">
                  <CheckCircle className="mt-0.5 size-4 shrink-0 text-slate-400" />
                  {f}
                </div>
              ))}
            </div>
            <Link href={isLoggedIn ? "/dashboard" : "/signup"} className="mt-8 flex w-full h-[3.25rem] items-center justify-center rounded-full border border-slate-300 bg-white px-8 text-[15px] font-bold text-slate-700 transition-all hover:bg-slate-50 hover:shadow-sm">
              Odaberi paket
            </Link>
          </div>

          {/* Puni Paket — highlighted */}
          <div className="relative rounded-[2rem] border-2 border-primary bg-white p-8 sm:p-9 shadow-xl shadow-blue-500/10 lg:scale-[1.03] z-10 transition-transform">
            <div className="absolute -top-4 inset-x-0 flex justify-center">
              <span className="rounded-full bg-primary px-4 py-1.5 text-[12px] font-bold uppercase tracking-wider text-white">
                Najčešći izbor
              </span>
            </div>
            <h3 className="font-heading text-xl font-bold text-slate-900 sm:text-2xl">Puni Paket</h3>
            <p className="mt-2.5 text-[15px] text-slate-500 min-h-[40px]">Uzimate tendere bez greške. Sve je uključeno.</p>
            <div className="mt-5 flex items-baseline gap-1">
              <span className="font-heading text-5xl font-bold text-slate-900 sm:text-6xl">99</span>
              <span className="text-[15px] font-medium text-slate-500">KM / mj.</span>
            </div>
            <p className="mt-1.5 text-[13px] text-emerald-600 font-bold tracking-tight">Bez ikakvih dodatnih troškova</p>
            <div className="mt-7 space-y-3.5">
              {[
                "Sve iz Osnovnog paketa +",
                "Neograničena priprema ponuda (bez dodatnih troškova)",
                "Ne plaćate po tenderu",
                "Vidite šta nedostaje prije predaje",
                "Pregled tržišta i konkurencije",
              ].map((f) => (
                <div key={f} className={`flex items-start gap-3.5 text-[15px] ${f.startsWith("Sve iz") ? "text-slate-400 font-medium" : "text-slate-700 font-medium"}`}>
                  <CheckCircle className={`mt-0.5 size-4 shrink-0 ${f.startsWith("Sve iz") ? "text-slate-300" : "text-primary"}`} />
                  {f}
                </div>
              ))}
            </div>
            <Link href={isLoggedIn ? "/dashboard" : "/signup"} className="mt-8 flex w-full h-[3.25rem] items-center justify-center rounded-full bg-primary px-8 text-[15px] font-bold text-white transition-all hover:bg-blue-700 hover:shadow-lg hover:shadow-blue-500/30">
              Počni bez ograničenja
            </Link>
          </div>

          {/* Agencijski */}
          <div className="rounded-[2rem] border border-white/60 bg-white p-8 sm:p-9 shadow-sm hover:shadow-md transition-shadow">
            <h3 className="font-heading text-xl font-bold text-slate-900 sm:text-2xl">Agencijski</h3>
            <p className="mt-2.5 text-[15px] text-slate-500 min-h-[40px]">Za agencije koje vode više firmi.</p>
            <div className="mt-5 flex items-baseline gap-1">
              <span className="font-heading text-4xl font-bold text-slate-900 sm:text-5xl">149+</span>
              <span className="text-[15px] font-medium text-slate-500">KM / mj.</span>
            </div>
            <p className="mt-1.5 text-[13px] text-slate-400 font-bold tracking-tight">+25 KM po dodatnoj firmi</p>
            <div className="mt-7 space-y-3.5">
              {[
                "Sve iz Punog paketa +",
                "Vodite više firmi sa jednog mjesta",
                "Poseban profil za svakog klijenta",
                "Odvojena kontrola po klijentu",
              ].map((f) => (
                <div key={f} className={`flex items-start gap-3.5 text-[15px] ${f.startsWith("Sve iz") ? "text-slate-400 font-medium" : "text-slate-600"}`}>
                  <CheckCircle className={`mt-0.5 size-4 shrink-0 ${f.startsWith("Sve iz") ? "text-slate-300" : "text-slate-400"}`} />
                  {f}
                </div>
              ))}
            </div>
            <Link href="/contact" className="mt-8 flex w-full h-[3.25rem] items-center justify-center rounded-full border border-slate-300 bg-white px-8 text-[15px] font-bold text-slate-700 transition-all hover:bg-slate-50 hover:shadow-sm">
              Kontaktirajte nas
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
    q: "Da li postoji ugovorna obaveza?",
    a: "Ne. Licenca se obnavlja mjesečno i možete je otkazati u bilo koje vrijeme.",
  },
  {
    q: "Šta ako nisam zadovoljan?",
    a: "Prvog mjeseca možete otkazati bez pitanja. Vaši podaci ostaju sačuvani.",
  },
  {
    q: "Koliko su moji podaci sigurni?",
    a: "Koristimo bankovnu enkripciju (AES-256). Vaša baza dokumenata je izolirana od ostalih korisnika.",
  },
  {
    q: "Da li vi pišete ponudu umjesto mene?",
    a: "Ne — vi donosite odluke i šaljete. Mi vam pokazujemo šta treba, šta nedostaje i vodimo vas kroz korake.",
  },
] as const;

function FAQSection() {
  return (
    <section className="bg-white px-6 py-20 sm:py-28 border-b border-slate-100">
      <div className="mx-auto max-w-3xl">
        <h2 className="font-heading text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl lg:text-5xl text-center mb-10">
          Česta pitanja
        </h2>
        <div className="space-y-3.5">
          {FAQ_ITEMS.map((item) => (
            <details key={item.q} className="group rounded-[1.5rem] border border-slate-200 bg-slate-50 transition-colors hover:bg-slate-100">
              <summary className="flex cursor-pointer items-center justify-between p-5 text-[1.05rem] font-bold text-slate-900 [&::-webkit-details-marker]:hidden">
                {item.q}
                <ChevronDown className="size-5 text-slate-500 transition-transform group-open:-rotate-180" />
              </summary>
              <div className="px-5 pb-5 pt-0">
                <p className="text-[15px] leading-relaxed text-slate-600">{item.a}</p>
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
    <section className="relative overflow-hidden bg-slate-900 px-6 py-24 sm:py-32 text-center">
      <div className="absolute inset-0 bg-primary/10" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 size-[800px] rounded-full bg-primary/20 blur-[120px] -z-10" />
      <div className="relative z-10 mx-auto max-w-3xl">
        <h2 className="font-heading text-3xl font-bold tracking-tight text-white sm:text-4xl lg:text-5xl">
          Počnite prije nego propustite sljedeći tender.
        </h2>
        <p className="mx-auto mt-5 max-w-2xl text-[1.125rem] text-slate-300 leading-relaxed">
          Besplatno se registrirajte i vidite koliko je tendera dostupno za vašu firmu — odmah.
        </p>
        <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
          <PrimaryCTA isLoggedIn={isLoggedIn} label="Pronađi moje tendere" className="!bg-white !text-slate-900 hover:!bg-slate-100 !shadow-white/10" />
          <p className="text-[14px] text-slate-400">Bez kreditne kartice · Od 49 KM/mj</p>
        </div>
      </div>
    </section>
  );
}

// ─── Footer ──────────────────────────────────────────────────────────────────
function Footer() {
  return (
    <footer className="bg-slate-50 px-6 py-12">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-col items-center justify-between gap-6 sm:flex-row">
          <div>
            <div className="flex items-baseline gap-0.5 justify-center sm:justify-start">
              <span className="font-heading text-xl font-bold text-slate-900">MojaPonuda</span>
              <span className="font-heading text-xl font-bold text-primary">.ba</span>
            </div>
            <p className="mt-2 text-[14px] text-slate-500 text-center sm:text-left">© 2026 Sva prava zadržana.</p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-6 text-[15px] font-medium text-slate-600">
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
