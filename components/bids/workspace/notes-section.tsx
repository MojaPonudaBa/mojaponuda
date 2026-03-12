"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Save } from "lucide-react";

interface NotesSectionProps {
  bidId: string;
  initialNotes: string;
}

export function NotesSection({ bidId, initialNotes }: NotesSectionProps) {
  const [notes, setNotes] = useState(initialNotes);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const saveNotes = useCallback(
    async (value: string) => {
      setSaving(true);
      setSaved(false);
      try {
        await fetch(`/api/bids/${bidId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ notes: value }),
        });
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      } catch (err) {
        console.error("Notes save error:", err);
      } finally {
        setSaving(false);
      }
    },
    [bidId]
  );

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  function handleChange(value: string) {
    setNotes(value);
    setSaved(false);

    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      saveNotes(value);
    }, 1000);
  }

  return (
    <div className="rounded-md border border-border bg-card p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Interne bilješke
        </h3>
        <div className="flex items-center gap-1.5 text-xs">
          {saving && (
            <span className="text-muted-foreground">Snima se...</span>
          )}
          {saved && (
            <span className="flex items-center gap-1 text-emerald-400">
              <Save className="size-3" />
              Sačuvano
            </span>
          )}
        </div>
      </div>
      <textarea
        value={notes}
        onChange={(e) => handleChange(e.target.value)}
        placeholder="Unesite interne bilješke o ovom tenderu..."
        rows={4}
        className="w-full resize-y rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
      />
    </div>
  );
}
