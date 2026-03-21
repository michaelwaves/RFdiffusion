"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

interface ChatEntry {
  chat_id: string;
  preview: string;
}

interface JobEntry {
  job_id: string;
  prompt: string;
  status: string;
  current_iteration: number;
}

export function ChatList() {
  const router = useRouter();
  const [entries, setEntries] = useState<{ id: string; preview: string; badge?: string }[]>([]);

  useEffect(() => {
    Promise.all([
      fetch("http://localhost:8000/chats").then((r) => r.ok ? r.json() : []).catch(() => []),
      fetch("http://localhost:8000/jobs").then((r) => r.ok ? r.json() : []).catch(() => []),
    ]).then(([chats, jobs]: [ChatEntry[], JobEntry[]]) => {
      const seen = new Set<string>();
      const result: { id: string; preview: string; badge?: string }[] = [];

      for (const chat of chats) {
        seen.add(chat.chat_id);
        result.push({ id: chat.chat_id, preview: chat.preview || "Chat session" });
      }
      for (const job of jobs) {
        if (seen.has(job.job_id)) continue;
        result.push({ id: job.job_id, preview: job.prompt, badge: job.status });
      }
      setEntries(result);
    });
  }, []);

  if (entries.length === 0) {
    return (
      <p className="text-sm text-slate-400 py-4 text-center">
        No sessions yet. Start your first design above.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {entries.map((entry) => (
        <button
          key={entry.id}
          onClick={() => router.push(`/dashboard/chat/${entry.id}`)}
          className="w-full rounded-xl border border-slate-200 bg-white p-4 text-left transition-all hover:border-blue-300 hover:shadow-sm"
        >
          <p className="text-sm font-medium text-slate-700 truncate">
            {entry.preview}
          </p>
          <p className="text-xs text-slate-400 mt-1">{entry.id}</p>
        </button>
      ))}
    </div>
  );
}
