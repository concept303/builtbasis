import type { FastifyInstance } from 'fastify';
import { TradeCreate, TradePatch, type TradeCreateInput, type TradePatchInput } from '../../domain';
import type { Db } from '../db/connection';
import { rethrowUnique } from '../db/sqlite-errors';
import { updateColumns } from '../db/update';
import { HttpError } from '../errors';
import { ItemParams, ProjectParams } from '../http/params';
import { assertHasAName } from './names';
import { requireProject } from './projects';

export interface Trade {
  id: number;
  code: string;
  nameEn: string;
  nameEl: string;
  defEn: string;
  defEl: string;
  /** Retired trades stay on existing records but are not offered for new selections (design §9.2). */
  active: boolean;
}

type TradeRow = Omit<Trade, 'active'> & { active: number };
const SELECT =
  'SELECT id, code, name_en AS nameEn, name_el AS nameEl, def_en AS defEn, def_el AS defEl, active FROM trades';
const toTrade = (row: TradeRow): Trade => ({ ...row, active: row.active === 1 });

export function listTrades(db: Db, projectId: number): Trade[] {
  return (db.prepare(`${SELECT} WHERE project_id = ? ORDER BY code`).all(projectId) as TradeRow[]).map(toTrade);
}

export function getTrade(db: Db, projectId: number, id: number): Trade {
  const row = db.prepare(`${SELECT} WHERE project_id = ? AND id = ?`).get(projectId, id) as TradeRow | undefined;
  if (!row) throw new HttpError(404, 'trade_not_found');
  return toTrade(row);
}

export function createTrade(db: Db, projectId: number, input: TradeCreateInput): Trade {
  const names = { nameEn: input.nameEn ?? '', nameEl: input.nameEl ?? '' };
  assertHasAName(names);
  try {
    const info = db
      .prepare(
        'INSERT INTO trades (project_id, code, name_en, name_el, def_en, def_el, active) VALUES (?, ?, ?, ?, ?, ?, ?)',
      )
      .run(
        projectId,
        input.code,
        names.nameEn,
        names.nameEl,
        input.defEn ?? '',
        input.defEl ?? '',
        input.active === false ? 0 : 1,
      );
    return getTrade(db, projectId, Number(info.lastInsertRowid));
  } catch (error) {
    return rethrowUnique(error, 'code_taken');
  }
}

export function updateTrade(db: Db, projectId: number, id: number, patch: TradePatchInput): Trade {
  const current = getTrade(db, projectId, id);
  assertHasAName({ nameEn: patch.nameEn ?? current.nameEn, nameEl: patch.nameEl ?? current.nameEl });
  try {
    updateColumns(db, 'trades', projectId, id, {
      code: patch.code,
      name_en: patch.nameEn,
      name_el: patch.nameEl,
      def_en: patch.defEn,
      def_el: patch.defEl,
      active: patch.active === undefined ? undefined : Number(patch.active),
    });
  } catch (error) {
    rethrowUnique(error, 'code_taken');
  }
  return getTrade(db, projectId, id);
}

export function registerTradeRoutes(app: FastifyInstance, db: Db): void {
  app.get('/api/projects/:projectId/trades', async (request) => {
    const { projectId } = ProjectParams.parse(request.params);
    requireProject(db, projectId);
    return listTrades(db, projectId);
  });

  app.post('/api/projects/:projectId/trades', async (request, reply) => {
    const { projectId } = ProjectParams.parse(request.params);
    requireProject(db, projectId);
    return reply.status(201).send(createTrade(db, projectId, TradeCreate.parse(request.body)));
  });

  app.patch('/api/projects/:projectId/trades/:id', async (request) => {
    const { projectId, id } = ItemParams.parse(request.params);
    requireProject(db, projectId);
    return updateTrade(db, projectId, id, TradePatch.parse(request.body));
  });
}
