import { streamText, convertToModelMessages, UIMessage, tool } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import { z } from "zod";

const openrouter = createOpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: process.env.OPENROUTER_API_KEY,
});

const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:8000";
const MODEL = process.env.CHAT_MODEL || "anthropic/claude-sonnet-4";

export async function POST(request: Request) {
  const { messages }: { messages: UIMessage[] } = await request.json();

  const result = streamText({
    model: openrouter(MODEL),
    system: `You are a protein design assistant. Help users design proteins using RFdiffusion.
When the user wants to generate a protein, use the generate_protein tool.
Explain protein design concepts clearly. Be concise.`,
    messages: await convertToModelMessages(messages),
    tools: {
      generate_protein: tool({
        description:
          "Generate a protein design using RFdiffusion. Use this when the user wants to create, design, or generate a protein structure.",
        inputSchema: z.object({
          prompt: z
            .string()
            .describe("The protein design request in natural language"),
          chat_id: z.string().optional().describe("Chat ID for grouping"),
          max_iterations: z
            .number()
            .optional()
            .describe("Max design iterations (1 for single shot, default 3)"),
        }),
        execute: async ({ prompt, chat_id, max_iterations }) => {
          const response = await fetch(`${BACKEND_URL}/generate`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              prompt,
              chat_id: chat_id || "default",
              max_iterations: max_iterations ?? 3,
            }),
          });
          const job = await response.json();
          return {
            job_id: job.job_id,
            status: job.status,
            message: `Design job queued (${job.job_id}). The agent is now working on: "${prompt}"`,
          };
        },
      }),
    },
  });

  return result.toUIMessageStreamResponse();
}
