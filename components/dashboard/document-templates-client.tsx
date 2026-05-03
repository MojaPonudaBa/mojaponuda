"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowLeft, FileText, Share2, WandSparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const templates = [
  {
    id: "izjava-o-ispunjavanju-uslova",
    name: "Izjava o ispunjavanju uslova",
    description: "Osnovna izjava za tendersku dokumentaciju sa podacima firme, JIB-om i odgovornim licem.",
    output: "DOCX/PDF",
    variables: ["Naziv firme", "JIB", "Tender", "Odgovorno lice"],
  },
  {
    id: "referenc-lista",
    name: "Lista referenci",
    description: "Strukturisan pregled referentnih projekata koji se može dopuniti prije predaje ponude.",
    output: "DOCX",
    variables: ["Klijent", "Projekat", "Vrijednost", "Godina"],
  },
  {
    id: "cover-letter",
    name: "Popratno pismo",
    description: "Kratko popratno pismo za predaju ponude prema ugovornom organu.",
    output: "PDF",
    variables: ["Ugovorni organ", "Predmet nabavke", "Kontakt"],
  },
  {
    id: "checklist-predaje",
    name: "Checklist predaje",
    description: "Interna kontrolna lista za provjeru dokumenata prije finalnog slanja.",
    output: "XLSX",
    variables: ["Tender", "Rok", "Odgovorna osoba", "Status"],
  },
];

export function DocumentTemplatesClient() {
  const [notice, setNotice] = useState<string | null>(null);

  return (
    <section className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Button asChild variant="ghost" className="mb-3 rounded-xl">
            <Link href="/dashboard/vault"><ArrowLeft className="size-4" aria-hidden="true" />Nazad na dokumentaciju</Link>
          </Button>
          <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-[var(--border-default)] bg-[var(--surface-1)] px-3 py-1 text-xs font-semibold text-[var(--primary-strong)]">
            <WandSparkles className="size-3.5" aria-hidden="true" />
            Generička biblioteka
          </div>
          <h1 className="text-3xl font-semibold tracking-tight text-[var(--text-primary)]">Šabloni dokumenata</h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--text-secondary)]">
            UI biblioteka generičkih šablona. Nema nove tabele niti trajnog spremanja dok template engine ne bude povezan.
          </p>
        </div>
        <Button type="button" variant="outline" className="h-10 rounded-xl">
          <Share2 className="size-4" aria-hidden="true" />
          Novi šablon
        </Button>
      </header>

      {notice ? (
        <div className="rounded-xl border border-[var(--success-soft)] bg-[var(--success-soft)] px-4 py-3 text-sm font-medium text-[var(--success-strong)]">
          {notice}
        </div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {templates.map((template) => (
          <article key={template.id} className="rounded-[var(--radius-card)] border border-[var(--border-default)] bg-[var(--surface-1)] p-5 shadow-[var(--shadow-card)] transition-shadow hover:shadow-[var(--shadow-card-hover)]">
            <div className="flex items-start justify-between gap-3">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[var(--primary-soft)] text-[var(--primary-strong)]">
                <FileText className="size-5" aria-hidden="true" />
              </span>
              <span className="rounded-full bg-[var(--surface-2)] px-2 py-1 text-xs font-semibold text-[var(--text-secondary)]">{template.output}</span>
            </div>
            <h2 className="mt-4 text-lg font-semibold text-[var(--text-primary)]">{template.name}</h2>
            <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">{template.description}</p>
            <div className="mt-4 flex flex-wrap gap-2">
              {template.variables.map((variable) => (
                <span key={variable} className="rounded-full bg-[var(--surface-2)] px-2 py-1 text-xs text-[var(--text-secondary)]">{variable}</span>
              ))}
            </div>
            <div className="mt-5 grid gap-2">
              <Input placeholder="Tender ili interni naziv..." className="h-10 rounded-xl" />
              <Button type="button" className="h-10 rounded-xl" onClick={() => setNotice(`Zahtjev za šablon "${template.name}" je zabilježen lokalno u UI stanju.`)}>
                Generiši dokument
              </Button>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
