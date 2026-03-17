"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Brain, Loader2, AlertTriangle, CheckCircle2, FileText, Lock } from "lucide-react";
import { analyzeTenderAction } from "@/app/actions/analyze-tender";
import type { AnalysisResult } from "@/lib/ai/tender-analysis";

interface QuickScanButtonProps {
  tenderId: string;
  isSubscribed: boolean;
}

export function QuickScanButton({ tenderId, isSubscribed }: QuickScanButtonProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleScan() {
    if (!isSubscribed) {
      router.push("/dashboard/subscription");
      return;
    }

    setOpen(true);
    // If we already have analysis, don't re-fetch unless forced?
    // For now, let's fetch to ensure fresh data or hit the cache in DB.
    if (analysis) return;

    setLoading(true);
    setError(null);

    try {
      const result = await analyzeTenderAction(tenderId);
      setAnalysis(result);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Došlo je do greške.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <Button
        onClick={handleScan}
        variant="outline"
        className="gap-2 border-purple-200 text-purple-700 hover:bg-purple-50 hover:text-purple-800"
      >
        {isSubscribed ? <Brain className="size-4" /> : <Lock className="size-4" />}
        Analiza tendera
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 font-heading text-xl">
              <Brain className="size-6 text-purple-600" />
              Automatska Analiza
            </DialogTitle>
            <DialogDescription>
              Sistem analizira dokumentaciju i izdvaja ključne zahtjeve i rokove.
            </DialogDescription>
          </DialogHeader>

          {loading ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="size-8 animate-spin text-purple-600 mb-4" />
              <p className="text-sm font-medium text-slate-500">
                Analiziram dokumentaciju...
              </p>
            </div>
          ) : error ? (
            <div className="rounded-xl bg-red-50 p-4 text-center">
              <AlertTriangle className="mx-auto size-8 text-red-500 mb-2" />
              <p className="font-bold text-red-700">{error}</p>
              <Button 
                variant="outline" 
                className="mt-4 border-red-200 text-red-700 hover:bg-red-100"
                onClick={() => setOpen(false)}
              >
                Zatvori
              </Button>
            </div>
          ) : analysis ? (
            <div className="space-y-6">
              {/* Risk Flags */}
              {analysis.risk_flags.length > 0 ? (
                <div className="rounded-xl border border-red-200 bg-red-50 p-4">
                  <h4 className="flex items-center gap-2 font-bold text-red-800 mb-3">
                    <AlertTriangle className="size-5" />
                    Upozorenja (Rizici)
                  </h4>
                  <ul className="space-y-2">
                    {analysis.risk_flags.map((flag, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-red-700">
                        <span className="mt-1.5 size-1.5 rounded-full bg-red-500 shrink-0" />
                        {flag}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 flex items-center gap-3 text-emerald-800">
                  <CheckCircle2 className="size-6" />
                  <span className="font-medium">Nisu pronađeni kritični rizici.</span>
                </div>
              )}

              {/* Deadlines */}
              {analysis.deadlines.length > 0 && (
                <div>
                  <h4 className="font-bold text-slate-900 mb-3">Ključni rokovi</h4>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {analysis.deadlines.map((dl, i) => (
                      <div key={i} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                        <p className="text-xs font-bold text-slate-500 uppercase">{dl.label}</p>
                        <p className="font-medium text-slate-900">{dl.date}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Checklist Summary */}
              <div>
                <h4 className="font-bold text-slate-900 mb-3">Potrebna dokumentacija ({analysis.checklist_items.length})</h4>
                <div className="space-y-2 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
                  {analysis.checklist_items.map((item, i) => (
                    <div key={i} className="flex items-start gap-3 rounded-lg border border-slate-100 p-3 hover:bg-slate-50">
                      <FileText className={`size-5 mt-0.5 ${item.is_required ? "text-slate-600" : "text-slate-400"}`} />
                      <div>
                        <p className="text-sm font-bold text-slate-900">
                          {item.name}
                          {!item.is_required && <span className="ml-2 text-xs font-normal text-slate-500">(Opciono)</span>}
                        </p>
                        <p className="text-xs text-slate-500 line-clamp-2">{item.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <Button onClick={() => setOpen(false)}>
                  U redu
                </Button>
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  );
}
