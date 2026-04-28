"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CheckCircle, AlertTriangle, ArrowRight, Loader2, Search, XCircle } from "lucide-react";
import Link from "next/link";
import { demoAnalyzeTender, type DemoTenderResult } from "@/app/actions/demo-analyze";

function formatValue(value: number | null | undefined): string {
  if (value === null || value === undefined) return "—";
  return (
    new Intl.NumberFormat("bs-BA", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value) + " KM"
  );
}

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("bs-BA", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function getDaysLeft(dateStr: string | null | undefined): { text: string; color: string } | null {
  if (!dateStr) return null;
  const diff = Math.ceil((new Date(dateStr).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  if (diff < 0) return { text: "Rok istekao", color: "text-slate-400" };
  if (diff <= 7) return { text: `Još ${diff} dana`, color: "text-red-600" };
  return { text: `Još ${diff} dana`, color: "text-emerald-600" };
}

export function DemoWidget() {
  const [step, setStep] = useState<"input" | "analyzing" | "result" | "not_found">("input");
  const [inputValue, setInputValue] = useState("");
  const [result, setResult] = useState<DemoTenderResult | null>(null);

  async function handleAnalyze() {
    if (!inputValue.trim()) return;
    setStep("analyzing");

    try {
      const data = await demoAnalyzeTender(inputValue.trim());
      if (data.found) {
        setResult(data);
        setStep("result");
      } else {
        setStep("not_found");
      }
    } catch {
      setStep("not_found");
    }
  }

  function handleReset() {
    setStep("input");
    setInputValue("");
    setResult(null);
  }

  const daysLeft = result?.deadline ? getDaysLeft(result.deadline) : null;

  return (
    <div className="w-full max-w-4xl mx-auto rounded-3xl border border-slate-200 bg-white shadow-2xl overflow-hidden">
      <div className="bg-slate-50 border-b border-slate-100 p-4 flex items-center justify-between">
        <div className="flex gap-2">
          <div className="size-3 rounded-full bg-red-400/50" />
          <div className="size-3 rounded-full bg-amber-400/50" />
          <div className="size-3 rounded-full bg-emerald-400/50" />
        </div>
        <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">
          Demo analize
        </div>
      </div>

      <div className="p-8 sm:p-12">
        {step === "input" && (
          <div className="text-center space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div>
              <h3 className="text-2xl font-heading font-bold text-slate-900 mb-2">
                Isprobajte analizu besplatno
              </h3>
              <p className="text-slate-500">
                Zalijepite link tendera s EJN portala da vidite kako radi.
              </p>
            </div>

            <div className="max-w-xl mx-auto">
              <div className="flex gap-2 p-2 rounded-2xl border border-slate-200 shadow-sm focus-within:ring-2 focus-within:ring-primary/20 transition-all">
                <Input
                  className="border-none shadow-none focus-visible:ring-0 h-12 text-base"
                  placeholder="https://www.ejn.gov.ba/Notice/..."
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleAnalyze()}
                />
                <Button 
                  size="lg" 
                  onClick={handleAnalyze} 
                  disabled={!inputValue.trim()}
                  className="rounded-xl font-bold bg-primary hover:bg-blue-700"
                >
                  <Search className="mr-2 size-4" />
                  Analiziraj
                </Button>
              </div>
              <div className="mt-4 flex items-center justify-center gap-4 text-xs text-slate-400">
                <span>Podržani portal: EJN (ejn.gov.ba)</span>
              </div>
            </div>

            <div className="pt-8 border-t border-slate-100">
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <div className="flex items-center gap-2 text-sm font-medium text-slate-600 bg-slate-50 px-4 py-2 rounded-full">
                  <CheckCircle className="size-4 text-emerald-500" />
                  Automatska lista dokumenata
                </div>
                <div className="flex items-center gap-2 text-sm font-medium text-slate-600 bg-slate-50 px-4 py-2 rounded-full">
                  <AlertTriangle className="size-4 text-amber-500" />
                  Detekcija rizika
                </div>
              </div>
            </div>
          </div>
        )}

        {step === "analyzing" && (
          <div className="py-12 flex flex-col items-center justify-center text-center animate-in fade-in duration-500">
            <div className="relative">
              <div className="absolute inset-0 bg-blue-500/20 blur-xl rounded-full animate-pulse" />
              <div className="relative bg-white p-4 rounded-2xl shadow-lg mb-6">
                <Loader2 className="size-12 text-primary animate-spin" />
              </div>
            </div>
            <h3 className="text-xl font-bold text-slate-900 mb-2">Tražim tender u bazi...</h3>
            <div className="space-y-1">
              <p className="text-sm text-slate-500 animate-pulse">Provjeravam EJN identifikator...</p>
            </div>
          </div>
        )}

        {step === "not_found" && (
          <div className="py-12 flex flex-col items-center justify-center text-center animate-in fade-in duration-500">
            <div className="bg-slate-100 p-4 rounded-2xl mb-6">
              <XCircle className="size-12 text-slate-400" />
            </div>
            <h3 className="text-xl font-bold text-slate-900 mb-2">Tender nije pronađen</h3>
            <p className="text-sm text-slate-500 max-w-md mb-6">
              Nismo pronašli ovaj tender u našoj bazi. Provjerite da li ste zalijepili ispravan EJN link, 
              ili se registrujte za pristup kompletnoj bazi tendera.
            </p>
            <div className="flex items-center gap-3">
              <Button variant="outline" onClick={handleReset} className="rounded-xl font-bold">
                Pokušaj ponovo
              </Button>
              <Link href="/signup">
                <Button className="rounded-xl font-bold bg-primary hover:bg-blue-700">
                  Kreiraj nalog
                  <ArrowRight className="ml-2 size-4" />
                </Button>
              </Link>
            </div>
          </div>
        )}

        {step === "result" && result && (
          <div className="animate-in fade-in zoom-in-95 duration-500">
            <div className="flex flex-col md:flex-row gap-8">
              <div className="flex-1 space-y-6">
                <div>
                  <div className="inline-flex items-center gap-2 rounded-md bg-blue-50 px-2 py-1 text-xs font-bold text-blue-700 mb-2">
                    REZULTAT ANALIZE
                  </div>
                  <h3 className="text-2xl font-bold text-slate-900">
                    {result.title}
                  </h3>
                  {result.contracting_authority && (
                    <p className="text-slate-500 text-sm mt-1">
                      {result.contracting_authority}
                    </p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
                    <p className="text-xs font-bold text-slate-500 uppercase">Rok za ponude</p>
                    <p className="text-lg font-bold text-slate-900 mt-1">{formatDate(result.deadline)}</p>
                    {daysLeft && (
                      <span className={`text-xs font-medium ${daysLeft.color}`}>{daysLeft.text}</span>
                    )}
                  </div>
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
                    <p className="text-xs font-bold text-slate-500 uppercase">Procijenjena vrijednost</p>
                    <p className="text-lg font-bold text-slate-900 mt-1">{formatValue(result.estimated_value)}</p>
                    {result.contract_type && (
                      <span className="text-xs font-medium text-slate-500">{result.contract_type}</span>
                    )}
                  </div>
                </div>

                <div className="space-y-3">
                  <h4 className="font-bold text-slate-900 text-sm">Šta Tendersistem radi za vas</h4>
                  <ul className="space-y-2">
                    {[
                      { name: "Identifikacija svih potrebnih dokumenata", type: "Automatski" },
                      { name: "Detekcija rizika diskvalifikacije", type: "Automatski" },
                      { name: "Automatsko uparivanje s vašim trezorom dokumenata", type: "Automatski" },
                      { name: "Praćenje rokova i obavijesti", type: "Automatski" },
                    ].map((item, i) => (
                      <li key={i} className="flex items-center justify-between p-2 rounded-lg border border-slate-100 bg-white">
                        <div className="flex items-center gap-2">
                          <CheckCircle className="size-4 text-emerald-500" />
                          <span className="text-sm font-medium text-slate-700">{item.name}</span>
                        </div>
                        <span className="text-[10px] font-bold bg-blue-50 text-blue-600 px-2 py-0.5 rounded">
                          {item.type}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>

                <button onClick={handleReset} className="text-sm font-medium text-slate-500 hover:text-slate-700 transition-colors">
                  ← Analiziraj drugi tender
                </button>
              </div>

              <div className="w-full md:w-72 shrink-0 flex flex-col justify-center gap-4 bg-slate-900 rounded-2xl p-6 text-white text-center">
                <div className="mx-auto size-12 rounded-full bg-blue-600 flex items-center justify-center mb-2">
                  <CheckCircle className="size-6 text-white" />
                </div>
                <h4 className="text-lg font-bold">Spremno za pripremu?</h4>
                <p className="text-sm text-slate-300">
                  Kreirajte besplatan nalog da sačuvate ovu analizu i započnete pripremu ponude.
                </p>
                <Link href="/signup">
                  <Button className="w-full bg-white text-slate-900 hover:bg-slate-100 font-bold">
                    Kreiraj nalog
                    <ArrowRight className="ml-2 size-4" />
                  </Button>
                </Link>
                <p className="text-xs text-slate-500 mt-2">
                  Bez kreditne kartice. 14 dana besplatno.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
