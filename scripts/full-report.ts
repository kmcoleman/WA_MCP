import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const data = JSON.parse(readFileSync(join(__dirname, "campouts-geocoded.json"), "utf-8"));

interface Row {
  num: number;
  date: string;
  eventName: string;
  cancelled: boolean;
  campoutGeo: { displayName: string } | null;
  breakfastGeo: { displayName: string } | null;
  campoutDistMi: number | null;
  campoutDurMin: number | null;
  breakfastDistMi: number | null;
  breakfastDurMin: number | null;
  campoutToBreakfastDistMi: number | null;
  campoutToBreakfastDurMin: number | null;
}

function fmt(mins: number | null): string {
  if (mins == null) return "";
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${h}h${m > 0 ? String(m).padStart(2, "0") + "m" : ""}`;
}

function mi(d: number | null): string {
  return d != null ? `${d} mi` : "";
}

function shortName(geo: { displayName: string } | null, maxLen: number): string {
  if (!geo) return "";
  let n = geo.displayName;
  // Strip long suffixes like ", California, United States"
  n = n.replace(/, United States$/, "");
  n = n.replace(/, California$/, ", CA");
  n = n.replace(/, Solano County, CA$/, ", CA");
  n = n.replace(/, Alameda County, CA$/, ", CA");
  n = n.replace(/, San Luis Obispo County, CA$/, ", CA");
  n = n.replace(/, Shasta County, CA$/, ", CA");
  n = n.replace(/, Napa County, CA$/, ", CA");
  n = n.replace(/, Madera County, CA$/, ", CA");
  n = n.replace(/, Merced County, CA$/, ", CA");
  n = n.replace(/, San Joaquin County, CA$/, ", CA");
  n = n.replace(/, Yuba County, CA$/, ", CA");
  n = n.replace(/, Santa Clara County, CA$/, ", CA");
  n = n.replace(/, Yolo County, CA$/, ", CA");
  n = n.replace(/, Marion County, Indiana$/, ", IN");
  n = n.replace(/, Sacramento County, CA$/, ", CA");
  n = n.replace(/, \d{5}$/, "");
  n = n.replace(/, \d{5}, CA$/, ", CA");
  if (n.length > maxLen) n = n.substring(0, maxLen - 1) + "…";
  return n;
}

const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

// Group by year
const byYear = new Map<number, Row[]>();
for (const row of data as Row[]) {
  const year = parseInt(row.date.substring(0, 4));
  if (!byYear.has(year)) byYear.set(year, []);
  byYear.get(year)!.push(row);
}

const years = [...byYear.keys()].sort();

const W = 140;
const SEP = "─".repeat(W);
const DSEP = "═".repeat(W);

console.log(DSEP);
console.log("BMW NORCAL CAMPOUT REPORT — All Events by Year with Driving Distances from San Leandro, CA");
console.log(DSEP);

for (const year of years) {
  const rows = byYear.get(year)!;
  const held = rows.filter(r => !r.cancelled);
  const cancelled = rows.filter(r => r.cancelled);

  console.log("");
  console.log(DSEP);
  console.log(`  ${year}    (${held.length} held, ${cancelled.length} cancelled)`);
  console.log(DSEP);
  console.log(
    "Mon".padEnd(5) +
    "Campout Location".padEnd(40) +
    "Dist".padStart(7) +
    "Drive".padStart(7) +
    " │ " +
    "Breakfast Location".padEnd(38) +
    "B→C".padStart(7) +
    "B→C Dr".padStart(7) +
    " │ " +
    "SL→B".padStart(7) +
    "SL→B Dr".padStart(8)
  );
  console.log(SEP);

  for (const r of rows) {
    const mo = months[parseInt(r.date.substring(5, 7)) - 1];

    if (r.cancelled) {
      const campName = shortName(r.campoutGeo, 38) || "(location TBD)";
      console.log(
        mo.padEnd(5) +
        `CANCELLED - ${campName}`.substring(0, 50).padEnd(40) +
        "".padStart(7) +
        "".padStart(7) +
        " │ " +
        "".padEnd(38) +
        "".padStart(7) +
        "".padStart(7) +
        " │ "
      );
      continue;
    }

    const campName = shortName(r.campoutGeo, 38);
    const bkfstName = shortName(r.breakfastGeo, 36);

    console.log(
      mo.padEnd(5) +
      (campName || "(no location)").padEnd(40) +
      mi(r.campoutDistMi).padStart(7) +
      fmt(r.campoutDurMin).padStart(7) +
      " │ " +
      (bkfstName || "").padEnd(38) +
      mi(r.campoutToBreakfastDistMi).padStart(7) +
      fmt(r.campoutToBreakfastDurMin).padStart(7) +
      " │ " +
      mi(r.breakfastDistMi).padStart(7) +
      fmt(r.breakfastDurMin).padStart(8)
    );
  }

  // Year averages
  const campDists = held.filter(r => r.campoutDistMi != null).map(r => r.campoutDistMi!);
  const campDurs = held.filter(r => r.campoutDurMin != null).map(r => r.campoutDurMin!);
  const bkfstDists = held.filter(r => r.breakfastDistMi != null).map(r => r.breakfastDistMi!);
  const b2cDists = held.filter(r => r.campoutToBreakfastDistMi != null).map(r => r.campoutToBreakfastDistMi!);

  const avg = (a: number[]) => a.length ? Math.round(a.reduce((s, v) => s + v, 0) / a.length) : null;

  console.log(SEP);
  const avgCamp = avg(campDists);
  const avgCampDur = avg(campDurs);
  const avgBkfst = avg(bkfstDists);
  const avgB2c = avg(b2cDists);
  console.log(
    "".padEnd(5) +
    `AVG (${campDists.length} events)`.padEnd(40) +
    mi(avgCamp).padStart(7) +
    fmt(avgCampDur).padStart(7) +
    " │ " +
    `AVG (${b2cDists.length} w/ breakfast)`.padEnd(38) +
    mi(avgB2c).padStart(7) +
    "".padStart(7) +
    " │ " +
    mi(avgBkfst).padStart(7)
  );

  // Excluding DV
  const noDV = campDists.filter(d => d < 480);
  const noDVDur = campDurs.filter(d => d < 570);
  if (noDV.length < campDists.length && noDV.length > 0) {
    console.log(
      "".padEnd(5) +
      `AVG excl Death Valley (${noDV.length})`.padEnd(40) +
      mi(avg(noDV)).padStart(7) +
      fmt(avg(noDVDur)).padStart(7) +
      " │ "
    );
  }
}

// Grand totals
console.log("");
console.log(DSEP);
console.log("  GRAND TOTALS");
console.log(DSEP);
const allHeld = (data as Row[]).filter(r => !r.cancelled);
const allCampDists = allHeld.filter(r => r.campoutDistMi != null).map(r => r.campoutDistMi!);
const allCampDurs = allHeld.filter(r => r.campoutDurMin != null).map(r => r.campoutDurMin!);
const allBkfst = allHeld.filter(r => r.breakfastDistMi != null).map(r => r.breakfastDistMi!);
const allB2c = allHeld.filter(r => r.campoutToBreakfastDistMi != null).map(r => r.campoutToBreakfastDistMi!);
const avg = (a: number[]) => a.length ? Math.round(a.reduce((s, v) => s + v, 0) / a.length) : null;
const noDV = allCampDists.filter(d => d < 480);
const noDVDur = allCampDurs.filter(d => d < 570);

console.log(`  Total events: ${data.length}  |  Held: ${allHeld.length}  |  Cancelled: ${data.length - allHeld.length}`);
console.log(`  Avg camp distance:           ${mi(avg(allCampDists))}  /  ${fmt(avg(allCampDurs))}`);
console.log(`  Avg excl Death Valley:       ${mi(avg(noDV))}  /  ${fmt(avg(noDVDur))}`);
console.log(`  Avg breakfast from SL:       ${mi(avg(allBkfst))}`);
console.log(`  Avg breakfast → camp:        ${mi(avg(allB2c))}`);
console.log(`  Closest campout:             ${Math.min(...allCampDists)} mi`);
console.log(`  Farthest campout:            ${Math.max(...allCampDists)} mi`);
console.log(`  Death Valley trips:          ${allCampDists.filter(d => d >= 480).length}`);
console.log(DSEP);
