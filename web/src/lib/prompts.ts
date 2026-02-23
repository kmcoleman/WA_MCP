import type { RideFormData } from "./types";

export function buildAssetDir(startDate: string, rideName: string): string {
  const date = new Date(startDate);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `/resources/_EVENTS/Ride%20Outs/${year}/${year}%20${month}%20-%20${encodeURIComponent(rideName)}`;
}

export function buildAssetUrl(assetDir: string, filename: string): string {
  return `${assetDir}/${encodeURIComponent(filename)}`;
}

export function buildSystemPrompt(): string {
  return `You are a copywriter for the BMW Club of Northern California (BMW NorCal), a motorcycle riding club.
You write engaging HTML event descriptions for monthly club rides posted on Wild Apricot.

RULES:
- Write in an engaging, enthusiastic motorcycle-rider tone. Think "Sunday morning ride with friends" energy.
- Use ONLY information provided by the user. Never invent stops, roads, or details.
- Output ONLY the HTML body content (no <html>, <head>, or <body> tags).
- Follow BMW NorCal HTML conventions:
  - Use <h2> for section headings with <font color="#000000">
  - Use <p> for body text with <font color="#000000">
  - Use <ul>/<ol> with <li><p> for lists
  - Use <strong> for emphasis
  - Use <a href="..." target="_blank"> for links
- Structure the description in this order:
  1. Featured image (centered, in an h2): <h2 align="center"><img src="{imageUrl}" alt="" title="" border="0"></h2>
  2. Ride overview paragraph — engaging summary from the highlights
  3. Registration info — when member/initiate signups open, cancellation policy note
  4. The Schedule — breakfast time and location (with Google Maps link), kickstands up time
  5. The Route — what makes this ride interesting, key stops if mentioned
  6. Rider Requirements — numbered list: full tank, navigation ready, route knowledge
  7. Stats — total distance and estimated duration
  8. Closing line — "See you at {breakfast location}!"
- Keep it concise. Each section should be 2-4 sentences max unless the user provided lots of detail.`;
}

export function buildUserPrompt(form: RideFormData, assetDir: string): string {
  const imageUrl = form.featuredImageFilename
    ? buildAssetUrl(assetDir, form.featuredImageFilename)
    : null;

  return `Generate the HTML event description for this ride:

**Event Name:** ${form.name}
**Date:** ${form.startDate}${form.endDate !== form.startDate ? ` to ${form.endDate}` : ""}
**Location/Destination:** ${form.location}

**Breakfast Location:** ${form.breakfastName}, ${form.breakfastAddress}
**Breakfast Google Maps:** ${form.breakfastMapsUrl}
**Breakfast Time:** ${form.breakfastTime}
**Kickstands Up:** ${form.kickstandsTime}

**Ride Highlights:**
${form.rideHighlights}

**Rever Route URL:** ${form.reverUrl}
**Total Distance:** ${form.totalDistance}
**Estimated Duration:** ${form.estimatedDuration}
**Elevation Gain:** ${form.elevation}
**Route Waypoints:** ${form.routeWaypoints}

${imageUrl ? `**Featured Image URL:** ${imageUrl}` : "No featured image."}

**Member Registration Opens:** ${form.memberTicketsAvailableFrom}
**Initiate Registration Opens:** ${form.initiateAvailableFrom}`;
}
