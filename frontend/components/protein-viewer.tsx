"use client";

import { useEffect, useRef, useState } from "react";

interface ProteinViewerProps {
  jobId: string | null;
  iteration: number;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function get3Dmol(): any {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (window as any).$3Dmol;
}

function load3DmolScript(): Promise<void> {
  if (get3Dmol()) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://3Dmol.org/build/3Dmol-min.js";
    script.onload = () => resolve();
    script.onerror = reject;
    document.head.appendChild(script);
  });
}

export function ProteinViewer({ jobId, iteration }: ProteinViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const viewerRef = useRef<any>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    load3DmolScript().then(() => setReady(true));
  }, []);

  useEffect(() => {
    if (!ready || !jobId || !containerRef.current) return;

    const mol = get3Dmol();
    if (!mol) return;

    const url = `http://localhost:8000/jobs/${jobId}/artifacts/v${iteration}/design_0.pdb`;

    fetch(url)
      .then((res) => {
        if (!res.ok) throw new Error("PDB not found");
        return res.text();
      })
      .then((pdbData) => {
        if (!containerRef.current) return;

        if (viewerRef.current) {
          viewerRef.current.removeAllModels();
        } else {
          viewerRef.current = mol.createViewer(containerRef.current, {
            backgroundColor: "white",
          });
        }

        viewerRef.current.addModel(pdbData, "pdb");
        viewerRef.current.setStyle({}, { cartoon: { color: "spectrum" } });
        viewerRef.current.zoomTo();
        viewerRef.current.render();
      })
      .catch(() => {});
  }, [ready, jobId, iteration]);

  if (!jobId) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 bg-gradient-to-br from-blue-50/30 to-indigo-50/30">
        <div className="text-4xl opacity-20">🧬</div>
        <p className="text-sm text-slate-400">
          No protein loaded. Start a design to visualize.
        </p>
      </div>
    );
  }

  return <div ref={containerRef} className="flex-1 min-h-0 relative" />;
}
