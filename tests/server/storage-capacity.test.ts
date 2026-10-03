import { beforeEach, afterEach, expect, it, vi } from 'vitest';
import * as fs from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { Readable } from 'node:stream';
import { openStorageCapacity } from '../../src/server/files/capacity';
import { stageFile, publishFile, discardStaged } from '../../src/server/files/storage';
vi.mock('node:fs/promises', async original => ({...await original<typeof import('node:fs/promises')>()}));
let dir: string;
beforeEach(async()=>{dir=await fs.mkdtemp(join(tmpdir(),'bb-capacity-'));});
afterEach(async()=>{vi.restoreAllMocks();await fs.rm(dir,{recursive:true,force:true});});
const policy={budgetBytes:100,freeReserveBytes:1};
const pdf=Buffer.concat([Buffer.from('%PDF-1.7\n'),Buffer.alloc(31)]);
it('counts actual retained orphans and stale temporary bytes on every startup',async()=>{
 await fs.mkdir(join(dir,'.tmp')); await fs.writeFile(join(dir,'.tmp','stale'),Buffer.alloc(10));
 await fs.writeFile(join(dir,'orphan'),Buffer.alloc(30));
 const capacity=await openStorageCapacity(dir,policy);
 await expect(capacity.reserve('61')).rejects.toMatchObject({statusCode:507,code:'storage_capacity'});
 const slot=await capacity.reserve('60');slot.release();
});
it('reserves concurrent requests before awaiting filesystem probes and releases admission failures',async()=>{
 const capacity=await openStorageCapacity(dir,policy);
 const first=await capacity.reserve('60');
 await expect(capacity.reserve('41')).rejects.toMatchObject({statusCode:507});
 first.release();first.release();
 const next=await capacity.reserve('100');next.release();
 vi.spyOn(fs,'statfs').mockRejectedValueOnce(new Error('private disk path'));
 await expect(capacity.reserve('100')).rejects.toMatchObject({statusCode:507,code:'storage_capacity'});
 const afterFailure=await capacity.reserve('100');afterFailure.release();
});
it('protects the physical free-space reserve including pending uploads',async()=>{
 const capacity=await openStorageCapacity(dir,{budgetBytes:1000,freeReserveBytes:100});
 vi.spyOn(fs,'statfs').mockResolvedValue({bavail:200n,bsize:1n} as never);
 const first=await capacity.reserve('60');
 await expect(capacity.reserve('41')).rejects.toMatchObject({statusCode:507});
 first.release();const next=await capacity.reserve('100');next.release();
});
it('charges a newly published orphan once across concurrent identical uploads',async()=>{
 const capacity=await openStorageCapacity(dir,policy);
 const a=await capacity.reserve('50');const b=await capacity.reserve('50');
 const fa=await stageFile(dir,Readable.from([pdf]),'a.pdf','attachment');
 const fb=await stageFile(dir,Readable.from([pdf]),'b.pdf','attachment');
 await Promise.all([publishFile(dir,fa,a.retained),publishFile(dir,fb,b.retained)]);
 a.release();b.release();
 await expect(capacity.reserve('61')).rejects.toMatchObject({statusCode:507});
 const next=await capacity.reserve('60');next.release();
 const restarted=await openStorageCapacity(dir,policy);
 await expect(restarted.reserve('61')).rejects.toMatchObject({statusCode:507});
});
it('records the hardlink before a later publish cleanup failure and fails closed on unknown staging cleanup',async()=>{
 const capacity=await openStorageCapacity(dir,policy);const slot=await capacity.reserve('60');
 const file=await stageFile(dir,Readable.from([pdf]),'a.pdf','attachment');
 vi.spyOn(fs,'unlink').mockRejectedValueOnce(new Error('forced unlink failure'));
 await expect(publishFile(dir,file,slot.retained)).rejects.toThrow('forced unlink');
 await discardStaged(file);slot.release();
 await expect(capacity.reserve('61')).rejects.toMatchObject({statusCode:507});
 const second=await capacity.reserve('60');second.cleanupFailed();second.release();
 await expect(capacity.reserve('1')).rejects.toMatchObject({statusCode:507});
});
it('distinguishes malformed and oversized envelopes from storage admission',async()=>{
 const capacity=await openStorageCapacity(dir,{budgetBytes:200_000_000,freeReserveBytes:1});
 await expect(capacity.reserve('100000001')).rejects.toMatchObject({statusCode:413});
 await expect(capacity.reserve('-1')).rejects.toMatchObject({statusCode:400});
 const chunked=await capacity.reserve(undefined);expect(chunked.maxBodyBytes).toBe(100_000_000);chunked.release();
});
it('prevents two admissions from spending capacity while the first statfs probe is pending',async()=>{
 const capacity=await openStorageCapacity(dir,policy);
 let finish!:(value:never)=>void;
 vi.spyOn(fs,'statfs').mockImplementationOnce(()=>new Promise(resolve=>{finish=resolve as typeof finish;}) as never);
 const firstPromise=capacity.reserve('60');
 await expect(capacity.reserve('41')).rejects.toMatchObject({statusCode:507});
 finish({bavail:1000n,bsize:1n} as never);
 const first=await firstPromise;first.release();
 const after=await capacity.reserve('100');after.release();
});
it('fails closed if staging cleanup becomes uncertain while another admission probes free space',async()=>{
 const capacity=await openStorageCapacity(dir,policy);const first=await capacity.reserve('40');
 let finish!:(value:never)=>void;
 vi.spyOn(fs,'statfs').mockImplementationOnce(()=>new Promise(resolve=>{finish=resolve as typeof finish;}) as never);
 const second=capacity.reserve('40');first.cleanupFailed();first.release();
 finish({bavail:1000n,bsize:1n} as never);
 await expect(second).rejects.toMatchObject({statusCode:507});
});
