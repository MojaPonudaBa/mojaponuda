"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Loader2, Briefcase } from "lucide-react";

interface StartBidButtonProps {
  tenderId: string;
  existingBidId?: string | null;
}

export function StartBidButton({ tenderId, existingBidId }: StartBidButtonProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  if (existingBidId) {
    return (
      <Button onClick={() => router.push(`/dashboard/bids/${existingBidId}`)}>
        <Briefcase className="size-4" />
        Otvori ponudu
      </Button>
    );
  }

  async function handleStart() {
    setLoading(true);
    try {
      const res = await fetch("/api/bids", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tender_id: tenderId }),
      });
      const data = await res.json();
      if (data.bid?.id) {
        router.push(`/dashboard/bids/${data.bid.id}`);
      }
    } catch (err) {
      console.error("Start bid error:", err);
      setLoading(false);
    }
  }

  return (
    <Button onClick={handleStart} disabled={loading}>
      {loading ? <Loader2 className="animate-spin" /> : <Briefcase className="size-4" />}
      Počni pripremu ponude
    </Button>
  );
}
