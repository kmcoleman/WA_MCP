"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";

interface EventLoaderProps {
  onEventLoaded: (event: Record<string, unknown>) => void;
}

export function EventLoader({ onEventLoaded }: EventLoaderProps) {
  const [eventId, setEventId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleLoad() {
    if (!eventId.trim()) return;
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/event/${eventId}`);
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || `Failed to load event ${eventId}`);
      }
      const event = await response.json();
      onEventLoaded(event);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load event");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Load Event</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-end gap-4">
          <div className="flex-1">
            <Label htmlFor="eventId">Event ID</Label>
            <Input
              id="eventId"
              type="number"
              placeholder="e.g. 6215541"
              value={eventId}
              onChange={(e) => setEventId(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleLoad()}
            />
          </div>
          <Button onClick={handleLoad} disabled={loading || !eventId.trim()}>
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Loading...
              </>
            ) : (
              "Load Event"
            )}
          </Button>
        </div>
        {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
      </CardContent>
    </Card>
  );
}
