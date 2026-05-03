"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  Archive,
  Boxes,
  CheckCircle2,
  Database,
  FileText,
  Folder,
  Search,
  ShieldAlert,
  Upload,
} from "lucide-react";

import { AddDocumentModal } from "@/components/vault/add-document-modal";
import { DocumentCard } from "@/components/vault/document-card";
import { DonutChart } from "@/components/ui/donut-chart";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { StatCard } from "@/components/ui/stat-card";
import { Button } from "@/components/ui/button";
import { DOCUMENT_TYPES, getExpiryStatus } from "@/lib/vault/constants";
import {
  buildVaultCategoryGroups,
  buildVaultTenderGroups,
  formatBytes,
  formatDate,
  getDocumentTypeChart,
  type VaultDashboardData,
} from "@/lib/dashboard-c3";
import type { Document } from "@/types/db-aliases";
import { cn } from "@/lib/utils";

const tabs = [
  { key: "all", label: "Svi dokumenti" },
  { key: "mine", label: "Moji" },
  { key: "shared", label: "Podijeljeno" },
  { key: "archive", label: "Arhiva" },
  { key: "templates", label: "Šabloni" },
] as const;

type TabKey = (typeof tabs)[number]["key"];

function DocumentTable({ documents, usageByDocument }: { documents: Document[]; usageByDocument: Map<string, number> }) {
  if (documents.length === 0) {
    return (
      <EmptyState
        icon={<FileText className="size-7" aria-hidden="true" />}
        title="Nema dokumenata za ove filtere"
        description="Promijenite pretragu, tip dokumenta ili dodajte novi dokument kroz postojeći upload tok."
      />
    );
  }

  return (
    <div className="overflow-hidden rounded-[var(--radius-card)] border border-[var(--border-default)] bg-[var(--surface-1)] shadow-[var(--shadow-card)]">
      <div className="hidden grid-cols-[1.5fr_0.7fr_0.65fr_0.7fr_0.7fr] gap-3 border-b border-[var(--border-default)] bg-[var(--surface-2)] px-4 py-3 text-xs font-semibold uppercase tracking-[0.08em] text-[var(--text-tertiary)] lg:grid">
        <span>Dokument</span>
        <span>Tip</span>
        <span>Veličina</span>
        <span>Rok</span>
        <span>Reused in</span>
      </div>
      {documents.map((document) => {
        const status = getExpiryStatus(document.expires_at);
        return (
          <div
            key={document.id}
            className="grid gap-3 border-b border-[var(--border-default)] px-4 py-4 last:border-b-0 lg:grid-cols-[1.5fr_0.7fr_0.65fr_0.7fr_0.7fr] lg:items-center"
          >
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-[var(--text-primary)]">{document.name}</p>
              <p className="mt-1 text-xs text-[var(--text-tertiary)]">Dodano {formatDate(document.created_at)}</p>
            </div>
            <span className="w-fit rounded-full bg-[var(--primary-soft)] px-2 py-1 text-xs font-semibold text-[var(--primary-strong)]">
              {document.type || "Ostalo"}
            </span>
            <span className="text-sm text-[var(--text-secondary)]">{formatBytes(document.size)}</span>
            <span
              className={cn(
                "w-fit rounded-full px-2 py-1 text-xs font-semibold",
                status === "danger"
                  ? "bg-[var(--danger-soft)] text-[var(--danger-strong)]"
                  : status === "warning"
                    ? "bg-[var(--warning-soft)] text-[var(--warning-strong)]"
                    : "bg-[var(--success-soft)] text-[var(--success-strong)]",
              )}
            >
              {document.expires_at ? formatDate(document.expires_at) : "Bez roka"}
            </span>
            <span className="text-sm font-semibold text-[var(--text-primary)]">
              {usageByDocument.get(document.id) ?? 0} ponuda
            </span>
          </div>
        );
      })}
    </div>
  );
}

export function VaultHubClient({ data }: { data: VaultDashboardData }) {
  const [activeTab, setActiveTab] = useState<TabKey>("all");
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [view, setView] = useState<"table" | "cards">("table");

  const usageByDocument = useMemo(() => {
    const map = new Map<string, number>();
    for (const item of data.usage) map.set(item.document_id, (map.get(item.document_id) ?? 0) + 1);
    return map;
  }, [data.usage]);

  const categoryGroups = useMemo(() => buildVaultCategoryGroups(data.documents), [data.documents]);
  const tenderGroups = useMemo(() => buildVaultTenderGroups(data.usage), [data.usage]);
  const typeChart = useMemo(() => getDocumentTypeChart(data.documents), [data.documents]);

  const filteredDocuments = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return data.documents.filter((document) => {
      if (activeTab === "shared" || activeTab === "archive") return false;
      if (activeTab === "templates") return false;
      if (typeFilter !== "all" && document.type !== typeFilter) return false;
      if (!normalizedQuery) return true;
      return [document.name, document.type, document.file_path].join(" ").toLowerCase().includes(normalizedQuery);
    });
  }, [activeTab, data.documents, query, typeFilter]);

  const expiringCount = data.documents.filter((document) => ["danger", "warning"].includes(getExpiryStatus(document.expires_at))).length;
  const totalBytes = data.documents.reduce((sum, document) => sum + Number(document.size ?? 0), 0);
  const storageQuotaBytes = 10 * 1024 * 1024 * 1024;
  const storagePercent = Math.min(100, Math.round((totalBytes / storageQuotaBytes) * 100));
  const linkedCount = usageByDocument.size;

  return (
    <section className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-[var(--border-default)] bg-[var(--surface-1)] px-3 py-1 text-xs font-semibold text-[var(--primary-strong)]">
            <Database className="size-3.5" aria-hidden="true" />
            Dokument hub
          </div>
          <h1 className="text-3xl font-semibold tracking-tight text-[var(--text-primary)]">Dokumentacija</h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--text-secondary)]">
            Centralizovan trezor za dokumente, rokove, ponovno korištenje i pripremu ponuda.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline" className="h-10 rounded-xl">
            <Link href="/dashboard/vault/sabloni">Šabloni</Link>
          </Button>
          <AddDocumentModal
            trigger={
              <Button type="button" className="h-10 rounded-xl bg-[var(--primary)] text-white hover:bg-[var(--primary-hover)]">
                <Upload className="size-4" aria-hidden="true" />
                Upload dokumenta
              </Button>
            }
          />
        </div>
      </header>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <StatCard title="Ukupno dokumenata" value={data.documents.length} description="Svi aktivni dokumenti" icon={<FileText className="size-5" aria-hidden="true" />} iconColor="blue" />
        <StatCard title="Povezano sa ponudama" value={linkedCount} description="Kroz bid_documents" icon={<Boxes className="size-5" aria-hidden="true" />} iconColor="green" />
        <StatCard title="Pred istekom" value={expiringCount} description="60 dana ili manje" icon={<ShieldAlert className="size-5" aria-hidden="true" />} iconColor="amber" />
        <StatCard title="Tipova dokumenata" value={categoryGroups.length} description="Kategorije u trezoru" icon={<Folder className="size-5" aria-hidden="true" />} iconColor="purple" />
        <StatCard title="Storage" value={formatBytes(totalBytes)} description={`${storagePercent}% od 10 GB`} icon={<Archive className="size-5" aria-hidden="true" />} iconColor="cyan" />
      </section>

      <nav className="flex flex-wrap gap-2 rounded-[var(--radius-card)] border border-[var(--border-default)] bg-[var(--surface-1)] p-2 shadow-[var(--shadow-card)]">
        {tabs.map((tab) => {
          const active = activeTab === tab.key;
          if (tab.key === "templates") {
            return (
              <Button key={tab.key} asChild variant={active ? "default" : "ghost"} className="rounded-xl">
                <Link href="/dashboard/vault/sabloni">{tab.label}</Link>
              </Button>
            );
          }
          return (
            <Button
              key={tab.key}
              type="button"
              variant={active ? "default" : "ghost"}
              onClick={() => setActiveTab(tab.key)}
              className="rounded-xl"
            >
              {tab.label}
            </Button>
          );
        })}
      </nav>

      <section className="flex flex-wrap items-center gap-3 rounded-[var(--radius-card)] border border-[var(--border-default)] bg-[var(--surface-1)] p-3 shadow-[var(--shadow-card)]">
        <div className="relative min-w-[260px] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[var(--text-tertiary)]" aria-hidden="true" />
          <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Pretraži dokumente..." className="h-10 rounded-xl pl-9" />
        </div>
        <select value={typeFilter} onChange={(event) => setTypeFilter(event.target.value)} className="h-10 rounded-xl border border-[var(--border-default)] bg-[var(--surface-1)] px-3 text-sm text-[var(--text-primary)]">
          <option value="all">Svi tipovi</option>
          {DOCUMENT_TYPES.map((type) => (
            <option key={type} value={type}>{type}</option>
          ))}
        </select>
        <Button type="button" variant="outline" onClick={() => setView(view === "table" ? "cards" : "table")} className="h-10 rounded-xl">
          {view === "table" ? "Kartice" : "Tabela"}
        </Button>
      </section>

      <div className="grid gap-6 xl:grid-cols-[240px_minmax(0,1fr)_320px]">
        <aside className="hidden space-y-4 xl:block">
          <section className="rounded-[var(--radius-card)] border border-[var(--border-default)] bg-[var(--surface-1)] p-4 shadow-[var(--shadow-card)]">
            <h2 className="text-sm font-semibold text-[var(--text-primary)]">Po tenderima</h2>
            <div className="mt-3 space-y-2">
              {tenderGroups.length ? tenderGroups.map((group) => (
                <div key={group.tenderId} className="flex items-center justify-between gap-3 rounded-xl bg-[var(--surface-2)] px-3 py-2 text-sm">
                  <span className="truncate text-[var(--text-secondary)]">{group.tenderTitle}</span>
                  <span className="font-semibold text-[var(--primary-strong)]">{group.count}</span>
                </div>
              )) : <p className="text-sm text-[var(--text-tertiary)]">Još nema veza prema ponudama.</p>}
            </div>
          </section>
          <section className="rounded-[var(--radius-card)] border border-[var(--border-default)] bg-[var(--surface-1)] p-4 shadow-[var(--shadow-card)]">
            <h2 className="text-sm font-semibold text-[var(--text-primary)]">Po kategorijama</h2>
            <div className="mt-3 space-y-2">
              {categoryGroups.map((group) => (
                <button key={group.category} type="button" onClick={() => setTypeFilter(group.category)} className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-sm hover:bg-[var(--surface-2)]">
                  <span className="truncate text-[var(--text-secondary)]">{group.category}</span>
                  <span className="font-semibold text-[var(--text-primary)]">{group.count}</span>
                </button>
              ))}
            </div>
          </section>
        </aside>

        <main className="min-w-0 space-y-5">
          <section className="rounded-[var(--radius-card)] border border-[var(--border-default)] bg-[var(--surface-1)] p-5 shadow-[var(--shadow-card)]">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-[var(--text-primary)]">Risk view</h2>
                <p className="text-sm text-[var(--text-secondary)]">Dokumenti pred istekom i stavke koje nisu povezane sa ponudama.</p>
              </div>
              <span className="rounded-full bg-[var(--danger-soft)] px-3 py-1 text-xs font-semibold text-[var(--danger-strong)]">{data.risks.length} signala</span>
            </div>
            <div className="mt-4 space-y-3">
              {data.risks.length ? data.risks.map((risk) => (
                <Link key={risk.id} href={risk.href} className="grid gap-3 rounded-xl border border-[var(--border-default)] p-3 transition-colors hover:bg-[var(--surface-2)] md:grid-cols-[minmax(0,1fr)_120px]">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-[var(--text-primary)]">{risk.title}</p>
                    <p className="mt-1 text-sm text-[var(--text-secondary)]">{risk.detail}</p>
                  </div>
                  <span className="text-sm font-semibold text-[var(--text-primary)]">{risk.dueDate ? formatDate(risk.dueDate) : "Provjeri"}</span>
                </Link>
              )) : (
                <EmptyState icon={<CheckCircle2 className="size-7" aria-hidden="true" />} title="Nema hitnih rizika" description="Dokumenti nemaju kritične rokove niti očite blokere u trenutno dostupnim vezama." />
              )}
            </div>
          </section>

          <section>
            <div className="mb-3 flex items-center justify-between gap-3">
              <h2 className="text-lg font-semibold text-[var(--text-primary)]">Dokumenti</h2>
              <p className="text-sm text-[var(--text-secondary)]">{filteredDocuments.length} prikazano</p>
            </div>
            {activeTab === "shared" || activeTab === "archive" ? (
              <EmptyState icon={<Archive className="size-7" aria-hidden="true" />} title="Nema podataka za ovaj tab" description="Postojeća šema nema shared/archive status za dokumente, pa prikaz ostaje prazan dok se ne uvede realan izvor." />
            ) : view === "cards" ? (
              filteredDocuments.length ? <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{filteredDocuments.map((document) => <DocumentCard key={document.id} document={document} />)}</div> : <DocumentTable documents={[]} usageByDocument={usageByDocument} />
            ) : (
              <DocumentTable documents={filteredDocuments} usageByDocument={usageByDocument} />
            )}
          </section>
        </main>

        <aside className="space-y-4">
          <section className="rounded-[var(--radius-card)] border border-[var(--border-default)] bg-[var(--surface-1)] p-5 shadow-[var(--shadow-card)]">
            <h2 className="text-base font-semibold text-[var(--text-primary)]">Korištenje prostora</h2>
            <p className="mt-3 text-2xl font-semibold text-[var(--text-primary)]">{formatBytes(totalBytes)}</p>
            <div className="mt-3 h-2 rounded-full bg-[var(--surface-2)]">
              <div className="h-full rounded-full bg-[var(--primary)]" style={{ width: `${storagePercent}%` }} />
            </div>
            <p className="mt-2 text-xs text-[var(--text-secondary)]">{storagePercent}% procijenjene kvote od 10 GB</p>
          </section>
          <section className="rounded-[var(--radius-card)] border border-[var(--border-default)] bg-[var(--surface-1)] p-5 shadow-[var(--shadow-card)]">
            <h2 className="text-base font-semibold text-[var(--text-primary)]">Brze akcije</h2>
            <div className="mt-4 space-y-2">
              <AddDocumentModal trigger={<Button type="button" variant="outline" className="h-10 w-full justify-start rounded-xl">Upload dokumenta</Button>} />
              <Button asChild type="button" variant="outline" className="h-10 w-full justify-start rounded-xl">
                <Link href="/dashboard/vault/sabloni">Otvori šablone</Link>
              </Button>
            </div>
          </section>
          <section className="rounded-[var(--radius-card)] border border-[var(--border-default)] bg-[var(--surface-1)] p-5 shadow-[var(--shadow-card)]">
            <h2 className="text-base font-semibold text-[var(--text-primary)]">Nedavno</h2>
            <div className="mt-4 space-y-3">
              {data.documents.slice(0, 4).map((document) => (
                <div key={document.id} className="flex gap-3">
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-[var(--primary-soft)] text-[var(--primary-strong)]"><FileText className="size-4" aria-hidden="true" /></span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-[var(--text-primary)]">{document.name}</p>
                    <p className="text-xs text-[var(--text-tertiary)]">{formatDate(document.created_at)}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>
          <section className="rounded-[var(--radius-card)] border border-[var(--border-default)] bg-[var(--surface-1)] p-5 shadow-[var(--shadow-card)]">
            <h2 className="text-base font-semibold text-[var(--text-primary)]">Tipovi dokumenata</h2>
            <DonutChart data={typeChart} height={220} centerLabel="tipova" centerValue={typeChart.length || 0} showLegend={false} valueSuffix="dokumenata" />
          </section>
        </aside>
      </div>
    </section>
  );
}
