import type { PersonRole } from '../../domain';
import type { Db } from '../db/connection';
import { copyBranch, createLocation } from '../lists/locations';
import { createPerson } from '../lists/people';
import { createProject, findProjectByCode } from '../lists/projects';
import { createTag } from '../lists/tags';
import { createTrade } from '../lists/trades';
import { createZoneType } from '../lists/zone-types';
import {
  GENNADI_PROJECT,
  OTHER_TOP_LEVEL,
  PROJECT_ROOT,
  TAGS,
  TRADE_OVERRIDES,
  VILLA_LEVELS,
  VILLA_NAMES,
  ZONE_TYPES,
  type ZoneKey,
} from './gennadi-data';

export interface SeedPerson {
  code: string;
  name: string;
  email: string | null;
  phone: string | null;
}

export interface SeedTrade {
  code: string;
  nameEn: string;
  nameEl: string;
  defEn: string;
  defEl: string;
}

export interface SeedSummary {
  projectId: number;
  projectCode: string;
  people: number;
  trades: number;
  zoneTypes: number;
  tags: number;
  locations: number;
  /** Codes no prefix rule matched: stored as "other"; the owner sets owner / owner's representative by hand. */
  peopleWithoutRole: string[];
}

const cell = (row: readonly string[], index: number): string => (row[index] ?? '').trim();

function columnFinder(header: readonly string[], source: string): (name: string) => number {
  return (name) => {
    const index = header.findIndex((value) => value.trim() === name);
    if (index < 0) throw new Error(`${source}: column "${name}" not found`);
    return index;
  };
}

/** Role from the code prefix (design §15); null when no rule applies. */
export function roleForCode(code: string): PersonRole | null {
  if (code.startsWith('ARCH')) return 'architect';
  if (code === 'C-PB') return 'main_contractor';
  if (code.startsWith('C-')) return 'subcontractor';
  if (code.startsWith('SUP')) return 'supplier';
  if (code.startsWith('O3P')) return 'other';
  return null;
}

/**
 * People from the References CSV. Its contact table (Full Name, Initials, Email, Phone) and owner table
 * (Owner Initials, Owner Full Name) do not line up row by row, so they are merged by code.
 */
export function extractPeople(rows: readonly (readonly string[])[]): SeedPerson[] {
  const column = columnFinder(rows[0] ?? [], 'References CSV');
  const initials = column('Initials');
  const fullName = column('Full Name');
  const email = column('Email');
  const phone = column('Phone');
  const ownerCode = column('Owner Initials');
  const ownerName = column('Owner Full Name');
  const people = new Map<string, SeedPerson>();
  for (const row of rows.slice(1)) {
    const code = cell(row, initials);
    if (code !== '' && !people.has(code)) {
      people.set(code, {
        code,
        name: cell(row, fullName) || code,
        email: cell(row, email) || null,
        phone: cell(row, phone) || null,
      });
    }
  }
  for (const row of rows.slice(1)) {
    const code = cell(row, ownerCode);
    if (code !== '' && !people.has(code)) {
      people.set(code, { code, name: cell(row, ownerName) || code, email: null, phone: null });
    }
  }
  return [...people.values()];
}

/** Trades from the Trades sheet, read by column name; rows without a code are skipped. */
export function tradesFromRows(rows: readonly (readonly string[])[]): SeedTrade[] {
  const column = columnFinder(rows[0] ?? [], 'Trades sheet');
  const code = column('code_en');
  const nameEn = column('english_one_word');
  const defEn = column('english_description');
  const nameEl = column('greek_one_word');
  const defEl = column('greek_description');
  return rows
    .slice(1)
    .map((row) => ({
      code: cell(row, code),
      nameEn: cell(row, nameEn),
      nameEl: cell(row, nameEl),
      defEn: cell(row, defEn),
      defEl: cell(row, defEl),
    }))
    .filter((trade) => trade.code !== '');
}

/** Creates the Gennadi 822A project with its managed lists in one transaction; refuses to run twice. */
export function seedGennadi(
  db: Db,
  sources: { people: readonly SeedPerson[]; trades: readonly SeedTrade[] },
): SeedSummary {
  return db.transaction((): SeedSummary => {
    if (findProjectByCode(db, GENNADI_PROJECT.code)) {
      throw new Error(`Project ${GENNADI_PROJECT.code} already exists; the seed runs only once`);
    }
    const project = createProject(db, GENNADI_PROJECT);

    const peopleWithoutRole: string[] = [];
    for (const person of sources.people) {
      const role = roleForCode(person.code);
      if (role === null) peopleWithoutRole.push(person.code);
      createPerson(db, project.id, { ...person, role: role ?? 'other' });
    }
    for (const trade of sources.trades) createTrade(db, project.id, { ...trade, ...TRADE_OVERRIDES[trade.code] });

    const zoneIds = new Map<ZoneKey, number>();
    for (const zone of ZONE_TYPES) {
      zoneIds.set(zone.key, createZoneType(db, project.id, { nameEn: zone.nameEn, nameEl: zone.nameEl }).id);
    }
    for (const tag of TAGS) createTag(db, project.id, tag);

    // Build Villa 1 once, then copy it (design §15).
    const root = createLocation(db, project.id, { kind: 'other', ...PROJECT_ROOT });
    const [firstVilla, ...otherVillas] = VILLA_NAMES;
    const villa = createLocation(db, project.id, { parentId: root.id, kind: 'building', ...firstVilla });
    for (const level of VILLA_LEVELS) {
      const levelNode = createLocation(db, project.id, {
        parentId: villa.id,
        kind: 'level',
        nameEn: level.nameEn,
        nameEl: level.nameEl,
      });
      for (const space of level.spaces) {
        createLocation(db, project.id, {
          parentId: levelNode.id,
          kind: 'space',
          zoneTypeId: zoneIds.get(space.zone),
          nameEn: space.nameEn,
          nameEl: space.nameEl,
        });
      }
    }
    for (const names of otherVillas) copyBranch(db, project.id, villa.id, names);
    for (const names of OTHER_TOP_LEVEL) createLocation(db, project.id, { parentId: root.id, kind: 'building', ...names });

    const count = (table: string): number =>
      db.prepare(`SELECT COUNT(*) FROM ${table} WHERE project_id = ?`).pluck().get(project.id) as number;
    return {
      projectId: project.id,
      projectCode: project.code,
      people: count('people'),
      trades: count('trades'),
      zoneTypes: count('zone_types'),
      tags: count('tags'),
      locations: count('location_nodes'),
      peopleWithoutRole,
    };
  })();
}
