# BMW NorCal Ride Planner — Design Document

**Date:** 2026-02-22
**Status:** Draft — Awaiting Approval

## Overview

A standalone web application that helps the BMW NorCal Tour Captain configure monthly ride events in Wild Apricot. The tool collects ride-specific inputs, uses AI (Anthropic API) to draft the event description HTML, updates the event via the WA Events API, and generates a registration confirmation email template for copy/paste into WA.

## User Workflow

1. Tour Captain **duplicates** a past ride event in WA admin (preserves registration types, waivers, registration fields)
2. Tour Captain **uploads** route assets (image, GPX files, PDF) to WA file storage via WebDAV at the standard path
3. Tour Captain **opens** the Ride Planner web tool
4. Tour Captain **enters** the duplicated event ID — tool loads existing event data from WA API
5. Tour Captain **fills in** ride-specific details in a form (see Input Fields below)
6. Tool **auto-derives** asset URLs from the standard path convention
7. Tool **auto-calculates** registration open dates (editable)
8. Tour Captain clicks **"Generate Description"** — AI drafts HTML event description
9. Tour Captain **previews** rendered HTML, iterates with AI chat to refine
10. Tour Captain clicks **"Update Event"** — tool PUTs updated event to WA Events API
11. Tool **generates** confirmation email HTML with ride-specific download links for copy/paste

## Architecture

### Standalone Next.js App

- Lives in `wildapricot-mcp/web/` directory
- Next.js with React, Radix UI, Tailwind CSS (matching norcaladmin stack)
- Runs locally for MVP (no auth required)
- Future: migrate page + API routes into norcaladmin (which has WA OAuth auth)

### API Routes

| Route | Purpose |
|-------|---------|
| `GET /api/event/[id]` | Fetch event from WA API |
| `PUT /api/event/[id]` | Update event via WA API |
| `POST /api/ai/generate-description` | Call Anthropic API to draft event description HTML |
| `POST /api/ai/refine-description` | Iterative AI refinement of description |

### Environment Variables

```
WILDAPRICOT_API_KEY        - WA API key (existing)
WILDAPRICOT_ACCOUNT_ID     - WA Account ID (existing)
ANTHROPIC_API_KEY          - Anthropic API key for AI description generation
```

## Input Fields

### Event Details (all editable, loaded from WA on event ID entry)

| Field | Type | Default | Notes |
|-------|------|---------|-------|
| Event ID | number | — | Entered by user, loads existing event |
| Event Name | text | from WA | Free text, custom per ride |
| Start Date/Time | datetime | from WA | Usually single day, sometimes multi-day |
| End Date/Time | datetime | from WA | |
| Location | text | from WA | Destination/campsite, free text |
| Registration Limit | number | from WA | Changes per ride |
| Access Level | toggle | Public | Public or AdminOnly |
| Tags | checkboxes | ["campout"] | Always "campout", optionally "ama" |

### Ride Details (for AI description generation)

| Field | Type | Notes |
|-------|------|-------|
| Breakfast Location Name | text | e.g. "Huckleberry's" |
| Breakfast Location Address | text | e.g. "2071 Camden Ave, San Jose, CA 95124" |
| Breakfast Google Maps URL | url | Link to start/breakfast location |
| Breakfast Time | time | e.g. "8:00 AM" |
| Kickstands Up Time | time | e.g. "9:00 AM" |
| Ride Highlights | textarea | Key points, interesting stops, scenery — AI expands on these |
| Rever Route URL | url | Link to route on Rever |
| Total Distance | text | e.g. "~185 miles" |
| Estimated Duration | text | e.g. "6 hours with breaks" |

### Asset Files

| Field | Type | Notes |
|-------|------|-------|
| Featured Image Filename | text | e.g. "plaskett.jpg" |
| GPX Route+Track Filename | text | e.g. "Feb 2026 HMB to Plaskett Creek.GPX" |
| GPX Track-Only Filename | text | e.g. "Pilot Light to Plaskett Creek Cg Track.GPX" |
| PDF Route Sheet Filename | text | e.g. "Feb 2026 Route Sheet.pdf" |
| Additional Asset Filenames | text[] | Optional extra files |

Asset URLs are derived from: `https://bmwnorcal.org/resources/_EVENTS/Ride%20Outs/{year}/{year}%20{MM}%20-%20{Ride Name}/{url-encoded filename}`

The year, month, and ride name are derived from the event start date and event name.

### Registration Types

| Field | Type | Default |
|-------|------|---------|
| Member Tickets — Available From | date | Sunday, 6 weeks before event start |
| Member Tickets — Price | currency | $0.00 (from duplicate) |
| Initiate Members — Available From | date | Sunday, 5 weeks before event start |
| Initiate Members — Price | currency | $15.00 (from duplicate) |

## AI Description Generation

### Flow

1. User fills in ride details and clicks "Generate Description"
2. Next.js API route sends structured prompt to Anthropic API (Claude) with:
   - All ride input fields
   - Standard HTML template structure
   - Asset URLs (derived)
   - Instructions to match the BMW NorCal event description style
3. AI returns HTML description
4. User sees rendered preview alongside raw HTML
5. User can type refinement instructions (e.g. "make the intro more exciting", "add a note about rain gear")
6. AI refines and returns updated HTML
7. Repeat until satisfied

### Standard Template Structure

The AI-generated HTML follows this structure (derived from the Plaskett Creek event):

1. **Featured image** (centered)
2. **Ride title heading**
3. **Ride description** — AI-written from highlights, engaging motorcycle-enthusiast tone
4. **Registration info** — signup dates, cancellation policy note
5. **The Schedule** — breakfast time, kickstands up, key stops
6. **The Route** — overview of the route, mid-way stops, fuel strategy
7. **Rider Requirements** — full tank, navigation ready, route knowledge
8. **Stats** — total distance, estimated duration

### Prompt Template (server-side)

A system prompt template will be stored server-side that instructs Claude to:
- Write in an engaging, motorcycle-enthusiast tone
- Use the BMW NorCal HTML formatting conventions (h2 headings, font colors, bullet lists)
- Include all provided links and asset URLs
- Keep the structure consistent across rides
- Not invent details — only use what the user provides

## Confirmation Email Generator

### Purpose

WA's registration confirmation email can't be updated via API. The tool generates the HTML for copy/paste.

### How It Works

The confirmation email is a **fixed template** where only the download button links change per ride. The tool:

1. Takes the derived asset URLs (GPX route, GPX track, route sheet PDF)
2. Takes the Rever URL
3. Injects them into the standard confirmation email HTML template
4. Presents the HTML with a "Copy to Clipboard" button

### Fixed Template Elements (never change)

- NorCal logo header
- Greeting with WA merge fields (`{Registration_First_Name}`, etc.)
- Event details section with merge fields
- Registration details section
- Best regards footer
- Club store banner

### Variable Elements (per ride)

- GPX Route button → links to `{asset_dir}/{gpx_route_filename}`
- GPX Track button → links to `{asset_dir}/{gpx_track_filename}`
- Rever button → links to Rever URL
- Route Sheet button → links to `{asset_dir}/{pdf_filename}`

### Button Images (static, reusable across rides)

- `/resources/_EVENTS/Ride Outs/GPX_Route_Button.png`
- `/resources/_EVENTS/Ride Outs/GPX_track_button.png`
- `/resources/_EVENTS/Ride Outs/Rever_20Button.png`
- `/resources/_EVENTS/Ride Outs/Routesheet_button.png`
- `/resources/Pictures/Buttons/clubstore.png`

## UI Layout

### Single Page Application with Sections

```
+--------------------------------------------------+
| BMW NorCal Ride Planner                          |
+--------------------------------------------------+
| Event ID: [______] [Load Event]                  |
+--------------------------------------------------+
| EVENT DETAILS                                     |
| Name: [________________________]                  |
| Start: [date] [time]  End: [date] [time]         |
| Location: [________________________]              |
| Reg Limit: [___]  Public: [toggle]                |
| Tags: [x] campout  [ ] ama                       |
+--------------------------------------------------+
| REGISTRATION TYPES                                |
| Member Tickets:  Opens [date]  Price [$___]       |
| Initiate Members: Opens [date]  Price [$___]      |
+--------------------------------------------------+
| RIDE DETAILS                                      |
| Breakfast: [name] [address] [maps url]            |
| Times: Breakfast [__:__] Kickstands [__:__]       |
| Highlights: [textarea - key ride points]          |
| Rever URL: [________________________]             |
| Distance: [______]  Duration: [______]            |
+--------------------------------------------------+
| ASSETS                                            |
| Image: [filename]                                 |
| GPX Route+Track: [filename]                       |
| GPX Track Only: [filename]                        |
| PDF Route Sheet: [filename]                       |
| Derived URLs: (shown as readonly links)           |
+--------------------------------------------------+
| [Generate Description]                            |
+--------------------------------------------------+
| DESCRIPTION PREVIEW              | RAW HTML       |
| (rendered HTML)                  | (code view)    |
|                                  |                |
| Refine: [type instruction here] [Send]            |
+--------------------------------------------------+
| [Update Event on Wild Apricot]                    |
+--------------------------------------------------+
| CONFIRMATION EMAIL                                |
| (rendered email preview)                          |
| [Copy HTML to Clipboard]                          |
+--------------------------------------------------+
```

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js (App Router) |
| UI Components | Radix UI primitives |
| Styling | Tailwind CSS |
| AI | Anthropic API (Claude, streaming via backend route) |
| WA Integration | Wild Apricot REST API v2.2 (reusing auth pattern from MCP server) |
| Language | TypeScript |

## Future Migration to norcaladmin

When ready to integrate into norcaladmin:
1. Move page component to `/src/app/ride-planner/page.tsx`
2. Move API routes to `/src/app/api/ride-planner/`
3. Add navigation link to header
4. Replace local env config with norcaladmin's existing WA auth
5. Add session check for Tour Captain role

## Out of Scope (MVP)

- File upload to WA (user uploads via WebDAV separately)
- User authentication (runs locally)
- Saving ride configurations for reuse
- Sending announcement emails
- Multiple organizer support (defaults to Tour Captain ID 32996416)
