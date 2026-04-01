import React from "react";

interface Props {
  content: string;
  className?: string;
}

/**
 * Renders AI-generated markdown content with proper typography.
 * Handles: ## headings, - bullets, **bold**, paragraphs.
 * No external dependencies.
 */
export function ArticleContent({ content, className = "" }: Props) {
  // Normalise: split into atomic blocks, handling both single and double newlines after headings
  const rawBlocks = content.split(/\n{2,}/);

  // Expand blocks: if a block starts with ## or ### and has body lines, split them apart
  const blocks: string[] = [];
  for (const block of rawBlocks) {
    const trimmed = block.trim();
    if (!trimmed) continue;
    const lines = trimmed.split("\n");
    if (
      (lines[0].startsWith("## ") || lines[0].startsWith("### ")) &&
      lines.length > 1
    ) {
      blocks.push(lines[0].trim());
      const rest = lines.slice(1).join("\n").trim();
      if (rest) blocks.push(rest);
    } else {
      blocks.push(trimmed);
    }
  }

  return (
    <div className={`space-y-3 text-sm leading-7 text-slate-700 ${className}`}>
      {blocks.map((block, i) => {
        const trimmed = block.trim();
        if (!trimmed) return null;

        // ## Heading
        if (trimmed.startsWith("## ")) {
          return (
            <h3 key={i} className="font-heading text-base font-bold text-slate-900 mt-6 mb-0 first:mt-0">
              {trimmed.slice(3)}
            </h3>
          );
        }

        // ### Subheading
        if (trimmed.startsWith("### ")) {
          return (
            <h4 key={i} className="font-semibold text-slate-800 mt-4 mb-0">
              {trimmed.slice(4)}
            </h4>
          );
        }

        // Bullet list block (all lines start with - or •)
        const lines = trimmed.split("\n");
        const isBulletBlock = lines.every((l) => l.trim().startsWith("- ") || l.trim().startsWith("• ") || !l.trim());
        if (isBulletBlock && lines.some((l) => l.trim().startsWith("- ") || l.trim().startsWith("• "))) {
          return (
            <ul key={i} className="space-y-1.5 pl-4">
              {lines
                .filter((l) => l.trim().startsWith("- ") || l.trim().startsWith("• "))
                .map((l, j) => (
                  <li key={j} className="flex items-start gap-2">
                    <span className="mt-2.5 size-1.5 shrink-0 rounded-full bg-blue-400" />
                    <span>{renderInline(l.replace(/^[-•]\s+/, ""))}</span>
                  </li>
                ))}
            </ul>
          );
        }

        // Mixed block (some bullet lines, some regular)
        if (lines.length > 1) {
          return (
            <div key={i} className="space-y-1">
              {lines.map((line, j) => {
                const t = line.trim();
                if (!t) return null;
                if (t.startsWith("- ") || t.startsWith("• ")) {
                  return (
                    <div key={j} className="flex items-start gap-2">
                      <span className="mt-2.5 size-1.5 shrink-0 rounded-full bg-blue-400" />
                      <span>{renderInline(t.replace(/^[-•]\s+/, ""))}</span>
                    </div>
                  );
                }
                return <p key={j}>{renderInline(t)}</p>;
              })}
            </div>
          );
        }

        // Paragraph that starts with **Bold heading** followed by space + body text
        // e.g. "**O ovom pozivu** Tekst tekst..." → render as heading + paragraph
        const inlineBoldHeading = /^\*\*([^*]+)\*\*\s+([\s\S]+)$/.exec(trimmed);
        if (inlineBoldHeading) {
          return (
            <React.Fragment key={i}>
              <h3 className="font-heading text-base font-bold text-slate-900 mt-6 mb-0 first:mt-0">
                {inlineBoldHeading[1]}
              </h3>
              <p>{renderInline(inlineBoldHeading[2])}</p>
            </React.Fragment>
          );
        }

        // Regular paragraph
        return <p key={i}>{renderInline(trimmed)}</p>;
      })}
    </div>
  );
}

/** Render inline markdown: **bold**, *italic*, `code` */
function renderInline(text: string): React.ReactNode {
  const parts: React.ReactNode[] = [];
  const re = /(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/g;
  let last = 0;
  let m: RegExpExecArray | null;

  while ((m = re.exec(text)) !== null) {
    if (m.index > last) parts.push(text.slice(last, m.index));
    const token = m[0];
    if (token.startsWith("**")) {
      parts.push(<strong key={m.index}>{token.slice(2, -2)}</strong>);
    } else if (token.startsWith("*")) {
      parts.push(<em key={m.index}>{token.slice(1, -1)}</em>);
    } else if (token.startsWith("`")) {
      parts.push(<code key={m.index} className="rounded bg-slate-100 px-1 text-xs font-mono">{token.slice(1, -1)}</code>);
    }
    last = m.index + token.length;
  }

  if (last < text.length) parts.push(text.slice(last));
  return parts.length === 1 && typeof parts[0] === "string" ? parts[0] : parts;
}
