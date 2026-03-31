import Link from "next/link";
import { cn } from "@/lib/utils";

interface PublicCtaProps {
  text: string;
  href: string;
  variant?: "primary" | "secondary";
  className?: string;
}

export function PublicCta({ text, href, variant = "primary", className }: PublicCtaProps) {
  return (
    <Link
      href={href}
      className={cn(
        "inline-flex h-11 items-center rounded-xl px-5 text-sm font-semibold transition-all",
        variant === "primary"
          ? "bg-slate-950 text-white hover:bg-blue-700"
          : "border border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50",
        className
      )}
    >
      {text}
    </Link>
  );
}
