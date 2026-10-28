import {describe,expect,it} from 'vitest';
import {MemoryVaultStorage} from '../../src/modules/vault/storage';
import {GuidedCardStore} from '../../src/modules/card/guided-store';
import type {GuidedCardRecord} from '../../src/modules/card/guided-store';
import type {LocalDraft} from '../../src/domain/types';

const draft:LocalDraft={id:'guided_card_1',profileRevision:1,config:{schemaVersion:1,id:'guided_card_1',kind:'manual',label:'AI 名片草稿',templateId:'soft-signal',layout:'editorial',animation:'float',orderedModules:[],createdAt:'2026-10-28T00:00:00.000Z',updatedAt:'2026-10-28T00:00:00.000Z'},identity:{name:'Example'},modules:[],assets:[]};
const record:GuidedCardRecord={id:draft.id,draft,purposeLabel:'商务合作',audienceLabel:'创业公司负责人',selection:{identity:['name'],fields:[],assetIds:[]},createdAt:'2026-10-28T00:00:00.000Z'};

describe('GuidedCardStore',()=>{
  it('persists separate card snapshots without placing private purpose labels in public projection',async()=>{
    const store=new GuidedCardStore(new MemoryVaultStorage());
    await store.save(record);
    expect(await store.list()).toEqual([record]);
  });
  it('can delete one snapshot without changing other cards',async()=>{
    const store=new GuidedCardStore(new MemoryVaultStorage());
    await store.save(record);
    await store.save({...record,id:'guided_card_2',draft:{...draft,id:'guided_card_2',config:{...draft.config,id:'guided_card_2'}}});
    await store.remove(record.id);
    expect((await store.list()).map(item=>item.id)).toEqual(['guided_card_2']);
  });
});
