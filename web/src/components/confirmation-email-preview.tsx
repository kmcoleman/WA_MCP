"use client";

import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Copy, Check } from "lucide-react";
import { generateConfirmationEmailHtml } from "@/lib/confirmation-email";
import type { AssetUrls } from "@/lib/assets";

interface ConfirmationEmailPreviewProps {
  assetUrls: AssetUrls | null;
  reverUrl: string;
}

export function ConfirmationEmailPreview({
  assetUrls,
  reverUrl,
}: ConfirmationEmailPreviewProps) {
  const [copied, setCopied] = useState(false);

  const emailHtml = useMemo(() => {
    if (!assetUrls) return null;
    return generateConfirmationEmailHtml(assetUrls, reverUrl);
  }, [assetUrls, reverUrl]);

  function handleCopy() {
    if (!emailHtml) return;
    navigator.clipboard.writeText(emailHtml);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (!emailHtml) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          Registration Confirmation Email
          <Button variant="outline" size="sm" onClick={handleCopy}>
            {copied ? (
              <Check className="mr-1 h-4 w-4" />
            ) : (
              <Copy className="mr-1 h-4 w-4" />
            )}
            {copied ? "Copied!" : "Copy HTML to Clipboard"}
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="preview">
          <TabsList>
            <TabsTrigger value="preview">Preview</TabsTrigger>
            <TabsTrigger value="html">HTML Source</TabsTrigger>
          </TabsList>
          <TabsContent value="preview">
            <div
              className="rounded-md border bg-white p-4"
              dangerouslySetInnerHTML={{ __html: emailHtml }}
            />
          </TabsContent>
          <TabsContent value="html">
            <pre className="max-h-96 overflow-auto rounded-md border bg-gray-900 p-4 text-sm text-green-400">
              {emailHtml}
            </pre>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
