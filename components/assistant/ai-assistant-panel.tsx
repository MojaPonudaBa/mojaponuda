"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { Bot, Loader2, Maximize2, MessageSquare, Send, Sparkles, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface AssistantMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
}

export interface AIAssistantPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  screenContext?: string;
  userContext?: Record<string, unknown>;
  initialMessages?: AssistantMessage[];
  className?: string;
}

const welcomeMessage: AssistantMessage = {
  id: "welcome",
  role: "assistant",
  content: "Tu sam da pomognem oko prioriteta, rizika i sljedeceg koraka.",
};

const suggestedPrompts = [
  "Koje tendere trebam prvo pregledati?",
  "Sažmi rizike na ovoj stranici.",
  "Šta je sljedeći najbolji korak?",
];

function createMessage(role: AssistantMessage["role"], content: string): AssistantMessage {
  return {
    id: `${role}-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    role,
    content,
  };
}

/**
 * Provides the dashboard AI assistant panel and sends messages to the persisted /api/assistant/chat flow.
 */
export function AIAssistantPanel({
  open,
  onOpenChange,
  screenContext,
  userContext,
  initialMessages,
  className,
}: AIAssistantPanelProps) {
  const pathname = usePathname();
  const [messages, setMessages] = useState<AssistantMessage[]>(initialMessages?.length ? initialMessages : [welcomeMessage]);
  const [conversationId, setConversationId] = useState<string>("");
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const resolvedScreenContext = screenContext ?? pathname ?? "dashboard";

  const canSend = input.trim().length > 0 && !isSending;

  const requestBody = useMemo(
    () => ({
      screenContext: resolvedScreenContext,
      userContext: userContext ?? {},
    }),
    [resolvedScreenContext, userContext],
  );

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, isSending]);

  const sendMessage = async () => {
    const message = input.trim();
    if (!message) return;

    const userMessage = createMessage("user", message);
    const assistantMessage = createMessage("assistant", "");
    setMessages((current) => [...current, userMessage, assistantMessage]);
    setInput("");
    setIsSending(true);

    try {
      const response = await fetch("/api/assistant/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...requestBody,
          conversationId,
          message,
        }),
      });

      if (!response.ok) {
        const errorBody = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(errorBody?.error ?? "AI asistent trenutno nije dostupan.");
      }

      const nextConversationId = response.headers.get("X-Conversation-Id");
      if (nextConversationId) setConversationId(nextConversationId);

      const contentType = response.headers.get("Content-Type") ?? "";
      if (contentType.includes("application/json")) {
        const json = (await response.json()) as { answer?: string; conversationId?: string };
        if (json.conversationId) setConversationId(json.conversationId);
        setMessages((current) =>
          current.map((item) =>
            item.id === assistantMessage.id
              ? { ...item, content: json.answer ?? "Nemam odgovor za ovu poruku." }
              : item,
          ),
        );
        return;
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error("Odgovor nije moguce procitati.");

      const decoder = new TextDecoder();
      let fullText = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        fullText += decoder.decode(value, { stream: true });
        setMessages((current) =>
          current.map((item) =>
            item.id === assistantMessage.id ? { ...item, content: fullText } : item,
          ),
        );
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "AI asistent trenutno nije dostupan.";
      setMessages((current) =>
        current.map((item) =>
          item.id === assistantMessage.id ? { ...item, content: errorMessage } : item,
        ),
      );
    } finally {
      setIsSending(false);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.aside
          initial={{ opacity: 0, x: 32 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 32 }}
          transition={{ duration: 0.18, ease: "easeOut" }}
          className={cn(
            "fixed bottom-4 right-4 z-50 flex h-[min(720px,calc(100vh-2rem))] w-[min(420px,calc(100vw-2rem))] flex-col overflow-hidden rounded-[var(--radius-modal)] border border-[var(--border-default)] bg-[var(--surface-1)] shadow-[var(--shadow-modal)]",
            className,
          )}
          aria-label="AI asistent"
        >
          <header className="flex items-center justify-between gap-3 bg-gradient-to-r from-purple-700 via-violet-600 to-fuchsia-600 px-4 py-3 text-white">
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex size-9 items-center justify-center rounded-full bg-white/15 text-white">
                <Sparkles className="size-4" aria-hidden="true" />
              </div>
              <div className="min-w-0">
                <h2 className="truncate text-sm font-semibold text-white">AI asistent</h2>
                <p className="truncate text-xs text-white/75">Kontekst: {resolvedScreenContext}</p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <Button type="button" variant="ghost" size="icon-sm" aria-label="Prosiri panel" className="text-white hover:bg-white/15 hover:text-white">
                <Maximize2 className="size-4" aria-hidden="true" />
              </Button>
              <Button type="button" variant="ghost" size="icon-sm" onClick={() => onOpenChange(false)} aria-label="Zatvori AI asistenta" className="text-white hover:bg-white/15 hover:text-white">
                <X className="size-4" aria-hidden="true" />
              </Button>
            </div>
          </header>

          <div ref={scrollRef} className="min-h-0 flex-1 space-y-3 overflow-y-auto bg-[var(--surface-2)] p-4">
            <div className="flex flex-wrap gap-2">
              {suggestedPrompts.map((prompt) => (
                <button
                  key={prompt}
                  type="button"
                  onClick={() => setInput(prompt)}
                  className="rounded-full border border-purple-100 bg-white px-3 py-1 text-xs font-semibold text-purple-700 transition-colors hover:bg-purple-50 focus-visible:outline-2 focus-visible:outline-primary"
                >
                  {prompt}
                </button>
              ))}
            </div>
            {messages.map((message) => (
              <div
                key={message.id}
                className={cn(
                  "flex gap-2",
                  message.role === "user" ? "justify-end" : "justify-start",
                )}
              >
                {message.role === "assistant" && (
                  <div className="mt-1 flex size-7 shrink-0 items-center justify-center rounded-full bg-[var(--accent-ai-soft)] text-[var(--accent-ai-strong)]">
                    <Bot className="size-3.5" aria-hidden="true" />
                  </div>
                )}
                <div
                  className={cn(
                    "max-w-[82%] rounded-[var(--radius-card)] px-3 py-2 text-sm leading-6",
                    message.role === "user"
                      ? "bg-[var(--primary)] text-white"
                      : "border border-[var(--border-default)] bg-[var(--surface-1)] text-[var(--text-primary)]",
                  )}
                >
                  {message.content || (
                    <span className="inline-flex items-center gap-2 text-[var(--text-secondary)]">
                      <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
                      Pisem odgovor...
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>

          <form
            className="border-t border-[var(--border-default)] bg-[var(--surface-1)] p-3"
            onSubmit={(event) => {
              event.preventDefault();
              void sendMessage();
            }}
          >
            <div className="flex items-end gap-2">
              <label className="sr-only" htmlFor="ai-assistant-input">
                Poruka za AI asistenta
              </label>
              <textarea
                id="ai-assistant-input"
                value={input}
                onChange={(event) => setInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault();
                    void sendMessage();
                  }
                }}
                placeholder="Pitaj o prioritetima, rizicima ili sljedecem koraku..."
                className="min-h-11 max-h-32 flex-1 resize-none rounded-[var(--radius-input)] border border-[var(--border-default)] bg-[var(--surface-1)] px-3 py-2 text-sm text-[var(--text-primary)] outline-none transition-colors placeholder:text-[var(--text-tertiary)] focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary-soft)]"
                rows={1}
              />
              <Button
                type="submit"
                size="icon-lg"
                disabled={!canSend}
                className="bg-[var(--accent-ai)] text-white hover:bg-[var(--accent-ai-strong)]"
                aria-label="Posalji poruku"
              >
                {isSending ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : <Send className="size-4" aria-hidden="true" />}
              </Button>
            </div>
            <p className="mt-2 flex items-center gap-1 text-xs text-[var(--text-tertiary)]">
              <MessageSquare className="size-3" aria-hidden="true" />
              Razgovori se cuvaju kroz postojeci assistant API.
            </p>
          </form>
        </motion.aside>
      )}
    </AnimatePresence>
  );
}

