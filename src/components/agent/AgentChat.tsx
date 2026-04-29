"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Send, Sparkles, User, Bot, Brain } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  reasoning?: string;
  streaming?: boolean;
}

const STARTERS = [
  "Compare PM2.5 between Lagos and Accra",
  "Where were the worst pollution spikes last week?",
  "Summarise air quality in Nigeria over the last 30 days",
];

function fakeReply(prompt: string): { reasoning: string; content: string } {
  const reasoning =
    "Filtering current dataset → aggregating PM2.5 by city and day → ranking outliers → drafting summary.";
  const lower = prompt.toLowerCase();
  if (lower.includes("compare")) {
    return {
      reasoning,
      content:
        "**Lagos vs Accra — PM2.5 comparison**\n\nLagos averaged ~46 µg/m³ over the selected window, roughly 1.8× higher than Accra (~25 µg/m³). Lagos also had ~3× more readings classified as *Unhealthy* or worse, with peaks concentrated on weekday mornings — consistent with traffic-driven exposure.",
    };
  }
  if (lower.includes("spike") || lower.includes("worst")) {
    return {
      reasoning,
      content:
        "**Notable pollution spikes**\n\nThe largest spikes appeared in **Kano** and **Lagos**, with several readings above 120 µg/m³. These cluster around mid-week and likely correlate with industrial activity and harmattan dust transport.",
    };
  }
  return {
    reasoning,
    content:
      "**Air quality summary**\n\nAcross the selected period, average PM2.5 sits in the *Moderate* band, with Nigerian sites consistently higher than Ghanaian ones. Roughly 18% of readings fall into *Unhealthy* or worse categories, concentrated in dense urban centres.",
  };
}

interface Props {
  collapsed: boolean;
  onToggle: () => void;
}

let __idCounter = 0;
const nextId = () => {
  __idCounter += 1;
  return `m-${__idCounter}`;
};

export function AgentChat({ collapsed, onToggle }: Props) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "assistant",
      content:
        "Hi — I'm your air-quality analyst. Ask about trends, comparisons or pollution events. I'll use the current filters to scope my answers.",
    },
  ]);
  const [input, setInput] = useState("");
  const [showReasoning, setShowReasoning] = useState(true);
  const scrollerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollerRef.current?.scrollTo({ top: scrollerRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const send = (text: string) => {
    if (!text.trim()) return;
    const userMsg: Message = { id: nextId(), role: "user", content: text };
    const reply = fakeReply(text);
    const aiMsg: Message = {
      id: nextId(),
      role: "assistant",
      content: "",
      reasoning: reply.reasoning,
      streaming: true,
    };
    setMessages((m) => [...m, userMsg, aiMsg]);
    setInput("");

    // Simulate streaming
    const tokens = reply.content.split(/(\s+)/);
    let i = 0;
    const tick = () => {
      i += 2;
      setMessages((m) =>
        m.map((msg) =>
          msg.id === aiMsg.id
            ? { ...msg, content: tokens.slice(0, i).join(""), streaming: i < tokens.length }
            : msg
        )
      );
      if (i < tokens.length) setTimeout(tick, 35);
    };
    setTimeout(tick, 200);
  };

  return (
    <div
      className={cn(
        "sticky top-16 h-[calc(100vh-4rem)] shrink-0 border-r border-border bg-card transition-[width] duration-300",
        collapsed ? "w-[52px]" : "w-[380px]"
      )}
    >
      <div className="flex items-center justify-between border-b border-border px-3 py-3">
        {!collapsed && (
          <div className="flex items-center gap-2 text-sm font-semibold">
            <Sparkles className="h-4 w-4 text-primary" /> Agent
          </div>
        )}
        <button
          onClick={onToggle}
          className="ml-auto inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
          aria-label="Toggle chat"
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </button>
      </div>

      {!collapsed && (
        <div className="flex h-[calc(100%-3rem)] flex-col">
          <div ref={scrollerRef} className="flex-1 space-y-4 overflow-y-auto p-4">
            {messages.map((m) => (
              <div key={m.id} className={cn("flex gap-2.5", m.role === "user" ? "justify-end" : "justify-start")}>
                {m.role === "assistant" && (
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <Bot className="h-4 w-4" />
                  </div>
                )}
                <div className={cn("max-w-[80%] space-y-2")}>
                  {m.role === "assistant" && m.reasoning && showReasoning && (
                    <div className="rounded-lg border border-dashed border-border bg-muted/40 px-3 py-2 text-[11px] text-muted-foreground">
                      <div className="mb-1 flex items-center gap-1 font-medium"><Brain className="h-3 w-3" /> Thinking</div>
                      {m.reasoning}
                    </div>
                  )}
                  <div
                    className={cn(
                      "whitespace-pre-wrap rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed",
                      m.role === "user"
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-foreground"
                    )}
                  >
                    {m.content || (m.streaming ? "…" : "")}
                    {m.streaming && m.content && <span className="ml-0.5 inline-block h-3 w-1.5 animate-pulse bg-current align-middle" />}
                  </div>
                </div>
                {m.role === "user" && (
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
                    <User className="h-4 w-4" />
                  </div>
                )}
              </div>
            ))}

            {messages.length <= 1 && (
              <div className="space-y-2 pt-2">
                <p className="text-xs font-medium text-muted-foreground">Try asking</p>
                {STARTERS.map((s) => (
                  <button
                    key={s}
                    onClick={() => send(s)}
                    className="block w-full rounded-lg border border-border bg-card px-3 py-2 text-left text-xs text-foreground transition hover:border-primary/40 hover:bg-accent/30"
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="border-t border-border p-3">
            <div className="mb-2 flex items-center justify-between">
              <label className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                <input
                  type="checkbox"
                  checked={showReasoning}
                  onChange={(e) => setShowReasoning(e.target.checked)}
                  className="h-3 w-3 accent-[color:var(--primary)]"
                />
                Show reasoning
              </label>
            </div>
            <form
              onSubmit={(e) => { e.preventDefault(); send(input); }}
              className="flex gap-2"
            >
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask the agent…"
                className="text-sm"
              />
              <Button type="submit" size="icon" aria-label="Send">
                <Send className="h-4 w-4" />
              </Button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
