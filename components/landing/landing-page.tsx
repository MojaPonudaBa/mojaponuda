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
  Zap,
  ShieldCheck,
  Building,
  Landmark,
  Briefcase,
  TrendingUp,
  Calendar,
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
    if (latest > previous && latest > 150) setHidden(true);
    else setHidden(false);
  });
  return (
    <motion.nav
      variants={{ visible: { y: 0, opacity: 1 }, hidden: { y: "-100%", opacity: 0 } }}
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
            <Link href="/dashboard" className="rounded-full bg-primary px-5 py-2.5 text-base font-bold text-white transition-all hover:bg-blue-700 hover:shadow-lg hover:shadow-blue-500/30 hover:-translate-y-0.5">Otvori Dashboard</Link>
          ) : (
            <>
              <Link href="/login" className="hidden text-base font-bold text-slate-600 transition-colors hover:text-primary sm:block">Prijava</Link>
              <Link href="/signup" className="rounded-full bg-slate-900 px-5 py-2.5 text-base font-bold text-white transition-all hover:bg-primary hover:shadow-lg hover:shadow-blue-500/30 hover:-translate-y-0.5">Isprobaj besplatno</Link>
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
    <section className="relative overflow-hidden bg-white px-4 sm:px-6 pb-12 pt-24 sm:pb-16 sm:pt-32 border-b border-slate-200">
      <div className="absolute inset-0 -z-10 bg-[linear-gradient(to_right,#f1f5f9_1px,transparent_1px),linear-gradient(to_bottom,#f1f5f9_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)]" />
      <div className="absolute top-0 right-0 h-[800px] w-[800px] blur-[1px] opacity-[0.25] -z-10 mix-blend-multiply translate-x-1/4 -translate-y-1/4 pointer-events-none select-none">
        <Image src="/images/premium-glass-hero.png" alt="" fill className="object-contain" priority />
      </div>
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[500px] bg-blue-500/10 blur-[120px] rounded-full -z-10" />

      <div className="relative mx-auto max-w-7xl">
        <div className="grid items-center gap-10 lg:grid-cols-[minmax(0,1.02fr)_minmax(420px,0.98fr)] lg:gap-12">
          {/* LEFT */}
          <motion.div initial="hidden" animate="visible" variants={fadeUpContainer} className="flex max-w-2xl flex-col items-start text-left">
            <motion.h1 variants={fadeUpItem} className="font-heading text-4xl font-extrabold leading-[1.02] tracking-tight text-slate-900 sm:text-5xl lg:text-[4.15rem]">
              Vaš sljedeći ugovor{"\u00A0"}počinje ovdje.
            </motion.h1>
            <motion.p variants={fadeUpItem} className="mt-5 max-w-xl text-[1.05rem] leading-relaxed text-slate-600 sm:text-lg">
              Unesite šta vaša firma radi — za 30 sekundi vidite sve tendere koji su za vas. Učitate dokumentaciju i sistem automatski izvlači točno šta trebate priložiti.
            </motion.p>
            <motion.p variants={fadeUpItem} className="mt-3 text-[0.9rem] font-medium text-slate-400">
              Koriste firme iz građevinarstva, IT-a i medicinske opreme širom BiH.
            </motion.p>
            <motion.div variants={fadeUpItem} className="mt-8 flex w-full flex-col items-start gap-3">
              <PrimaryCTA isLoggedIn={isLoggedIn} label="Isprobajte besplatno 7 dana" className="h-[3.75rem] w-full text-[1rem] sm:w-auto sm:px-10 shadow-2xl shadow-blue-500/30" />
              <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 text-[13px] text-slate-500">
                <span className="flex items-center gap-1.5"><CheckCircle className="size-3.5 text-emerald-500" /> Bez kreditne kartice</span>
                <span className="flex items-center gap-1.5"><CheckCircle className="size-3.5 text-emerald-500" /> Postavljanje za 2 minute</span>
                <span className="flex items-center gap-1.5"><ShieldCheck className="size-3.5 text-blue-500" /> Otkaži u svakom trenutku</span>
              </div>
            </motion.div>
          </motion.div>

          {/* RIGHT */}
          <motion.div initial={{ opacity: 0, x: 36, scale: 0.97 }} animate={{ opacity: 1, x: 0, scale: 1 }} transition={{ duration: 0.8, delay: 0.2, ease: [0.22, 1, 0.36, 1] }} className="relative mx-auto w-full max-w-[540px]">
            <div className="absolute inset-0 rounded-[2rem] bg-blue-500/10 blur-3xl" />
            <div className="relative overflow-hidden rounded-[2rem] border border-slate-200/80 bg-white/90 p-4 shadow-[0_24px_80px_rgba(15,23,42,0.14)] backdrop-blur-sm sm:p-5">
              <div className="rounded-[1.6rem] border border-slate-700/80 bg-[#111] p-3 sm:p-4">
                <div className="relative aspect-[4/5] overflow-hidden rounded-[1.4rem] border border-white/10 bg-[#1a1a1a]">
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(59,130,246,0.16),transparent_38%)]" />
                  <div className="absolute inset-x-0 top-0 flex h-12 items-center gap-2 border-b border-white/10 bg-white/[0.03] px-4">
                    <span className="size-2.5 rounded-full bg-white/20" /><span className="size-2.5 rounded-full bg-white/20" /><span className="size-2.5 rounded-full bg-white/20" />
                    <div className="ml-3 h-2 w-24 rounded-full bg-white/10" />
                  </div>
                  <div className="flex h-full flex-col items-center justify-center px-8 pt-12 text-center">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.26em] text-slate-500">Demo screenshot / video</p>
                    <p className="mt-3 max-w-[16rem] text-base font-medium leading-snug text-slate-400">Dodajte snimku ekrana vaše platforme ovdje</p>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Source trust bar */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 1, delay: 0.6 }} className="mx-auto mt-16 max-w-4xl border-t border-slate-200/60 pt-10">
          <p className="mb-5 text-center text-[12px] font-bold uppercase tracking-widest text-slate-400">Pouzdano praćenje sa svih ključnih bh. izvora</p>
          <div className="flex flex-wrap justify-center gap-x-8 gap-y-3 text-[13.5px] font-semibold text-slate-500">
            <span className="flex items-center gap-2"><Landmark className="size-4 text-slate-400" /> Portal Javnih Nabavki</span>
            <span className="flex items-center gap-2"><Building className="size-4 text-slate-400" /> Vlada FBiH i RS</span>
            <span className="flex items-center gap-2"><Building className="size-4 text-slate-400" /> Kantonalna ministarstva</span>
            <span className="flex items-center gap-2"><Briefcase className="size-4 text-slate-400" /> Javna preduzeća</span>
          </div>
        </motion.div>

        {/* 3 Stat Cards */}
        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-50px" }} variants={fadeUpContainer} className="mt-10 grid gap-4 md:grid-cols-3">
          {[
            { metric: "3-5 sati", label: "ručnog rada po tenderu", desc: "Mi to radimo za vas za 30 sekundi.", icon: Clock },
            { metric: "1 papir", label: "dovoljan za odbijanje ponude", desc: "Sistem provjeri svaki zahtjev prije slanja.", icon: FileText },
            { metric: "47.000+", label: "tendera godišnje u BiH", desc: "Koliko ste ih propustili jer niste provjerili portal?", icon: TrendingUp },
          ].map((item) => (
            <motion.div variants={fadeUpItem} key={item.label} className="group flex h-full flex-col rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-blue-200 hover:shadow-[0_12px_40px_rgba(37,99,235,0.12)]">
              <div className="flex items-start gap-4">
                <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-blue-100 shadow-inner shadow-blue-200/60">
                  <item.icon className="size-5 text-blue-600" />
                </div>
                <div className="min-w-0">
                  <p className="font-heading text-[2.25rem] font-extrabold leading-none tracking-tight text-blue-600">{item.metric}</p>
                  <p className="mt-2 text-[0.95rem] font-semibold leading-snug text-slate-800">{item.label}</p>
                </div>
              </div>
              <div className="my-4 h-px bg-gradient-to-r from-blue-100 via-slate-100 to-transparent" />
              <p className="text-[13.5px] leading-relaxed text-slate-500">{item.desc}</p>
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
    { icon: Zap, badge: "POSTAVLJANJE", title: "Recite nam šta radite", desc: "Unesete djelatnost i lokaciju vaše firme. To je sve." },
    { icon: Bell, badge: "TENDERI", title: "Vaši tenderi su već tu", desc: "Otvorite stranicu i vidite samo tendere koji su za vas. Nema pretraživanja. Nema gubljenja vremena. Novi tenderi stižu i na email čim izađu." },
    { icon: FileText, badge: "ANALIZA", title: "Priložite dokument — naš sistem analizira.", desc: "Kliknete na tender, priložite dokumentaciju sa portala i sistem vam za tren izvuče listu svega što trebate pripremiti." },
    { icon: CheckCircle, badge: "PRIJAVA", title: "Znate točno šta treba", desc: "Sistem vas upozori šta nedostaje i vodi vas kroz svaki korak — da ponuda bude ispravna kada je pošaljete." },
  ];

  return (
    <section id="kako-radi" className="relative px-4 sm:px-6 py-16 sm:py-20 border-b border-slate-200 overflow-hidden">
      <div className="absolute inset-0 opacity-[0.35] -z-20">
        <Image src="/images/how-it-works-bg.png" alt="Smooth Abstract Wave Background" fill className="object-cover" />
      </div>
      <div className="absolute inset-0 bg-white/70 backdrop-blur-sm -z-10" />

      <div className="mx-auto max-w-6xl relative z-10">
        <div className="text-center mb-12">
          <motion.h2 initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }} className="font-heading text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
            Sistematiziran proces prijave
          </motion.h2>
          <motion.p initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6, delay: 0.1 }} className="mt-3 text-lg text-slate-700">
            4 optimizirana koraka od objave tendera do odobrene aplikacije.
          </motion.p>
        </div>

        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-50px" }} variants={fadeUpContainer} className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4 relative">
          <div className="hidden lg:block absolute top-12 left-10 right-10 h-0.5 border-t-2 border-dashed border-slate-200 -z-0" />
          {steps.map((s) => (
            <motion.div variants={fadeUpItem} key={s.title} className="relative rounded-2xl border border-white/80 bg-white/90 p-6 shadow-sm shadow-blue-500/5 transition-all duration-300 hover:border-blue-200/60 hover:bg-white hover:shadow-[0_8px_30px_rgb(59,130,246,0.15)] z-10 backdrop-blur-md hover:-translate-y-1">
              <div className="flex justify-between items-start mb-4">
                <div className="flex size-12 items-center justify-center rounded-xl bg-blue-50 text-blue-600 ring-4 ring-white/50"><s.icon className="size-6" /></div>
                <span className="rounded-md bg-white px-2 py-1 text-[11px] font-bold tracking-wider text-slate-500 uppercase border border-slate-200/60 shadow-sm">{s.badge}</span>
              </div>
              <h3 className="font-heading text-lg font-bold leading-tight text-slate-900">{s.title}</h3>
              <p className="mt-2 text-base leading-relaxed text-slate-600">{s.desc}</p>
            </motion.div>
          ))}
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6, delay: 0.4 }} className="mt-12 flex justify-center">
          <PrimaryCTA className="h-[3.25rem] px-10 text-base shadow-md" />
        </motion.div>
      </div>
    </section>
  );
}

// ─── Opportunities Preview ───────────────────────────────────────────────────
function OpportunitiesPreviewSection({ recentOpportunities, recentLegalUpdates }: { recentOpportunities?: LandingPageProps['recentOpportunities']; recentLegalUpdates?: LandingPageProps['recentLegalUpdates']; }) {
  if (!recentOpportunities?.length && !recentLegalUpdates?.length) return null;

  return (
    <section className="bg-slate-50 px-4 sm:px-6 py-16 sm:py-20 border-b border-slate-200 overflow-hidden">
      <div className="mx-auto max-w-7xl">
        <div className="text-center mb-12">
          <motion.h2 initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }} className="font-heading text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
            Aktivne prilike i pravne izmjene
          </motion.h2>
          <motion.p initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6, delay: 0.1 }} className="mt-3 text-lg text-slate-700">
            Najnovije prilike i pravne izmjene koje mogu uticati na vaše poslovanje.
          </motion.p>
        </div>

        <div className="grid gap-8 lg:grid-cols-2">
          {recentOpportunities && recentOpportunities.length > 0 && (
            <motion.div initial={{ opacity: 0, x: -40 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true, margin: "-50px" }} transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}>
              <h3 className="font-heading text-xl font-bold text-slate-900 mb-4 flex items-center gap-2"><TrendingUp className="size-5 text-primary" /> Aktivne prilike</h3>
              <div className="space-y-4">
                {recentOpportunities.slice(0, 3).map((opportunity) => (
                  <OpportunityCard key={opportunity.id} opportunity={opportunity} />
                ))}
              </div>
              <Link href="/prilike" className="mt-6 inline-flex items-center gap-2 text-base font-bold text-primary hover:text-blue-700 transition-colors group">
                Vidi sve prilike <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
              </Link>
            </motion.div>
          )}

          {recentLegalUpdates && recentLegalUpdates.length > 0 && (
            <motion.div initial={{ opacity: 0, x: 40 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true, margin: "-50px" }} transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1], delay: 0.1 }}>
              <h3 className="font-heading text-xl font-bold text-slate-900 mb-4 flex items-center gap-2"><FileText className="size-5 text-primary" /> Pravne izmjene</h3>
              <div className="space-y-4">
                {recentLegalUpdates.slice(0, 3).map((update) => (
                  <div key={update.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-all hover:border-blue-200 hover:shadow-md">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap gap-2 mb-2">
                          <span className="rounded-full bg-amber-50 px-2.5 py-0.5 text-[11px] font-semibold text-amber-700">
                            {update.type === "zakon" ? "Zakon" : update.type === "propis" ? "Propis" : "Izmjena"}
                          </span>
                          {update.published_date && (
                            <span className="text-[11px] text-slate-500 flex items-center gap-1">
                              <Calendar className="size-3" />
                              {new Date(update.published_date).toLocaleDateString('bs-BA', { day: 'numeric', month: 'short', year: 'numeric' })}
                            </span>
                          )}
                        </div>
                        <h4 className="font-semibold text-slate-900 line-clamp-2 mb-2">{update.title}</h4>
                        {update.summary && <p className="text-sm text-slate-600 line-clamp-2">{update.summary}</p>}
                        <p className="text-xs text-slate-500 mt-2">{update.source}</p>
                        {update.source_url && (
                          <a href={update.source_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-primary hover:text-blue-700 mt-2 font-semibold">
                            Izvor <ExternalLink className="size-3" />
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <Link href="/zakon" className="mt-6 inline-flex items-center gap-2 text-base font-bold text-primary hover:text-blue-700 transition-colors group">
                Prati pravne izmjene <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
              </Link>
            </motion.div>
          )}
        </div>
      </div>
    </section>
  );
}

// ─── Prije / Poslije ─────────────────────────────────────────────────────────
function BeforeAfterSection() {
  return (
    <section id="usporedba" className="bg-white px-4 sm:px-6 py-16 sm:py-20 border-b border-slate-100 overflow-hidden">
      <div className="mx-auto max-w-5xl">
        <div className="text-center mb-12">
          <motion.h2 initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }} className="font-heading text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
            Koliko vremena gubite na jedan tender?
          </motion.h2>
          <motion.p initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6, delay: 0.1 }} className="mt-3 text-lg text-slate-700">
            Razlika između iscrpljujućeg ručnog rada i servisa koji radi za Vas.
          </motion.p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <motion.div initial={{ opacity: 0, x: -40 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true, margin: "-50px" }} transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }} className="rounded-3xl border border-red-100 bg-red-50/60 p-6 sm:p-8 relative overflow-hidden">
            <div className="absolute top-0 right-0 h-32 w-32 translate-x-8 -translate-y-8 rounded-full bg-red-100/50 blur-2xl" />
            <div className="flex items-center gap-4 mb-6 relative">
              <div className="flex size-12 items-center justify-center rounded-xl bg-red-100 text-red-500"><X className="size-6" /></div>
              <div>
                <p className="text-[13px] font-bold uppercase tracking-wider text-red-600">Postojeći način</p>
                <p className="font-heading text-2xl font-bold text-slate-900">3–5 sati po tenderu</p>
              </div>
            </div>
            <div className="mb-6 space-y-2 relative">
              <div className="flex justify-between text-[13px] font-bold text-slate-600"><span>Utrošeno vrijeme procesa</span><span className="text-red-500">100%</span></div>
              <div className="h-2 w-full rounded-full bg-slate-200 overflow-hidden">
                <motion.div initial={{ width: 0 }} whileInView={{ width: "100%" }} transition={{ duration: 1.2, delay: 0.3, ease: "easeOut" }} className="h-full rounded-full bg-red-400" />
              </div>
            </div>
            <ul className="space-y-4 relative">
              {["Ručno pretraživanje portala apsolutno svaki dan", "Pregledanje i čitanje tendera koji nisu za vas", "Čitanje stotina stranica dokumentacije od nule", "Nejasno šta sve tačno prikupiti od papira", "Niste sigurni je li ponuda 100% ispravna za predaju"].map((item) => (
                <li key={item} className="flex items-start gap-3 text-base text-slate-700"><X className="mt-0.5 size-5 shrink-0 text-red-400" /><span className="leading-snug">{item}</span></li>
              ))}
            </ul>
          </motion.div>

          <motion.div initial={{ opacity: 0, x: 40 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true, margin: "-50px" }} transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1], delay: 0.1 }} className="rounded-3xl border border-emerald-200 bg-emerald-50/60 p-6 sm:p-8 relative overflow-hidden">
            <div className="absolute top-0 right-0 h-32 w-32 translate-x-8 -translate-y-8 rounded-full bg-emerald-100/50 blur-2xl" />
            <div className="flex items-center gap-4 mb-6 relative">
              <div className="flex size-12 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600 shadow-sm shadow-emerald-500/20"><Zap className="size-6" /></div>
              <div>
                <p className="text-[13px] font-bold uppercase tracking-wider text-emerald-700">Sa Tendersistem sistemom</p>
                <p className="font-heading text-2xl font-bold text-slate-900">15–30 minuta ukupno</p>
              </div>
            </div>
            <div className="mb-6 space-y-2 relative">
              <div className="flex justify-between text-[13px] font-bold text-slate-600"><span>Utrošeno vrijeme procesa</span><span className="text-emerald-700">-90% kraće (10x brže)</span></div>
              <div className="h-2 w-full rounded-full bg-emerald-200/50 overflow-hidden">
                <motion.div initial={{ width: 0 }} whileInView={{ width: "10%" }} transition={{ duration: 1.2, delay: 0.3, ease: "easeOut" }} className="h-full rounded-full bg-emerald-500" />
              </div>
            </div>
            <ul className="space-y-4 relative">
              {["Dobijate tendere izabrane isključivo za vas", "Jasan pregled onoga što je kritično za tender", "Tačan grafički spisak dokumentacije koja vam treba", "Sigurnosne provjere ispravnosti prije predaje", "Pratite najnovije poticaje i grantove za Vas"].map((item) => (
                <li key={item} className="flex items-start gap-3 text-base text-slate-800 font-semibold"><CheckCircle className="mt-0.5 size-5 shrink-0 text-emerald-600" /><span className="leading-snug">{item}</span></li>
              ))}
            </ul>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

// ─── Novac blok ──────────────────────────────────────────────────────────────
function MoneySection() {
  return (
    <section className="bg-slate-900 px-4 sm:px-6 py-16 sm:py-24 text-white relative overflow-hidden">
      <div className="absolute inset-0 opacity-20 -z-20 bg-[linear-gradient(to_right,#ffffff1a_1px,transparent_1px),linear-gradient(to_bottom,#ffffff1a_1px,transparent_1px)] bg-[size:3rem_3rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_80%,transparent_100%)]" />
      <div className="absolute top-0 right-0 h-[600px] w-[600px] -translate-y-1/2 translate-x-1/3 rounded-full bg-blue-500/20 blur-[120px] -z-10 mix-blend-screen" />
      <div className="absolute bottom-0 left-0 h-[500px] w-[500px] translate-y-1/3 -translate-x-1/3 rounded-full bg-emerald-500/10 blur-[100px] -z-10 mix-blend-screen" />
      <div className="absolute inset-0 bg-slate-900/40 -z-10 backdrop-blur-[1px]" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 size-[600px] rounded-full bg-primary/20 blur-[120px] -z-10" />

      <div className="relative z-10 mx-auto max-w-5xl">
        <div className="grid gap-12 lg:grid-cols-2 items-center">
          <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.7 }}>
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 mb-6">
              <ShieldCheck className="size-4 text-emerald-400" />
              <span className="text-[12px] font-bold uppercase tracking-wider text-emerald-400">Sigurnost poslovanja</span>
            </div>
            <h2 className="font-heading text-3xl font-bold leading-tight sm:text-4xl lg:text-5xl">Jedan propušten tender košta vas više od cijele godišnje pretplate.</h2>
            <p className="mt-5 text-lg text-slate-300 leading-relaxed">Firme gube poslove zbog bizarnih administrativnih grešaka. Nevažeća porezna potvrda, zaboravljen aneks... to više nije vaš problem. Gubitak stotina hiljada KM zbog papira je neprihvatljiv.</p>

            <motion.div className="mt-8 space-y-4" initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUpContainer}>
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
              <p className="mt-1 text-base text-slate-300">Ljudski je pogriješiti u papirologiji. Sistem to ne dozvoljava.</p>
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, scale: 0.95 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }} transition={{ duration: 0.7, delay: 0.2 }} className="rounded-[1.5rem] border border-white/10 bg-white/5 p-8 sm:p-10 backdrop-blur-sm shadow-2xl">
            <p className="text-[14px] font-bold uppercase tracking-wider text-blue-300 mb-6">Vizualna kontrola svake tačke</p>
            <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={{ visible: { transition: { staggerChildren: 0.1 } } }} className="space-y-3">
              {[
                { done: true, text: "Uvjerenje o izmirenim porezima (PDV)" },
                { done: true, text: "Popunjena izjava o podobnosti učesnika" },
                { done: true, text: "Referentna lista (min. 3 proc.) validirana" },
                { done: false, text: "Bankarska garancija za ozbiljnost ← HITNO" },
                { done: true, text: "Dokaz o tehničkoj specifikaciji" },
                { done: false, text: "UJP potvrda (stara potvrda je istekla!)" },
              ].map((item) => (
                <motion.div variants={{ hidden: { opacity: 0, x: -10 }, visible: { opacity: 1, x: 0 } }} key={item.text} className={`flex items-center gap-3.5 rounded-xl p-4 transition-colors ${item.done ? "border border-white/10 bg-white/5" : "border border-red-500/40 bg-red-500/10 shadow-[0_0_15px_rgba(239,68,68,0.15)]"}`}>
                  {item.done ? <CheckCircle className="size-5 shrink-0 text-emerald-400" /> : <AlertTriangle className="size-5 shrink-0 text-red-400" />}
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
    <section id="cijene" className="relative overflow-hidden border-b border-slate-200 bg-slate-100 px-4 py-20 sm:px-6 sm:py-24 lg:px-8">
      <div className="absolute inset-0 -z-20 opacity-60 mix-blend-multiply">
        <Image src="/images/pricing-bg.png" alt="Premium Pricing Abstract Background" fill className="object-cover" />
      </div>
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top,_rgba(191,219,254,0.85),_rgba(255,255,255,0.78)_38%,_rgba(248,250,252,0.95)_100%)]" />

      <div className="relative z-10 mx-auto max-w-[1280px]">
        <div className="relative px-0 py-0 sm:px-0 sm:py-0 lg:px-0">
          <div className="relative">
            <div className="mb-12 text-center">
              <motion.div initial={{ opacity: 0, scale: 0.9 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }} className="mb-5 inline-flex items-center gap-2 rounded-full border border-blue-200/80 bg-white/90 px-4 py-1.5 shadow-[0_10px_30px_rgba(59,130,246,0.10)]">
                <span className="text-[13px] font-bold uppercase tracking-widest text-slate-700">Za profesionalce</span>
              </motion.div>
              <motion.h2 initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }} className="font-heading text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
                Jasni paketi. Bez iznenađenja.
              </motion.h2>
              <motion.p initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6, delay: 0.1 }} className="mx-auto mt-3 max-w-2xl text-lg leading-relaxed text-slate-600">
                Odaberite paket prema vašem obimu rada. Nema skrivenih troškova ni ugovornih zamki.
              </motion.p>
            </div>

            <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-50px" }} variants={fadeUpContainer} className="mx-auto grid max-w-[1180px] gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.08fr)_minmax(0,1fr)] lg:items-stretch xl:gap-6">
              {/* Osnovni */}
              <motion.div variants={fadeUpItem} className="flex h-full flex-col rounded-[1.9rem] border border-white/80 bg-white/92 p-6 shadow-[0_16px_45px_rgba(15,23,42,0.08)] backdrop-blur-md transition-all duration-300 hover:-translate-y-1.5 hover:border-blue-200 hover:shadow-[0_22px_55px_rgba(37,99,235,0.12)] sm:p-8">
                <div className="inline-flex w-fit rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.24em] text-slate-500">Paket</div>
                <h3 className="mt-5 font-heading text-xl font-bold text-slate-900 sm:text-2xl">Osnovni</h3>
                <p className="mt-2 min-h-[84px] text-base leading-relaxed text-slate-600">Praćenje svih tendera. Plaćate samo kada zaista želite pripremu ponude.</p>
                <div className="mt-6 flex items-end gap-2">
                  <span className="font-heading text-4xl font-bold text-slate-900">49</span>
                  <span className="pb-1 text-base font-semibold text-slate-500">KM / mj.</span>
                </div>
                <p className="mt-2 text-[14px] font-bold tracking-tight text-blue-600">+ 5 KM po svakoj pripremi ponude</p>
                <div className="mt-6 h-px bg-gradient-to-r from-blue-100 via-slate-100 to-transparent" />
                <div className="mt-6 space-y-4">
                  {["Svi tenderi iz vaše djelatnosti", "Email obavijesti i pregledi", "Uvid u relevantnost dokumenta", "Pripremu kupujete samo kada vam treba"].map((f) => (
                    <div key={f} className="flex items-start gap-3 text-base text-slate-700">
                      <CheckCircle className="mt-0.5 size-5 shrink-0 text-blue-500" />
                      <span className="leading-snug">{f}</span>
                    </div>
                  ))}
                </div>
                <Link href={isLoggedIn ? "/dashboard" : "/signup"} className="mt-8 flex h-[3.25rem] w-full items-center justify-center rounded-xl border border-slate-300 bg-white px-6 text-base font-bold text-slate-800 transition-all duration-300 hover:-translate-y-0.5 hover:border-blue-300 hover:bg-blue-50/60 hover:shadow-[0_10px_24px_rgba(37,99,235,0.10)] active:scale-95">
                  Odaberi ovaj paket
                </Link>
              </motion.div>

              {/* Puni Paket — highlighted */}
              <motion.div variants={fadeUpItem} className="relative z-10 flex h-full flex-col rounded-[2rem] border border-blue-400/70 bg-[linear-gradient(180deg,rgba(15,23,42,0.97),rgba(15,23,42,0.91))] p-6 text-white shadow-[0_24px_70px_rgba(15,23,42,0.28)] transition-all duration-300 hover:-translate-y-2 hover:shadow-[0_30px_80px_rgba(30,64,175,0.28)] sm:p-8 lg:scale-[1.035]">
                <div className="absolute inset-x-0 -top-5 z-30 flex justify-center">
                  <span className="relative inline-flex rounded-full border border-blue-300/60 bg-blue-500 px-5 py-1.5 text-[12px] font-bold uppercase tracking-wider text-white shadow-[0_8px_24px_rgba(59,130,246,0.35)]">
                    Najčešći izbor
                  </span>
                </div>
                <div className="inline-flex w-fit rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.24em] text-blue-200">Premium</div>
                <h3 className="mt-5 font-heading text-xl font-bold text-white sm:text-2xl">Puni Paket</h3>
                <p className="mt-2 min-h-[84px] text-base leading-relaxed text-slate-300">20 besplatnih priprema ponude mjesečno, a dodatne pakete dodajete samo kada zatrebaju.</p>
                <div className="mt-6 flex items-end gap-2">
                  <span className="font-heading text-5xl font-bold text-white">99</span>
                  <span className="pb-1 text-base font-semibold text-blue-100">KM / mj.</span>
                </div>
                <p className="mt-2 text-[14px] font-bold tracking-tight text-blue-300">20 priprema uključeno svakog mjeseca</p>
                <div className="mt-6 h-px bg-gradient-to-r from-blue-400/40 via-white/10 to-transparent" />
                <div className="mt-6 flex-grow space-y-4">
                  {["Sve iz Osnovnog paketa", "20 besplatnih priprema ponude mjesečno", "Praćenje i provjera dokumentacije", "Praćenje nadolazećih tendera"].map((f, i) => (
                    <div key={f} className={`flex items-start gap-3 text-base ${i === 0 ? "font-semibold text-blue-100" : "font-bold text-white"}`}>
                      <CheckCircle className={`mt-0.5 size-5 shrink-0 ${i === 0 ? "text-blue-300" : "text-blue-400"}`} />
                      <span className="leading-snug">{f}</span>
                    </div>
                  ))}
                </div>
                <Link href={isLoggedIn ? "/dashboard" : "/signup"} className="mt-8 flex h-[3.5rem] w-full items-center justify-center rounded-xl bg-white px-6 text-[16px] font-bold text-slate-900 transition-all duration-300 hover:-translate-y-0.5 hover:bg-blue-50 hover:shadow-[0_18px_30px_rgba(59,130,246,0.20)] active:scale-95">
                  Kreni bez limita
                </Link>
              </motion.div>

              {/* Agencijski */}
              <motion.div variants={fadeUpItem} className="flex h-full flex-col rounded-[1.9rem] border border-white/80 bg-white/92 p-6 shadow-[0_16px_45px_rgba(15,23,42,0.08)] backdrop-blur-md transition-all duration-300 hover:-translate-y-1.5 hover:border-blue-200 hover:shadow-[0_22px_55px_rgba(37,99,235,0.12)] sm:p-8">
                <div className="inline-flex w-fit rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.24em] text-slate-500">Timovi</div>
                <h3 className="mt-5 font-heading text-xl font-bold text-slate-900 sm:text-2xl">Agencijski</h3>
                <p className="mt-2 min-h-[84px] text-base leading-relaxed text-slate-600">Za agencije koje profesionalno vode tender apliciranje za klijente.</p>
                <div className="mt-6 flex items-end gap-2">
                  <span className="font-heading text-4xl font-bold text-slate-900">149+</span>
                  <span className="pb-1 text-base font-semibold text-slate-500">KM / mj.</span>
                </div>
                <p className="mt-2 text-[14px] font-bold tracking-tight text-blue-600">10 besplatnih priprema mjesečno za svakog klijenta</p>
                <div className="mt-6 h-px bg-gradient-to-r from-blue-100 via-slate-100 to-transparent" />
                <div className="mt-6 flex-grow space-y-4">
                  {["Sve pogodnosti Punog paketa", "10 priprema mjesečno za svaku firmu", "Vođenje više firmi odjednom", "Zasebni logički profili klijenata"].map((f, i) => (
                    <div key={f} className={`flex items-start gap-3 text-base ${i === 0 ? "font-semibold text-slate-500" : "text-slate-700"}`}>
                      <CheckCircle className="mt-0.5 size-5 shrink-0 text-blue-500" />
                      <span className="leading-snug">{f}</span>
                    </div>
                  ))}
                </div>
                <Link href="/contact" className="mt-8 flex h-[3.25rem] w-full items-center justify-center rounded-xl border border-slate-300 bg-white px-6 text-base font-bold text-slate-800 transition-all duration-300 hover:-translate-y-0.5 hover:border-blue-300 hover:bg-blue-50/60 hover:shadow-[0_10px_24px_rgba(37,99,235,0.10)] active:scale-95">
                  Kontakt za agencije
                </Link>
              </motion.div>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 15 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6, delay: 0.5 }} className="mt-12 flex items-center justify-center gap-2 text-center text-[14px] font-medium text-slate-500">
              <ShieldCheck className="size-5 text-blue-500" />
              Pretplatu možete otkazati bilo kada. Bez vezivanja dugoročnim ugovorom.
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── FAQ ─────────────────────────────────────────────────────────────────────
const FAQ_ITEMS = [
  { q: "Da li postoji ugovorna obaveza ili penali otkazivanja?", a: "Ne. Licenca se obnavlja isključivo mjesečno, a možete je otkazati u bilo koje vrijeme s jednim klikom." },
  { q: "Šta ako nisam siguran da aplikacija donosi posao?", a: "Tokom prvog mjeseca aplikaciju možete prekinuti bez ijednog dodatnog pitanja ukoliko zaključite da vas ne ubrzava u radu i ne pridonosi redu." },
  { q: "Kakva je sigurnost mojih prenesenih dokumenata?", a: "Svi dokumenti su striktno izolovani kroz AWS enterprise sigurnosne protokole (AES-256). Nitko osim vas nema pristup vašoj bazi." },
  { q: "Da li vi pišete i printate moju ponudu?", a: "Ne. Mi nudimo softverski nadzor — vi printate papire i odlučujete cijene. Aplikacija služi da vas osigura da niste nešto pogrešno spakovali i da vas alarmira ukoliko papir fali." },
] as const;

function FAQSection() {
  return (
    <section className="bg-white px-4 sm:px-6 py-16 sm:py-20 border-b border-slate-100">
      <div className="mx-auto max-w-3xl">
        <motion.h2 initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }} className="font-heading text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl text-center mb-10">
          Česta pitanja (FAQ)
        </motion.h2>
        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUpContainer} className="space-y-4">
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
      <div className="absolute inset-0 opacity-40 -z-20"><Image src="/images/premium-dark-cta.png" alt="Premium Vercel-style Dark Background" fill className="object-cover" /></div>
      <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/40 to-slate-900/10 -z-10" />
      <div className="absolute inset-0 bg-primary/10" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 size-[800px] rounded-full bg-primary/20 blur-[120px] -z-10 mix-blend-screen" />
      <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} whileInView={{ opacity: 1, scale: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.8, ease: "easeOut" }} className="relative z-10 mx-auto max-w-3xl">
        <h2 className="font-heading text-3xl font-bold tracking-tight text-white sm:text-4xl">Počnite raditi prije nego propustite sljedeći posao.</h2>
        <p className="mx-auto mt-5 max-w-2xl text-[1.125rem] text-slate-300 leading-relaxed font-medium">Dopustite sistemu da obavi teški, dosadni rad umjesto Vas, te da vas vodi kroz čitav postupak.</p>
        <div className="mt-8 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
          <PrimaryCTA isLoggedIn={isLoggedIn} label="Isprobajte besplatno" className="!bg-white !text-slate-900 hover:!bg-slate-100 !shadow-white/10" />
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
      <OpportunitiesPreviewSection recentOpportunities={recentOpportunities} recentLegalUpdates={recentLegalUpdates} />
      <BeforeAfterSection />
      <MoneySection />
      <PricingSection isLoggedIn={isLoggedIn} />
      <FAQSection />
      <FinalCTA isLoggedIn={isLoggedIn} />
      <Footer />
    </div>
  );
}
