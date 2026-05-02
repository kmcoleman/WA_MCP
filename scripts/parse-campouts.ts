import { readFileSync, writeFileSync } from 'fs';

const CACHE_FILE = 'scripts/campouts-raw.json';
const OUTPUT_FILE = 'scripts/campouts-parsed.json';

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

function extractBreakfast(text: string): string {
  // Look for breakfast-related lines
  const lines = text.split('\n');
  const breakfastLines: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (/breakfast/i.test(line)) {
      // Grab this line and possibly the next for context
      breakfastLines.push(line);
      if (i + 1 < lines.length && lines[i + 1].trim().length > 5) {
        breakfastLines.push(lines[i + 1].trim());
      }
    }
  }

  if (breakfastLines.length > 0) {
    return breakfastLines.join(' | ').substring(0, 500);
  }

  // Also check for "Sunday morning" or "meet at" patterns
  for (const line of lines) {
    if (/sunday\s+morning|sunday\s+brunch|meet\s+(?:at|for)\s+breakfast/i.test(line)) {
      return line.trim().substring(0, 300);
    }
  }

  return '';
}

function main() {
  const raw: RawCampout[] = JSON.parse(readFileSync(CACHE_FILE, 'utf-8'));

  const parsed = raw.map(c => {
    const plainText = stripHtml(c.descriptionHtml);
    const breakfast = extractBreakfast(plainText);

    return {
      id: c.id,
      name: c.name,
      date: c.startDate?.substring(0, 10),
      campoutLocation: c.location,
      breakfastRaw: breakfast,
      descriptionPlain: plainText.substring(0, 1000),
    };
  });

  // Output summary
  for (const p of parsed) {
    console.log(`\n=== ${p.date} | ${p.name} ===`);
    console.log(`  Campout: ${p.campoutLocation}`);
    console.log(`  Breakfast: ${p.breakfastRaw || '(not found)'}`);
    if (!p.breakfastRaw && p.descriptionPlain.length > 0) {
      // Show first 300 chars of description for manual review
      console.log(`  Desc preview: ${p.descriptionPlain.substring(0, 300)}`);
    }
  }

  // Save parsed data
  writeFileSync(OUTPUT_FILE, JSON.stringify(parsed, null, 2));
  console.log(`\n\nSaved parsed data to ${OUTPUT_FILE}`);

  // Stats
  const withBreakfast = parsed.filter(p => p.breakfastRaw);
  console.log(`\nTotal: ${parsed.length}, With breakfast info: ${withBreakfast.length}, Missing: ${parsed.length - withBreakfast.length}`);
}

main();
