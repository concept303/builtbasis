import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { parseArgs } from 'node:util';
import { loadEnvFile, openMigratedDatabase } from '../src/server/bootstrap';
import { loadConfig } from '../src/server/config';
import { parseCsv } from '../src/server/seed/csv';
import { extractPeople, seedGennadi, tradesFromRows } from '../src/server/seed/gennadi';

// exceljs is CommonJS and its named exports are not detectable from ESM, so load it with require.
const ExcelJS = createRequire(import.meta.url)('exceljs') as typeof import('exceljs');
const EXPECTED_TRADES = 34;

const { values } = parseArgs({ options: { references: { type: 'string' }, lookups: { type: 'string' } } });
if (!values.references || !values.lookups) {
  console.error(
    'Usage: npm run seed:gennadi -- --references "<…Εκκρεμότητες v3-References.csv>" --lookups "<…Project Fields Lookups.xlsx>"',
  );
  process.exit(2);
}

const people = extractPeople(parseCsv(readFileSync(values.references, 'utf8')));

const workbook = new ExcelJS.Workbook();
await workbook.xlsx.readFile(values.lookups);
const sheet = workbook.getWorksheet('Trades');
if (!sheet) throw new Error('Sheet "Trades" not found');
const tradeRows: string[][] = [];
sheet.eachRow({ includeEmpty: false }, (row) => {
  const cells: string[] = [];
  for (let column = 1; column <= 6; column += 1) cells.push(row.getCell(column).text);
  tradeRows.push(cells);
});
const trades = tradesFromRows(tradeRows);
if (trades.length !== EXPECTED_TRADES) {
  throw new Error(`Expected ${EXPECTED_TRADES} trades in the Trades sheet, found ${trades.length}`);
}

loadEnvFile();
const { db } = openMigratedDatabase(loadConfig());
try {
  const summary = seedGennadi(db, { people, trades });
  console.log(
    `Seeded ${summary.projectCode} (project id ${summary.projectId}): ${summary.people} people, ${summary.trades} trades, ` +
      `${summary.zoneTypes} zone types, ${summary.tags} tags, ${summary.locations} locations.`,
  );
  console.log(`Set the role by hand (owner / owner's representative) for: ${summary.peopleWithoutRole.join(', ')}`);
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
} finally {
  db.close();
}
