import { readFileSync } from 'fs';

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

console.log('#   | Date       | Campout Location                              | Breakfast Location                               | X');
console.log('----|------------|-----------------------------------------------|--------------------------------------------------|---');
csv.forEach((line, i) => {
  const cols = parseCSV(line);
  const date = cols[0];
  const campout = (cols[3] || '').substring(0, 45).padEnd(45);
  const breakfast = (cols[4] || '').substring(0, 48).padEnd(48);
  const cancel = cols[6] ? 'X' : '';
  const num = (i + 1).toString().padStart(3);
  console.log(`${num} | ${date} | ${campout} | ${breakfast} | ${cancel}`);
});
