import {describe,expect,it} from 'vitest';
import {importSharedCard} from '../../src/modules/sharing/import';
import {ReceivedCardsStore} from '../../src/modules/sharing/receiver-store';
import {cachePreparedCard,shareViaOS} from '../../src/modules/sharing/native';
import {cachePolicy} from '../../src/pwa/cache-policy';
import {serializeNcard} from '../../src/modules/sharing/export';
import {MemoryVaultStorage} from '../../src/modules/vault/storage';
import {createVault} from '../../src/modules/vault/vault';
import {makeDraft,makeProfile,makeProjection} from '../fixtures/domain';

describe('guest receiving and offline behavior',()=>{
  it('imports only valid data projections and stores them separately from the owner profile',async()=>{
    const projection=makeProjection(),received=await importSharedCard(serializeNcard(projection));
    expect(received).toEqual(projection);
    await expect(importSharedCard(new TextEncoder().encode('<script>alert(1)</script>'))).rejects.toThrow();
    const storage=new MemoryVaultStorage(),vault=createVault(storage),store=new ReceivedCardsStore(storage);
    await vault.saveProfile(makeProfile());await store.add(received,'2026-10-25T00:00:00.000Z');
    expect((await vault.loadPublicProfile()).facts).toHaveLength(1);
    expect(await store.list()).toHaveLength(1);
  });
  it('keeps offline prepared drafts encrypted inside the unlocked local vault',async()=>{
    const storage=new MemoryVaultStorage(),vault=createVault(storage);await vault.initialize('correct horse battery staple');await vault.saveProfile(makeProfile());
    const draft=makeDraft({modules:[{id:'mod_project',kind:'project',title:'Private',items:[{id:'item_demo',label:'Draft',value:'PRIVATE_DRAFT_SENTINEL',sensitivity:'ordinary'}]}]});
    await cachePreparedCard(draft,vault);expect(await storage.dumpSerialized()).not.toContain('PRIVATE_DRAFT_SENTINEL');vault.lock();
    await expect(vault.readPreparedDraft(draft.id)).rejects.toMatchObject({code:'PERMISSION_DENIED'});
    await vault.unlock('correct horse battery staple');expect(await vault.readPreparedDraft(draft.id)).toEqual(draft);
    await vault.saveProfile(makeProfile({revision:2}));expect(await vault.listPreparedDrafts()).toEqual([]);
  });
  it('never serves public snapshots or publication API from offline cache',()=>{
    expect(cachePolicy('/p/public-demo')).toBe('network-only');
    expect(cachePolicy('/v1/publications/public-demo')).toBe('network-only');
    expect(cachePolicy('/v1/publications/public-demo?token=secret')).toBe('network-only');
    expect(cachePolicy('/_next/static/app.js')).toBe('cache-first');
    expect(cachePolicy('/receive')).toBe('cache-first');
    expect(cachePolicy('/prepare')).toBe('cache-first');
  });
  it('uses the file fallback when the operating system share API is unavailable',async()=>{
    expect(await shareViaOS(makeProjection())).toBe('fallback');
  });
});
