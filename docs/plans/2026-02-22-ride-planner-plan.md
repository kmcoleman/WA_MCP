# Ride Planner Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a standalone Next.js web app that lets the Tour Captain update duplicated Wild Apricot ride events with AI-generated descriptions and produce confirmation email HTML.

**Architecture:** Standalone Next.js App Router app in `web/` directory. Backend API routes proxy to WA API (reusing auth pattern) and Anthropic API (streaming). Single-page UI with form sections, AI chat, and HTML preview. Matches norcaladmin's Radix UI + Tailwind stack for future migration.

**Tech Stack:** Next.js 16, React 19, Radix UI, Tailwind CSS 4, Anthropic SDK, TypeScript

---

## Task 1: Scaffold Next.js App

**Files:**
- Create: `web/package.json`
- Create: `web/tsconfig.json`
- Create: `web/next.config.ts`
- Create: `web/src/app/layout.tsx`
- Create: `web/src/app/page.tsx`
- Create: `web/.env.local`
- Create: `web/src/lib/utils.ts`

**Step 1: Initialize the Next.js project**

```bash
cd /Users/kev/dev/mcp/wildapricot-mcp
npx create-next-app@latest web --typescript --tailwind --eslint --app --src-dir --no-import-alias --skip-install
```

If `create-next-app` prompts interactively, answer: TypeScript=Yes, ESLint=Yes, Tailwind=Yes, src/=Yes, App Router=Yes, import alias=No.

**Step 2: Install dependencies**

```bash
cd /Users/kev/dev/mcp/wildapricot-mcp/web
npm install @anthropic-ai/sdk @radix-ui/react-checkbox @radix-ui/react-label @radix-ui/react-select @radix-ui/react-separator @radix-ui/react-slot @radix-ui/react-tabs @radix-ui/react-switch class-variance-authority clsx tailwind-merge lucide-react
```

**Step 3: Create the cn() utility**

Create `web/src/lib/utils.ts`:

```typescript
import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

**Step 4: Create .env.local**

Create `web/.env.local`:

```
WILDAPRICOT_API_KEY=<copy from parent .env>
WILDAPRICOT_ACCOUNT_ID=<copy from parent .env>
ANTHROPIC_API_KEY=<your anthropic key>
```

**Step 5: Create minimal layout**

Replace `web/src/app/layout.tsx`:

```tsx
import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "BMW NorCal Ride Planner",
  description: "Configure monthly ride events for Wild Apricot",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-gray-50 antialiased">
        {children}
      </body>
    </html>
  );
}
```

**Step 6: Create placeholder page**

Replace `web/src/app/page.tsx`:

```tsx
export default function Home() {
  return (
    <main className="container mx-auto max-w-4xl p-8">
      <h1 className="text-3xl font-bold">BMW NorCal Ride Planner</h1>
      <p className="mt-2 text-gray-600">Configure monthly ride events for Wild Apricot</p>
    </main>
  );
}
```

**Step 7: Verify it runs**

```bash
cd /Users/kev/dev/mcp/wildapricot-mcp/web && npm run dev
```

Open http://localhost:3000 — should show the heading.

**Step 8: Commit**

```bash
cd /Users/kev/dev/mcp/wildapricot-mcp
git add web/
echo "web/.env.local" >> web/.gitignore
git add web/.gitignore
git commit -m "feat: scaffold ride planner Next.js app"
```

---

## Task 2: WA API Client Library

**Files:**
- Create: `web/src/lib/wa-client.ts`

**Step 1: Create the WA API client**

This reuses the auth pattern from the MCP server's `src/auth.ts` and `src/client.ts` but adapted for Next.js server-side usage.

Create `web/src/lib/wa-client.ts`:

```typescript
const TOKEN_URL = "https://oauth.wildapricot.org/auth/token";
const API_BASE = "https://api.wildapricot.org/v2.2";
const TOKEN_EXPIRY_BUFFER_MS = 60000;

let cachedToken: string | null = null;
let tokenExpiresAt = 0;

function getConfig() {
  const apiKey = process.env.WILDAPRICOT_API_KEY;
  const accountId = process.env.WILDAPRICOT_ACCOUNT_ID;
  if (!apiKey || !accountId) {
    throw new Error("WILDAPRICOT_API_KEY and WILDAPRICOT_ACCOUNT_ID must be set");
  }
  return { apiKey, accountId };
}

async function getAccessToken(): Promise<string> {
  if (cachedToken && Date.now() < tokenExpiresAt - TOKEN_EXPIRY_BUFFER_MS) {
    return cachedToken;
  }

  const { apiKey } = getConfig();
  const credentials = Buffer.from(`APIKEY:${apiKey}`).toString("base64");

  const response = await fetch(TOKEN_URL, {
    method: "POST",
    headers: {
      Authorization: `Basic ${credentials}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials&scope=auto",
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`WA auth failed: ${response.status} ${errorText}`);
  }

  const data = await response.json();
  cachedToken = data.access_token;
  tokenExpiresAt = Date.now() + data.expires_in * 1000;
  return cachedToken!;
}

export async function waGet<T>(endpoint: string): Promise<T> {
  const { accountId } = getConfig();
  const token = await getAccessToken();
  const url = `${API_BASE}/accounts/${accountId}${endpoint}`;

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`WA API error: ${response.status} ${errorText}`);
  }

  return response.json();
}

export async function waPut<T>(endpoint: string, body: unknown): Promise<T> {
  const { accountId } = getConfig();
  const token = await getAccessToken();
  const url = `${API_BASE}/accounts/${accountId}${endpoint}`;

  const response = await fetch(url, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`WA API error: ${response.status} ${errorText}`);
  }

  const text = await response.text();
  return text ? JSON.parse(text) : undefined;
}
```

**Step 2: Commit**

```bash
git add web/src/lib/wa-client.ts
git commit -m "feat: add Wild Apricot API client for ride planner"
```

---

## Task 3: Event API Routes

**Files:**
- Create: `web/src/lib/types.ts`
- Create: `web/src/app/api/event/[id]/route.ts`

**Step 1: Define types**

Create `web/src/lib/types.ts`:

```typescript
export interface RegistrationType {
  Id: number;
  Name: string;
  IsEnabled: boolean;
  BasePrice: number;
  GuestPrice: number;
  AvailableFrom: string;
  CurrentRegistrantsCount: number;
  Description: string;
}

export interface WaEvent {
  Id: number;
  Name: string;
  StartDate: string;
  EndDate: string;
  Location: string;
  EventType: string;
  RegistrationEnabled: boolean;
  RegistrationsLimit: number;
  ConfirmedRegistrationsCount: number;
  Tags: string[];
  AccessLevel: string;
  StartTimeSpecified: boolean;
  EndTimeSpecified: boolean;
  Details: {
    DescriptionHtml: string;
    RegistrationTypes: RegistrationType[];
    TimeZone: {
      ZoneId: string;
      Name: string;
      UtcOffset: number;
    };
    [key: string]: unknown;
  };
}

export interface RideFormData {
  eventId: number;
  name: string;
  startDate: string;
  endDate: string;
  location: string;
  registrationsLimit: number;
  accessLevel: string;
  tags: string[];

  // Ride details for AI
  breakfastName: string;
  breakfastAddress: string;
  breakfastMapsUrl: string;
  breakfastTime: string;
  kickstandsTime: string;
  rideHighlights: string;
  reverUrl: string;
  totalDistance: string;
  estimatedDuration: string;

  // Assets
  featuredImageFilename: string;
  gpxRouteFilename: string;
  gpxTrackFilename: string;
  pdfRouteSheetFilename: string;

  // Registration types
  memberTicketsAvailableFrom: string;
  memberTicketsPrice: number;
  initiateAvailableFrom: string;
  initiatePrice: number;

  // Generated
  descriptionHtml: string;
}
```

**Step 2: Create the event GET/PUT API route**

Create `web/src/app/api/event/[id]/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { waGet, waPut } from "@/lib/wa-client";
import type { WaEvent } from "@/lib/types";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const event = await waGet<WaEvent>(`/events/${id}`);
    return NextResponse.json(event);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch event";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const body = await request.json();
    const result = await waPut(`/events/${id}`, { Id: Number(id), ...body });
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update event";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
```

**Step 3: Test manually**

```bash
curl http://localhost:3000/api/event/6215541 | jq '.Name'
```

Expected: `"February Campout - Plaskett Creek"`

**Step 4: Commit**

```bash
git add web/src/lib/types.ts web/src/app/api/event/
git commit -m "feat: add event GET/PUT API routes"
```

---

## Task 4: AI Description API Route

**Files:**
- Create: `web/src/lib/prompts.ts`
- Create: `web/src/app/api/ai/generate-description/route.ts`

**Step 1: Create the prompt template**

Create `web/src/lib/prompts.ts`:

```typescript
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

${imageUrl ? `**Featured Image URL:** ${imageUrl}` : "No featured image."}

**Member Registration Opens:** ${form.memberTicketsAvailableFrom}
**Initiate Registration Opens:** ${form.initiateAvailableFrom}`;
}
```

**Step 2: Create the AI API route with streaming**

Create `web/src/app/api/ai/generate-description/route.ts`:

```typescript
import { NextRequest } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { buildSystemPrompt, buildUserPrompt, buildAssetDir } from "@/lib/prompts";
import type { RideFormData } from "@/lib/types";

const anthropic = new Anthropic();

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { formData, refinementInstruction, currentHtml } = body as {
      formData: RideFormData;
      refinementInstruction?: string;
      currentHtml?: string;
    };

    const assetDir = buildAssetDir(formData.startDate, formData.name);
    const systemPrompt = buildSystemPrompt();

    let userPrompt: string;
    if (refinementInstruction && currentHtml) {
      userPrompt = `Here is the current HTML event description:\n\n${currentHtml}\n\nPlease make this change: ${refinementInstruction}\n\nReturn the complete updated HTML.`;
    } else {
      userPrompt = buildUserPrompt(formData, assetDir);
    }

    const stream = anthropic.messages.stream({
      model: "claude-sonnet-4-6",
      max_tokens: 4096,
      system: systemPrompt,
      messages: [{ role: "user", content: userPrompt }],
    });

    const encoder = new TextEncoder();
    const readable = new ReadableStream({
      async start(controller) {
        for await (const event of stream) {
          if (
            event.type === "content_block_delta" &&
            event.delta.type === "text_delta"
          ) {
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ text: event.delta.text })}\n\n`)
            );
          }
        }
        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
        controller.close();
      },
    });

    return new Response(readable, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "AI generation failed";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
```

**Step 3: Commit**

```bash
git add web/src/lib/prompts.ts web/src/app/api/ai/
git commit -m "feat: add AI description generation API with streaming"
```

---

## Task 5: Shared UI Components

**Files:**
- Create: `web/src/components/ui/button.tsx`
- Create: `web/src/components/ui/card.tsx`
- Create: `web/src/components/ui/input.tsx`
- Create: `web/src/components/ui/label.tsx`
- Create: `web/src/components/ui/textarea.tsx`
- Create: `web/src/components/ui/checkbox.tsx`
- Create: `web/src/components/ui/switch.tsx`

These are minimal shadcn/ui-style components matching norcaladmin's patterns. Use `npx shadcn@latest add` if available, otherwise create manually.

**Step 1: Install shadcn and add components**

```bash
cd /Users/kev/dev/mcp/wildapricot-mcp/web
npx shadcn@latest init
```

Accept defaults (New York style, zinc base color, CSS variables). Then:

```bash
npx shadcn@latest add button card input label textarea checkbox switch tabs separator
```

**Step 2: Verify components exist**

```bash
ls web/src/components/ui/
```

Expected: `button.tsx card.tsx checkbox.tsx input.tsx label.tsx separator.tsx switch.tsx tabs.tsx textarea.tsx`

**Step 3: Commit**

```bash
git add web/src/components/ web/components.json web/src/lib/utils.ts
git commit -m "feat: add shadcn/ui components for ride planner"
```

---

## Task 6: Asset URL Utility & Confirmation Email Template

**Files:**
- Create: `web/src/lib/assets.ts`
- Create: `web/src/lib/confirmation-email.ts`

**Step 1: Create asset URL builder**

Create `web/src/lib/assets.ts`:

```typescript
export interface AssetUrls {
  assetDir: string;
  featuredImage: string | null;
  gpxRoute: string | null;
  gpxTrack: string | null;
  pdfRouteSheet: string | null;
}

export function buildAssetDir(startDate: string, rideName: string): string {
  const date = new Date(startDate);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const encodedName = encodeURIComponent(rideName).replace(/%20/g, "%20");
  return `/resources/_EVENTS/Ride%20Outs/${year}/${year}%20${month}%20-%20${encodedName}`;
}

export function deriveAssetUrls(
  startDate: string,
  rideName: string,
  filenames: {
    featuredImage?: string;
    gpxRoute?: string;
    gpxTrack?: string;
    pdfRouteSheet?: string;
  }
): AssetUrls {
  const dir = buildAssetDir(startDate, rideName);
  return {
    assetDir: dir,
    featuredImage: filenames.featuredImage
      ? `${dir}/${encodeURIComponent(filenames.featuredImage)}`
      : null,
    gpxRoute: filenames.gpxRoute
      ? `${dir}/${encodeURIComponent(filenames.gpxRoute)}`
      : null,
    gpxTrack: filenames.gpxTrack
      ? `${dir}/${encodeURIComponent(filenames.gpxTrack)}`
      : null,
    pdfRouteSheet: filenames.pdfRouteSheet
      ? `${dir}/${encodeURIComponent(filenames.pdfRouteSheet)}`
      : null,
  };
}

/**
 * Calculate the Sunday N weeks before a given date.
 */
export function sundayWeeksBefore(eventDate: string, weeks: number): string {
  const date = new Date(eventDate);
  date.setDate(date.getDate() - weeks * 7);
  // Move to previous Sunday (0 = Sunday)
  const day = date.getDay();
  if (day !== 0) {
    date.setDate(date.getDate() - day);
  }
  return date.toISOString().split("T")[0];
}
```

**Step 2: Create confirmation email template**

Create `web/src/lib/confirmation-email.ts`:

```typescript
import type { AssetUrls } from "./assets";

export function generateConfirmationEmailHtml(
  assetUrls: AssetUrls,
  reverUrl: string
): string {
  const gpxRouteLink = assetUrls.gpxRoute
    ? `<a href="${assetUrls.gpxRoute}" target="_blank"><img src="/resources/_EVENTS/Ride%20Outs/GPX_Route_Button.png" alt="GPX Route" title="" border="0" style="width: 164px; height: 65px;"></a>`
    : "";

  const gpxTrackLink = assetUrls.gpxTrack
    ? `<a href="${assetUrls.gpxTrack}" target="_blank"><img src="/resources/_EVENTS/Ride%20Outs/GPX_track_button.png" alt="GPX Track" title="" border="0" style="width: 166px; height: 66px;"></a>`
    : "";

  const reverLink = reverUrl
    ? `<a href="${reverUrl}" target="_blank"><img src="/resources/_EVENTS/Ride%20Outs/Rever_20Button.png" alt="Rever Route" title="" border="0" style="width: 169px; height: auto;"></a>`
    : "";

  const routeSheetLink = assetUrls.pdfRouteSheet
    ? `<a href="${assetUrls.pdfRouteSheet}" target="_blank"><img src="/resources/_EVENTS/Ride%20Outs/Routesheet_button.png" alt="Route Sheet" title="" border="0" style="width: 167px; height: 67px;"></a>`
    : "";

  return `<p style="line-height: 22px;" align="right"><font style="font-size: 16px;"><img src="/resources/Pictures/NorcalLogo_Large.jpg" alt="" title="" border="0" width="85" height="85"></font></p>
<p style="line-height: 22px;"><font style="font-size: 16px;">Dear {Registration_First_Name} {Registration_Last_Name},<br>Your event registration has been completed. Thank you for registering!</font></p>
<h2 style="line-height: 32px;"><font color="#333333" style="font-size: 26px;">{Event_Title}</font></h2>
<p style="line-height: 22px;"><font color="#333333" style="font-size: 16px;">When: {Event_Date} {Event_Time}, {Event_TimeZone}<br>Where: {Event_Location}<br></font></p>
<p style="line-height: 22px;"><font color="#333333"><font style="font-size: 14px;"><strong>EVENT DETAILS:</strong></font><br><font style="font-size: 16px;">{Event_Details}<br></font></font></p>
<p style="line-height: 22px;"><font color="#333333"><font style="font-size: 16px;"><font style="font-size: 14px;"><strong>ADDITIONAL INFORMATION:</strong></font><br><font style="font-size: 16px;">{Event_Extra_Info}</font><br></font></font></p>
<p style="line-height: 22px;"><font color="#333333"><font style="font-size: 16px;"><font style="font-size: 16px;"><font style="font-size: 14px;"><strong>YOUR REGISTRATION DETAILS:</strong></font><br><font style="font-size: 16px;">{EventField_All}</font><br></font></font></font></p>
<p style="line-height: 22px;"><font style="font-size: 16px;"><font color="#333333">To review your registration details, go to your</font> <a href="{Registration_Details_Page_Url}" target="_blank"><font color="#21ACEE">registration details page</font></a></font></p>
<p style="line-height: 22px;"><font style="font-size: 16px;"><font color="#333333">Best regards,</font><br><a href="{Organization_URL}" target="_blank"><font color="#21ACEE">{Organization_Name}</font></a></font></p>
<p style="line-height: 22px;"><font style="font-size: 16px;"><font color="#21ACEE"><br></font></font></p>
<p style="line-height: 22px;"><font style="font-size: 16px;"><font color="#21ACEE">${gpxRouteLink}${gpxTrackLink}${reverLink}${routeSheetLink}<br></font></font></p>
<p style="line-height: 22px;" align="center"><font style="font-size: 16px;"><font color="#21ACEE"><a href="/store" target="_blank"><img src="/resources/Pictures/Buttons/clubstore.png" alt="" title="" border="0" width="128" height="66"></a><br></font></font></p>
<p style="line-height: 22px;" align="center"><font><font color="#21ACEE"><font size="3"><em>Remember to order whatever swag you need from the club store ahead of time if you want some of those goodies delivered before the event!</em></font></font></font></p>`;
}
```

**Step 3: Commit**

```bash
git add web/src/lib/assets.ts web/src/lib/confirmation-email.ts
git commit -m "feat: add asset URL builder and confirmation email template"
```

---

## Task 7: Event Loader Component

**Files:**
- Create: `web/src/components/event-loader.tsx`

**Step 1: Create the event loader**

This is the top section of the page — event ID input + Load button.

Create `web/src/components/event-loader.tsx`:

```tsx
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
```

**Step 2: Commit**

```bash
git add web/src/components/event-loader.tsx
git commit -m "feat: add event loader component"
```

---

## Task 8: Event Details Form Component

**Files:**
- Create: `web/src/components/event-details-form.tsx`

**Step 1: Create the event details form**

Create `web/src/components/event-details-form.tsx`:

```tsx
"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import type { RideFormData } from "@/lib/types";

interface EventDetailsFormProps {
  formData: RideFormData;
  onChange: (updates: Partial<RideFormData>) => void;
}

export function EventDetailsForm({ formData, onChange }: EventDetailsFormProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Event Details</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label htmlFor="name">Event Name</Label>
          <Input
            id="name"
            value={formData.name}
            onChange={(e) => onChange({ name: e.target.value })}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="startDate">Start Date/Time</Label>
            <Input
              id="startDate"
              type="datetime-local"
              value={formData.startDate ? formData.startDate.slice(0, 16) : ""}
              onChange={(e) => onChange({ startDate: e.target.value })}
            />
          </div>
          <div>
            <Label htmlFor="endDate">End Date/Time</Label>
            <Input
              id="endDate"
              type="datetime-local"
              value={formData.endDate ? formData.endDate.slice(0, 16) : ""}
              onChange={(e) => onChange({ endDate: e.target.value })}
            />
          </div>
        </div>

        <div>
          <Label htmlFor="location">Location (Destination)</Label>
          <Input
            id="location"
            value={formData.location}
            onChange={(e) => onChange({ location: e.target.value })}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="registrationsLimit">Registration Limit</Label>
            <Input
              id="registrationsLimit"
              type="number"
              value={formData.registrationsLimit || ""}
              onChange={(e) =>
                onChange({ registrationsLimit: Number(e.target.value) })
              }
            />
          </div>
          <div className="flex items-center gap-3 pt-6">
            <Switch
              id="accessLevel"
              checked={formData.accessLevel === "Public"}
              onCheckedChange={(checked) =>
                onChange({ accessLevel: checked ? "Public" : "AdminOnly" })
              }
            />
            <Label htmlFor="accessLevel">Public Event</Label>
          </div>
        </div>

        <div>
          <Label>Tags</Label>
          <div className="mt-2 flex gap-4">
            <div className="flex items-center gap-2">
              <Checkbox
                id="tag-campout"
                checked={formData.tags.includes("campout")}
                onCheckedChange={(checked) => {
                  const tags = checked
                    ? [...formData.tags, "campout"]
                    : formData.tags.filter((t) => t !== "campout");
                  onChange({ tags });
                }}
              />
              <Label htmlFor="tag-campout">campout</Label>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="tag-ama"
                checked={formData.tags.includes("ama")}
                onCheckedChange={(checked) => {
                  const tags = checked
                    ? [...formData.tags, "ama"]
                    : formData.tags.filter((t) => t !== "ama");
                  onChange({ tags });
                }}
              />
              <Label htmlFor="tag-ama">ama</Label>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
```

**Step 2: Commit**

```bash
git add web/src/components/event-details-form.tsx
git commit -m "feat: add event details form component"
```

---

## Task 9: Registration Types Form Component

**Files:**
- Create: `web/src/components/registration-types-form.tsx`

**Step 1: Create the form**

Create `web/src/components/registration-types-form.tsx`:

```tsx
"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { RideFormData } from "@/lib/types";

interface RegistrationTypesFormProps {
  formData: RideFormData;
  onChange: (updates: Partial<RideFormData>) => void;
}

export function RegistrationTypesForm({
  formData,
  onChange,
}: RegistrationTypesFormProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Registration Types</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="memberOpens">Member Tickets — Opens</Label>
            <Input
              id="memberOpens"
              type="date"
              value={formData.memberTicketsAvailableFrom}
              onChange={(e) =>
                onChange({ memberTicketsAvailableFrom: e.target.value })
              }
            />
          </div>
          <div>
            <Label htmlFor="memberPrice">Member Tickets — Price ($)</Label>
            <Input
              id="memberPrice"
              type="number"
              step="0.01"
              value={formData.memberTicketsPrice}
              onChange={(e) =>
                onChange({ memberTicketsPrice: Number(e.target.value) })
              }
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="initiateOpens">Initiate Members — Opens</Label>
            <Input
              id="initiateOpens"
              type="date"
              value={formData.initiateAvailableFrom}
              onChange={(e) =>
                onChange({ initiateAvailableFrom: e.target.value })
              }
            />
          </div>
          <div>
            <Label htmlFor="initiatePrice">Initiate Members — Price ($)</Label>
            <Input
              id="initiatePrice"
              type="number"
              step="0.01"
              value={formData.initiatePrice}
              onChange={(e) =>
                onChange({ initiatePrice: Number(e.target.value) })
              }
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
```

**Step 2: Commit**

```bash
git add web/src/components/registration-types-form.tsx
git commit -m "feat: add registration types form component"
```

---

## Task 10: Ride Details Form Component

**Files:**
- Create: `web/src/components/ride-details-form.tsx`

**Step 1: Create the form**

Create `web/src/components/ride-details-form.tsx`:

```tsx
"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { RideFormData } from "@/lib/types";

interface RideDetailsFormProps {
  formData: RideFormData;
  onChange: (updates: Partial<RideFormData>) => void;
}

export function RideDetailsForm({ formData, onChange }: RideDetailsFormProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Ride Details</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
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

        <div>
          <Label htmlFor="breakfastMapsUrl">Breakfast Google Maps URL</Label>
          <Input
            id="breakfastMapsUrl"
            type="url"
            placeholder="https://www.google.com/maps/place/..."
            value={formData.breakfastMapsUrl}
            onChange={(e) => onChange({ breakfastMapsUrl: e.target.value })}
          />
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
          <Label htmlFor="rideHighlights">Ride Highlights</Label>
          <Textarea
            id="rideHighlights"
            rows={5}
            placeholder="Key points about the ride — interesting roads, stops, scenery, lunch spots. The AI will expand on these."
            value={formData.rideHighlights}
            onChange={(e) => onChange({ rideHighlights: e.target.value })}
          />
        </div>

        <div>
          <Label htmlFor="reverUrl">Rever Route URL</Label>
          <Input
            id="reverUrl"
            type="url"
            placeholder="https://app.rfrn.co/..."
            value={formData.reverUrl}
            onChange={(e) => onChange({ reverUrl: e.target.value })}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
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
        </div>
      </CardContent>
    </Card>
  );
}
```

**Step 2: Commit**

```bash
git add web/src/components/ride-details-form.tsx
git commit -m "feat: add ride details form component"
```

---

## Task 11: Assets Form Component

**Files:**
- Create: `web/src/components/assets-form.tsx`

**Step 1: Create the form**

Create `web/src/components/assets-form.tsx`:

```tsx
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
```

**Step 2: Commit**

```bash
git add web/src/components/assets-form.tsx
git commit -m "feat: add assets form component with URL preview"
```

---

## Task 12: Description Preview & AI Chat Component

**Files:**
- Create: `web/src/components/description-editor.tsx`

**Step 1: Create the description editor with streaming AI chat**

Create `web/src/components/description-editor.tsx`:

```tsx
"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Sparkles, Send, Copy, Check } from "lucide-react";
import type { RideFormData } from "@/lib/types";

interface DescriptionEditorProps {
  formData: RideFormData;
  descriptionHtml: string;
  onDescriptionChange: (html: string) => void;
}

export function DescriptionEditor({
  formData,
  descriptionHtml,
  onDescriptionChange,
}: DescriptionEditorProps) {
  const [loading, setLoading] = useState(false);
  const [refinement, setRefinement] = useState("");
  const [copied, setCopied] = useState(false);
  const streamBuffer = useRef("");

  async function streamAI(refinementInstruction?: string) {
    setLoading(true);
    streamBuffer.current = "";

    try {
      const response = await fetch("/api/ai/generate-description", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          formData,
          refinementInstruction: refinementInstruction || undefined,
          currentHtml: refinementInstruction ? descriptionHtml : undefined,
        }),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || "AI generation failed");
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) throw new Error("No response stream");

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split("\n");

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const data = line.slice(6);
            if (data === "[DONE]") break;
            try {
              const parsed = JSON.parse(data);
              if (parsed.text) {
                streamBuffer.current += parsed.text;
                onDescriptionChange(streamBuffer.current);
              }
            } catch {
              // skip parse errors on partial chunks
            }
          }
        }
      }
    } catch (err) {
      console.error("AI error:", err);
    } finally {
      setLoading(false);
    }
  }

  function handleGenerate() {
    streamAI();
  }

  function handleRefine() {
    if (!refinement.trim()) return;
    streamAI(refinement.trim());
    setRefinement("");
  }

  function handleCopyHtml() {
    navigator.clipboard.writeText(descriptionHtml);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          Event Description
          <div className="flex gap-2">
            {descriptionHtml && (
              <Button variant="outline" size="sm" onClick={handleCopyHtml}>
                {copied ? (
                  <Check className="mr-1 h-4 w-4" />
                ) : (
                  <Copy className="mr-1 h-4 w-4" />
                )}
                {copied ? "Copied!" : "Copy HTML"}
              </Button>
            )}
            <Button onClick={handleGenerate} disabled={loading}>
              {loading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="mr-2 h-4 w-4" />
              )}
              {descriptionHtml ? "Regenerate" : "Generate Description"}
            </Button>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {descriptionHtml ? (
          <>
            <Tabs defaultValue="preview">
              <TabsList>
                <TabsTrigger value="preview">Preview</TabsTrigger>
                <TabsTrigger value="html">HTML Source</TabsTrigger>
              </TabsList>
              <TabsContent value="preview">
                <div
                  className="prose max-w-none rounded-md border bg-white p-4"
                  dangerouslySetInnerHTML={{ __html: descriptionHtml }}
                />
              </TabsContent>
              <TabsContent value="html">
                <pre className="max-h-96 overflow-auto rounded-md border bg-gray-900 p-4 text-sm text-green-400">
                  {descriptionHtml}
                </pre>
              </TabsContent>
            </Tabs>

            <div className="flex gap-2">
              <Input
                placeholder="Refine: e.g. 'make the intro more exciting' or 'add a note about rain gear'"
                value={refinement}
                onChange={(e) => setRefinement(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleRefine()}
                disabled={loading}
              />
              <Button
                onClick={handleRefine}
                disabled={loading || !refinement.trim()}
                size="icon"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </>
        ) : (
          <p className="text-sm text-gray-500">
            Fill in the ride details above, then click &quot;Generate
            Description&quot; to create the event HTML.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
```

**Step 2: Commit**

```bash
git add web/src/components/description-editor.tsx
git commit -m "feat: add description editor with AI streaming and refinement"
```

---

## Task 13: Confirmation Email Preview Component

**Files:**
- Create: `web/src/components/confirmation-email-preview.tsx`

**Step 1: Create the component**

Create `web/src/components/confirmation-email-preview.tsx`:

```tsx
"use client";

import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Copy, Check } from "lucide-react";
import { generateConfirmationEmailHtml } from "@/lib/confirmation-email";
import type { AssetUrls } from "@/lib/assets";

interface ConfirmationEmailPreviewProps {
  assetUrls: AssetUrls | null;
  reverUrl: string;
}

export function ConfirmationEmailPreview({
  assetUrls,
  reverUrl,
}: ConfirmationEmailPreviewProps) {
  const [copied, setCopied] = useState(false);

  const emailHtml = useMemo(() => {
    if (!assetUrls) return null;
    return generateConfirmationEmailHtml(assetUrls, reverUrl);
  }, [assetUrls, reverUrl]);

  function handleCopy() {
    if (!emailHtml) return;
    navigator.clipboard.writeText(emailHtml);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (!emailHtml) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          Registration Confirmation Email
          <Button variant="outline" size="sm" onClick={handleCopy}>
            {copied ? (
              <Check className="mr-1 h-4 w-4" />
            ) : (
              <Copy className="mr-1 h-4 w-4" />
            )}
            {copied ? "Copied!" : "Copy HTML to Clipboard"}
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="preview">
          <TabsList>
            <TabsTrigger value="preview">Preview</TabsTrigger>
            <TabsTrigger value="html">HTML Source</TabsTrigger>
          </TabsList>
          <TabsContent value="preview">
            <div
              className="rounded-md border bg-white p-4"
              dangerouslySetInnerHTML={{ __html: emailHtml }}
            />
          </TabsContent>
          <TabsContent value="html">
            <pre className="max-h-96 overflow-auto rounded-md border bg-gray-900 p-4 text-sm text-green-400">
              {emailHtml}
            </pre>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
```

**Step 2: Commit**

```bash
git add web/src/components/confirmation-email-preview.tsx
git commit -m "feat: add confirmation email preview with copy-to-clipboard"
```

---

## Task 14: Main Page — Wire Everything Together

**Files:**
- Modify: `web/src/app/page.tsx`

**Step 1: Build the main page that composes all components**

Replace `web/src/app/page.tsx`:

```tsx
"use client";

import { useState, useMemo, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, Upload } from "lucide-react";
import { EventLoader } from "@/components/event-loader";
import { EventDetailsForm } from "@/components/event-details-form";
import { RegistrationTypesForm } from "@/components/registration-types-form";
import { RideDetailsForm } from "@/components/ride-details-form";
import { AssetsForm } from "@/components/assets-form";
import { DescriptionEditor } from "@/components/description-editor";
import { ConfirmationEmailPreview } from "@/components/confirmation-email-preview";
import { deriveAssetUrls, sundayWeeksBefore } from "@/lib/assets";
import type { RideFormData, WaEvent } from "@/lib/types";

const EMPTY_FORM: RideFormData = {
  eventId: 0,
  name: "",
  startDate: "",
  endDate: "",
  location: "",
  registrationsLimit: 0,
  accessLevel: "Public",
  tags: ["campout"],
  breakfastName: "",
  breakfastAddress: "",
  breakfastMapsUrl: "",
  breakfastTime: "8:00 AM",
  kickstandsTime: "9:00 AM",
  rideHighlights: "",
  reverUrl: "",
  totalDistance: "",
  estimatedDuration: "",
  featuredImageFilename: "",
  gpxRouteFilename: "",
  gpxTrackFilename: "",
  pdfRouteSheetFilename: "",
  memberTicketsAvailableFrom: "",
  memberTicketsPrice: 0,
  initiateAvailableFrom: "",
  initiatePrice: 15,
  descriptionHtml: "",
};

function parseWaDateTime(waDate: string): string {
  // WA returns "2026-02-20T08:00:00-08:00", we need "2026-02-20T08:00" for datetime-local
  return waDate.slice(0, 16);
}

export default function Home() {
  const [formData, setFormData] = useState<RideFormData>(EMPTY_FORM);
  const [rawEvent, setRawEvent] = useState<WaEvent | null>(null);
  const [updating, setUpdating] = useState(false);
  const [updateResult, setUpdateResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);

  const handleFormChange = useCallback(
    (updates: Partial<RideFormData>) => {
      setFormData((prev) => ({ ...prev, ...updates }));
    },
    []
  );

  const assetUrls = useMemo(() => {
    if (!formData.startDate || !formData.name) return null;
    return deriveAssetUrls(formData.startDate, formData.name, {
      featuredImage: formData.featuredImageFilename || undefined,
      gpxRoute: formData.gpxRouteFilename || undefined,
      gpxTrack: formData.gpxTrackFilename || undefined,
      pdfRouteSheet: formData.pdfRouteSheetFilename || undefined,
    });
  }, [
    formData.startDate,
    formData.name,
    formData.featuredImageFilename,
    formData.gpxRouteFilename,
    formData.gpxTrackFilename,
    formData.pdfRouteSheetFilename,
  ]);

  function handleEventLoaded(event: Record<string, unknown>) {
    const waEvent = event as unknown as WaEvent;
    setRawEvent(waEvent);

    // Find registration types
    const regTypes = waEvent.Details?.RegistrationTypes || [];
    const memberType = regTypes.find((rt) =>
      rt.Name.toLowerCase().includes("member ticket")
    );
    const initiateType = regTypes.find((rt) =>
      rt.Name.toLowerCase().includes("initiate")
    );

    // Calculate default registration open dates
    const startDate = parseWaDateTime(waEvent.StartDate);
    const memberOpens =
      memberType?.AvailableFrom?.split("T")[0] ||
      sundayWeeksBefore(waEvent.StartDate, 6);
    const initiateOpens =
      initiateType?.AvailableFrom?.split("T")[0] ||
      sundayWeeksBefore(waEvent.StartDate, 5);

    setFormData({
      ...EMPTY_FORM,
      eventId: waEvent.Id,
      name: waEvent.Name,
      startDate,
      endDate: parseWaDateTime(waEvent.EndDate),
      location: waEvent.Location || "",
      registrationsLimit: waEvent.RegistrationsLimit || 0,
      accessLevel: waEvent.AccessLevel || "Public",
      tags: waEvent.Tags || ["campout"],
      memberTicketsAvailableFrom: memberOpens,
      memberTicketsPrice: memberType?.BasePrice ?? 0,
      initiateAvailableFrom: initiateOpens,
      initiatePrice: initiateType?.BasePrice ?? 15,
      descriptionHtml: waEvent.Details?.DescriptionHtml || "",
    });
  }

  async function handleUpdateEvent() {
    if (!formData.eventId) return;
    setUpdating(true);
    setUpdateResult(null);

    try {
      // Build the update payload
      const payload: Record<string, unknown> = {
        Name: formData.name,
        StartDate: formData.startDate,
        EndDate: formData.endDate,
        Location: formData.location,
        RegistrationsLimit: formData.registrationsLimit,
        AccessLevel: formData.accessLevel,
        Tags: formData.tags,
      };

      if (formData.descriptionHtml) {
        payload.DescriptionHtml = formData.descriptionHtml;
      }

      // Include registration type updates if we have the raw event
      if (rawEvent?.Details?.RegistrationTypes) {
        const updatedRegTypes = rawEvent.Details.RegistrationTypes.map((rt) => {
          if (rt.Name.toLowerCase().includes("member ticket")) {
            return {
              ...rt,
              AvailableFrom: formData.memberTicketsAvailableFrom + "T00:00:00+00:00",
              BasePrice: formData.memberTicketsPrice,
            };
          }
          if (rt.Name.toLowerCase().includes("initiate")) {
            return {
              ...rt,
              AvailableFrom: formData.initiateAvailableFrom + "T00:00:00+00:00",
              BasePrice: formData.initiatePrice,
            };
          }
          return rt;
        });
        payload.Details = {
          ...rawEvent.Details,
          RegistrationTypes: updatedRegTypes,
          DescriptionHtml: formData.descriptionHtml || rawEvent.Details.DescriptionHtml,
        };
      }

      const response = await fetch(`/api/event/${formData.eventId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to update event");
      }

      setUpdateResult({
        success: true,
        message: `Event "${formData.name}" updated successfully!`,
      });
    } catch (err) {
      setUpdateResult({
        success: false,
        message: err instanceof Error ? err.message : "Update failed",
      });
    } finally {
      setUpdating(false);
    }
  }

  return (
    <main className="container mx-auto max-w-4xl space-y-6 p-8">
      <h1 className="text-3xl font-bold">BMW NorCal Ride Planner</h1>
      <p className="text-gray-600">
        Configure monthly ride events for Wild Apricot
      </p>

      <EventLoader onEventLoaded={handleEventLoaded} />

      {formData.eventId > 0 && (
        <>
          <EventDetailsForm formData={formData} onChange={handleFormChange} />
          <RegistrationTypesForm
            formData={formData}
            onChange={handleFormChange}
          />
          <RideDetailsForm formData={formData} onChange={handleFormChange} />
          <AssetsForm
            formData={formData}
            assetUrls={assetUrls}
            onChange={handleFormChange}
          />
          <DescriptionEditor
            formData={formData}
            descriptionHtml={formData.descriptionHtml}
            onDescriptionChange={(html) =>
              handleFormChange({ descriptionHtml: html })
            }
          />

          <div className="flex items-center gap-4">
            <Button
              size="lg"
              onClick={handleUpdateEvent}
              disabled={updating}
            >
              {updating ? (
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              ) : (
                <Upload className="mr-2 h-5 w-5" />
              )}
              Update Event on Wild Apricot
            </Button>
            {updateResult && (
              <p
                className={`text-sm ${
                  updateResult.success ? "text-green-600" : "text-red-600"
                }`}
              >
                {updateResult.message}
              </p>
            )}
          </div>

          <ConfirmationEmailPreview
            assetUrls={assetUrls}
            reverUrl={formData.reverUrl}
          />
        </>
      )}
    </main>
  );
}
```

**Step 2: Run the dev server and verify**

```bash
cd /Users/kev/dev/mcp/wildapricot-mcp/web && npm run dev
```

Open http://localhost:3000, enter event ID 6215541, click Load. Verify:
- Event details populate the form
- All sections render
- Registration type dates auto-calculate

**Step 3: Commit**

```bash
git add web/src/app/page.tsx
git commit -m "feat: wire up main ride planner page with all components"
```

---

## Task 15: End-to-End Smoke Test

**Step 1: Start the dev server**

```bash
cd /Users/kev/dev/mcp/wildapricot-mcp/web && npm run dev
```

**Step 2: Test the full workflow**

1. Open http://localhost:3000
2. Enter event ID `6215541`, click Load Event
3. Verify event details populate (name, dates, location, tags, registration types)
4. Fill in ride details (breakfast, times, highlights)
5. Fill in asset filenames
6. Verify derived URLs appear in the Assets section
7. Click "Generate Description" — verify AI streams HTML
8. Try a refinement — verify it updates the description
9. Preview the confirmation email — verify button links are correct
10. Copy confirmation email HTML — verify clipboard
11. (Optional) Click "Update Event" to test the PUT — only if using a test event

**Step 3: Fix any issues found during smoke test**

Address rendering issues, form state bugs, API errors, etc.

**Step 4: Final commit**

```bash
git add -A web/
git commit -m "feat: ride planner MVP complete — smoke tested"
```

---

## Summary

| Task | What | Est. |
|------|------|------|
| 1 | Scaffold Next.js app | 5 min |
| 2 | WA API client | 3 min |
| 3 | Event API routes | 3 min |
| 4 | AI description API route | 5 min |
| 5 | Shared UI components (shadcn) | 3 min |
| 6 | Asset URL builder + confirmation email template | 3 min |
| 7 | Event loader component | 3 min |
| 8 | Event details form | 3 min |
| 9 | Registration types form | 2 min |
| 10 | Ride details form | 3 min |
| 11 | Assets form | 3 min |
| 12 | Description editor + AI chat | 5 min |
| 13 | Confirmation email preview | 3 min |
| 14 | Main page — wire together | 5 min |
| 15 | End-to-end smoke test | 10 min |
