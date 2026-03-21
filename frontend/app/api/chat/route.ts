import { streamText, convertToModelMessages, UIMessage, tool, stepCountIs } from "ai";
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
    system: `You are ProteinForge, an expert protein design assistant powered by RFdiffusion.

IMPORTANT: Do NOT immediately call the generate_protein tool. First, have a brief conversation:
1. Acknowledge the user's request
2. Explain your design approach (what topology, symmetry, size you'd use and why)
3. Ask if they want to proceed or adjust anything
4. Only call generate_protein after the user confirms (e.g. "go ahead", "yes", "do it", "proceed", "looks good")

The user's message may include iteration preferences like "(2 iterations max)" — use that as the max_iterations parameter when calling the tool but do NOT repeat it back to the user.

When discussing designs, mention relevant concepts like:
- Secondary structure (alpha helices, beta sheets/barrels, loops)
- Symmetry (cyclic C2-C12, dihedral, tetrahedral)
- Size (number of residues)
- Special features (binder design, motif scaffolding, partial diffusion)

Be concise but knowledgeable. 2-3 sentences per response is ideal.
After calling the tool, briefly tell the user the job has been submitted and they can watch progress in the console.`,
    messages: await convertToModelMessages(messages),
    stopWhen: stepCountIs(3),
    tools: {
      generate_protein: tool({
        description:
          "Generate a protein design using RFdiffusion. Call this when the user confirms they want to proceed with the design.",
        inputSchema: z.object({
          prompt: z
            .string()
            .describe("Detailed protein design request for the RFdiffusion agent"),
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
