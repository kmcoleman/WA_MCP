import { NextRequest, NextResponse } from "next/server";

const REVER_GEOJSON_BASE = "https://a.rever.co/ui/v1/routes";
const GEOJSON_INCLUDES =
  "user,privacy,surface,user_bike,bike_type,route_photos,sharing_photos,categories,privacy_zones,comments,tags";

const METERS_PER_MILE = 1609.344;
const FEET_PER_METER = 3.28084;

/**
 * Parses a Rever route URL and extracts ride stats from the GeoJSON API.
 * Supports:
 *  - Direct URLs: a.rever.co/rides/123, a.rever.co/embed/rides/123
 *  - Short URLs: go.rever.co/xxx (fetches HTML to find ride ID)
 */
export async function POST(request: NextRequest) {
  try {
    const { url } = await request.json();
    if (!url || typeof url !== "string") {
      return NextResponse.json(
        { error: "Missing url parameter" },
        { status: 400 }
      );
    }

    const rideId = await extractRideId(url);
    if (!rideId) {
      return NextResponse.json(
        { error: "Could not extract ride ID from URL" },
        { status: 400 }
      );
    }

    const geojsonUrl = `${REVER_GEOJSON_BASE}/${rideId}/include/${GEOJSON_INCLUDES}.geojson`;
    const res = await fetch(geojsonUrl, {
      headers: { "User-Agent": "RidePlannerApp/1.0" },
    });

    if (!res.ok) {
      return NextResponse.json(
        { error: `Rever API returned ${res.status}` },
        { status: 502 }
      );
    }

    const geojson = await res.json();
    const result = parseGeoJson(geojson);

    return NextResponse.json(result);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to parse Rever URL";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

async function extractRideId(url: string): Promise<string | null> {
  // Direct URL patterns: a.rever.co/rides/123 or a.rever.co/embed/rides/123
  const directMatch = url.match(/rever\.co\/(?:embed\/)?rides\/(\d+)/);
  if (directMatch) {
    return directMatch[1];
  }

  // Short URL: go.rever.co/xxx — fetch and scan for ride ID
  if (url.includes("go.rever.co") || url.includes("rfrn.co")) {
    try {
      const res = await fetch(url, {
        headers: { "User-Agent": "RidePlannerApp/1.0" },
        redirect: "follow",
      });
      const text = await res.text();
      // Look for ride ID in the resolved URL or page content
      const redirectMatch = res.url.match(/rever\.co\/(?:embed\/)?rides\/(\d+)/);
      if (redirectMatch) return redirectMatch[1];

      const htmlMatch = text.match(/rever\.co\/rides\/(\d+)/);
      if (htmlMatch) return htmlMatch[1];
    } catch {
      // Fall through
    }
  }

  return null;
}

interface GeoJsonFeature {
  type: string;
  geometry: {
    type: string;
    coordinates: number[] | number[][] | number[][][];
  };
  properties: Record<string, unknown>;
}

interface ParsedRoute {
  distance: string;
  duration: string;
  elevation: string;
  waypoints: string[];
}

function parseGeoJson(geojson: { features?: GeoJsonFeature[] }): ParsedRoute {
  const features = geojson.features || [];

  let distance = "";
  let duration = "";
  let elevation = "";
  const waypoints: string[] = [];

  for (const feature of features) {
    const props = feature.properties || {};

    // Path feature has distance and duration
    if (props.distance !== undefined && props.duration !== undefined) {
      const meters = Number(props.distance);
      const seconds = Number(props.duration);

      if (!isNaN(meters) && meters > 0) {
        const miles = Math.round(meters / METERS_PER_MILE);
        distance = `~${miles} miles`;
      }

      if (!isNaN(seconds) && seconds > 0) {
        const hours = Math.floor(seconds / 3600);
        const mins = Math.round((seconds % 3600) / 60);
        duration = hours > 0 ? `${hours}h ${mins}min` : `${mins}min`;
      }
    }

    // Elevation feature — calculate total elevation gain from coordinates
    if (
      feature.geometry?.type === "LineString" &&
      props.type === "elevation"
    ) {
      const coords = feature.geometry.coordinates as number[][];
      let totalGain = 0;
      for (let i = 1; i < coords.length; i++) {
        const diff = coords[i][2] - coords[i - 1][2];
        if (diff > 0) totalGain += diff;
      }
      if (totalGain > 0) {
        const feet = Math.round(totalGain * FEET_PER_METER);
        elevation = `${feet.toLocaleString()} ft`;
      }
    }

    // Waypoint features
    if (props.type === "waypoint" && props.name) {
      const index = typeof props.index === "number" ? props.index : 999;
      waypoints.push(
        JSON.stringify({ index, name: String(props.name) })
      );
    }
  }

  // Sort waypoints by index and extract names
  const sortedWaypoints = waypoints
    .map((w) => JSON.parse(w) as { index: number; name: string })
    .sort((a, b) => a.index - b.index)
    .map((w) => w.name);

  return { distance, duration, elevation, waypoints: sortedWaypoints };
}
