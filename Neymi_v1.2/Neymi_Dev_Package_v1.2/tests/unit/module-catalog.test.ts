import {describe,expect,it} from 'vitest';
import {canAddFreeModule,moduleCatalog,updateModuleItem} from '../../src/modules/card/module-catalog';
import {makeProfile} from '../fixtures/domain';
import {createVault} from '../../src/modules/vault/vault';
import {MemoryVaultStorage} from '../../src/modules/vault/storage';
import {exportBackup,importBackup} from '../../src/modules/vault/backup';

describe('free module additions preserve existing content',()=>{
  it('allows one content module and one external record, blocks additional or planned modules',()=>{
    const empty=makeProfile({modules:[]});
    for(const kind of ['story','project','website','social'])expect(canAddFreeModule(empty,kind)).toBe(true);
    expect(canAddFreeModule(empty,'services')).toBe(false);
    const occupied=makeProfile({modules:[{id:'old',kind:'custom',title:'Existing',items:[]},{id:'link',kind:'social',title:'Social',items:[]}]});
    for(const kind of ['story','project','website','social'])expect(canAddFreeModule(occupied,kind)).toBe(false);
    expect(moduleCatalog.filter(entry=>entry.availability!=='free').every(entry=>entry.example.length>0)).toBe(true);
    expect(empty.modules).toEqual([]);
  });
  it('editing one legacy item preserves every other item, metadata and unknown module through backup restore',async()=>{
    const profile=makeProfile();
    profile.modules.push({id:'custom',kind:'unknown_custom',title:'Legacy',items:[{id:'one',label:'First',value:'Before',sensitivity:'ordinary'},{id:'two',label:'Second',value:'KEEP_SECOND',sensitivity:'ordinary'}]});
    const updated=updateModuleItem(profile,'custom','one','After');
    expect(updated.modules[1].items[1]).toEqual(profile.modules[1].items[1]);
    expect(updated.modules[0]).toEqual(profile.modules[0]);
    expect(profile.modules[1].items[0].value).toBe('Before');
    const vault=createVault(new MemoryVaultStorage());await vault.saveOrdinaryProfile(updated);
    const backup=await exportBackup(vault,'correct horse battery');
    const restored=createVault(new MemoryVaultStorage());await importBackup(restored,backup,'correct horse battery');
    expect((await restored.loadPublicProfile()).modules).toEqual(updated.modules);
  });
});
