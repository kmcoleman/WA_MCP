import { NextRequest, NextResponse } from "next/server";

/**
 * Parses a Google Maps URL to extract place name and address.
 * - Name: extracted from /place/Name/ in the URL path
 * - Address: reverse-geocoded from @lat,lng coordinates in the URL
 * - Short URLs (goo.gl/maps.app): follows redirect to get full URL
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

    // For short URLs, follow redirects to get the full Maps URL
    let resolvedUrl = url;
    if (url.includes("goo.gl") || url.includes("maps.app")) {
      try {
        const res = await fetch(url, { method: "HEAD", redirect: "follow" });
        resolvedUrl = res.url;
      } catch {
        // Fall through with original URL
      }
    }

    const name = parseNameFromUrl(resolvedUrl);
    const coords = parseCoordsFromUrl(resolvedUrl);

    let address = "";
    if (coords) {
      address = await reverseGeocode(coords.lat, coords.lng);
    }

    return NextResponse.json({ name, address });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to parse Maps URL";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

function parseNameFromUrl(url: string): string {
  try {
    const parsed = new URL(url);
    const placeMatch = parsed.pathname.match(/\/place\/([^/@]+)/);
    if (placeMatch) {
      return decodeURIComponent(placeMatch[1]).replace(/\+/g, " ");
    }
  } catch {
    // ignore parse errors
  }
  return "";
}

function parseCoordsFromUrl(
  url: string
): { lat: number; lng: number } | null {
  // Match @lat,lng pattern in the URL
  const match = url.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
  if (match) {
    const lat = parseFloat(match[1]);
    const lng = parseFloat(match[2]);
    if (!isNaN(lat) && !isNaN(lng)) {
      return { lat, lng };
    }
  }
  return null;
}

async function reverseGeocode(lat: number, lng: number): Promise<string> {
  try {
    // Use OpenStreetMap Nominatim (free, no API key needed)
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&addressdetails=1`,
      {
        headers: {
          "User-Agent": "RidePlannerApp/1.0",
        },
      }
    );
    if (!res.ok) return "";

    const data = await res.json();
    if (data.address) {
      const a = data.address;
      const parts: string[] = [];

      // Build a US-style address: number street, city, state zip
      if (a.house_number && a.road) {
        parts.push(`${a.house_number} ${a.road}`);
      } else if (a.road) {
        parts.push(a.road);
      }

      const city = a.city || a.town || a.village || a.hamlet || "";
      if (city) parts.push(city);

      const state = a.state || "";
      const postcode = a.postcode || "";
      if (state && postcode) {
        parts.push(`${state} ${postcode}`);
      } else if (state) {
        parts.push(state);
      }

      return parts.join(", ");
    }

    return data.display_name || "";
  } catch {
    return "";
  }
}
