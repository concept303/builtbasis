import { readFileSync, mkdirSync, writeFileSync, existsSync, lstatSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { dirname, isAbsolute, relative, resolve, sep } from 'node:path';

// Extract reviewed plan payloads only. This does not execute the plan's commands.
const [plan, destination, task = 'all', phase = 'all'] = process.argv.slice(2);
if (!plan || !destination || !/^(all|[1-6])$/.test(task) || !['all', 'setup', 'test', 'implementation'].includes(phase)) {
  throw new Error('Usage: node replay-plan5.mjs <plan.md> <checkout> [1-6|all] [setup|test|implementation|all]');
}
const root = resolve(destination);
const source = readFileSync(plan, 'utf8').replaceAll('\r\n', '\n');
const pattern = /#### File: `([^`]+)`\n\n<!-- replay task=(\d+) phase=(setup|test|implementation) encoding=(text|base64) sha256=([a-f0-9]{64}) -->\n\n``````[^\n]*\n([\s\S]*?)``````\n/g;
const seen = new Set();
const selected = [];
for (const match of source.matchAll(pattern)) {
  const [, path, taskNumber, filePhase, encoding, hash, payload] = match;
  if (seen.has(path)) throw new Error(`Duplicate payload: ${path}`);
  seen.add(path);
  if (isAbsolute(path) || path.includes('\\') || path.split('/').some(part => !part || part === '.' || part === '..' || part === '.git')) throw new Error(`Unsafe path: ${path}`);
  const target = resolve(root, path);
  const inside = relative(root, target);
  if (inside === '..' || inside.startsWith('..' + sep) || isAbsolute(inside)) throw new Error(`Outside target: ${path}`);
  let component = root;
  for (const part of path.split('/')) { component = resolve(component, part); if (existsSync(component) && lstatSync(component).isSymbolicLink()) throw new Error(`Symlink in target: ${path}`); }
  const bytes = Buffer.from(payload, encoding === 'base64' ? 'base64' : 'utf8');
  if (createHash('sha256').update(bytes).digest('hex') !== hash) throw new Error(`Payload checksum mismatch: ${path}`);
  if ((task === 'all' || task === taskNumber) && (phase === 'all' || phase === filePhase)) selected.push({ target, bytes, path });
}
if (!selected.length) throw new Error('No matching payloads. Check the task, phase and plan format.');
// Validate all checksums and paths before writing any selected file.
for (const { target, bytes, path } of selected) {
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, bytes);
  process.stdout.write(path + '\n');
}
process.stdout.write(`Wrote ${selected.length} payloads; verified ${seen.size} total payloads.\n`);
