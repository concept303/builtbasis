import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import * as fs from 'node:fs/promises';
import { mkdir, readdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { buildApp } from '../../src/server/app';
import { createContributor } from '../../src/server/auth/contributors';
import { createSession } from '../../src/server/auth/sessions';
import { OWNER, get } from './helpers';
import { forceStatus, makeFixture, postRecord, recordUrl, type Fixture } from './record-fixture';
import { multipart, PDF } from './file-fixture';
let f:Fixture;let id:number;
vi.mock('node:fs/promises', async original => ({...await original<typeof import('node:fs/promises')>()}));
beforeEach(async()=>{f=await makeFixture();id=(await postRecord(f,{subtype:'task',title:'Capacity'})).id;});
afterEach(async()=>{vi.restoreAllMocks();await f.ctx.app.close();await f.ctx.close();});
const form=()=>multipart([{name:'metadata',data:'{}'},{name:'file',filename:'a.pdf',data:PDF}]);
async function restart(budget:number){await f.ctx.app.close();f.ctx.config={...f.ctx.config,filesStorageBudgetBytes:budget,filesFreeReserveBytes:1};f.ctx.app=await buildApp({db:f.ctx.db,config:f.ctx.config});}
function upload(cookie=f.cookie,url=recordUrl(f,id,'/attachments'),payload=form()){
 return f.ctx.app.inject({method:'POST',url,headers:{cookie,origin:f.ctx.origin,'content-type':payload.contentType},payload:payload.body});
}
it('requires explicit HTTP capacity configuration while preserving offline config use',async()=>{
 for(const missing of ['filesStorageBudgetBytes','filesFreeReserveBytes']) {
  const outcome=await buildApp({db:f.ctx.db,config:{...f.ctx.config,[missing]:null}}).then(async app=>{await app.close();return 'started';},error=>(error as Error).message);
  expect(outcome).toBe('storage_configuration_required');
 }
});
it('rejects owner and granted contributor uploads uniformly with 507 while authorization still precedes admission',async()=>{
 forceStatus(f,id,'open');const user=createContributor(f.ctx.db,'u','Builder',OWNER.password);
 const cookie=`bb_session=${createSession(f.ctx.db,user).token}`;
 f.ctx.db.prepare('INSERT INTO record_grants VALUES (?,?,1,0)').run(id,user);
 await restart(1);
 expect((await upload('')).statusCode).toBe(401);
 for(const [session,url] of [[f.cookie,recordUrl(f,id,'/attachments')],[cookie,`/api/assigned-records/${id}/attachments`]]){
  const res=await upload(session,url);expect(res.statusCode).toBe(507);expect(res.json()).toEqual({error:'storage_capacity'});
 }
 expect((await get(f.ctx,f.cookie,recordUrl(f,id))).statusCode).toBe(200);
 expect(f.ctx.db.prepare('SELECT count(*) FROM attachments').pluck().get()).toBe(0);
});
it('releases a failed parse reservation so a subsequent valid request succeeds',async()=>{
 await restart(2000);
 const invalid=multipart([{name:'metadata',data:'{bad'},{name:'file',filename:'a.pdf',data:PDF}]);
 expect((await upload(f.cookie,undefined,invalid)).statusCode).toBe(400);
 expect((await upload()).statusCode).toBe(201);
 expect(await readdir(join(f.ctx.config.filesDir,'.tmp'))).toEqual([]);
});
it('retains charges for published orphan bytes after a database failure and across restart',async()=>{
 await restart(form().body.length);
 f.ctx.db.exec("CREATE TRIGGER fail_touch BEFORE UPDATE ON records BEGIN SELECT RAISE(ABORT,'forced'); END");
 expect((await upload()).statusCode).toBe(500);
 f.ctx.db.exec('DROP TRIGGER fail_touch');
 expect(f.ctx.db.prepare('SELECT count(*) FROM blobs').pluck().get()).toBe(0);
 expect((await upload()).statusCode).toBe(507);
 await restart(form().body.length);expect((await upload()).statusCode).toBe(507);
});
it('starts over-budget stores for reads and counts unmanaged retained files before accepting uploads',async()=>{
 await f.ctx.app.close();await mkdir(f.ctx.config.filesDir,{recursive:true});await writeFile(join(f.ctx.config.filesDir,'retained-orphan'),Buffer.alloc(1000));
 f.ctx.config={...f.ctx.config,filesStorageBudgetBytes:100,filesFreeReserveBytes:1};f.ctx.app=await buildApp({db:f.ctx.db,config:f.ctx.config});
 expect((await get(f.ctx,f.cookie,recordUrl(f,id))).statusCode).toBe(200);
 expect((await upload()).statusCode).toBe(507);
});
it('does not let actual bytes overrun a smaller Content-Length reservation',async()=>{
 await restart(2000);const body=form();
 const response=await f.ctx.app.inject({method:'POST',url:recordUrl(f,id,'/attachments'),headers:{cookie:f.cookie,origin:f.ctx.origin,'content-type':body.contentType,'content-length':'10'},payload:body.body});
 expect(response.statusCode).toBe(413);expect(f.ctx.db.prepare('SELECT count(*) FROM attachments').pluck().get()).toBe(0);
 expect((await upload()).statusCode).toBe(201);
});
it('fails closed after an actual temporary-file cleanup failure and never forgets leftover bytes',async()=>{
 await restart(2000);
 const invalid=multipart([{name:'file',filename:'a.pdf',data:PDF},{name:'metadata',data:'{bad'}]);
 vi.spyOn(fs,'unlink').mockRejectedValue(new Error('private cleanup location'));
 const rejected=await upload(f.cookie,undefined,invalid);
 expect(rejected.statusCode).toBe(507);expect(rejected.json()).toEqual({error:'storage_capacity'});
 vi.restoreAllMocks();expect((await upload()).statusCode).toBe(507);
 expect((await readdir(join(f.ctx.config.filesDir,'.tmp'))).length).toBe(1);
});
it.each(['ENOSPC','EDQUOT'])('returns 507 for %s during staging and releases the cleaned reservation',async code=>{
 await restart(2000);
 const originalOpen=fs.open;
 vi.spyOn(fs,'open').mockImplementation(async(...args:Parameters<typeof originalOpen>)=>{
  const handle=await originalOpen(...args);
  vi.spyOn(handle,'write').mockRejectedValueOnce(Object.assign(new Error('private disk details'),{code}));
  return handle;
 });
 const res=await upload();expect(res.statusCode).toBe(507);expect(res.json()).toEqual({error:'storage_capacity'});
 vi.restoreAllMocks();expect(await readdir(join(f.ctx.config.filesDir,'.tmp'))).toEqual([]);
 expect((await upload()).statusCode).toBe(201);
});
