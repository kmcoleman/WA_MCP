"use client";

import { useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { RideFormData } from "@/lib/types";
import type { AssetUrls } from "@/lib/assets";

interface AssetsFormProps {
  formData: RideFormData;
  assetUrls: AssetUrls | null;
  onChange: (updates: Partial<RideFormData>) => void;
}

const ASSET_FIELDS = [
  {
    key: "featuredImage" as const,
    label: "Featured Image Filename",
    placeholder: "e.g. plaskett.jpg",
    formKey: "featuredImageFilename" as const,
    accept: "image/*",
  },
  {
    key: "gpxRoute" as const,
    label: "GPX Route+Track Filename",
    placeholder: "e.g. Feb 2026 HMB to Plaskett Creek.GPX",
    formKey: "gpxRouteFilename" as const,
    accept: ".gpx",
  },
  {
    key: "gpxTrack" as const,
    label: "GPX Track-Only Filename",
    placeholder: "e.g. Pilot Light to Plaskett Creek Track.GPX",
    formKey: "gpxTrackFilename" as const,
    accept: ".gpx",
  },
  {
    key: "pdfRouteSheet" as const,
    label: "PDF Route Sheet Filename",
    placeholder: "e.g. Feb 2026 Route Sheet.pdf",
    formKey: "pdfRouteSheetFilename" as const,
    accept: ".pdf",
  },
] as const;

type AssetKey = (typeof ASSET_FIELDS)[number]["key"];

export function AssetsForm({ formData, assetUrls, onChange }: AssetsFormProps) {
  const fileInputRefs = useRef<Record<AssetKey, HTMLInputElement | null>>({
    featuredImage: null,
    gpxRoute: null,
    gpxTrack: null,
    pdfRouteSheet: null,
  });
  const [selectedFiles, setSelectedFiles] = useState<
    Partial<Record<AssetKey, File>>
  >({});
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  const pendingCount = Object.keys(selectedFiles).length;

  async function handleUpload() {
    if (!assetUrls || pendingCount === 0) return;

    setUploading(true);
    setUploadResult(null);

    try {
      const form = new FormData();
      form.append("targetDir", assetUrls.assetDir);

      for (const field of ASSET_FIELDS) {
        const file = selectedFiles[field.key];
        if (!file) continue;
        form.append(field.key, file);
        const desiredName = formData[field.formKey];
        if (desiredName && desiredName !== file.name) {
          form.append(`${field.key}:rename`, desiredName);
        }
      }

      const res = await fetch("/api/assets/upload", {
        method: "POST",
        body: form,
      });

      const data = await res.json();

      if (!res.ok) {
        setUploadResult({ type: "error", message: data.error });
        return;
      }

      setUploadResult({
        type: "success",
        message: `Uploaded ${data.uploaded.length} file(s): ${data.uploaded.join(", ")}`,
      });
      setSelectedFiles({});
    } catch (err) {
      setUploadResult({
        type: "error",
        message: err instanceof Error ? err.message : "Upload failed",
      });
    } finally {
      setUploading(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Assets</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          {ASSET_FIELDS.map((field) => (
            <div key={field.key}>
              <Label htmlFor={field.key}>{field.label}</Label>
              <div className="flex gap-2">
                <Input
                  id={field.key}
                  placeholder={field.placeholder}
                  value={formData[field.formKey]}
                  onChange={(e) =>
                    onChange({ [field.formKey]: e.target.value })
                  }
                  className="flex-1"
                />
                <input
                  type="file"
                  accept={field.accept}
                  ref={(el) => {
                    fileInputRefs.current[field.key] = el;
                  }}
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    setSelectedFiles((prev) => ({
                      ...prev,
                      [field.key]: file,
                    }));
                    let filename = file.name;
                    if (formData.name) {
                      const name = formData.name;
                      const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
                      if (field.key === "featuredImage") {
                        filename = `${name}.${ext || "png"}`;
                      } else if (field.key === "gpxRoute") {
                        filename = `${name}.gpx`;
                      } else if (field.key === "gpxTrack") {
                        filename = `${name}-Track.gpx`;
                      } else if (field.key === "pdfRouteSheet") {
                        filename = `${name} Route Sheet.pdf`;
                      }
                    }
                    onChange({ [field.formKey]: filename });
                    setUploadResult(null);
                  }}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    fileInputRefs.current[field.key]?.click()
                  }
                >
                  Browse
                </Button>
              </div>
              {selectedFiles[field.key] && (
                <p className="mt-1 text-xs text-blue-600">
                  Ready to upload: {selectedFiles[field.key]!.name}
                </p>
              )}
            </div>
          ))}
        </div>

        {assetUrls && (
          <div className="rounded-md bg-gray-50 p-3 text-sm">
            <p className="mb-1 font-medium text-gray-700">Derived URLs:</p>
            <p className="text-gray-500">
              Dir: {decodeURIComponent(assetUrls.assetDir)}
            </p>
            {assetUrls.featuredImage && (
              <p className="truncate text-gray-500">
                Image: {decodeURIComponent(assetUrls.featuredImage)}
              </p>
            )}
            {assetUrls.gpxRoute && (
              <p className="truncate text-gray-500">
                GPX Route: {decodeURIComponent(assetUrls.gpxRoute)}
              </p>
            )}
            {assetUrls.gpxTrack && (
              <p className="truncate text-gray-500">
                GPX Track: {decodeURIComponent(assetUrls.gpxTrack)}
              </p>
            )}
            {assetUrls.pdfRouteSheet && (
              <p className="truncate text-gray-500">
                PDF: {decodeURIComponent(assetUrls.pdfRouteSheet)}
              </p>
            )}
          </div>
        )}

        <div className="flex items-center gap-3">
          <Button
            type="button"
            onClick={handleUpload}
            disabled={uploading || pendingCount === 0 || !assetUrls}
          >
            {uploading ? "Uploading..." : `Upload Files (${pendingCount})`}
          </Button>
          {!assetUrls && pendingCount > 0 && (
            <p className="text-sm text-amber-600">
              Set event date and name to enable upload
            </p>
          )}
        </div>

        {uploadResult && (
          <p
            className={`text-sm ${
              uploadResult.type === "success"
                ? "text-green-600"
                : "text-red-600"
            }`}
          >
            {uploadResult.message}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
