import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const JSON_PATH = join(__dirname, "campouts-geocoded.json");

interface CampoutRow {
  num: number;
  date: string;
  eventName: string;
  cancelled: boolean;
  campoutDistMi: number | null;
  campoutDurMin: number | null;
  breakfastDistMi: number | null;
  breakfastDurMin: number | null;
  campoutToBreakfastDistMi: number | null;
  campoutToBreakfastDurMin: number | null;
}

const data: CampoutRow[] = JSON.parse(readFileSync(JSON_PATH, "utf-8"));

interface YearStats {
  year: number;
  total: number;
  cancelled: number;
  held: number;
  campDists: number[];
  campDurs: number[];
  bkfstDists: number[];
  bkfstDurs: number[];
  b2cDists: number[];
  b2cDurs: number[];
}

const byYear = new Map<number, YearStats>();

for (const row of data) {
  const year = parseInt(row.date.substring(0, 4));
  if (!byYear.has(year)) {
    byYear.set(year, {
      year, total: 0, cancelled: 0, held: 0,
      campDists: [], campDurs: [],
      bkfstDists: [], bkfstDurs: [],
      b2cDists: [], b2cDurs: [],
    });
  }
  const ys = byYear.get(year)!;
  ys.total++;
  if (row.cancelled) {
    ys.cancelled++;
    continue;
  }
  ys.held++;
  if (row.campoutDistMi != null) ys.campDists.push(row.campoutDistMi);
  if (row.campoutDurMin != null) ys.campDurs.push(row.campoutDurMin);
  if (row.breakfastDistMi != null) ys.bkfstDists.push(row.breakfastDistMi);
  if (row.breakfastDurMin != null) ys.bkfstDurs.push(row.breakfastDurMin);
  if (row.campoutToBreakfastDistMi != null) ys.b2cDists.push(row.campoutToBreakfastDistMi);
  if (row.campoutToBreakfastDurMin != null) ys.b2cDurs.push(row.campoutToBreakfastDurMin);
}

function avg(arr: number[]): number | null {
  if (arr.length === 0) return null;
  return Math.round(arr.reduce((a, b) => a + b, 0) / arr.length);
}

function max(arr: number[]): number | null {
  if (arr.length === 0) return null;
  return Math.max(...arr);
}

function min(arr: number[]): number | null {
  if (arr.length === 0) return null;
  return Math.min(...arr);
}

function hrs(mins: number | null): string {
  if (mins == null) return "-";
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${h}h${m > 0 ? m + 'm' : ''}`;
}

const years = [...byYear.values()].sort((a, b) => a.year - b.year);

// Print summary table
console.log("═══════════════════════════════════════════════════════════════════════════════════════════════");
console.log("CAMPOUT YEARLY AVERAGES — Driving distance from San Leandro");
console.log("═══════════════════════════════════════════════════════════════════════════════════════════════");
console.log("");
console.log(
  "Year".padEnd(6) +
  "Events".padStart(7) +
  "Held".padStart(6) +
  "Cxld".padStart(6) +
  " │ " +
  "Avg Mi".padStart(7) +
  "Avg Time".padStart(9) +
  "Min Mi".padStart(8) +
  "Max Mi".padStart(8) +
  " │ " +
  "Avg Bkfst".padStart(10) +
  "Avg B→C".padStart(9)
);
console.log("─".repeat(95));

// Collect all dists for grand total
const allCampDists: number[] = [];
const allCampDurs: number[] = [];
const allBkfstDists: number[] = [];
const allB2cDists: number[] = [];

for (const ys of years) {
  allCampDists.push(...ys.campDists);
  allCampDurs.push(...ys.campDurs);
  allBkfstDists.push(...ys.bkfstDists);
  allB2cDists.push(...ys.b2cDists);

  const avgDist = avg(ys.campDists);
  const avgDur = avg(ys.campDurs);
  const minDist = min(ys.campDists);
  const maxDist = max(ys.campDists);
  const avgBkfst = avg(ys.bkfstDists);
  const avgB2c = avg(ys.b2cDists);

  console.log(
    `${ys.year}`.padEnd(6) +
    `${ys.total}`.padStart(7) +
    `${ys.held}`.padStart(6) +
    `${ys.cancelled}`.padStart(6) +
    " │ " +
    `${avgDist ?? '-'}`.padStart(7) +
    `${hrs(avgDur)}`.padStart(9) +
    `${minDist ?? '-'}`.padStart(8) +
    `${maxDist ?? '-'}`.padStart(8) +
    " │ " +
    `${avgBkfst != null ? avgBkfst + ' mi' : '-'}`.padStart(10) +
    `${avgB2c != null ? avgB2c + ' mi' : '-'}`.padStart(9)
  );
}

console.log("─".repeat(95));
console.log(
  "ALL".padEnd(6) +
  `${years.reduce((s, y) => s + y.total, 0)}`.padStart(7) +
  `${years.reduce((s, y) => s + y.held, 0)}`.padStart(6) +
  `${years.reduce((s, y) => s + y.cancelled, 0)}`.padStart(6) +
  " │ " +
  `${avg(allCampDists) ?? '-'}`.padStart(7) +
  `${hrs(avg(allCampDurs))}`.padStart(9) +
  `${min(allCampDists) ?? '-'}`.padStart(8) +
  `${max(allCampDists) ?? '-'}`.padStart(8) +
  " │ " +
  `${avg(allBkfstDists) != null ? avg(allBkfstDists) + ' mi' : '-'}`.padStart(10) +
  `${avg(allB2cDists) != null ? avg(allB2cDists) + ' mi' : '-'}`.padStart(9)
);

console.log("");
console.log("═══════════════════════════════════════════════════════════════════════════════════════════════");
console.log("NOTES:");
console.log("  Avg Mi / Avg Time = average driving distance & time from San Leandro to campground");
console.log("  Avg Bkfst = average driving distance from San Leandro to breakfast meetup");
console.log("  Avg B→C = average driving distance from breakfast to campground");
console.log("  Cancelled events excluded from distance averages");
console.log("  Death Valley trips (~488 mi) pull up the averages significantly");

// Death Valley excluded averages
const noDVDists = allCampDists.filter(d => d < 480);
const noDVDurs = allCampDurs.filter(d => d < 570);
console.log("");
console.log(`  Avg distance excluding Death Valley: ${avg(noDVDists)} mi, ${hrs(avg(noDVDurs))}`);
console.log(`  Avg distance Death Valley only: 488 mi, ${hrs(578)} (${allCampDists.filter(d => d >= 480).length} trips)`);
