import {describe,expect,it} from 'vitest';
import {checkGrant,createGrant} from '../../src/modules/consent/local';
import {composeDraft} from '../../src/modules/card/compose';
import {PreparedStore} from '../../src/modules/prepared/store';
import {MemoryVaultStorage} from '../../src/modules/vault/storage';
import {createVault} from '../../src/modules/vault/vault';
import {makeGrant,makeManual,makeProfile,makeRecipe,makeSelection,timestamp} from '../fixtures/domain';
import {projectShare} from '../../src/modules/sharing/projection';
import {makeDraft} from '../fixtures/domain';

const request={profileId:'profile_demo',deviceId:'device_demo',cardId:'card_demo',fields:[{moduleId:'mod_project',itemId:'item_demo'}],identity:['name'] as Array<'name'|'company'|'role'>,assetIds:[],purpose:'Prepare a workshop card',operation:'compose_local' as const};

describe('scoped local composition and prepared cards',()=>{
  it('rejects expired, revoked, and out-of-scope grants',()=>{
    expect(()=>checkGrant(makeGrant({expiresAt:'2026-10-24T10:01:00.000Z'}),request,'2026-10-24T10:02:00.000Z')).toThrow();
    expect(()=>checkGrant(makeGrant({revokedAt:timestamp}),request,'2026-10-24T10:05:00.000Z')).toThrow();
    expect(()=>checkGrant(makeGrant({allowedFields:[]}),request,'2026-10-24T10:05:00.000Z')).toThrow();
  });
  it('reads only approved fields and identity after grant validation',async()=>{
    const vault=createVault(new MemoryVaultStorage()),profile=makeProfile();await vault.saveProfile(profile);
    const draft=await composeDraft(makeManual(),makeGrant(),vault,request,'2026-10-24T10:05:00.000Z');
    expect(draft.identity).toEqual({name:'Lin'});
    expect(draft.modules.flatMap(module=>module.items).map(item=>item.id)).toEqual(['item_demo']);
    await expect(composeDraft(makeManual(),makeGrant({revokedAt:timestamp}),vault,request,'2026-10-24T10:05:00.000Z')).rejects.toThrow();
    await expect(composeDraft(makeManual(),makeGrant(),vault,request,'2026-10-24T10:05:00.000Z',2)).rejects.toThrow('Profile changed; generate a new strategy first');
  });
  it('requires an unlocked vault and an explicit grant to read sensitive fields',async()=>{
    const vault=createVault(new MemoryVaultStorage());await vault.initialize('correct horse battery staple');
    const profile=makeProfile({modules:[{id:'mod_project',kind:'project',title:'Contact',items:[{id:'phone_item',label:'Phone',value:'+14155550199',valueKind:'phone',sensitivity:'sensitive'}]}]});
    await vault.saveProfile(profile);
    const scope={...request,fields:[{moduleId:'mod_project',itemId:'phone_item'}]},grant=createGrant(scope,timestamp);
    const draft=await composeDraft(makeManual(),grant,vault,scope,'2026-10-24T10:05:00.000Z');
    expect(draft.modules[0].items[0].value).toBe('+14155550199');
    vault.lock();await expect(composeDraft(makeManual(),grant,vault,scope,'2026-10-24T10:05:00.000Z')).rejects.toMatchObject({code:'PERMISSION_DENIED'});
  });
  it('keeps recipient labels local and marks older recipes stale',async()=>{
    const storage=new MemoryVaultStorage(),store=new PreparedStore(storage);
    await store.save(makeRecipe(),
      {cardId:'card_demo',recipientLabel:'Investor Lin',scenario:'Pitch meeting'},1);
    expect(await store.find('Investor')).toHaveLength(1);
    await store.markStale(2);
    expect((await store.find('Investor'))[0].status).toBe('stale');
    const projection=projectShare(makeDraft(),makeSelection());
    expect(JSON.stringify(projection)).not.toContain('Investor Lin');
  });
});
