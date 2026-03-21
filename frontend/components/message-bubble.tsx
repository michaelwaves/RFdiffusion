"use client";

import type { UIMessage } from "ai";

function stripMetadata(text: string): string {
  return text.replace(/\n?\[iterations: \d+\]$/, "");
}

interface MessageBubbleProps {
  message: UIMessage;
}

export function MessageBubble({ message }: MessageBubbleProps) {
  const isUser = message.role === "user";

  if (isUser) {
    return (
      <div className="flex justify-end">
        <div className="max-w-[85%] rounded-3xl bg-slate-100 px-5 py-3 text-[15px] leading-relaxed text-slate-800">
          {message.parts?.map((part, i) =>
            part.type === "text"
              ? <span key={i}>{stripMetadata(part.text)}</span>
              : null
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {message.parts?.map((part, index) => {
        if (part.type === "text") {
          return (
            <p key={index} className="text-[15px] leading-[1.7] text-slate-700">
              {part.text}
            </p>
          );
        }
        if (part.type.startsWith("tool-") || part.type === "dynamic-tool") {
          const p = part as {
            type: string;
            state?: string;
            output?: { message?: string };
            toolName?: string;
          };
          const name = p.type === "dynamic-tool"
            ? p.toolName
            : p.type.replace("tool-", "");
          const isDone = p.state === "result";
          return (
            <div
              key={index}
              className="flex items-start gap-2 rounded-xl border border-slate-150 bg-slate-50 px-4 py-3"
            >
              <span className="mt-0.5 text-xs">
                {isDone ? "✓" : "⏳"}
              </span>
              <div className="min-w-0">
                <p className="text-[13px] font-medium text-slate-500">
                  {name}
                </p>
                {isDone && p.output?.message && (
                  <p className="mt-1 text-[13px] leading-relaxed text-slate-600">
                    {p.output.message}
                  </p>
                )}
              </div>
            </div>
          );
        }
        return null;
      })}
    </div>
  );
}
