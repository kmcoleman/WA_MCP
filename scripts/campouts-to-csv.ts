import { readFileSync, writeFileSync } from 'fs';

const RAW_FILE = 'scripts/campouts-raw.json';
const OUTPUT_CSV = 'scripts/campouts-data.csv';

interface RawCampout {
  id: number;
  name: string;
  startDate: string;
  endDate: string;
  location: string;
  tags: string[];
  descriptionHtml: string;
}

function stripHtml(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<\/div>/gi, '\n')
    .replace(/<\/li>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#\d+;/g, '')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n\s+/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

// Known breakfast spots (restaurants, diners, cafes)
const BREAKFAST_PATTERNS = [
  /denny'?s/i, /black bear/i, /country waffle/i, /scramblz/i,
  /jim'?s country/i, /cowboy'?s corner/i, /eduardo'?s/i,
  /mimi'?s cafe/i, /bayside cafe/i, /sharp park/i,
  /bmw\s+(motorrad|motorcycles|of|santa|san)/i, /adventure designs/i,
];

// Known campground/campout patterns
const CAMPOUT_PATTERNS = [
  /campground/i, /campsite/i, /group site/i, /state park/i,
  /recreation area/i, /national park/i, /national forest/i,
  /creek\s+camp/i, /hot springs/i, /furnace creek/i,
  /death valley/i, /ranch/i, /lake\s+\w+/i, /point/i,
  /flat\s/i, /ridge/i, /basin/i, /meadow/i, /peak/i,
  /koa/i, /rotary park/i,
];

function looksLikeBreakfastSpot(text: string): boolean {
  return BREAKFAST_PATTERNS.some(p => p.test(text));
}

function looksLikeCampout(text: string): boolean {
  return CAMPOUT_PATTERNS.some(p => p.test(text));
}

function extractBreakfastFromDesc(text: string): string {
  const lines = text.split('\n');
  const breakfastInfo: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (/breakfast/i.test(line)) {
      breakfastInfo.push(line);
      // Check next line for address
      if (i + 1 < lines.length) {
        const next = lines[i + 1].trim();
        if (next.length > 5 && /\d|street|st\.|ave|blvd|rd|road|hwy|drive|dr\.|way|lane|ln/i.test(next)) {
          breakfastInfo.push(next);
        }
      }
    }
  }

  // Also look for "meet at" or "start at" patterns
  if (breakfastInfo.length === 0) {
    for (const line of lines) {
      if (/(?:meet|start|depart|leave)\s+(?:at|from)\s/i.test(line) && !/camp/i.test(line)) {
        breakfastInfo.push(line.trim());
      }
    }
  }

  return breakfastInfo.join(' ').substring(0, 400);
}

function extractCampoutFromName(name: string): string {
  // Try to extract campout location from event name
  // First strip common prefixes like "July Member Meeting & Campout,"
  let cleaned = name;

  // Remove month prefix
  cleaned = cleaned.replace(/^(?:January|February|March|April|May|June|July|August|September|October|November|December|Jan|Feb|Mar|Apr|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec)\s+/i, '');

  // Remove "Member Meeting &/and Campout" or "Campout" prefix, along with separators
  cleaned = cleaned.replace(/^(?:Member\s+)?(?:Meeting\s+)?(?:&|and)?\s*(?:Campout|Camp\s*out)\s*[-–—,]*\s*/i, '');
  cleaned = cleaned.replace(/^(?:Club\s+)?(?:Meeting|Campout)\s*[-–—,]*\s*/i, '');

  // Remove "Meeting -" prefix
  cleaned = cleaned.replace(/^Meeting\s*[-–—]\s*/i, '');

  cleaned = cleaned.trim();

  // Remove trailing exclamation marks
  cleaned = cleaned.replace(/!+$/, '').trim();

  return cleaned || '';
}

function csvEscape(val: string): string {
  if (val.includes(',') || val.includes('"') || val.includes('\n')) {
    return '"' + val.replace(/"/g, '""') + '"';
  }
  return val;
}

function main() {
  const raw: RawCampout[] = JSON.parse(readFileSync(RAW_FILE, 'utf-8'));

  const rows: string[] = [];
  rows.push('Date,Event Name,WA Location Field,Campout Location (parsed),Breakfast Location (parsed),Breakfast from Description,Cancelled');

  for (const c of raw) {
    const plainText = stripHtml(c.descriptionHtml);
    const waLocation = c.location;
    const cancelled = /cancel/i.test(c.name) || /cancel/i.test(plainText.substring(0, 200));
    const isTemplate = /template/i.test(c.name);

    if (isTemplate) continue; // Skip templates

    // Determine if WA location field is breakfast or campout
    let campoutLocation = '';
    let breakfastLocation = '';

    if (looksLikeBreakfastSpot(waLocation)) {
      breakfastLocation = waLocation;
      // Try to get campout from event name
      campoutLocation = extractCampoutFromName(c.name);
    } else if (looksLikeCampout(waLocation) || !waLocation) {
      campoutLocation = waLocation;
    } else {
      // Ambiguous - could be either. Check if it has a street address
      // If it has a specific street address, likely breakfast. Otherwise campout.
      if (/\d+\s+\w+\s+(st|street|ave|blvd|rd|road|dr|drive|way|ln|lane|hwy)\b/i.test(waLocation)) {
        // Has street address - could be either
        // Check if event name has a recognizable campground
        const nameLocation = extractCampoutFromName(c.name);
        if (nameLocation && nameLocation !== waLocation) {
          campoutLocation = nameLocation;
          breakfastLocation = waLocation;
        } else {
          campoutLocation = waLocation;
        }
      } else {
        campoutLocation = waLocation;
      }
    }

    // Extract breakfast from description
    const breakfastFromDesc = extractBreakfastFromDesc(plainText);

    // If we don't have breakfast from WA location, try description
    if (!breakfastLocation && breakfastFromDesc) {
      breakfastLocation = breakfastFromDesc;
    }

    rows.push([
      c.startDate?.substring(0, 10),
      csvEscape(c.name),
      csvEscape(waLocation),
      csvEscape(campoutLocation),
      csvEscape(breakfastLocation),
      csvEscape(breakfastFromDesc),
      cancelled ? 'YES' : '',
    ].join(','));
  }

  writeFileSync(OUTPUT_CSV, rows.join('\n'));
  console.log(`Wrote ${rows.length - 1} rows to ${OUTPUT_CSV}`);

  // Print summary
  const dataRows = rows.slice(1);
  const withCampout = dataRows.filter(r => {
    const cols = r.split(',');
    return cols[3] && cols[3] !== '""';
  });
  const withBreakfast = dataRows.filter(r => {
    const cols = r.split(',');
    return cols[4] && cols[4] !== '""';
  });

  console.log(`\nWith campout location: ${withCampout.length}`);
  console.log(`With breakfast location: ${withBreakfast.length}`);
}

main();
