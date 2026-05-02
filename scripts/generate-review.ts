import { readFileSync, writeFileSync } from 'fs';

const csv = readFileSync('scripts/campouts-data.csv', 'utf-8').split('\n').slice(1).filter(Boolean);

function parseCSV(line: string): string[] {
  const cols: string[] = [];
  let current = '';
  let inQuotes = false;
  for (const ch of line) {
    if (ch === '"') { inQuotes = inQuotes ? false : true; continue; }
    if (ch === ',' && !inQuotes) { cols.push(current); current = ''; continue; }
    current += ch;
  }
  cols.push(current);
  return cols;
}

function csvEscape(val: string): string {
  if (val.includes(',') || val.includes('"') || val.includes('\n')) {
    return '"' + val.replace(/"/g, '""') + '"';
  }
  return val;
}

const header = '#,Date,Event Name,Campout Location,Breakfast Location,Cancelled,Notes';
const rows: string[] = [header];

csv.forEach((line, i) => {
  const cols = parseCSV(line);
  const date = cols[0];
  const name = cols[1];
  const campout = cols[3] || '';
  const breakfast = cols[4] || '';
  const cancelled = cols[6] || '';

  rows.push([
    (i + 1).toString(),
    date,
    csvEscape(name),
    csvEscape(campout),
    csvEscape(breakfast),
    cancelled ? 'YES' : '',
    '', // Notes column for user corrections
  ].join(','));
});

writeFileSync('scripts/campouts-review.csv', rows.join('\n'));
console.log('Wrote ' + (rows.length - 1) + ' rows to scripts/campouts-review.csv');
