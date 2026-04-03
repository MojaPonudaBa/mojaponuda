"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Loader2, Briefcase, Lock, Sparkles } from "lucide-react";
import { PaywallModal } from "@/components/subscription/paywall-modal";
import { DocumentUploadStep } from "@/components/bids/document-upload-step";
import { PRICING } from "@/lib/plans";
import { trackEvent } from "@/lib/analytics";

interface StartBidButtonProps {
  tenderId: string;
  tenderTitle: string;
  existingBidId?: string | null;
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link";
  className?: string;
  isSubscribed?: boolean;
}

export function StartBidButton({ tenderId, tenderTitle, existingBidId, variant = "default", className, isSubscribed = false }: StartBidButtonProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showPaywall, setShowPaywall] = useState(false);
  const [limitInfo, setLimitInfo] = useState<{ limit: number; current: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showTenderPaywall, setShowTenderPaywall] = useState(false);
  const [paywallTenderId, setPaywallTenderId] = useState<string | null>(null);

  if (existingBidId) {
    return (
      <div className="space-y-2">
        <Button
          variant={variant}
          onClick={() => router.push(`/dashboard/bids/${existingBidId}`)}
          className={className || "rounded-sm font-semibold"}
        >
          <Briefcase className="mr-2 size-4" />
          Otvori postojeću ponudu
        </Button>
        {error && <p className="text-sm font-medium text-red-600">{error}</p>}
      </div>
    );
  }

  async function handleStart() {
    if (!isSubscribed) {
      setLimitInfo(null);
      trackEvent("SHOW_PAYWALL_FREE_USER_ACTION", { tenderId });
      setShowPaywall(true);
      return;
    }

    setError(null);
    
    // Open upload modal instead of creating bid directly
    setShowUploadModal(true);
  }

  return (
    <>
      <div className="space-y-2">
        <Button onClick={handleStart} disabled={loading} variant={variant} className={className || "rounded-sm font-semibold bg-blue-600 hover:bg-blue-700 text-white"}>
          {loading ? (
            <>
              <Loader2 className="mr-2 size-4 animate-spin" />
              Učitavam...
            </>
          ) : (
            <>
              {isSubscribed ? <Sparkles className="mr-2 size-4" /> : <Lock className="mr-2 size-4" />}
              Započni pripremu ponude
            </>
          )}
        </Button>
        {error && <p className="text-sm font-medium text-red-600">{error}</p>}
      </div>

      <Dialog open={showUploadModal} onOpenChange={setShowUploadModal}>
        <DialogContent className="max-w-3xl">
          <DocumentUploadStep
            tenderId={tenderId}
            tenderTitle={tenderTitle}
            onComplete={() => setShowUploadModal(false)}
          />
        </DialogContent>
      </Dialog>

      <PaywallModal
        isOpen={showPaywall}
        onClose={() => setShowPaywall(false)}
        title={limitInfo ? "Dostigli ste limit paketa" : "Profesionalna priprema ponude je dostupna uz pretplatu"}
        description={limitInfo
          ? `Vaš trenutni paket omogućava maksimalno ${limitInfo?.limit} aktivnih tendera. Trenutno imate ${limitInfo?.current}. Nadogradite paket ako želite nastaviti rad bez blokade.`
          : "Uz pretplatu dobijate profesionalnu pripremu ponude, početnu listu onoga što treba prikupiti i jasniji pregled prije slanja."}
        limitType="tenders"
      />

      <PaywallModal
        isOpen={showTenderPaywall}
        onClose={() => setShowTenderPaywall(false)}
        title={`Otključaj ovaj tender (${PRICING.tenderUnlock} KM)`}
        description={`Vaš Osnovni paket vam omogućava pregled tendera, ali priprema ponude se naplaćuje po tenderu. Otključajte ovaj tender za samo ${PRICING.tenderUnlock} KM.`}
        limitType="tenders"
        isPerTenderUnlock={true}
        tenderId={paywallTenderId || tenderId}
      />
    </>
  );
}

