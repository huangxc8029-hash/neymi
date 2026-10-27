import {describe,expect,it} from 'vitest';
import {MemoryVaultStorage} from '../../src/modules/vault/storage';
import {createVault} from '../../src/modules/vault/vault';
import {CONTACT_MODULE_ID,contactItems} from '../../src/modules/card/contacts';
import {createManualDraft} from '../../src/modules/card/create';
import {projectShare} from '../../src/modules/sharing/projection';
import {serializeNcard,serializeVcard} from '../../src/modules/sharing/export';
import {makeProfile} from '../fixtures/domain';

const values={email:'lin@example.org',phone:'+1 415 555 0100',wechat:'lin_wechat',whatsapp:'+44 7700 900123',address:'上海市徐汇区'};
const config={schemaVersion:1 as const,id:'card_contact',kind:'manual' as const,label:'名片',templateId:'plain',layout:'editorial' as const,animation:'float' as const,
  orderedModules:[{localModuleId:CONTACT_MODULE_ID,kind:'contact',emphasis:'normal' as const}],createdAt:'2026-10-25T00:00:00.000Z',updatedAt:'2026-10-25T00:00:00.000Z'};

describe('encrypted contact card',()=>{
  it('keeps all five contacts encrypted while ordinary editing works locked',async()=>{
    const storage=new MemoryVaultStorage(),vault=createVault(storage);
    await vault.saveOrdinaryProfile(makeProfile());await vault.initialize('correct horse battery');
    await vault.saveContacts(values);
    const raw=await storage.dumpSerialized();
    for(const value of Object.values(values))expect(raw).not.toContain(value);
    expect((await vault.loadPublicProfile()).modules.find(section=>section.id===CONTACT_MODULE_ID)?.items).toEqual([]);
    vault.lock();
    const updated={...await vault.loadPublicProfile(),revision:3,identity:{name:'Changed'}};
    await vault.saveOrdinaryProfile(updated);
    await expect(vault.readContacts()).rejects.toMatchObject({code:'PERMISSION_DENIED'});
    await vault.unlock('correct horse battery');
    expect(await vault.readContacts()).toEqual(values);
  });

  it('exports only the contact explicitly selected for sharing',async()=>{
    const vault=createVault(new MemoryVaultStorage());await vault.saveOrdinaryProfile(makeProfile());
    await vault.initialize('correct horse battery');const profile=await vault.saveContacts(values);
    const base=createManualDraft(profile,config),draft={...base,modules:[{id:CONTACT_MODULE_ID,kind:'contact',title:'联系方式',items:contactItems(await vault.readContacts())}]};
    const projection=projectShare(draft,{identity:['name'],fields:[{moduleId:CONTACT_MODULE_ID,itemId:'contact_email'}],assetIds:[]});
    const json=new TextDecoder().decode(serializeNcard(projection)),vcard=new TextDecoder().decode(serializeVcard(projection));
    expect(json).toContain(values.email);expect(vcard).toContain(`EMAIL:${values.email}`);
    for(const value of [values.phone,values.wechat,values.whatsapp,values.address]){expect(json).not.toContain(value);expect(vcard).not.toContain(value);}
    const social=projectShare(draft,{identity:['name'],fields:[{moduleId:CONTACT_MODULE_ID,itemId:'contact_wechat'}],assetIds:[]});
    expect(new TextDecoder().decode(serializeVcard(social))).toContain(`NOTE:微信: ${values.wechat}`);
    const address=projectShare(draft,{identity:['name'],fields:[{moduleId:CONTACT_MODULE_ID,itemId:'contact_address'}],assetIds:[]});
    expect(new TextDecoder().decode(serializeVcard(address))).toContain(`ADR:;;${values.address};;;;`);
  });

  it('rejects malformed contact values before encryption',()=>{
    expect(()=>contactItems({...values,email:'bad-address'})).toThrow();
    expect(()=>contactItems({...values,whatsapp:'not-a-number'})).toThrow();
  });
});
