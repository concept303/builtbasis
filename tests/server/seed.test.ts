import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { openDatabase, type Db } from '../../src/server/db/connection';
import { migrate } from '../../src/server/db/migrate';
import { listLocations } from '../../src/server/lists/locations';
import { listPeople } from '../../src/server/lists/people';
import { listTrades } from '../../src/server/lists/trades';
import { listZoneTypes } from '../../src/server/lists/zone-types';
import { parseCsv } from '../../src/server/seed/csv';
import { extractPeople, roleForCode, seedGennadi, tradesFromRows } from '../../src/server/seed/gennadi';

// Same layout as the real References CSV; made-up people, no real contact details.
const REFERENCES_CSV = [
  'Thematic Group,,Status,,Priority,,Completion %,,Owner Initials,Owner Full Name,,Full Name,Initials,Email,Phone',
  'Group A,,Proposed,,None,,0%,,OWN,Owner short,,Owner Person,OWN,own@example.com,+30 210 0000000',
  'Group B,,Issued,,Low,,10%,,ARCH-XY,Architect short,,Architect Person,ARCH-XY,arch@example.com,',
  'Group C,,,,,,,,C-PB,Main short,,Main Contractor Ltd,C-PB,,',
  'Group D,,,,,,,,C-AB,"Sub, owner list only",,Sub Contact,C-CD,sub@example.com,',
  'Group E,,,,,,,,SUP,Supplier,,Project Supplier,SUP,,',
  'Group F,,,,,,,,O3P,Other 3rd Party,,Third Party,O3P,,',
  'Group G,,,,,,,,,,,,,,',
].join('\r\n');

const TRADE_ROWS = [
  ['code_en', 'english_one_word', 'english_description', 'greek_one_word', 'greek_description', 'notes'],
  ['CAR', 'Carpentry', 'Interior carpentry.', 'Ξυλουργικά', 'Εσωτερικά ξυλουργικά.', ''],
  ['LVS', 'Low Voltage', 'Low-voltage systems.', 'Ασθενή', 'Ασθενή ρεύματα, δίκτυα.', 'a note'],
  ['', '', '', '', '', ''],
];

let db: Db;
beforeEach(() => {
  db = openDatabase(':memory:');
  migrate(db, { backupsDir: 'unused' });
});

afterEach(() => db.close());

const sources = () => ({ people: extractPeople(parseCsv(REFERENCES_CSV)), trades: tradesFromRows(TRADE_ROWS) });

describe('seed sources', () => {
  it('parses quoted CSV fields, CRLF line ends and a byte-order mark', () => {
    expect(parseCsv('\uFEFFa,"b, c","d ""e"""\r\n1,,3\r\n')).toEqual([
      ['a', 'b, c', 'd "e"'],
      ['1', '', '3'],
    ]);
  });

  it('merges the contact table and the owner table of the References CSV by code', () => {
    expect(extractPeople(parseCsv(REFERENCES_CSV))).toEqual([
      { code: 'OWN', name: 'Owner Person', email: 'own@example.com', phone: '+30 210 0000000' },
      { code: 'ARCH-XY', name: 'Architect Person', email: 'arch@example.com', phone: null },
      { code: 'C-PB', name: 'Main Contractor Ltd', email: null, phone: null },
      { code: 'C-CD', name: 'Sub Contact', email: 'sub@example.com', phone: null },
      { code: 'SUP', name: 'Project Supplier', email: null, phone: null },
      { code: 'O3P', name: 'Third Party', email: null, phone: null },
      { code: 'C-AB', name: 'Sub, owner list only', email: null, phone: null },
    ]);
  });

  it('maps roles from code prefixes and reads trades by column name', () => {
    expect(['ARCH-XY', 'C-PB', 'C-CD', 'SUP', 'O3P', 'OWN'].map(roleForCode)).toEqual([
      'architect',
      'main_contractor',
      'subcontractor',
      'supplier',
      'other',
      null,
    ]);
    expect(tradesFromRows(TRADE_ROWS)).toEqual([
      { code: 'CAR', nameEn: 'Carpentry', nameEl: 'Ξυλουργικά', defEn: 'Interior carpentry.', defEl: 'Εσωτερικά ξυλουργικά.' },
      { code: 'LVS', nameEn: 'Low Voltage', nameEl: 'Ασθενή', defEn: 'Low-voltage systems.', defEl: 'Ασθενή ρεύματα, δίκτυα.' },
    ]);
  });
});

describe('seedGennadi (design §15)', () => {
  it('loads people, trades, zone types, tags and the location tree', () => {
    const summary = seedGennadi(db, sources());
    expect(summary).toEqual({
      projectId: expect.any(Number),
      projectCode: 'cbg2401',
      people: 7,
      trades: 2,
      zoneTypes: 13,
      tags: 25,
      locations: 93,
      peopleWithoutRole: ['OWN'],
    });
    const people = listPeople(db, summary.projectId);
    expect(people.find((person) => person.code === 'OWN')).toMatchObject({ role: 'other', email: 'own@example.com' });
    expect(people.find((person) => person.code === 'C-AB')).toMatchObject({ role: 'subcontractor', email: null });
    expect(listTrades(db, summary.projectId).find((trade) => trade.code === 'LVS')?.nameEl).toBe('Ασθενή ρεύματα');
  });

  it('builds Villa 1 once and copies it to Villas 2 and 3', () => {
    const { projectId } = seedGennadi(db, sources());
    const nodes = listLocations(db, projectId);
    const childrenOf = (id: number | null) => nodes.filter((node) => node.parentId === id);
    const roots = childrenOf(null);
    expect(roots.map((node) => node.nameEl)).toEqual(['Γεννάδι 822Α']);
    const top = childrenOf(roots[0]!.id);
    expect(top.map((node) => node.nameEn)).toEqual([
      'Villa 1',
      'Villa 2',
      'Villa 3',
      'Site — shared infrastructure',
      'Off-site — supplier fabrication',
    ]);
    const shape = (villaId: number) =>
      childrenOf(villaId).map((level) => ({
        level: level.nameEn,
        spaces: childrenOf(level.id).map((space) => `${space.nameEn}:${space.zoneTypeId}`),
      }));
    expect(shape(top[0]!.id).map((level) => level.level)).toEqual(['Basement', 'Ground', 'Upper', 'Roof', 'External']);
    expect(shape(top[1]!.id)).toEqual(shape(top[0]!.id));
    expect(shape(top[2]!.id)).toEqual(shape(top[0]!.id));
    const kitchen = listZoneTypes(db, projectId).find((zone) => zone.nameEn === 'Kitchen');
    expect(nodes.filter((node) => node.zoneTypeId === kitchen?.id)).toHaveLength(3);
  });

  it('runs only once and leaves nothing behind when it fails', () => {
    seedGennadi(db, sources());
    expect(() => seedGennadi(db, sources())).toThrow('already exists');

    const fresh = openDatabase(':memory:');
    migrate(fresh, { backupsDir: 'unused' });
    const broken = {
      ...sources(),
      trades: [...tradesFromRows(TRADE_ROWS), { code: 'CAR', nameEn: 'Duplicate', nameEl: '', defEn: '', defEl: '' }],
    };
    expect(() => seedGennadi(fresh, broken)).toThrow();
    expect(fresh.prepare('SELECT COUNT(*) FROM projects').pluck().get()).toBe(0);
    fresh.close();
  });
});
