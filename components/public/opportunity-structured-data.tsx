interface OpportunityStructuredDataProps {
  opportunity: {
    title: string;
    issuer: string;
    description: string | null;
    deadline: string | null;
    value: number | null;
    source_url: string | null;
    created_at: string | null;
  };
}

export function OpportunityStructuredData({ opportunity: o }: OpportunityStructuredDataProps) {
  const schema = {
    "@context": "https://schema.org",
    "@type": "GovernmentService",
    "name": o.title,
    "provider": {
      "@type": "Organization",
      "name": o.issuer,
    },
    "description": o.description ?? o.title,
    "url": o.source_url ?? undefined,
    "datePosted": o.created_at ?? undefined,
    ...(o.deadline ? { "validThrough": o.deadline } : {}),
    ...(o.value ? { "offers": { "@type": "Offer", "price": o.value, "priceCurrency": "BAM" } } : {}),
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}
