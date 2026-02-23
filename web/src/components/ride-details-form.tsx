"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import type { RideFormData } from "@/lib/types";

interface RideDetailsFormProps {
  formData: RideFormData;
  onChange: (updates: Partial<RideFormData>) => void;
}

async function parseGoogleMapsUrl(
  url: string
): Promise<{ name: string; address: string } | null> {
  try {
    const res = await fetch("/api/maps/parse", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (data.name || data.address) return data;
    return null;
  } catch {
    return null;
  }
}

async function parseReverUrl(
  url: string
): Promise<{
  distance: string;
  duration: string;
  elevation: string;
  waypoints: string[];
} | null> {
  try {
    const res = await fetch("/api/rever/parse", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url }),
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export function RideDetailsForm({ formData, onChange }: RideDetailsFormProps) {
  const [parsingMaps, setParsingMaps] = useState(false);
  const [parsingRever, setParsingRever] = useState(false);

  async function handleMapsUrlChange(url: string) {
    onChange({ breakfastMapsUrl: url });

    if (!url || (!url.includes("google.com/maps") && !url.includes("goo.gl") && !url.includes("maps.app"))) {
      return;
    }

    setParsingMaps(true);
    try {
      const result = await parseGoogleMapsUrl(url);
      if (result) {
        const updates: Partial<RideFormData> = {};
        if (result.name && !formData.breakfastName) {
          updates.breakfastName = result.name;
        }
        if (result.address && !formData.breakfastAddress) {
          updates.breakfastAddress = result.address;
        }
        if (Object.keys(updates).length > 0) {
          onChange(updates);
        }
      }
    } finally {
      setParsingMaps(false);
    }
  }

  async function handleReverUrlChange(url: string) {
    onChange({ reverUrl: url });

    if (!url || (!url.includes("rever.co") && !url.includes("rfrn.co"))) {
      return;
    }

    setParsingRever(true);
    try {
      const result = await parseReverUrl(url);
      if (result) {
        const updates: Partial<RideFormData> = {};
        if (result.distance && !formData.totalDistance) {
          updates.totalDistance = result.distance;
        }
        if (result.duration && !formData.estimatedDuration) {
          updates.estimatedDuration = result.duration;
        }
        if (result.elevation && !formData.elevation) {
          updates.elevation = result.elevation;
        }
        if (result.waypoints?.length && !formData.routeWaypoints) {
          updates.routeWaypoints = result.waypoints.join(" → ");
        }
        if (Object.keys(updates).length > 0) {
          onChange(updates);
        }
      }
    } finally {
      setParsingRever(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Ride Details</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label htmlFor="breakfastMapsUrl">Breakfast Google Maps URL</Label>
          <div className="relative">
            <Input
              id="breakfastMapsUrl"
              type="url"
              placeholder="https://www.google.com/maps/place/..."
              value={formData.breakfastMapsUrl}
              onChange={(e) => onChange({ breakfastMapsUrl: e.target.value })}
              onPaste={(e) => {
                const pasted = e.clipboardData.getData("text");
                if (pasted) {
                  setTimeout(() => handleMapsUrlChange(pasted), 0);
                }
              }}
              onBlur={(e) => {
                if (e.target.value && (!formData.breakfastName || !formData.breakfastAddress)) {
                  handleMapsUrlChange(e.target.value);
                }
              }}
            />
            {parsingMaps && (
              <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
            )}
          </div>
          {parsingMaps && (
            <p className="text-xs text-muted-foreground mt-1">
              Fetching location details...
            </p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="breakfastName">Breakfast Location Name</Label>
            <Input
              id="breakfastName"
              placeholder="e.g. Huckleberry's"
              value={formData.breakfastName}
              onChange={(e) => onChange({ breakfastName: e.target.value })}
            />
          </div>
          <div>
            <Label htmlFor="breakfastAddress">Breakfast Address</Label>
            <Input
              id="breakfastAddress"
              placeholder="e.g. 2071 Camden Ave, San Jose, CA 95124"
              value={formData.breakfastAddress}
              onChange={(e) => onChange({ breakfastAddress: e.target.value })}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="breakfastTime">Breakfast Time</Label>
            <Input
              id="breakfastTime"
              placeholder="8:00 AM"
              value={formData.breakfastTime}
              onChange={(e) => onChange({ breakfastTime: e.target.value })}
            />
          </div>
          <div>
            <Label htmlFor="kickstandsTime">Kickstands Up Time</Label>
            <Input
              id="kickstandsTime"
              placeholder="9:00 AM"
              value={formData.kickstandsTime}
              onChange={(e) => onChange({ kickstandsTime: e.target.value })}
            />
          </div>
        </div>

        <div>
          <Label htmlFor="reverUrl">Rever Route URL</Label>
          <div className="relative">
            <Input
              id="reverUrl"
              type="url"
              placeholder="https://go.rever.co/..."
              value={formData.reverUrl}
              onChange={(e) => onChange({ reverUrl: e.target.value })}
              onPaste={(e) => {
                const pasted = e.clipboardData.getData("text");
                if (pasted) {
                  setTimeout(() => handleReverUrlChange(pasted), 0);
                }
              }}
              onBlur={(e) => {
                if (
                  e.target.value &&
                  (!formData.totalDistance || !formData.estimatedDuration || !formData.elevation || !formData.routeWaypoints)
                ) {
                  handleReverUrlChange(e.target.value);
                }
              }}
            />
            {parsingRever && (
              <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
            )}
          </div>
          {parsingRever && (
            <p className="text-xs text-muted-foreground mt-1">
              Fetching route details...
            </p>
          )}
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div>
            <Label htmlFor="totalDistance">Total Distance</Label>
            <Input
              id="totalDistance"
              placeholder="~185 miles"
              value={formData.totalDistance}
              onChange={(e) => onChange({ totalDistance: e.target.value })}
            />
          </div>
          <div>
            <Label htmlFor="estimatedDuration">Estimated Duration</Label>
            <Input
              id="estimatedDuration"
              placeholder="6 hours with breaks"
              value={formData.estimatedDuration}
              onChange={(e) => onChange({ estimatedDuration: e.target.value })}
            />
          </div>
          <div>
            <Label htmlFor="elevation">Elevation Gain</Label>
            <Input
              id="elevation"
              placeholder="13,283 ft"
              value={formData.elevation}
              onChange={(e) => onChange({ elevation: e.target.value })}
            />
          </div>
        </div>

        <div>
          <Label htmlFor="routeWaypoints">Route Waypoints</Label>
          <Input
            id="routeWaypoints"
            placeholder="Sacramento → Garden Highway → Nicolaus → Auburn"
            value={formData.routeWaypoints}
            onChange={(e) => onChange({ routeWaypoints: e.target.value })}
          />
        </div>

        <div>
          <Label htmlFor="rideHighlights">Ride Highlights</Label>
          <Textarea
            id="rideHighlights"
            rows={5}
            placeholder="Key points about the ride — interesting roads, stops, scenery, lunch spots. The AI will expand on these."
            value={formData.rideHighlights}
            onChange={(e) => onChange({ rideHighlights: e.target.value })}
          />
        </div>
      </CardContent>
    </Card>
  );
}
