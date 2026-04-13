"use client";

import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import { motion, Variants, useScroll, useMotionValueEvent } from "framer-motion";
import {
  CheckCircle,
  ArrowRight,
  ChevronDown,
  X,
  Clock,
  Bell,
  FileText,
  AlertTriangle,
  DollarSign,
  Zap,
  Bot,
  ShieldCheck,
  Building,
  Landmark,
  Briefcase,
  TrendingUp,
  Calendar,
  MapPin,
  ExternalLink
} from "lucide-react";
import { TenderSistemLogo } from "@/components/brand/tender-sistem-logo";
import { OpportunityCard } from "@/components/public/opportunity-card";

interface LandingPageProps {
  isLoggedIn?: boolean;
  recentOpportunities?: Array<{
    id: string;
    slug: string;
    type: string;
    title: string;
    issuer: string;
    category: string | null;
    value: number | null;
    deadline: string | null;
    location: string | null;
    ai_summary: string | null;
    ai_difficulty: string | null;
  }>;
  recentLegalUpdates?: Array<{
    id: string;
    type: string;
    title: string;
    summary: string | null;
    source: string;
    source_url: string | null;
    published_date: string | null;
    relevance_tags: string[] | null;
  }>;
}

// Minimalistic framer-motion variants for premium slide-ins
const fadeUpContainer: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.15 }
  }
};

const fadeUpItem: Variants = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1] } }
};

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
      className={`group inline-flex h-[3.5rem] items-center justify-center gap-2.5 rounded-full bg-primary px-8 text-base font-bold text-white shadow-xl shadow-blue-500/30 transition-all duration-300 hover:bg-blue-600 hover:shadow-[0_0_30px_rgb(59,130,246,0.6)] hover:-translate-y-0.5 active:scale-95 ${className}`}
    >
      {label}
      <ArrowRight className="size-5 transition-transform group-hover:translate-x-1" />
    </Link>
  );
}

// ─── NavBar ─────────────────────────────────────────────────────────────────
function NavBar({ isLoggedIn }: { isLoggedIn?: boolean }) {
  const { scrollY } = useScroll();
  const [hidden, setHidden] = useState(false);

  useMotionValueEvent(scrollY, "change", (latest) => {
    const previous = scrollY.getPrevious() ?? 0;
    if (latest > previous && latest > 150) {
      setHidden(true);
    } else {
      setHidden(false);
    }
  });

  return (
    <motion.nav
      variants={{
        visible: { y: 0, opacity: 1 },
        hidden: { y: "-100%", opacity: 0 }
      }}
      animate={hidden ? "hidden" : "visible"}
      initial="visible"
      transition={{ duration: 0.35, ease: "easeInOut" }}
      className="fixed top-0 z-50 w-full border-b border-slate-200/70 bg-white/78 backdrop-blur-2xl"
    >
      <div className="mx-auto flex h-[4.5rem] max-w-7xl items-center justify-between px-4 sm:px-6">
        <TenderSistemLogo href="/" size="sm" className="group" />

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
    </motion.nav>
  );
}

// ─── Hero ────────────────────────────────────────────────────────────────────
function HeroSection({ isLoggedIn }: { isLoggedIn?: boolean }) {
  return (
    <section className="relative overflow-hidden bg-white px-4 sm:px-6 pb-12 pt-28 sm:pb-16 sm:pt-36 border-b border-slate-200">
      <div className="absolute inset-0 -z-10 bg-[linear-gradient(to_right,#f1f5f9_1px,transparent_1px),linear-gradient(to_bottom,#f1f5f9_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)]" />
      <div className="absolute top-0 right-0 h-[800px] w-[800px] blur-[1px] opacity-[0.25] -z-10 mix-blend-multiply translate-x-1/4 -translate-y-1/4 pointer-events-none select-none">
        <Image src="/images/premium-glass-hero.png" alt="Premium Abstract Glass Background" fill className="object-contain" priority />
      </div>
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[500px] bg-blue-500/10 blur-[120px] rounded-full -z-10" />

      <div className="relative mx-auto max-w-7xl">
        <div className="grid items-center gap-10 lg:grid-cols-[minmax(0,1.02fr)_minmax(420px,0.98fr)] lg:gap-12">
          <motion.div
            initial="hidden"
            animate="visible"
            variants={fadeUpContainer}
            className="flex max-w-2xl flex-col items-start text-left"
          >
            <motion.h1
              variants={fadeUpItem}
              className="font-heading text-4xl font-extrabold leading-[1.02] tracking-tight text-slate-900 sm:text-5xl lg:text-[4.15rem]"
            >
              Vaš sljedeći ugovor počinje ovdje.
            </motion.h1>

            <motion.p
              variants={fadeUpItem}
              className="mt-6 max-w-2xl text-[1.05rem] leading-relaxed text-slate-700 sm:text-[1.2rem]"
            >
              Unesite šta vaša firma radi — za 30 sekundi vidite sve tendere koji su za vas. Kliknete na tender, učitate dokumentaciju i sistem vam automatski izvlači točno šta trebate priložiti.
            </motion.p>

            <motion.p
              variants={fadeUpItem}
              className="mt-5 text-[0.97rem] text-slate-500 sm:text-base"
            >
              Koriste firme iz građevinarstva, IT-a i medicinske opreme širom BiH.
            </motion.p>

            <motion.div
              variants={fadeUpItem}
              className="mt-8 flex w-full flex-col items-start gap-3"
            >
              <PrimaryCTA
                isLoggedIn={false}
                label="Isprobajte besplatno 7 dana"
                className="h-[3.9rem] w-full border border-blue-600 text-lg shadow-2xl shadow-blue-500/35 sm:w-auto sm:px-12"
              />
              <p className="text-[14px] font-medium text-slate-500">
                Bez kartice. Bez obaveza. Otkažite kada želite.
              </p>
              <Link
                href="#kako-radi"
                className="inline-flex items-center gap-2 text-[15px] font-bold text-slate-700 transition-colors hover:text-primary"
              >
                Pogledaj kako radi
                <ArrowRight className="size-4" />
              </Link>
            </motion.div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 36, scale: 0.97 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
            className="relative mx-auto w-full max-w-[560px]"
          >
            <div className="absolute inset-0 rounded-[2rem] bg-blue-500/10 blur-3xl" />
            <div className="relative overflow-hidden rounded-[2rem] border border-slate-200/80 bg-white/90 p-4 shadow-[0_24px_80px_rgba(15,23,42,0.14)] backdrop-blur-sm sm:p-5">
              <div className="rounded-[1.6rem] border border-slate-700/80 bg-[#111111] p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] sm:p-4">
                <div className="relative aspect-[4/5] overflow-hidden rounded-[1.4rem] border border-white/10 bg-[#1a1a1a] shadow-[0_18px_45px_rgba(15,23,42,0.28)]">
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(59,130,246,0.16),transparent_38%),linear-gradient(180deg,rgba(255,255,255,0.03),transparent_35%)]" />
                  <div className="absolute inset-x-0 top-0 flex h-14 items-center gap-2 border-b border-white/10 bg-white/[0.03] px-4">
                    <span className="size-2.5 rounded-full bg-white/20" />
                    <span className="size-2.5 rounded-full bg-white/20" />
                    <span className="size-2.5 rounded-full bg-white/20" />
                    <div className="ml-3 h-2.5 w-24 rounded-full bg-white/10" />
                  </div>

                  <div className="relative flex h-full flex-col items-center justify-center px-8 pt-14 text-center">
                    <p className="text-[12px] font-semibold uppercase tracking-[0.26em] text-slate-400">
                      VIDEO / GIF DEMO
                    </p>
                    <p className="mt-4 max-w-[18rem] text-xl font-semibold leading-snug text-white sm:text-2xl">
                      Placeholder — dodati snimku ekrana platforme
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>

        <div className="hidden">
        <div className="grid items-center gap-10 lg:grid-cols-[minmax(0,1.05fr)_minmax(420px,0.95fr)] lg:gap-12">
          <motion.div
            initial="hidden"
            animate="visible"
            variants={fadeUpContainer}
            className="flex max-w-2xl flex-col items-start text-left"
          >
            <motion.div
              variants={fadeUpItem}
              className="mb-5 inline-flex items-center gap-2 rounded-full border border-blue-100 bg-blue-50/60 px-3 py-1.5"
            >
              <span className="flex size-2 rounded-full bg-blue-500 animate-pulse shadow-[0_0_10px_rgba(59,130,246,0.5)]" />
              <span className="text-[13px] font-bold uppercase tracking-wide text-blue-700">
                Sve javne nabavke u BiH — na jednom mjestu
              </span>
            </motion.div>

            <motion.h1
              variants={fadeUpItem}
              className="font-heading text-4xl font-extrabold leading-[1.02] tracking-tight text-slate-900 sm:text-5xl lg:text-[4.25rem]"
            >
              Pronalazimo tendere.
              <br />
              Čitamo zahtjeve.
              <br />
              Slažemo dobitnu ponudu.
            </motion.h1>

            <motion.p
              variants={fadeUpItem}
              className="mt-6 max-w-xl text-[1.05rem] leading-relaxed text-slate-700 sm:text-[1.2rem]"
            >
              Za vašu djelatnost izdvajamo samo relevantne prilike, jasno označavamo šta naručilac traži i pretvaramo komplikovanu dokumentaciju u konkretne korake za sigurnu prijavu.
            </motion.p>

            <motion.div
              variants={fadeUpItem}
              className="mt-6 flex w-full flex-col gap-3 rounded-[1.75rem] border border-blue-100/80 bg-white/85 p-5 shadow-[0_20px_60px_rgba(15,23,42,0.06)] backdrop-blur-sm sm:p-6"
            >
              <div className="flex items-start gap-4">
                <div className="flex size-11 shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-600">
                  <Bot className="size-6" />
                </div>
                <p className="text-base leading-relaxed text-slate-700">
                  Umjesto dodatnog zaposlenika od <strong className="text-slate-900">1.500+ KM mjesečno</strong>, dobijate sistem koji prati objave, upozorava na rokove i vodi Vas prema kompletnoj ponudi bez skupih propusta.
                </p>
              </div>

              <div className="grid gap-2 text-sm text-slate-600 sm:grid-cols-2">
                <div className="flex items-center gap-2 rounded-full bg-slate-50 px-3 py-2">
                  <CheckCircle className="size-4 text-blue-600" />
                  Samo relevantni tenderi
                </div>
                <div className="flex items-center gap-2 rounded-full bg-slate-50 px-3 py-2">
                  <ShieldCheck className="size-4 text-blue-600" />
                  Jasni zahtjevi i rokovi
                </div>
              </div>
            </motion.div>

            <motion.div
              variants={fadeUpItem}
              className="mt-8 flex w-full flex-col items-start gap-3"
            >
              <PrimaryCTA
                isLoggedIn={isLoggedIn}
                className="h-[3.9rem] w-full border border-blue-600 text-lg shadow-2xl shadow-blue-500/35 sm:w-auto sm:px-12"
              />
              <p className="rounded-full border border-blue-100/70 bg-blue-50/60 px-4 py-1.5 text-[14px] font-medium text-slate-600">
                Aktivne prilike za vašu firmu možete provjeriti za <span className="font-bold text-slate-800">30 sekundi</span>
              </p>
            </motion.div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 36, scale: 0.97 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
            className="relative mx-auto w-full max-w-[560px]"
          >
            <div className="absolute inset-0 rounded-[2rem] bg-blue-500/10 blur-3xl" />
            <div className="relative overflow-hidden rounded-[2rem] border border-slate-200/80 bg-white/90 p-4 shadow-[0_24px_80px_rgba(15,23,42,0.14)] backdrop-blur-sm sm:p-5">
              <div className="rounded-[1.6rem] border border-dashed border-blue-200 bg-[linear-gradient(180deg,rgba(239,246,255,0.95),rgba(248,250,252,0.98))] p-5 sm:p-6">
                <div className="mb-5 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.22em] text-blue-700">Mjesto za sliku</p>
                    <p className="mt-1 text-sm text-slate-600">Ubaci screenshot platforme ili branded ilustraciju.</p>
                  </div>
                  <div className="rounded-full border border-blue-100 bg-white px-3 py-1 text-xs font-semibold text-slate-700 shadow-sm">
                    Omjer 4:5
                  </div>
                </div>

                <div className="relative aspect-[4/5] overflow-hidden rounded-[1.35rem] border border-white/80 bg-white shadow-inner">
                  <div className="absolute inset-x-0 top-0 flex h-14 items-center gap-2 border-b border-slate-200 bg-slate-50 px-4">
                    <span className="size-2.5 rounded-full bg-rose-300" />
                    <span className="size-2.5 rounded-full bg-amber-300" />
                    <span className="size-2.5 rounded-full bg-emerald-300" />
                    <div className="ml-3 h-2.5 w-28 rounded-full bg-slate-200" />
                  </div>

                  <div className="absolute inset-0 top-14 p-4 sm:p-5">
                    <div className="h-full rounded-[1rem] border border-blue-100 bg-[radial-gradient(circle_at_top_right,rgba(96,165,250,0.18),transparent_36%),linear-gradient(180deg,#ffffff_0%,#eff6ff_100%)] p-4 sm:p-5">
                      <div className="flex h-full flex-col justify-between rounded-[0.9rem] border border-white/80 bg-white/80 p-4 shadow-sm">
                        <div className="space-y-3">
                          <div className="h-3 w-24 rounded-full bg-blue-100" />
                          <div className="h-8 w-4/5 rounded-2xl bg-slate-200" />
                          <div className="grid gap-3">
                            <div className="rounded-2xl border border-slate-200 bg-white p-4">
                              <div className="h-3 w-20 rounded-full bg-blue-100" />
                              <div className="mt-3 h-3 w-full rounded-full bg-slate-100" />
                              <div className="mt-2 h-3 w-5/6 rounded-full bg-slate-100" />
                              <div className="mt-4 flex gap-2">
                                <div className="h-8 w-24 rounded-full bg-blue-600/15" />
                                <div className="h-8 w-20 rounded-full bg-slate-200" />
                              </div>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                              <div className="rounded-2xl border border-slate-200 bg-white p-4">
                                <div className="h-3 w-16 rounded-full bg-slate-200" />
                                <div className="mt-3 h-10 rounded-2xl bg-slate-100" />
                              </div>
                              <div className="rounded-2xl border border-slate-200 bg-white p-4">
                                <div className="h-3 w-16 rounded-full bg-slate-200" />
                                <div className="mt-3 h-10 rounded-2xl bg-slate-100" />
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="rounded-2xl border border-blue-100 bg-blue-50/80 px-4 py-3 text-center">
                          <p className="text-sm font-semibold text-slate-700">Preporučena veličina slike</p>
                          <p className="mt-1 text-lg font-extrabold tracking-tight text-slate-900">1200 × 1500 px</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
        </div>

        {/* Trust & Scale Indicators - Professional SaaS context */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, delay: 0.6 }}
          className="mx-auto mt-16 max-w-4xl border-t border-slate-200/60 pt-10"
        >
          <p className="mb-6 text-center text-[14px] font-bold uppercase tracking-widest text-slate-500">Pouzdano praćenje sa svih ključnih bh. izvora</p>
          <div className="flex flex-wrap justify-center gap-x-8 gap-y-4 text-slate-600 font-bold text-[15px]">
            <span className="flex items-center gap-2"><Landmark className="size-5 text-slate-400" /> Portal Javnih Nabavki</span>
            <span className="flex items-center gap-2"><Building className="size-5 text-slate-400" /> Vlada FBiH i RS</span>
            <span className="flex items-center gap-2"><Building className="size-5 text-slate-400" /> Kantonalna ministarstva</span>
            <span className="flex items-center gap-2"><Briefcase className="size-5 text-slate-400" /> Javna preduzeća</span>
          </div>
        </motion.div>

        {/* 3 Metric-driven Cards */}
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-50px" }}
          variants={fadeUpContainer}
          className="mt-16 grid gap-5 text-left md:grid-cols-3"
        >
          {[
            { metric: "4-6 sati", title: "toliko traje ručno pretraživanje jednog tendera", desc: "Mi to radimo za vas za 30 sekundi." },
            { metric: "1 papir", title: "dovoljan da vam odbiju cijelu ponudu", desc: "Sistem provjeri svaki zahtjev prije nego pošaljete." },
            { metric: "47.000+", title: "tendera godišnje u BiH", desc: "Koliko ste ih propustili jer niste stigli provjeriti portal tog dana?" },
          ].map((item) => (
            <motion.div
              variants={fadeUpItem}
              key={item.title}
              className="flex flex-col gap-2 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition-all duration-300 hover:border-blue-200 hover:bg-blue-50/30 hover:shadow-[0_8px_30px_rgb(59,130,246,0.12)] hover:-translate-y-1"
            >
              <div className="flex flex-wrap items-baseline gap-2">
                <span className="font-heading text-[2.5rem] font-extrabold tracking-tight text-blue-600">{item.metric}</span>
                <span className="text-[1.125rem] font-bold text-slate-900 leading-tight">{item.title}</span>
              </div>
              <p className="text-[15px] text-slate-600 leading-relaxed mt-1">{item.desc}</p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}

// ─── Kako Radi ───────────────────────────────────────────────────────────────
function HowItWorksSection() {
  const steps = [
    {
      icon: Zap,
      badge: "POSTAVLJANJE",
      title: "Recite nam šta radite",
      desc: "Unesete djelatnost i lokaciju vaše firme. To je sve.",
    },
    {
      icon: Bell,
      badge: "TENDERI",
      title: "Vaši tenderi su već tu",
      desc: "Otvorite stranicu i vidite samo tendere koji su za vas. Nema pretraživanja. Nema gubljenja vremena. Novi tenderi stižu i na email čim izađu.",
    },
    {
      icon: FileText,
      badge: "ČITANJE",
      title: "Priložite dokument — mi čitamo",
      desc: "Kliknete na tender, priložite dokumentaciju sa portala i sistem vam za tren izvuče listu svega što trebate pripremiti.",
    },
    {
      icon: CheckCircle,
      badge: "PRIJAVA",
      title: "Znate točno šta treba",
      desc: "Sistem vas upozori šta nedostaje i vodi vas kroz svaki korak — da ponuda bude ispravna kada je pošaljete.",
    },
  ];

  return (
    <section id="kako-radi" className="relative px-4 sm:px-6 py-16 sm:py-20 border-b border-slate-200 overflow-hidden">
      <div className="absolute inset-0 opacity-[0.35] -z-20">
        <Image src="/images/how-it-works-bg.png" alt="Smooth Abstract Wave Background" fill className="object-cover" />
      </div>
      <div className="absolute inset-0 bg-white/70 backdrop-blur-sm -z-10" />

      <div className="mx-auto max-w-6xl relative z-10">
        <div className="text-center mb-12">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="font-heading text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl"
          >
            Sistematiziran proces prijave
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="mt-3 text-lg text-slate-700"
          >
            4 optimizirana koraka od objave tendera do odobrene aplikacije.
          </motion.p>
        </div>

        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-50px" }}
          variants={fadeUpContainer}
          className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4 relative"
        >
          {/* Subtle connection line for desktop */}
          <div className="hidden lg:block absolute top-12 left-10 right-10 h-0.5 border-t-2 border-dashed border-slate-200 -z-0" />

          {steps.map((s) => (
            <motion.div
              variants={fadeUpItem}
              key={s.title}
              className="relative rounded-2xl border border-white/80 bg-white/90 p-6 shadow-sm shadow-blue-500/5 transition-all duration-300 hover:border-blue-200/60 hover:bg-white hover:shadow-[0_8px_30px_rgb(59,130,246,0.15)] z-10 backdrop-blur-md hover:-translate-y-1"
            >
              <div className="flex justify-between items-start mb-4">
                <div className="flex size-12 items-center justify-center rounded-xl bg-blue-50 text-blue-600 ring-4 ring-white/50">
                  <s.icon className="size-6" />
                </div>
                <span className="rounded-md bg-white px-2 py-1 text-[11px] font-bold tracking-wider text-slate-500 uppercase border border-slate-200/60 shadow-sm">
                  {s.badge}
                </span>
              </div>
              <h3 className="font-heading text-lg font-bold leading-tight text-slate-900">{s.title}</h3>
              <p className="mt-2 text-base leading-relaxed text-slate-600">{s.desc}</p>
            </motion.div>
          ))}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="mt-12 flex justify-center"
        >
          <PrimaryCTA className="h-[3.25rem] px-10 text-base shadow-md" />
        </motion.div>
      </div>
    </section>
  );
}

// ─── Opportunities Preview ───────────────────────────────────────────────────
function OpportunitiesPreviewSection({
  recentOpportunities,
  recentLegalUpdates
}: {
  recentOpportunities?: LandingPageProps['recentOpportunities'];
  recentLegalUpdates?: LandingPageProps['recentLegalUpdates'];
}) {
  // Only render if we have data
  if (!recentOpportunities?.length && !recentLegalUpdates?.length) {
    return null;
  }

  return (
    <section className="bg-slate-50 px-4 sm:px-6 py-16 sm:py-20 border-b border-slate-200 overflow-hidden">
      <div className="mx-auto max-w-7xl">
        <div className="text-center mb-12">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="font-heading text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl"
          >
            Aktivne prilike i pravne izmjene
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="mt-3 text-lg text-slate-700"
          >
            Najnovije prilike i pravne izmjene koje mogu uticati na vaše poslovanje.
          </motion.p>
        </div>

        <div className="grid gap-8 lg:grid-cols-2">
          {/* Opportunities Column */}
          {recentOpportunities && recentOpportunities.length > 0 && (
            <motion.div
              initial={{ opacity: 0, x: -40 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
            >
              <h3 className="font-heading text-xl font-bold text-slate-900 mb-4 flex items-center gap-2">
                <TrendingUp className="size-5 text-primary" />
                Aktivne prilike
              </h3>
              <div className="space-y-4">
                {recentOpportunities.slice(0, 3).map((opportunity) => (
                  <OpportunityCard key={opportunity.id} opportunity={opportunity} />
                ))}
              </div>
              <Link
                href="/prilike"
                className="mt-6 inline-flex items-center gap-2 text-base font-bold text-primary hover:text-blue-700 transition-colors group"
              >
                Vidi sve prilike
                <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
              </Link>
            </motion.div>
          )}

          {/* Legal Updates Column */}
          {recentLegalUpdates && recentLegalUpdates.length > 0 && (
            <motion.div
              initial={{ opacity: 0, x: 40 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1], delay: 0.1 }}
            >
              <h3 className="font-heading text-xl font-bold text-slate-900 mb-4 flex items-center gap-2">
                <FileText className="size-5 text-primary" />
                Pravne izmjene
              </h3>
              <div className="space-y-4">
                {recentLegalUpdates.slice(0, 3).map((update) => (
                  <div
                    key={update.id}
                    className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-all hover:border-blue-200 hover:shadow-md"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap gap-2 mb-2">
                          <span className="rounded-full bg-amber-50 px-2.5 py-0.5 text-[11px] font-semibold text-amber-700">
                            {update.type === "zakon" ? "Zakon" : update.type === "propis" ? "Propis" : "Izmjena"}
                          </span>
                          {update.published_date && (
                            <span className="text-[11px] text-slate-500 flex items-center gap-1">
                              <Calendar className="size-3" />
                              {new Date(update.published_date).toLocaleDateString('bs-BA', {
                                day: 'numeric',
                                month: 'short',
                                year: 'numeric'
                              })}
                            </span>
                          )}
                        </div>
                        <h4 className="font-semibold text-slate-900 line-clamp-2 mb-2">
                          {update.title}
                        </h4>
                        {update.summary && (
                          <p className="text-sm text-slate-600 line-clamp-2">{update.summary}</p>
                        )}
                        <p className="text-xs text-slate-500 mt-2">{update.source}</p>
                        {update.source_url && (
                          <a
                            href={update.source_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-xs text-primary hover:text-blue-700 mt-2 font-semibold"
                          >
                            Izvor
                            <ExternalLink className="size-3" />
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <Link
                href="/zakon"
                className="mt-6 inline-flex items-center gap-2 text-base font-bold text-primary hover:text-blue-700 transition-colors group"
              >
                Prati pravne izmjene
                <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
              </Link>
            </motion.div>
          )}
        </div>
      </div>
    </section>
  );
}

// ─── Prije / Poslije ─────────────────────────────────────────────────────────
function BeforeAfterSection({ isLoggedIn }: { isLoggedIn?: boolean }) {
  return (
    <section id="usporedba" className="bg-white px-4 sm:px-6 py-16 sm:py-20 border-b border-slate-100 overflow-hidden">
      <div className="mx-auto max-w-5xl">
        <div className="text-center mb-12">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="font-heading text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl"
          >
            Koliko vremena gubite na jedan tender?
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="mt-3 text-lg text-slate-700"
          >
            Razlika između iscrpljujućeg ručnog rada i servisa koji radi za Vas.
          </motion.p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Bez aplikacije */}
          <motion.div
            initial={{ opacity: 0, x: -40 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-50px" }}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
            className="rounded-3xl border border-red-100 bg-red-50/60 p-6 sm:p-8 relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 h-32 w-32 translate-x-8 -translate-y-8 rounded-full bg-red-100/50 blur-2xl" />
            <div className="flex items-center gap-4 mb-6 relative">
              <div className="flex size-12 items-center justify-center rounded-xl bg-red-100 text-red-500">
                <X className="size-6" />
              </div>
              <div>
                <p className="text-[13px] font-bold uppercase tracking-wider text-red-600">Postojeći način</p>
                <p className="font-heading text-2xl font-bold text-slate-900">3–5 sati po tenderu</p>
              </div>
            </div>

            <div className="mb-6 space-y-2 relative">
              <div className="flex justify-between text-[13px] font-bold text-slate-600">
                <span>Utrošeno vrijeme procesa</span>
                <span className="text-red-500">100%</span>
              </div>
              <div className="h-2 w-full rounded-full bg-slate-200 overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  whileInView={{ width: "100%" }}
                  transition={{ duration: 1.2, delay: 0.3, ease: "easeOut" }}
                  className="h-full rounded-full bg-red-400"
                />
              </div>
            </div>

            <ul className="space-y-4 relative">
              {[
                "Ručno pretraživanje portala apsolutno svaki dan",
                "Pregledanje i čitanje tendera koji nisu za vas",
                "Čitanje stotina stranica dokumentacije od nule",
                "Nejasno šta sve tačno prikupiti od papira",
                "Niste sigurni je li ponuda 100% ispravna za predaju",
              ].map((item) => (
                <li key={item} className="flex items-start gap-3 text-base text-slate-700">
                  <X className="mt-0.5 size-5 shrink-0 text-red-400" />
                  <span className="leading-snug">{item}</span>
                </li>
              ))}
            </ul>
          </motion.div>

          {/* Sa aplikacijom */}
          <motion.div
            initial={{ opacity: 0, x: 40 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-50px" }}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1], delay: 0.1 }}
            className="rounded-3xl border border-emerald-200 bg-emerald-50/60 p-6 sm:p-8 relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 h-32 w-32 translate-x-8 -translate-y-8 rounded-full bg-emerald-100/50 blur-2xl" />
            <div className="flex items-center gap-4 mb-6 relative">
              <div className="flex size-12 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600 shadow-sm shadow-emerald-500/20">
                <Zap className="size-6" />
              </div>
              <div>
                <p className="text-[13px] font-bold uppercase tracking-wider text-emerald-700">Sa Tendersistem sistemom</p>
                <p className="font-heading text-2xl font-bold text-slate-900">15–30 minuta ukupno</p>
              </div>
            </div>

            <div className="mb-6 space-y-2 relative">
              <div className="flex justify-between text-[13px] font-bold text-slate-600">
                <span>Utrošeno vrijeme procesa</span>
                <span className="text-emerald-700">-90% kraće (10x brže)</span>
              </div>
              <div className="h-2 w-full rounded-full bg-emerald-200/50 overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  whileInView={{ width: "10%" }}
                  transition={{ duration: 1.2, delay: 0.3, ease: "easeOut" }}
                  className="h-full rounded-full bg-emerald-500"
                />
              </div>
            </div>

            <ul className="space-y-4 relative">
              {[
                "Dobijate tendere izabrane isključivo za vas",
                "Jasan pregled onoga što je kritično za tender",
                "Tačan grafički spisak dokumentacije koja vam treba",
                "Sigurnosne provjere ispravnosti prije predaje",
                "Pratite najnovije poticaje i grantove za Vas",
              ].map((item) => (
                <li key={item} className="flex items-start gap-3 text-base text-slate-800 font-semibold">
                  <CheckCircle className="mt-0.5 size-5 shrink-0 text-emerald-600" />
                  <span className="leading-snug">{item}</span>
                </li>
              ))}
            </ul>
          </motion.div>
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
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7 }}
          >
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 mb-6">
              <ShieldCheck className="size-4 text-emerald-400" />
              <span className="text-[12px] font-bold uppercase tracking-wider text-emerald-400">Sigurnost poslovanja</span>
            </div>
            <h2 className="font-heading text-3xl font-bold leading-tight sm:text-4xl lg:text-5xl">
              Jedan propušten tender košta vas više od cijele godišnje pretplate.
            </h2>
            <p className="mt-5 text-lg text-slate-300 leading-relaxed">
              Firme gube poslove zbog bizarnih administrativnih grešaka. Nevažeća porezna potvrda, zaboravljen aneks... to više nije vaš problem. Gubitak stotina hiljada KM zbog papira je neprihvatljiv.
            </p>

            <motion.div
              className="mt-8 space-y-4"
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={fadeUpContainer}
            >
              {[
                { icon: AlertTriangle, text: "Niste vidjeli tender jer taj dan niste stigli provjeriti portale" },
                { icon: Clock, text: "Ponuda kasni jer vam je ostalo premalo dana za pripremu svega" },
                { icon: FileText, text: "Ponuda je potpuno odbačena jer je nedostajao jedan jedini papir" },
              ].map((item) => (
                <motion.div variants={fadeUpItem} key={item.text} className="flex items-center gap-4 rounded-xl border border-white/10 bg-white/5 p-4">
                  <item.icon className="size-6 shrink-0 text-red-400" />
                  <span className="text-base text-slate-200">{item.text}</span>
                </motion.div>
              ))}
            </motion.div>

            <div className="mt-8 rounded-xl border border-blue-500/30 bg-blue-600/20 p-5">
              <p className="text-lg font-bold text-white">Softver dizajniran da sprječava ljudske greške.</p>
              <p className="mt-1 text-base text-slate-300">
                Ljudski je pogriješiti u papirologiji. Sistem to ne dozvoljava.
              </p>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7, delay: 0.2 }}
            className="rounded-[1.5rem] border border-white/10 bg-white/5 p-8 sm:p-10 backdrop-blur-sm shadow-2xl"
          >
            <p className="text-[14px] font-bold uppercase tracking-wider text-blue-300 mb-6">Visualna kontrola svake tačke</p>
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={{
                visible: { transition: { staggerChildren: 0.1 } }
              }}
              className="space-y-3"
            >
              {[
                { done: true, text: "Uvjerenje o izmirenim porezima (PDV)" },
                { done: true, text: "Popunjena izjava o podobnosti učesnika" },
                { done: true, text: "Referentna lista (min. 3 proc.) validirana" },
                { done: false, text: "Bankarska garancija za ozbiljnost ← HITNO" },
                { done: true, text: "Dokaz o tehničkoj specifikaciji" },
                { done: false, text: "UJP potvrda (stara potvrda je istekla!)" },
              ].map((item) => (
                <motion.div
                  variants={{ hidden: { opacity: 0, x: -10 }, visible: { opacity: 1, x: 0 } }}
                  key={item.text}
                  className={`flex items-center gap-3.5 rounded-xl p-4 transition-colors ${item.done ? "border border-white/10 bg-white/5" : "border border-red-500/40 bg-red-500/10 shadow-[0_0_15px_rgba(239,68,68,0.15)]"}`}
                >
                  {item.done
                    ? <CheckCircle className="size-5 shrink-0 text-emerald-400" />
                    : <AlertTriangle className="size-5 shrink-0 text-red-400" />
                  }
                  <span className={`text-[15px] sm:text-base ${item.done ? "text-white" : "text-red-300 font-bold"}`}>{item.text}</span>
                </motion.div>
              ))}
            </motion.div>
            <p className="mt-6 text-[15px] font-medium text-slate-400">Sistem Vam ne dopušta da napravite grešku i radi za Vas.</p>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

// ─── Pricing Section ─────────────────────────────────────────────────────────
function PricingSection({ isLoggedIn }: { isLoggedIn?: boolean }) {
  return (
    <section id="cijene" className="relative bg-slate-100 px-4 sm:px-6 py-16 sm:py-24 border-b border-slate-200 overflow-hidden">
      <div className="absolute inset-0 opacity-60 -z-20 mix-blend-multiply">
        <Image src="/images/pricing-bg.png" alt="Premium Pricing Abstract Background" fill className="object-cover" />
      </div>
      <div className="absolute inset-0 bg-white/40 backdrop-blur-[2px] -z-10" />

      <div className="mx-auto max-w-6xl relative z-10">
        <div className="text-center mb-12">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-1.5 mb-5 shadow-sm"
          >
            <span className="text-[13px] font-bold text-slate-600 uppercase tracking-widest">Za profesionalce</span>
          </motion.div>
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="font-heading text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl"
          >
            Jasni paketi. Bez iznenađenja.
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="mt-3 text-lg text-slate-700"
          >
            Odaberite paket prema vašem obimu rada. Nema skrivenih troškova ni ugovornih zamki.
          </motion.p>
        </div>

        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-50px" }}
          variants={fadeUpContainer}
          className="mx-auto grid max-w-5xl gap-6 lg:grid-cols-3 lg:items-start lg:gap-8"
        >
          {/* Osnovni */}
          <motion.div variants={fadeUpItem} className="rounded-[1.5rem] border border-white/80 bg-white/90 p-6 sm:p-8 shadow-sm backdrop-blur-md transition-all duration-300 hover:border-slate-300 hover:bg-white hover:shadow-xl hover:-translate-y-1.5 flex flex-col">
            <h3 className="font-heading text-xl font-bold text-slate-900 sm:text-2xl">Osnovni</h3>
            <p className="mt-2 text-base text-slate-600 min-h-[44px]">Praćenje svih tendera. Plaćate jednokratno ako želite pripremu.</p>
            <div className="mt-5 flex items-baseline gap-1.5">
              <span className="font-heading text-4xl font-bold text-slate-900">49</span>
              <span className="text-base font-semibold text-slate-600">KM / mj.</span>
            </div>
            <p className="mt-1.5 text-[14px] text-amber-600 font-bold tracking-tight">+ 15 KM po svakoj pripremi ponude</p>
            <div className="mt-6 space-y-4 border-t border-slate-200/60 pt-6">
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
            <Link href={isLoggedIn ? "/dashboard" : "/signup"} className="mt-8 flex w-full h-[3.25rem] items-center justify-center rounded-xl border border-slate-300 bg-white px-6 text-base font-bold text-slate-800 transition-all duration-300 hover:bg-slate-50 hover:border-slate-400 hover:shadow-[0_4px_20px_rgb(15,23,42,0.08)] hover:-translate-y-0.5 active:scale-95">
              Odaberi ovaj paket
            </Link>
          </motion.div>

          {/* Puni Paket — highlighted */}
          <motion.div variants={fadeUpItem} className="relative rounded-[1.5rem] border-2 border-primary bg-white/95 p-6 sm:p-8 shadow-xl shadow-blue-500/15 backdrop-blur-md lg:scale-[1.05] z-10 transition-all duration-300 hover:shadow-[0_20px_40px_rgb(59,130,246,0.25)] hover:-translate-y-2 lg:hover:-translate-y-4 hover:border-blue-500 flex flex-col">
            <div className="absolute -top-4 inset-x-0 flex justify-center">
              <span className="rounded-full bg-primary px-4 py-1.5 text-[12px] font-bold uppercase tracking-wider text-white shadow-sm">
                Najčešći izbor
              </span>
            </div>
            <h3 className="font-heading text-xl font-bold text-slate-900 sm:text-2xl">Puni Paket</h3>
            <p className="mt-2 text-base text-slate-600 min-h-[44px]">Predajete bez greške. Priprema i pregled uključena potpuno besplatno.</p>
            <div className="mt-5 flex items-baseline gap-1.5">
              <span className="font-heading text-5xl font-bold text-slate-900">99</span>
              <span className="text-base font-semibold text-slate-600">KM / mj.</span>
            </div>
            <p className="mt-1.5 text-[14px] text-emerald-600 font-bold tracking-tight">Konačna cijena, nema doplata</p>
            <div className="mt-6 space-y-4 border-t border-slate-200/60 pt-6 flex-grow">
              {[
                "Sve iz Osnovnog paketa",
                "Besplatna priprema svake ponude",
                "Praćenje i provjera dokumentacije",
                "Aktivno praćenje konkurencije",
              ].map((f, i) => (
                <div key={f} className={`flex items-start gap-3 text-base ${i === 0 ? "text-slate-500 font-semibold" : "text-slate-800 font-bold"}`}>
                  <CheckCircle className={`mt-0.5 size-5 shrink-0 ${i === 0 ? "text-slate-400" : "text-primary"}`} />
                  <span className="leading-snug">{f}</span>
                </div>
              ))}
            </div>
            <Link href={isLoggedIn ? "/dashboard" : "/signup"} className="mt-8 flex w-full h-[3.5rem] items-center justify-center rounded-xl bg-primary px-6 text-[16px] font-bold text-white transition-all duration-300 hover:bg-blue-600 hover:shadow-[0_0_30px_rgb(59,130,246,0.5)] hover:-translate-y-0.5 active:scale-95">
              Kreni bez limita
            </Link>
          </motion.div>

          {/* Agencijski */}
          <motion.div variants={fadeUpItem} className="rounded-[1.5rem] border border-white/80 bg-white/90 p-6 sm:p-8 shadow-sm backdrop-blur-md transition-all duration-300 hover:border-slate-300 hover:bg-white hover:shadow-xl hover:-translate-y-1.5 flex flex-col">
            <h3 className="font-heading text-xl font-bold text-slate-900 sm:text-2xl">Agencijski</h3>
            <p className="mt-2 text-base text-slate-600 min-h-[44px]">Za agencije koje profesionalno vode tender apliciranje za klijente.</p>
            <div className="mt-5 flex items-baseline gap-1.5">
              <span className="font-heading text-4xl font-bold text-slate-900">149+</span>
              <span className="text-base font-semibold text-slate-600">KM / mj.</span>
            </div>
            <p className="mt-1.5 text-[14px] text-slate-500 font-bold tracking-tight">+25 KM za svaku dodatnu firmu</p>
            <div className="mt-6 space-y-4 border-t border-slate-200/60 pt-6 flex-grow">
              {[
                "Sve pogodnosti Punog paketa",
                "Vođenje više firmi odjednom",
                "Zasebni logički profili klijenata",
                "Uspostavljanje centralne kontrole",
              ].map((f, i) => (
                <div key={f} className={`flex items-start gap-3 text-base ${i === 0 ? "text-slate-500 font-semibold" : "text-slate-700"}`}>
                  <CheckCircle className={`mt-0.5 size-5 shrink-0 ${i === 0 ? "text-slate-400" : "text-slate-400"}`} />
                  <span className="leading-snug">{f}</span>
                </div>
              ))}
            </div>
            <Link href="/contact" className="mt-8 flex w-full h-[3.25rem] items-center justify-center rounded-xl border border-slate-300 bg-white px-6 text-base font-bold text-slate-800 transition-all duration-300 hover:bg-slate-50 hover:border-slate-400 hover:shadow-[0_4px_20px_rgb(15,23,42,0.08)] hover:-translate-y-0.5 active:scale-95">
              Kontakt za agencije
            </Link>
          </motion.div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 15 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.5 }}
          className="mt-12 text-center text-[14px] font-medium text-slate-500 flex items-center justify-center gap-2"
        >
          <ShieldCheck className="size-5 text-emerald-500" />
          Pretplatu možete otkazati bilo kada. Bez vezivanja dugoročnim ugovorom.
        </motion.div>
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
    a: "Tokom prvog mjeseca aplikaciju možete prekinuti bez ijednog dodatnog pitanja ukoliko zaključite da vas ne ubrzava u radu i ne pridonosi redu.",
  },
  {
    q: "Kakva je sigurnost mojih prenesenih dokumenata?",
    a: "Svi dokumenti su striktno izolovani kroz AWS enterprise sigurnosne protokole (AES-256). Nitko osim vas nema pristup vašoj bazi.",
  },
  {
    q: "Da li vi pišete i printate moju ponudu?",
    a: "Ne. Mi nudimo softverski nadzor — vi printate papire i odlučujete cijene. Aplikacija služi da vas osigura da niste nešto pogrešno spakovali i da vas alarmira ukoliko papir fali.",
  },
] as const;

function FAQSection() {
  return (
    <section className="bg-white px-4 sm:px-6 py-16 sm:py-20 border-b border-slate-100">
      <div className="mx-auto max-w-3xl">
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="font-heading text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl text-center mb-10"
        >
          Česta pitanja (FAQ)
        </motion.h2>
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={fadeUpContainer}
          className="space-y-4"
        >
          {FAQ_ITEMS.map((item) => (
            <motion.details variants={fadeUpItem} key={item.q} className="group rounded-2xl border border-slate-200 bg-slate-50 transition-colors hover:bg-slate-100">
              <summary className="flex cursor-pointer items-center justify-between p-5 sm:p-6 text-[1.125rem] font-bold text-slate-900 [&::-webkit-details-marker]:hidden focus:outline-none">
                {item.q}
                <ChevronDown className="size-6 text-slate-500 transition-transform group-open:-rotate-180" />
              </summary>
              <div className="px-5 pb-5 sm:px-6 sm:pb-6 pt-0">
                <p className="text-base leading-relaxed text-slate-700">{item.a}</p>
              </div>
            </motion.details>
          ))}
        </motion.div>
      </div>
    </section>
  );
}

// ─── Final CTA ───────────────────────────────────────────────────────────────
function FinalCTA({ isLoggedIn }: { isLoggedIn?: boolean }) {
  return (
    <section className="relative overflow-hidden bg-slate-900 px-4 sm:px-6 py-20 sm:py-24 text-center">
      <div className="absolute inset-0 opacity-40 -z-20">
        <Image src="/images/premium-dark-cta.png" alt="Premium Vercel-style Dark Background" fill className="object-cover" />
      </div>
      <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/40 to-slate-900/10 -z-10" />
      <div className="absolute inset-0 bg-primary/10" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 size-[800px] rounded-full bg-primary/20 blur-[120px] -z-10 mix-blend-screen" />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        whileInView={{ opacity: 1, scale: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="relative z-10 mx-auto max-w-3xl"
      >
        <h2 className="font-heading text-3xl font-bold tracking-tight text-white sm:text-4xl">
          Počnite raditi prije nego propustite sljedeći posao.
        </h2>
        <p className="mx-auto mt-5 max-w-2xl text-[1.125rem] text-slate-300 leading-relaxed font-medium">
          Dopustite sistemu da obavi teški, dosadni rad umjesto Vas, te da vas vodi kroz čitav postupak.
        </p>
        <div className="mt-8 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
          <PrimaryCTA isLoggedIn={isLoggedIn} label="Besplatno osigurajte svoju firmu" className="!bg-white !text-slate-900 hover:!bg-slate-100 !shadow-white/10" />
        </div>
      </motion.div>
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
            <TenderSistemLogo href="/" size="sm" />
            <p className="mt-1 text-[14px] font-semibold text-slate-500 text-center sm:text-left">© 2026 Sva prava zadržana.</p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-6 text-[15px] font-bold text-slate-600">
            <Link href="/prilike" className="hover:text-primary transition-colors">Prilike i poticaji</Link>
            <Link href="/zakon" className="hover:text-primary transition-colors">Zakon o nabavkama</Link>
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
export function LandingPage({ isLoggedIn, recentOpportunities, recentLegalUpdates }: LandingPageProps) {
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
