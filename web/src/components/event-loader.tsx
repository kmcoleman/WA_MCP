"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";

interface EventSummary {
  Id: number;
  Name: string;
  StartDate: string;
  Location: string;
}

interface EventLoaderProps {
  onEventLoaded: (event: Record<string, unknown>) => void;
}

function formatDate(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return dateStr;
  }
}

export function EventLoader({ onEventLoaded }: EventLoaderProps) {
  const [events, setEvents] = useState<EventSummary[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(true);
  const [selectedEventId, setSelectedEventId] = useState("");
  const [manualId, setManualId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchEvents() {
      try {
        const res = await fetch("/api/events");
        if (!res.ok) throw new Error("Failed to load events");
        const data: EventSummary[] = await res.json();
        setEvents(data);
      } catch {
        // Silently fail — user can still enter ID manually
      } finally {
        setLoadingEvents(false);
      }
    }
    fetchEvents();
  }, []);

  async function loadEvent(id: string) {
    if (!id.trim()) return;
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/event/${id}`);
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || `Failed to load event ${id}`);
      }
      const event = await response.json();
      onEventLoaded(event);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load event");
    } finally {
      setLoading(false);
    }
  }

  function handleSelectChange(value: string) {
    setSelectedEventId(value);
    setManualId("");
    if (value) {
      loadEvent(value);
    }
  }

  function handleManualLoad() {
    if (manualId.trim()) {
      setSelectedEventId("");
      loadEvent(manualId.trim());
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Load Event</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label htmlFor="eventSelect">Select an Event</Label>
          {loadingEvents ? (
            <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading events from Wild Apricot...
            </div>
          ) : events.length > 0 ? (
            <select
              id="eventSelect"
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              value={selectedEventId}
              onChange={(e) => handleSelectChange(e.target.value)}
              disabled={loading}
            >
              <option value="">Choose an event...</option>
              {events.map((evt) => (
                <option key={evt.Id} value={String(evt.Id)}>
                  {formatDate(evt.StartDate)} — {evt.Name}
                  {evt.Location ? ` (${evt.Location})` : ""}
                </option>
              ))}
            </select>
          ) : (
            <p className="text-sm text-muted-foreground mt-1">
              No events found. Enter an ID manually below.
            </p>
          )}
        </div>

        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <div className="h-px flex-1 bg-border" />
          or enter ID manually
          <div className="h-px flex-1 bg-border" />
        </div>

        <div className="flex items-end gap-4">
          <div className="flex-1">
            <Label htmlFor="eventId">Event ID</Label>
            <Input
              id="eventId"
              type="number"
              placeholder="e.g. 6215541"
              value={manualId}
              onChange={(e) => setManualId(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleManualLoad()}
            />
          </div>
          <Button
            onClick={handleManualLoad}
            disabled={loading || !manualId.trim()}
          >
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
