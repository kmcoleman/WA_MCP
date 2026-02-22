"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Sparkles, Send, Copy, Check } from "lucide-react";
import type { RideFormData } from "@/lib/types";

interface DescriptionEditorProps {
  formData: RideFormData;
  descriptionHtml: string;
  onDescriptionChange: (html: string) => void;
}

export function DescriptionEditor({
  formData,
  descriptionHtml,
  onDescriptionChange,
}: DescriptionEditorProps) {
  const [loading, setLoading] = useState(false);
  const [refinement, setRefinement] = useState("");
  const [copied, setCopied] = useState(false);
  const streamBuffer = useRef("");

  async function streamAI(refinementInstruction?: string) {
    setLoading(true);
    streamBuffer.current = "";

    try {
      const response = await fetch("/api/ai/generate-description", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          formData,
          refinementInstruction: refinementInstruction || undefined,
          currentHtml: refinementInstruction ? descriptionHtml : undefined,
        }),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || "AI generation failed");
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) throw new Error("No response stream");

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split("\n");

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const data = line.slice(6);
            if (data === "[DONE]") break;
            try {
              const parsed = JSON.parse(data);
              if (parsed.text) {
                streamBuffer.current += parsed.text;
                onDescriptionChange(streamBuffer.current);
              }
            } catch {
              // skip parse errors on partial chunks
            }
          }
        }
      }
    } catch (err) {
      console.error("AI error:", err);
    } finally {
      setLoading(false);
    }
  }

  function handleGenerate() {
    streamAI();
  }

  function handleRefine() {
    if (!refinement.trim()) return;
    streamAI(refinement.trim());
    setRefinement("");
  }

  function handleCopyHtml() {
    navigator.clipboard.writeText(descriptionHtml);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          Event Description
          <div className="flex gap-2">
            {descriptionHtml && (
              <Button variant="outline" size="sm" onClick={handleCopyHtml}>
                {copied ? (
                  <Check className="mr-1 h-4 w-4" />
                ) : (
                  <Copy className="mr-1 h-4 w-4" />
                )}
                {copied ? "Copied!" : "Copy HTML"}
              </Button>
            )}
            <Button onClick={handleGenerate} disabled={loading}>
              {loading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="mr-2 h-4 w-4" />
              )}
              {descriptionHtml ? "Regenerate" : "Generate Description"}
            </Button>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {descriptionHtml ? (
          <>
            <Tabs defaultValue="preview">
              <TabsList>
                <TabsTrigger value="preview">Preview</TabsTrigger>
                <TabsTrigger value="html">HTML Source</TabsTrigger>
              </TabsList>
              <TabsContent value="preview">
                <div
                  className="prose max-w-none rounded-md border bg-white p-4"
                  dangerouslySetInnerHTML={{ __html: descriptionHtml }}
                />
              </TabsContent>
              <TabsContent value="html">
                <pre className="max-h-96 overflow-auto rounded-md border bg-gray-900 p-4 text-sm text-green-400">
                  {descriptionHtml}
                </pre>
              </TabsContent>
            </Tabs>

            <div className="flex gap-2">
              <Input
                placeholder="Refine: e.g. 'make the intro more exciting' or 'add a note about rain gear'"
                value={refinement}
                onChange={(e) => setRefinement(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleRefine()}
                disabled={loading}
              />
              <Button
                onClick={handleRefine}
                disabled={loading || !refinement.trim()}
                size="icon"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </>
        ) : (
          <p className="text-sm text-gray-500">
            Fill in the ride details above, then click &quot;Generate
            Description&quot; to create the event HTML.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
