"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { RideFormData } from "@/lib/types";
import type { AssetUrls } from "@/lib/assets";

interface AssetsFormProps {
  formData: RideFormData;
  assetUrls: AssetUrls | null;
  onChange: (updates: Partial<RideFormData>) => void;
}

export function AssetsForm({ formData, assetUrls, onChange }: AssetsFormProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Assets</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="featuredImage">Featured Image Filename</Label>
            <Input
              id="featuredImage"
              placeholder="e.g. plaskett.jpg"
              value={formData.featuredImageFilename}
              onChange={(e) =>
                onChange({ featuredImageFilename: e.target.value })
              }
            />
          </div>
          <div>
            <Label htmlFor="gpxRoute">GPX Route+Track Filename</Label>
            <Input
              id="gpxRoute"
              placeholder="e.g. Feb 2026 HMB to Plaskett Creek.GPX"
              value={formData.gpxRouteFilename}
              onChange={(e) => onChange({ gpxRouteFilename: e.target.value })}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="gpxTrack">GPX Track-Only Filename</Label>
            <Input
              id="gpxTrack"
              placeholder="e.g. Pilot Light to Plaskett Creek Track.GPX"
              value={formData.gpxTrackFilename}
              onChange={(e) => onChange({ gpxTrackFilename: e.target.value })}
            />
          </div>
          <div>
            <Label htmlFor="pdfRoute">PDF Route Sheet Filename</Label>
            <Input
              id="pdfRoute"
              placeholder="e.g. Feb 2026 Route Sheet.pdf"
              value={formData.pdfRouteSheetFilename}
              onChange={(e) =>
                onChange({ pdfRouteSheetFilename: e.target.value })
              }
            />
          </div>
        </div>

        {assetUrls && (
          <div className="rounded-md bg-gray-50 p-3 text-sm">
            <p className="mb-1 font-medium text-gray-700">Derived URLs:</p>
            <p className="text-gray-500">Dir: {decodeURIComponent(assetUrls.assetDir)}</p>
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
      </CardContent>
    </Card>
  );
}
