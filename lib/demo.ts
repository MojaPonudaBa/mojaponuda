import type {
  BidChecklistItemInsert,
  Company,
  Document,
  DocumentInsert,
  Subscription,
  SubscriptionInsert,
} from "@/types/database";

export const DEMO_USER_EMAIL = "marin.kolenda@outlook.com";

export function isDemoUser(email?: string | null): boolean {
  return email?.trim().toLowerCase() === DEMO_USER_EMAIL;
}

export function isCompanyProfileComplete(company?: Pick<Company, "jib"> | null): boolean {
  return Boolean(company?.jib?.trim());
}

export function getDemoCompanyDefaults(companyName?: string) {
  return {
    name: companyName?.trim() || "MojaPonuda Demo d.o.o.",
    jib: "420000000001",
    pdv: "200000000001",
    address: "Travnik 72270, Bosna i Hercegovina",
    contactEmail: DEMO_USER_EMAIL,
    contactPhone: "+387 63 123 456",
  };
}

export function getDemoSubscription(userId: string): Subscription {
  const now = new Date();
  const currentPeriodEnd = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString();

  return {
    id: "demo-subscription",
    user_id: userId,
    lemonsqueezy_customer_id: "demo-customer",
    lemonsqueezy_subscription_id: "demo-subscription-id",
    lemonsqueezy_variant_id: "demo-variant",
    status: "active",
    current_period_end: currentPeriodEnd,
    created_at: now.toISOString(),
  };
}

export function getDemoSubscriptionInsert(userId: string): SubscriptionInsert {
  const subscription = getDemoSubscription(userId);

  return {
    user_id: subscription.user_id,
    lemonsqueezy_customer_id: subscription.lemonsqueezy_customer_id,
    lemonsqueezy_subscription_id: subscription.lemonsqueezy_subscription_id,
    lemonsqueezy_variant_id: subscription.lemonsqueezy_variant_id,
    status: subscription.status,
    current_period_end: subscription.current_period_end,
  };
}

export function getDemoDocuments(companyId: string): Document[] {
  const now = new Date();
  const thirtyDays = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString();
  const ninetyDays = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000).toISOString();
  const oneYear = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000).toISOString();
  const createdAt = now.toISOString();

  return [
    {
      id: "demo-doc-1",
      company_id: companyId,
      name: "Porezno uvjerenje 2026",
      type: "tax",
      file_path: "demo/porezno-uvjerenje-2026.pdf",
      expires_at: thirtyDays,
      created_at: createdAt,
    },
    {
      id: "demo-doc-2",
      company_id: companyId,
      name: "Rješenje o registraciji",
      type: "registration",
      file_path: "demo/rjesenje-o-registraciji.pdf",
      expires_at: oneYear,
      created_at: createdAt,
    },
    {
      id: "demo-doc-3",
      company_id: companyId,
      name: "Uvjerenje o izmirenim doprinosima",
      type: "contributions",
      file_path: "demo/doprinosi-uvjerenje.pdf",
      expires_at: ninetyDays,
      created_at: createdAt,
    },
  ];
}

export function getDemoDocumentInserts(companyId: string): DocumentInsert[] {
  return getDemoDocuments(companyId).map((document) => ({
    id: document.id,
    company_id: document.company_id,
    name: document.name,
    type: document.type,
    file_path: document.file_path,
    expires_at: document.expires_at,
    created_at: document.created_at,
  }));
}

export function getDemoChecklistItems(bidId: string, documentIds: string[]): BidChecklistItemInsert[] {
  return [
    {
      id: `${bidId}-item-1`,
      bid_id: bidId,
      title: "Rješenje o registraciji",
      description: "Priložite aktuelni izvod iz sudskog registra.",
      status: "confirmed",
      document_id: documentIds[1] ?? null,
      risk_note: null,
      sort_order: 0,
    },
    {
      id: `${bidId}-item-2`,
      bid_id: bidId,
      title: "Porezno uvjerenje",
      description: "Dokaz o izmirenim poreskim obavezama, ne stariji od 30 dana.",
      status: "attached",
      document_id: documentIds[0] ?? null,
      risk_note: "Provjeriti datum važenja prije finalne predaje.",
      sort_order: 1,
    },
    {
      id: `${bidId}-item-3`,
      bid_id: bidId,
      title: "Potvrda o tehničkoj sposobnosti",
      description: "Reference za slične ugovore iz posljednje tri godine.",
      status: "missing",
      document_id: null,
      risk_note: "Nedostaje potpisana referentna lista.",
      sort_order: 2,
    },
  ];
}

export const demoBidSummaries = [
  {
    id: "demo-bid-1",
    status: "in_review" as const,
    created_at: new Date().toISOString(),
    tender: {
      id: "demo-tender-1",
      title: "Nabavka IT opreme za općinsku upravu",
      contracting_authority: "Općina Travnik",
      deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      estimated_value: 85000,
    },
  },
  {
    id: "demo-bid-2",
    status: "submitted" as const,
    created_at: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
    tender: {
      id: "demo-tender-2",
      title: "Održavanje mrežne infrastrukture",
      contracting_authority: "JU Dom zdravlja Zenica",
      deadline: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
      estimated_value: 42000,
    },
  },
  {
    id: "demo-bid-3",
    status: "won" as const,
    created_at: new Date(Date.now() - 18 * 24 * 60 * 60 * 1000).toISOString(),
    tender: {
      id: "demo-tender-3",
      title: "Licenciranje poslovnog softvera",
      contracting_authority: "Grad Mostar",
      deadline: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
      estimated_value: 120000,
    },
  },
];

export const demoTopAuthorities = [
  { name: "Grad Sarajevo", jib: null, count: 18 },
  { name: "Općina Travnik", jib: null, count: 12 },
  { name: "Klinički centar Tuzla", jib: null, count: 9 },
];

export const demoTopWinners = [
  { name: "MojaPonuda Demo d.o.o.", jib: "420000000001", wins: 4, total_value: 245000 },
  { name: "TechVision d.o.o.", jib: "420000000002", wins: 3, total_value: 183000 },
  { name: "Infodom d.o.o.", jib: "420000000003", wins: 2, total_value: 112000 },
];

export const demoUpcomingProcurements = [
  {
    id: "demo-plan-1",
    portal_id: "demo-plan-1",
    description: "Nabavka serverske opreme i mrežnih komponenti",
    estimated_value: 150000,
    planned_date: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
    contract_type: "Robe",
    cpv_code: "48820000",
    contracting_authority_id: null,
    contracting_authorities: { name: "Grad Sarajevo", jib: "420000000010" },
  },
  {
    id: "demo-plan-2",
    portal_id: "demo-plan-2",
    description: "Održavanje aplikativnih servisa i helpdesk podrška",
    estimated_value: 68000,
    planned_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
    contract_type: "Usluge",
    cpv_code: "72253000",
    contracting_authority_id: null,
    contracting_authorities: { name: "JU Dom zdravlja Zenica", jib: "420000000011" },
  },
];

export const demoRecentProcurements = [
  {
    id: "demo-plan-3",
    portal_id: "demo-plan-3",
    description: "Nabavka licenci za sigurnosni softver",
    estimated_value: 54000,
    planned_date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
    contract_type: "Robe",
    cpv_code: "48730000",
    contracting_authority_id: null,
    contracting_authorities: { name: "Općina Travnik", jib: "420000000012" },
  },
];

export const demoCompetitors = [
  {
    name: "TechVision d.o.o.",
    jib: "420000000002",
    wins: 7,
    total_value: 310000,
    categories: ["Robe", "Usluge"],
    last_win_date: new Date(Date.now() - 11 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
    win_rate: 58,
  },
  {
    name: "Infodom d.o.o.",
    jib: "420000000003",
    wins: 5,
    total_value: 198000,
    categories: ["Usluge", "Softver"],
    last_win_date: new Date(Date.now() - 22 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
    win_rate: 47,
  },
  {
    name: "NetSys d.o.o.",
    jib: "420000000004",
    wins: 4,
    total_value: 122000,
    categories: ["Robe"],
    last_win_date: new Date(Date.now() - 35 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
    win_rate: 42,
  },
];
