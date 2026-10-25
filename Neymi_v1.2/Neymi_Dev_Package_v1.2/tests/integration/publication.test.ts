import {describe,expect,it} from 'vitest';
import {createHash} from 'node:crypto';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {PublicationService} from '../../src/modules/publication/service';
import {MemoryPublicationStore,SqlitePublicationStore} from '../../src/modules/publication/store';
import {confirmShare} from '../../src/modules/sharing/confirmation';
import {makeDraft,makeSelection} from '../fixtures/domain';
import {projectShare} from '../../src/modules/sharing/projection';

const now='2026-10-25T00:00:00.000Z',secret='publication-test-secret-which-is-long-enough-32';
const service=()=>new PublicationService(new MemoryPublicationStore(),{secret,baseUrl:'https://cards.example',ttlMs:30*24*60*60*1000});
const setup=async()=>{const value=service(),projection=projectShare(makeDraft(),makeSelection()),confirmation=await confirmShare(projection,'publish');
  confirmation.confirmedAt=now;return{value,projection,confirmation};};

describe('deliberate publication lifecycle',()=>{
  it('is idempotent per owner and key while rejecting changed content',async()=>{
    const{value,projection,confirmation}=await setup(),first=await value.publishCard('owner_a',projection,confirmation,'a'.repeat(40),now);
    const retry=await value.publishCard('owner_a',projection,confirmation,'a'.repeat(40),now);
    expect(retry.publication.publicId).toBe(first.publication.publicId);expect(retry.revokeToken).toBe(first.revokeToken);
    const changed={...projection,identity:{name:'Changed'}};
    await expect(value.publishCard('owner_a',changed,confirmation,'a'.repeat(40),now)).rejects.toThrow();
  });
  it('requires a matching publish confirmation, revocation secret, and expires snapshots',async()=>{
    const{value,projection,confirmation}=await setup(),receipt=await value.publishCard('owner_a',projection,confirmation,'b'.repeat(40),now);
    await expect(value.publishCard('owner_a',{...projection,identity:{name:'Edited'}},confirmation,'c'.repeat(40),now)).rejects.toThrow();
    await expect(value.revokePublication(receipt.publication.publicId,'wrong-token')).rejects.toThrow();
    const after='2026-11-25T00:00:01.000Z';expect(await value.expirePublications(after)).toBe(1);
    await expect(value.readPublication(receipt.publication.publicId,after)).rejects.toMatchObject({code:'EXPIRED'});
  });
  it('hashes revocation tokens and isolates owner idempotency keys',async()=>{
    const store=new MemoryPublicationStore(),value=new PublicationService(store,{secret,baseUrl:'https://cards.example'});
    const{projection,confirmation}=await setup(),first=await value.publishCard('owner_a',projection,confirmation,'d'.repeat(40),now);
    const second=await value.publishCard('owner_b',projection,confirmation,'d'.repeat(40),now);
    expect(second.publication.publicId).not.toBe(first.publication.publicId);
    const record=await store.get(first.publication.publicId);
    expect(record?.revokeHash).toBe(createHash('sha256').update(first.revokeToken).digest('hex'));
    expect(record?.revokeHash).not.toContain(first.revokeToken);
  });
  it('keeps snapshots in persistent SQLite storage across service instances',async()=>{
    const directory=mkdtempSync(join(tmpdir(),'neymi-publication-')),filename=join(directory,'store.sqlite');
    try{
      const{projection,confirmation}=await setup(),firstStore=new SqlitePublicationStore(filename);
      const firstService=new PublicationService(firstStore,{secret,baseUrl:'https://cards.example'});
      const receipt=await firstService.publishCard('owner',projection,confirmation,'e'.repeat(40),now);firstStore.close();
      const secondStore=new SqlitePublicationStore(filename),secondService=new PublicationService(secondStore,{secret,baseUrl:'https://cards.example'});
      expect(await secondService.readPublication(receipt.publication.publicId,now)).toEqual(projection);
      await secondService.revokePublication(receipt.publication.publicId,receipt.revokeToken,now);
      await expect(secondService.readPublication(receipt.publication.publicId,now)).rejects.toMatchObject({code:'NOT_FOUND'});
      secondStore.close();
    }finally{rmSync(directory,{recursive:true,force:true});}
  });
});
