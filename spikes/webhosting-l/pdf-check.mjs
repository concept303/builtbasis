import { chromium } from 'playwright';
import { join } from 'node:path';

const dataDir = process.env.BUILTBASIS_DATA_DIR ?? '.';
const out = join(dataDir, 'pdf-check.pdf');

const browser = await chromium.launch();
const page = await browser.newPage();
await page.setContent('<h1>BuiltBasis PDF check</h1><p>Ελληνικό κείμενο: Ζήτημα ποιότητας, Τεχνική διευκρίνιση.</p>');
await page.pdf({ path: out, format: 'A3', landscape: true });
await browser.close();
console.log(`PDF written: ${out}`);
