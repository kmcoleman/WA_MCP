import type { RideFormData } from "./types";
import { WA_BASE_URL } from "./assets";

export function buildAssetDir(startDate: string, rideName: string): string {
  const date = new Date(startDate);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `/resources/_EVENTS/Ride%20Outs/${year}/${year}%20${month}%20-%20${encodeURIComponent(rideName)}`;
}

export function buildAssetUrl(assetDir: string, filename: string): string {
  return `${WA_BASE_URL}${assetDir}/${encodeURIComponent(filename)}`;
}

export function buildSystemPrompt(): string {
  return `You are a copywriter for the BMW Club of Northern California (BMW NorCal), a motorcycle riding club.
You write engaging HTML event descriptions for monthly club rides posted on Wild Apricot.

RULES:
- Write in an engaging, enthusiastic motorcycle-rider tone. Think "Sunday morning ride with friends" energy.
- Use ONLY information provided by the user. Never invent stops, roads, or details.
- Output ONLY the inner HTML (no <html>, <head>, or <body> tags). Start with the wrapper <div>.
- Do NOT wrap the output in markdown code fences (\`\`\`html or \`\`\`). Output raw HTML only.
- Keep it concise. Each section should be 2-4 sentences max unless the user provided lots of detail.
- You may research and add real details about the campground/destination and surrounding area (nearby towns, terrain, what makes the area special) to enrich the description.

DESIGN TEMPLATE — use this exact inline-CSS structure:

1. **Wrapper div**: \`<div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 800px; margin: 0 auto; color: #333;">\`

2. **Hero image** (if provided): centered, rounded, with shadow:
   \`<div style="text-align: center; margin-bottom: 30px;"><img src="{imageUrl}" alt="{event name}" style="width: 100%; max-width: 600px; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.1);"></div>\`

3. **Header banner**: BMW blue gradient with white text:
   \`<div style="background: linear-gradient(135deg, #0066B1 0%, #004d85 100%); color: white; padding: 30px 20px; border-radius: 12px; margin-bottom: 30px; text-align: center;">\`
   - h1: event name, font-size 2.2em, font-weight 700, text-shadow
   - p: subtitle/tagline, font-size 1.3em, opacity 0.95

4. **The Destination / Campout Details card** (THIS COMES FIRST): light gray background:
   \`<div style="background: #f8f9fa; border: 1px solid #e9ecef; border-radius: 10px; padding: 25px; margin-bottom: 30px;">\`
   - Section heading: \`<h3 style="color: #0066B1; margin-top: 0; font-size: 1.4em; border-bottom: 2px solid #0066B1; padding-bottom: 8px;">🏕️ The Destination</h3>\`
   - Grid with key details: Location/Campground, Dates, Times
   - Any critical information from Ride Highlights
   - A paragraph about the campground and the surrounding area — what makes it special, nearby towns, terrain, things to know

5. **The Club Ride card**: white background with border:
   \`<div style="background: #fff; border: 1px solid #dee2e6; border-radius: 10px; padding: 25px; margin-bottom: 30px;">\`
   - Section heading: \`<h3 style="color: #0066B1; margin-top: 0; font-size: 1.4em; border-bottom: 2px solid #0066B1; padding-bottom: 8px;">🏍️ The Club Ride</h3>\`
   - Breakfast meetup: name and location (with Google Maps link), time
   - Kickstands up time
   - Distance and estimated duration
   - Description of the ride: significant towns, roads, points of interest along the route
   - Route highlights as styled list: \`<li style="padding: 8px 0; border-bottom: 1px solid #f1f3f4;"><span style="color: #0066B1;">✓</span> <strong>Highlight:</strong> description</li>\`

6. **Come Prepared** (yellow warning card):
   \`<div style="background: #fff3cd; border: 1px solid #ffeaa7; border-radius: 10px; padding: 25px; margin-bottom: 30px;">\`
   - h3 with ⚠️ emoji, color #856404
   - All text color: #856404
   - Standard reminders:
     • Show up with a full tank of gas
     • Have knowledge of the route
     • Have GPX files loaded on your device
   - If the event is tagged "Ama", add this reminder:
     "When you register, you will receive an email with a link to sign your liability waiver. Be sure to sign it as soon as you receive it. You will receive reminders to sign, and your registration will be cancelled if the waiver is not signed."

7. **Call to Action**: BMW blue gradient card, white text, centered:
   - Encouraging closing message

8. **Footer**: centered, muted text, italic tagline

LINK STYLE: \`color: #0066B1; text-decoration: none;\` with target="_blank"
SECTION HEADINGS: All use \`color: #0066B1; font-size: 1.4em; border-bottom: 2px solid #0066B1; padding-bottom: 8px;\`
HTML ENTITIES: Use \`&amp;\` for &, \`&ndash;\` for –, etc.`;
}

export function buildUserPrompt(form: RideFormData, assetDir: string): string {
  const imageUrl = form.featuredImageFilename
    ? buildAssetUrl(assetDir, form.featuredImageFilename)
    : null;
  const gpxRouteUrl = form.gpxRouteFilename
    ? buildAssetUrl(assetDir, form.gpxRouteFilename)
    : null;
  const gpxTrackUrl = form.gpxTrackFilename
    ? buildAssetUrl(assetDir, form.gpxTrackFilename)
    : null;
  const pdfUrl = form.pdfRouteSheetFilename
    ? buildAssetUrl(assetDir, form.pdfRouteSheetFilename)
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
${gpxRouteUrl ? `**GPX Route Download URL:** ${gpxRouteUrl}` : ""}
${gpxTrackUrl ? `**GPX Track Download URL:** ${gpxTrackUrl}` : ""}
${pdfUrl ? `**PDF Route Sheet URL:** ${pdfUrl}` : ""}

**Event Tags:** ${form.tags.length > 0 ? form.tags.join(", ") : "None"}

**Member Registration Opens:** ${form.memberTicketsAvailableFrom}
**Initiate Registration Opens:** ${form.initiateAvailableFrom}`;
}
