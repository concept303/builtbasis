import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { get, send } from './helpers';
import { makeFixture, postRecord, recordUrl, type Fixture } from './record-fixture';

let f: Fixture;
beforeEach(async () => {
  f = await makeFixture();
});
afterEach(async () => {
  await f.ctx.close();
});

describe('records and the request rules (design §11.5)', () => {
  it('GET requests never write anything', async () => {
    const qi = await postRecord(f, { subtype: 'quality_issue', title: 'Jamb', problemTypes: ['defect'] });
    await send(f.ctx, f.cookie, 'POST', recordUrl(f, qi.id, '/options'), { label: 'Grind' });
    await send(f.ctx, f.cookie, 'POST', recordUrl(f, qi.id, '/measurement-sets'), { date: '2026-09-14', phase: 'before' });
    await send(f.ctx, f.cookie, 'POST', recordUrl(f, qi.id, '/log'), { text: 'Seen on site' });
    await send(f.ctx, f.cookie, 'POST', recordUrl(f, qi.id, '/transitions'), { to: 'open' });

    const totalChanges = () => f.ctx.db.prepare('SELECT total_changes()').pluck().get();
    const before = totalChanges();
    const urls = [
      `${f.base}/records`,
      `${f.base}/records?q=jamb&sort=updated`,
      recordUrl(f, qi.id),
      ...['/activity', '/verifications', '/options', '/measurement-sets', '/log'].map((suffix) => recordUrl(f, qi.id, suffix)),
      `${f.base}/tags/${f.tags.stone}/usage`,
    ];
    for (const url of urls) expect((await get(f.ctx, f.cookie, url)).statusCode, url).toBe(200);
    expect(totalChanges()).toBe(before);
  });

  it('records routes need the owner session, and changes need the matching Origin', async () => {
    const record = await postRecord(f, { subtype: 'task' });
    const noSession = await f.ctx.app.inject({ method: 'GET', url: recordUrl(f, record.id) });
    expect(noSession.statusCode).toBe(401);
    const noOrigin = await f.ctx.app.inject({
      method: 'PATCH',
      url: recordUrl(f, record.id),
      headers: { cookie: f.cookie },
      payload: { title: 'x' },
    });
    expect(noOrigin.statusCode).toBe(403);
    const wrongOrigin = await f.ctx.app.inject({
      method: 'POST',
      url: recordUrl(f, record.id, '/transitions'),
      headers: { cookie: f.cookie, origin: 'https://www.ktimanet.com' },
      payload: { to: 'cancelled', reasonCode: 'duplicate' },
    });
    expect(wrongOrigin.statusCode).toBe(403);
  });
});
