import { NextResponse } from "next/server";
import { waGet } from "@/lib/wa-client";

interface WaEventSummary {
  Id: number;
  Name: string;
  StartDate: string;
  Location: string;
}

interface WaEventsResponse {
  Events: WaEventSummary[];
}

/**
 * Fetches upcoming events from Wild Apricot.
 * Returns events sorted by start date (soonest first).
 */
export async function GET() {
  try {
    // Fetch upcoming and recent events (last 30 days + future)
    const now = new Date();
    const pastCutoff = new Date(now);
    pastCutoff.setDate(pastCutoff.getDate() - 30);
    const dateFilter = pastCutoff.toISOString().split("T")[0];

    const data = await waGet<WaEventsResponse>(
      `/events?$filter=StartDate ge ${dateFilter}&$sort=StartDate asc`
    );

    const events = (data.Events || []).map((e) => ({
      Id: e.Id,
      Name: e.Name,
      StartDate: e.StartDate,
      Location: e.Location || "",
    }));

    return NextResponse.json(events);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to fetch events";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
