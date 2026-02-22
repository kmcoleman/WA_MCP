import { NextRequest } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { buildSystemPrompt, buildUserPrompt, buildAssetDir } from "@/lib/prompts";
import type { RideFormData } from "@/lib/types";

const anthropic = new Anthropic();

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { formData, refinementInstruction, currentHtml } = body as {
      formData: RideFormData;
      refinementInstruction?: string;
      currentHtml?: string;
    };

    const assetDir = buildAssetDir(formData.startDate, formData.name);
    const systemPrompt = buildSystemPrompt();

    let userPrompt: string;
    if (refinementInstruction && currentHtml) {
      userPrompt = `Here is the current HTML event description:\n\n${currentHtml}\n\nPlease make this change: ${refinementInstruction}\n\nReturn the complete updated HTML.`;
    } else {
      userPrompt = buildUserPrompt(formData, assetDir);
    }

    const stream = anthropic.messages.stream({
      model: "claude-sonnet-4-6",
      max_tokens: 4096,
      system: systemPrompt,
      messages: [{ role: "user", content: userPrompt }],
    });

    const encoder = new TextEncoder();
    const readable = new ReadableStream({
      async start(controller) {
        for await (const event of stream) {
          if (
            event.type === "content_block_delta" &&
            event.delta.type === "text_delta"
          ) {
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ text: event.delta.text })}\n\n`)
            );
          }
        }
        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
        controller.close();
      },
    });

    return new Response(readable, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "AI generation failed";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
