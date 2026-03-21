"use client";

import { useEffect, useRef, useState } from "react";

interface AgentConsoleProps {
  jobId: string | null;
}

export function AgentConsole({ jobId }: AgentConsoleProps) {
  const [logs, setLogs] = useState<string[]>([]);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!jobId) return;
    setLogs(["Connecting to agent..."]);

    let active = true;

    async function poll() {
      while (active) {
        try {
          const res = await fetch(`http://localhost:8000/jobs/${jobId}/logs`);
          if (res.ok) {
            const data = await res.json();
            if (data.logs?.length > 0) {
              setLogs(data.logs);
            }
            const jobRes = await fetch(`http://localhost:8000/jobs/${jobId}`);
            const job = await jobRes.json();
            if (job.status === "completed") {
              setLogs((prev) => [...prev, "--- Job completed ---"]);
              break;
            }
            if (job.status === "failed") {
              setLogs((prev) => [...prev, `--- Job failed: ${job.error} ---`]);
              break;
            }
          }
        } catch { /* backend unreachable */ }
        await new Promise((r) => setTimeout(r, 2000));
      }
    }

    poll();
    return () => { active = false; };
  }, [jobId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs]);

  return (
    <div className="flex h-full flex-col bg-slate-950 overflow-hidden">
      <div className="shrink-0 border-b border-slate-800 px-3 py-2 flex items-center gap-2">
        <div className="h-2 w-2 rounded-full bg-blue-500 animate-pulse" />
        <span className="text-xs font-medium text-slate-400">
          Agent Console
        </span>
      </div>
      <div className="flex-1 overflow-y-auto p-3 min-h-0">
        <div className="space-y-0.5 font-mono text-xs break-all">
          {!jobId && (
            <p className="text-slate-500">Waiting for a design job...</p>
          )}
          {logs.map((line, i) => (
            <p key={i} className={logLineColor(line)}>
              {line}
            </p>
          ))}
          <div ref={bottomRef} />
        </div>
      </div>
    </div>
  );
}

function logLineColor(line: string): string {
  if (line.includes("Done") || line.includes("completed")) return "text-emerald-400";
  if (line.includes("failed") || line.includes("Error")) return "text-red-400";
  if (line.startsWith("🔧")) return "text-blue-400";
  if (line.startsWith("✅")) return "text-emerald-400";
  if (line.startsWith("❌")) return "text-red-400";
  return "text-slate-400";
}
