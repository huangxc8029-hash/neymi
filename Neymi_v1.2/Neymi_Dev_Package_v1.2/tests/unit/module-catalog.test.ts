import {describe,expect,it} from 'vitest';
import {canAddFreeModule,legacyModuleKindMap,moduleCatalog,moveModule,moduleCatalogGroups,updateModuleItem} from '../../src/modules/card/module-catalog';
import {makeProfile} from '../fixtures/domain';
import {createVault} from '../../src/modules/vault/vault';
import {MemoryVaultStorage} from '../../src/modules/vault/storage';
import {exportBackup,importBackup} from '../../src/modules/vault/backup';

describe('free module additions preserve existing content',()=>{
  it('groups modules by user goals and permits multiple project cases within the project slot',()=>{
    const projects=makeProfile({modules:[{id:'project_one',kind:'project',title:'One',items:[]}]});
    expect(moduleCatalogGroups).toEqual(['认识我','我能提供什么','我的证明','我的观点','与我合作','个人特点与联系']);
    expect(canAddFreeModule(projects,'project')).toBe(true);
    expect(legacyModuleKindMap).toMatchObject({story:'my_story',project:'project_case',services:'service',portfolio:'portfolio_gallery',skills:'skills',collaboration:'collaboration_style',availability:'availability',social:'social_links',website:'website',booking:'booking_link'});
    expect(moveModule(projects,'project_one','up').modules).toEqual(projects.modules);
  });
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
