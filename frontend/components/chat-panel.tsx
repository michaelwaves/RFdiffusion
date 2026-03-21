"use client";

import { useRef, useEffect, useCallback, useState } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { MessageBubble } from "@/components/message-bubble";

interface ChatPanelProps {
  chatId: string;
  onJobCreated: (jobId: string) => void;
  onJobCompleted: (iterations: number) => void;
}

export function ChatPanel({ chatId, onJobCreated, onJobCompleted }: ChatPanelProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const trackedJobsRef = useRef<Set<string>>(new Set());
  const [maxIterations, setMaxIterations] = useState(3);

  const { messages, sendMessage, status } = useChat({
    id: chatId,
    transport: new DefaultChatTransport({ api: "/api/chat" }),
  });

  const trackJobs = useCallback(() => {
    for (const message of messages) {
      for (const part of message.parts ?? []) {
        if (!part.type.startsWith("tool-") && part.type !== "dynamic-tool") continue;
        const p = part as { state?: string; output?: { job_id?: string } };
        if (p.state !== "result") continue;
        const jobId = p.output?.job_id;
        if (jobId && !trackedJobsRef.current.has(jobId)) {
          trackedJobsRef.current.add(jobId);
          onJobCreated(jobId);
          pollJobUntilComplete(jobId);
        }
      }
    }
  }, [messages, onJobCreated]);

  useEffect(() => { trackJobs(); }, [trackJobs]);

  async function pollJobUntilComplete(jobId: string) {
    for (let i = 0; i < 120; i++) {
      await new Promise((r) => setTimeout(r, 5000));
      try {
        const res = await fetch(`http://localhost:8000/jobs/${jobId}`);
        const job = await res.json();
        if (job.status === "completed" || job.status === "failed") {
          onJobCompleted(job.current_iteration || 3);
          break;
        }
      } catch { /* keep polling */ }
    }
  }

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  function handleSubmit() {
    const textarea = textareaRef.current;
    if (!textarea || !textarea.value.trim()) return;
    const iterNote = maxIterations === 1
      ? " (single shot, 1 iteration)"
      : ` (${maxIterations} iterations max)`;
    sendMessage({ text: textarea.value + iterNote });
    textarea.value = "";
    textarea.style.height = "auto";
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      handleSubmit();
    }
  }

  function handleInput() {
    const textarea = textareaRef.current;
    if (!textarea) return;
    textarea.style.height = "auto";
    textarea.style.height = Math.min(textarea.scrollHeight, 200) + "px";
  }

  const isStreaming = status === "streaming" || status === "submitted";

  return (
    <div className="flex flex-1 flex-col bg-white">
      <div className="px-6 py-4">
        <h1 className="text-lg font-semibold text-slate-800 tracking-tight">
          ProteinForge
        </h1>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-2xl px-6 py-4 space-y-6">
          {messages.length === 0 && (
            <p className="text-center text-[15px] text-slate-400 pt-40">
              Describe a protein you&apos;d like to design.
            </p>
          )}
          {messages.map((message) => (
            <MessageBubble key={message.id} message={message} />
          ))}
        </div>
      </div>

      <div className="px-6 pb-6 pt-2">
        <div className="mx-auto max-w-2xl">
          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm focus-within:border-blue-300 focus-within:shadow-md transition-all">
            <textarea
              ref={textareaRef}
              onKeyDown={handleKeyDown}
              onInput={handleInput}
              placeholder="Describe a protein..."
              disabled={isStreaming}
              rows={3}
              className="w-full resize-none bg-transparent px-4 pt-4 pb-2 text-[15px] text-slate-800 placeholder:text-slate-400 focus:outline-none disabled:opacity-50"
            />
            <div className="flex items-center justify-between px-3 pb-3">
              <div className="flex items-center gap-1">
                {[1, 2, 3, 5].map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setMaxIterations(n)}
                    className={`h-7 min-w-[28px] rounded-lg px-2 text-xs font-medium transition-colors ${
                      maxIterations === n
                        ? "bg-slate-800 text-white"
                        : "text-slate-400 hover:text-slate-600 hover:bg-slate-100"
                    }`}
                  >
                    {n === 1 ? "1x" : `${n}x`}
                  </button>
                ))}
                <span className="ml-1 text-[11px] text-slate-400">iterations</span>
              </div>
              <button
                onClick={handleSubmit}
                disabled={isStreaming}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-800 text-white transition-colors hover:bg-slate-700 disabled:opacity-40"
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M3 13L13 8L3 3V7L9 8L3 9V13Z" fill="currentColor"/>
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
