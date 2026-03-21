"use client";

import { use, useEffect, useState } from "react";
import { ChatPanel } from "@/components/chat-panel";
import { ProteinViewer } from "@/components/protein-viewer";
import { IterationSlider } from "@/components/iteration-slider";
import { AgentConsole } from "@/components/agent-console";

export default function ChatPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [jobId, setJobId] = useState<string | null>(null);
  const [iteration, setIteration] = useState(0);
  const [maxIteration, setMaxIteration] = useState(0);

  useEffect(() => {
    fetch(`http://localhost:8000/jobs/${id}`)
      .then((res) => {
        if (!res.ok) return null;
        return res.json();
      })
      .then((job) => {
        if (!job) return;
        setJobId(job.job_id);
        const iters = job.current_iteration || 0;
        if (iters > 0) {
          setMaxIteration(iters - 1);
          setIteration(iters - 1);
        }
      })
      .catch(() => {});
  }, [id]);

  return (
    <div className="flex h-full w-full">
      <div className="flex w-1/2 flex-col border-r border-slate-150">
        <ChatPanel
          chatId={id}
          onJobCreated={(newJobId) => {
            setJobId(newJobId);
            setIteration(0);
            setMaxIteration(0);
          }}
          onJobCompleted={(iterations) => {
            setMaxIteration(iterations - 1);
            setIteration(iterations - 1);
          }}
        />
      </div>

      <div className="flex w-1/2 flex-col">
        <div className="flex flex-1 flex-col border-b border-border">
          <ProteinViewer jobId={jobId} iteration={iteration} />
          {maxIteration > 0 && (
            <IterationSlider
              value={iteration}
              max={maxIteration}
              onChange={setIteration}
            />
          )}
        </div>
        <div className="h-1/3">
          <AgentConsole jobId={jobId} />
        </div>
      </div>
    </div>
  );
}
