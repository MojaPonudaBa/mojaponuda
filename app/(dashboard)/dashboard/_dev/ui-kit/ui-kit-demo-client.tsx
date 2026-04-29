"use client";

import type React from "react";
import { useState } from "react";
import {
  BarChart3,
  Bell,
  Building2,
  FileText,
  Search,
  Trophy,
} from "lucide-react";

import { AIAssistantPanel } from "@/components/assistant/ai-assistant-panel";
import { KeyboardShortcutsModal } from "@/components/dashboard/keyboard-shortcuts-modal";
import { AIInsightBox } from "@/components/ui/ai-insight-box";
import { Button } from "@/components/ui/button";
import { CircularProgressScore } from "@/components/ui/circular-progress-score";
import { DeadlineCountdown } from "@/components/ui/deadline-countdown";
import { DonutChart } from "@/components/ui/donut-chart";
import { EmptyState } from "@/components/ui/empty-state";
import { LineAreaChart } from "@/components/ui/line-area-chart";
import { PriorityPill } from "@/components/ui/priority-pill";
import { Skeleton } from "@/components/ui/skeleton";
import { StatCard } from "@/components/ui/stat-card";
import { StatusBadge } from "@/components/ui/status-badge";

const donutData = [
  { name: "Otvoreni", value: 42 },
  { name: "U pripremi", value: 18 },
  { name: "Predani", value: 11 },
  { name: "Dobijeni", value: 7 },
];

const lineData = [
  { month: "Jan", tenders: 24, bids: 8 },
  { month: "Feb", tenders: 32, bids: 12 },
  { month: "Mar", tenders: 28, bids: 10 },
  { month: "Apr", tenders: 41, bids: 16 },
  { month: "Maj", tenders: 38, bids: 15 },
  { month: "Jun", tenders: 52, bids: 20 },
];

const sparklineData = [
  { value: 18 },
  { value: 24 },
  { value: 21 },
  { value: 32 },
  { value: 38 },
  { value: 44 },
];

function nextDeadline(days: number) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date;
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-4">
      <h2 className="text-lg font-semibold text-[var(--text-primary)]">{title}</h2>
      {children}
    </section>
  );
}

/**
 * Renders every Phase B component variant for protected visual QA.
 */
export function UiKitDemoClient() {
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [assistantOpen, setAssistantOpen] = useState(false);

  return (
    <div className="space-y-8 pb-16">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-[var(--text-primary)]">Phase B UI Kit</h1>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">
            Admin QA pregled dashboard tokena, komponenti i layout dodataka.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" onClick={() => setShortcutsOpen(true)}>
            Precice
          </Button>
          <Button
            type="button"
            className="bg-[var(--accent-ai)] text-white hover:bg-[var(--accent-ai-strong)]"
            onClick={() => setAssistantOpen(true)}
          >
            AI panel
          </Button>
        </div>
      </div>

      <Section title="Stat kartice">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <StatCard
            title="Aktivni tenderi"
            value="124"
            description="U odnosu na prosli mjesec"
            icon={Search}
            iconColor="blue"
            trend={{ value: 12, label: "rast" }}
            chartData={sparklineData}
          />
          <StatCard
            title="Ponude u radu"
            value="18"
            description="Tri roka ove sedmice"
            icon={FileText}
            iconColor="amber"
            trend={{ value: -4, label: "pad" }}
            chartData={sparklineData.slice().reverse()}
          />
          <StatCard
            title="Dobijeni poslovi"
            value="7"
            description="Stopa uspjeha 28%"
            icon={Trophy}
            iconColor="green"
            trend={{ value: 8, label: "rast" }}
          />
          <StatCard
            title="AI preporuke"
            value="36"
            description="Spremno za pregled"
            icon={BarChart3}
            iconColor="purple"
            trend={{ value: 0, label: "stabilno", direction: "neutral" }}
          />
        </div>
      </Section>

      <Section title="Score, rokovi i oznake">
        <div className="grid gap-4 lg:grid-cols-3">
          <div className="rounded-[var(--radius-card)] border border-[var(--border-default)] bg-[var(--surface-1)] p-5 shadow-[var(--shadow-card)]">
            <div className="flex flex-wrap items-center gap-6">
              <CircularProgressScore score={92} size="lg" />
              <CircularProgressScore score={68} size="md" />
              <CircularProgressScore score={37} size="sm" />
            </div>
          </div>
          <div className="rounded-[var(--radius-card)] border border-[var(--border-default)] bg-[var(--surface-1)] p-5 shadow-[var(--shadow-card)]">
            <div className="flex flex-wrap gap-2">
              <DeadlineCountdown deadline={nextDeadline(0)} />
              <DeadlineCountdown deadline={nextDeadline(3)} />
              <DeadlineCountdown deadline={nextDeadline(9)} />
              <DeadlineCountdown deadline={nextDeadline(-1)} compact />
            </div>
          </div>
          <div className="rounded-[var(--radius-card)] border border-[var(--border-default)] bg-[var(--surface-1)] p-5 shadow-[var(--shadow-card)]">
            <div className="flex flex-wrap gap-2">
              <PriorityPill priority="urgent" />
              <PriorityPill priority="high" />
              <PriorityPill priority="medium" />
              <PriorityPill priority="low" />
              <StatusBadge status="open" />
              <StatusBadge status="closing_soon" />
              <StatusBadge status="submitted" />
              <StatusBadge status="won" />
              <StatusBadge status="lost" />
            </div>
          </div>
        </div>
      </Section>

      <Section title="AI preporuke">
        <div className="grid gap-4 lg:grid-cols-2">
          <AIInsightBox title="Prilika visokog prioriteta" actionLabel="Otvori tender" feedbackId="ui-kit-default">
            Tender ima visok fit score, poznatog narucioca i rok koji ostavlja dovoljno vremena za pripremu.
          </AIInsightBox>
          <AIInsightBox title="Rizik u dokumentaciji" variant="warning" dismissible feedbackId="ui-kit-warning">
            Nedostaje potvrda o solventnosti. Provjerite listu dokumenata prije predaje ponude.
          </AIInsightBox>
          <AIInsightBox title="Preporucena akcija" variant="suggestion">
            Dodajte ovaj tender u pipeline i zakazite internu odluku najkasnije do sutra.
          </AIInsightBox>
          <AIInsightBox title="Spremno za predaju" variant="success">
            Svi kljucni dokumenti su oznaceni kao kompletirani.
          </AIInsightBox>
        </div>
      </Section>

      <Section title="Grafikoni">
        <div className="grid gap-4 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]">
          <div className="rounded-[var(--radius-card)] border border-[var(--border-default)] bg-[var(--surface-1)] p-5 shadow-[var(--shadow-card)]">
            <h3 className="mb-4 text-sm font-semibold text-[var(--text-primary)]">Status tendera</h3>
            <DonutChart data={donutData} centerValue="78" centerLabel="ukupno" />
          </div>
          <div className="rounded-[var(--radius-card)] border border-[var(--border-default)] bg-[var(--surface-1)] p-5 shadow-[var(--shadow-card)]">
            <h3 className="mb-4 text-sm font-semibold text-[var(--text-primary)]">Trend prilika</h3>
            <LineAreaChart
              data={lineData}
              xKey="month"
              series={[
                { key: "tenders", name: "Tenderi" },
                { key: "bids", name: "Ponude", color: "var(--chart-2)" },
              ]}
            />
          </div>
        </div>
      </Section>

      <Section title="Prazna stanja i skeleton">
        <div className="grid gap-4 lg:grid-cols-2">
          <EmptyState
            title="Nema sacuvanih tendera"
            description="Kada sacuvate tender, pojavit ce se ovdje sa rokom, prioritetom i AI preporukom."
            icon={Building2}
            actionLabel="Pronadji tendere"
            secondaryActionLabel="Pogledaj preporuke"
          />
          <div className="rounded-[var(--radius-card)] border border-[var(--border-default)] bg-[var(--surface-1)] p-5 shadow-[var(--shadow-card)]">
            <div className="flex items-center gap-3">
              <Skeleton variant="circle" className="size-12" />
              <div className="flex-1 space-y-2">
                <Skeleton variant="text" className="w-1/2" />
                <Skeleton variant="text" className="w-3/4" />
              </div>
            </div>
            <Skeleton variant="card" className="mt-5" />
            <div className="mt-4 flex gap-2">
              <Skeleton variant="button" className="w-28" />
              <Skeleton variant="button" className="w-20" />
            </div>
          </div>
        </div>
      </Section>

      <Section title="Layout dodaci">
        <div className="rounded-[var(--radius-card)] border border-[var(--border-default)] bg-[var(--surface-1)] p-5 shadow-[var(--shadow-card)]">
          <div className="flex flex-wrap items-center gap-3">
            <Button type="button" variant="outline" onClick={() => setShortcutsOpen(true)}>
              Otvori precice
            </Button>
            <Button
              type="button"
              className="bg-[var(--accent-ai)] text-white hover:bg-[var(--accent-ai-strong)]"
              onClick={() => setAssistantOpen(true)}
            >
              Otvori AI asistenta
            </Button>
            <span className="inline-flex items-center gap-2 text-sm text-[var(--text-secondary)]">
              <Bell className="size-4" aria-hidden="true" />
              Layout komponente nisu montirane globalno.
            </span>
          </div>
        </div>
      </Section>

      <KeyboardShortcutsModal open={shortcutsOpen} onOpenChange={setShortcutsOpen} />
      <AIAssistantPanel
        open={assistantOpen}
        onOpenChange={setAssistantOpen}
        screenContext="/dashboard/_dev/ui-kit"
        userContext={{ source: "phase-b-ui-kit" }}
      />
    </div>
  );
}
