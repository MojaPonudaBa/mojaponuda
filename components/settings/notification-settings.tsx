import { Bell, Mail, MonitorSmartphone } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { PrefToggle } from "./notification-pref-toggle";

interface EventDef {
  key: string;
  title: string;
  description: string;
}

const EVENT_GROUPS: Array<{ label: string; events: EventDef[] }> = [
  {
    label: "Pracenje trzista",
    events: [
      {
        key: "new_tender_watched_authority",
        title: "Novi tender od pracenog narucioca",
        description: "Kada se pojavi novi tender od narucioca kojeg pratite.",
      },
      {
        key: "new_tender_watched_cpv",
        title: "Novi tender u pracenoj CPV kategoriji",
        description: "Kada se pojavi novi tender u CPV kategoriji koju pratite.",
      },
      {
        key: "competitor_downloaded_td",
        title: "Konkurent preuzeo TD",
        description: "Kada konkurent koga pratite preuzme tendersku dokumentaciju (uskoro).",
      },
    ],
  },
  {
    label: "Rokovi ponuda",
    events: [
      {
        key: "bid_deadline_7d",
        title: "7 dana do roka za ponudu",
        description: "Sedam dana prije submission_deadline za ponude u izradi.",
      },
      {
        key: "bid_deadline_2d",
        title: "2 dana do roka za ponudu",
        description: "Dva dana prije submission_deadline (hitno).",
      },
    ],
  },
  {
    label: "Vault dokumenti",
    events: [
      {
        key: "vault_document_expires_30d",
        title: "Dokument istice za 30 dana",
        description: "Prvi podsjetnik za obnovu dokumenta u Vault-u.",
      },
      {
        key: "vault_document_expires_7d",
        title: "Dokument istice za 7 dana",
        description: "Hitan podsjetnik za obnovu (zadnja sedmica).",
      },
    ],
  },
];

// Defaulti kad korisnik nema red u bazi za tu kombinaciju (event_type, channel).
const DEFAULT_ENABLED: Record<string, { email: boolean; in_app: boolean }> = {
  new_tender_watched_authority: { email: true, in_app: true },
  new_tender_watched_cpv: { email: true, in_app: true },
  competitor_downloaded_td: { email: true, in_app: true },
  bid_deadline_7d: { email: true, in_app: true },
  bid_deadline_2d: { email: true, in_app: true },
  vault_document_expires_30d: { email: true, in_app: true },
  vault_document_expires_7d: { email: true, in_app: true },
};

export async function NotificationSettings() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const anySupabase = supabase as any;
  const { data: rows } = await anySupabase
    .from("notification_preferences")
    .select("event_type, channel, enabled")
    .eq("user_id", user.id);

  const prefMap = new Map<string, boolean>();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  for (const r of (rows ?? []) as any[]) {
    prefMap.set(`${r.event_type}:${r.channel}`, Boolean(r.enabled));
  }

  function isEnabled(eventKey: string, channel: "email" | "in_app"): boolean {
    const key = `${eventKey}:${channel}`;
    if (prefMap.has(key)) return prefMap.get(key)!;
    return DEFAULT_ENABLED[eventKey]?.[channel] ?? true;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-3 rounded-2xl border border-blue-100 bg-blue-50/60 p-4 text-sm text-slate-700">
        <Bell className="mt-0.5 size-5 shrink-0 text-blue-600" />
        <div>
          <p className="font-semibold text-slate-900">Obavjestenja salju dnevni cron i in-app feed.</p>
          <p className="mt-1">
            Email isporuka koristi Resend placeholder (trenutno se loguje u konzolu dok ne povezemo API kljuc). In-app
            obavjestenja se pojavljuju u desktop sidebar-u cim se event generise.
          </p>
        </div>
      </div>

      {EVENT_GROUPS.map((group) => (
        <section key={group.label} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <header className="border-b border-slate-100 bg-slate-50 px-5 py-3">
            <h3 className="text-sm font-semibold text-slate-900">{group.label}</h3>
          </header>

          <div className="divide-y divide-slate-100">
            {group.events.map((ev) => (
              <div key={ev.key} className="flex flex-col gap-3 px-5 py-4 md:flex-row md:items-center md:gap-6">
                <div className="flex-1">
                  <p className="text-sm font-semibold text-slate-900">{ev.title}</p>
                  <p className="mt-0.5 text-xs text-slate-500">{ev.description}</p>
                </div>

                <div className="flex items-center gap-4">
                  <PrefToggle
                    eventKey={ev.key}
                    channel="email"
                    checked={isEnabled(ev.key, "email")}
                    icon={<Mail className="size-3.5" />}
                    label="Email"
                  />
                  <PrefToggle
                    eventKey={ev.key}
                    channel="in_app"
                    checked={isEnabled(ev.key, "in_app")}
                    icon={<MonitorSmartphone className="size-3.5" />}
                    label="U aplikaciji"
                  />
                </div>
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
