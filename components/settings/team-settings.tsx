"use client";

import { useState } from "react";
import { Mail, Plus, Trash2, User } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PaywallModal } from "@/components/subscription/paywall-modal";
import type { SubscriptionStatus } from "@/lib/subscription";

interface TeamSettingsProps {
  status: SubscriptionStatus;
}

export function TeamSettings({ status }: TeamSettingsProps) {
  const [showPaywall, setShowPaywall] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");

  const members = [
    { id: "1", email: "marin.kolenda@outlook.com", role: "vlasnik", name: "Marin Kolenda" },
  ];

  const maxMembers = status.plan.limits.maxTeamMembers || 1;
  const currentMembers = members.length;

  function handleInvite(event: React.FormEvent) {
    event.preventDefault();
    if (!inviteEmail.trim()) return;

    if (currentMembers >= maxMembers) {
      setShowPaywall(true);
      return;
    }

    alert("Funkcionalnost pozivanja članova tima uskoro stiže!");
    setInviteEmail("");
  }

  return (
    <div className="space-y-6">
      <section className="rounded-[1.75rem] border border-slate-800 bg-[linear-gradient(180deg,#111827_0%,#0f172a_100%)] p-6 text-white shadow-[0_24px_60px_-42px_rgba(2,6,23,0.88)]">
        <div className="mb-6 flex flex-col gap-4 border-b border-white/10 pb-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-sky-300">
              <User className="size-5" />
            </div>
            <div>
              <h2 className="font-heading text-lg font-bold text-white">Upravljanje timom</h2>
              <p className="text-sm text-slate-400">{currentMembers} od {maxMembers} članova</p>
            </div>
          </div>
          {status.plan.id === "agency" ? (
            <Badge className="border-indigo-500/20 bg-indigo-500/10 text-indigo-100 hover:bg-indigo-500/20">
              Agencijski tim
            </Badge>
          ) : null}
        </div>

        <form onSubmit={handleInvite} className="mb-6 grid gap-3 rounded-[1.4rem] border border-white/10 bg-white/5 p-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
          <div className="space-y-2">
            <Label htmlFor="invite-email" className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
              Pozovi novog člana
            </Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-500" />
              <Input
                id="invite-email"
                type="email"
                placeholder="kolega@firma.ba"
                className="h-11 border-white/10 bg-white/5 pl-9 text-white placeholder:text-slate-500"
                value={inviteEmail}
                onChange={(event) => setInviteEmail(event.target.value)}
              />
            </div>
          </div>
          <Button type="submit" className="h-11 rounded-2xl bg-white px-5 text-sm font-semibold text-slate-950 hover:bg-slate-100">
            <Plus className="mr-2 size-4" />
            Pozovi
          </Button>
        </form>

        <div className="space-y-3">
          {members.map((member) => (
            <article
              key={member.id}
              className="flex flex-col gap-4 rounded-[1.3rem] border border-white/10 bg-white/5 p-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="flex min-w-0 items-center gap-4">
                <Avatar className="size-11 border border-white/10 shadow-sm">
                  <AvatarImage src={`https://ui-avatars.com/api/?name=${member.name}&background=0f172a&color=fff`} />
                  <AvatarFallback>MK</AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-white">{member.name}</p>
                  <p className="truncate text-xs text-slate-400">{member.email}</p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <Badge variant="outline" className="border-white/10 bg-white/5 capitalize text-slate-200">
                  {member.role}
                </Badge>
                {member.role !== "vlasnik" ? (
                  <Button variant="outline" size="sm" className="h-10 rounded-2xl border-rose-500/20 bg-rose-500/10 px-4 text-sm font-semibold text-rose-100 hover:bg-rose-500/20 hover:text-rose-50">
                    <Trash2 className="mr-2 size-4" />
                    Ukloni
                  </Button>
                ) : null}
              </div>
            </article>
          ))}
        </div>
      </section>

      <PaywallModal
        isOpen={showPaywall}
        onClose={() => setShowPaywall(false)}
        title="Dostigli ste limit tima"
        description={`Vaš trenutni paket omogućava maksimalno ${maxMembers} članova tima. Nadogradite paket za dodavanje više kolega.`}
        limitType="members"
      />
    </div>
  );
}
