"use client";

import { useRouter } from "next/navigation";
import { CheckCircle, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface PaywallModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description: string;
  limitType: "tenders" | "storage" | "members" | "feature";
  isPerTenderUnlock?: boolean;
  tenderId?: string;
  ctaLabel?: string;
  ctaHref?: string;
  featureList?: string[];
}

const DEFAULT_FEATURES = [
  "Profesionalnu pripremu ponude kada odlučite aplicirati",
  "Početnu listu dokumenata i koraka za rad",
  "Pregled šta još nedostaje prije slanja",
  "Manje propuštenih detalja i više kontrole nad ponudom",
];

const CREDIT_FEATURES = [
  "Pregled koliko vam je priprema ostalo u ovom ciklusu",
  "Kupovinu dodatnih paketa priprema bez komplikacija",
  "Jasan pregled potrošnje za račun ili klijenta",
  "Neprekinut rad na tenderu čim dopunite pripreme",
];

export function PaywallModal({
  isOpen,
  onClose,
  title,
  description,
  isPerTenderUnlock,
  tenderId,
  ctaLabel,
  ctaHref,
  featureList,
}: PaywallModalProps) {
  const router = useRouter();

  const resolvedHref =
    ctaHref ??
    (isPerTenderUnlock && tenderId
      ? `/dashboard/subscription#pripreme`
      : "/dashboard/subscription");

  const resolvedLabel =
    ctaLabel ??
    (isPerTenderUnlock ? "Dopuni pripreme i nastavi" : "Pogledaj pakete");

  const resolvedFeatures =
    featureList ?? (isPerTenderUnlock ? CREDIT_FEATURES : DEFAULT_FEATURES);

  function handlePrimaryAction() {
    router.push(resolvedHref);
    onClose();
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-full bg-blue-100">
            <Zap className="size-6 text-blue-600" />
          </div>
          <DialogTitle className="text-center text-xl font-bold">{title}</DialogTitle>
          <DialogDescription className="pt-2 text-center">{description}</DialogDescription>
        </DialogHeader>

        <div className="my-4 rounded-xl border border-slate-100 bg-slate-50 p-4">
          <h4 className="mb-3 text-sm font-semibold text-slate-900">
            {isPerTenderUnlock ? "Ovo dobijate odmah:" : "Uz paket dobijate:"}
          </h4>
          <ul className="space-y-2 text-sm">
            {resolvedFeatures.map((feature) => (
              <li key={feature} className="flex items-center gap-2">
                <CheckCircle className="size-4 text-blue-500" />
                <span>{feature}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="flex flex-col gap-2">
          <Button
            size="lg"
            className="w-full bg-primary font-bold hover:bg-blue-700"
            onClick={handlePrimaryAction}
          >
            {resolvedLabel}
          </Button>
          <Button variant="ghost" onClick={onClose} className="w-full text-slate-500">
            Možda kasnije
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
