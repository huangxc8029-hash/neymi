import {describe,expect,it} from 'vitest';
import {MemoryVaultStorage} from '../../src/modules/vault/storage';
import {createVault} from '../../src/modules/vault/vault';
import {exportBackup,importBackup} from '../../src/modules/vault/backup';
import {makeProfile} from '../fixtures/domain';

function sensitiveProfile() {
  const profile=makeProfile();
  profile.modules[0].items.push({id:'phone',label:'Contact',value:'PRIVATE_SENTINEL',valueKind:'phone',sensitivity:'sensitive'});
  return profile;
}
describe('local vault',()=>{
  it('lets a guest save ordinary facts without a passphrase',async()=>{
    const vault=createVault(new MemoryVaultStorage());
    await vault.saveProfile(makeProfile());
    expect((await vault.readFields([{moduleId:'mod_project',itemId:'item_demo'}]))[0].value).toBe('Warehouse robot');
  });
  it('never writes a sensitive value to ordinary storage',async()=>{
    const storage=new MemoryVaultStorage(),vault=createVault(storage);
    await vault.initialize('correct horse');
    await vault.saveProfile(sensitiveProfile());
    expect(await storage.dumpSerialized()).not.toContain('PRIVATE_SENTINEL');
    expect((await vault.readFields([{moduleId:'mod_project',itemId:'phone'}]))[0].value).toBe('PRIVATE_SENTINEL');
  });
  it('locks sensitive reads and rejects the wrong passphrase',async()=>{
    const vault=createVault(new MemoryVaultStorage());
    await vault.initialize('correct horse'); await vault.saveProfile(sensitiveProfile()); vault.lock();
    await expect(vault.readFields([{moduleId:'mod_project',itemId:'phone'}])).rejects.toMatchObject({code:'PERMISSION_DENIED'});
    await expect(vault.unlock('wrong')).rejects.toMatchObject({code:'PERMISSION_DENIED'});
    await vault.unlock('correct horse');
    expect((await vault.readFields([{moduleId:'mod_project',itemId:'phone'}]))[0].value).toBe('PRIVATE_SENTINEL');
  });
  it('refuses to overwrite an existing initialized vault',async()=>{
    const vault=createVault(new MemoryVaultStorage()); await vault.initialize('secret');
    await expect(vault.initialize('other')).rejects.toMatchObject({code:'ALREADY_EXISTS'});
  });
  it('rejects saving contact values into an uninitialized vault',async()=>{
    const vault=createVault(new MemoryVaultStorage());
    await expect(vault.saveProfile(sensitiveProfile())).rejects.toMatchObject({code:'PERMISSION_DENIED'});
  });
  it('rejects a contact value mislabeled as ordinary text',async()=>{
    const profile=makeProfile();
    profile.modules[0].items[0].value='demo@example.org';
    profile.modules[0].items[0].sensitivity='ordinary';
    await expect(createVault(new MemoryVaultStorage()).saveProfile(profile)).rejects.toThrow();
  });
  it('requires unlock before replacing a profile that already has an encrypted area',async()=>{
    const storage=new MemoryVaultStorage(),vault=createVault(storage);
    await vault.initialize('passphrase');await vault.saveProfile(sensitiveProfile());vault.lock();
    const before=await storage.dumpSerialized();
    await expect(vault.saveProfile(makeProfile())).rejects.toMatchObject({code:'PERMISSION_DENIED'});
    expect(await storage.dumpSerialized()).toBe(before);
  });
  it('starts locked after a page reload',async()=>{
    const storage=new MemoryVaultStorage(),vault=createVault(storage);
    await vault.initialize('passphrase');await vault.saveProfile(sensitiveProfile());
    await expect(createVault(storage).readFields([{moduleId:'mod_project',itemId:'phone'}])).rejects.toMatchObject({code:'PERMISSION_DENIED'});
  });
  it('restores an encrypted backup and leaves old data intact on tampering',async()=>{
    const source=createVault(new MemoryVaultStorage()); await source.initialize('passphrase');
    await source.saveProfile(sensitiveProfile());
    const bytes=await exportBackup(source,'passphrase');
    expect(new TextDecoder().decode(bytes)).not.toContain('PRIVATE_SENTINEL');
    const storage=new MemoryVaultStorage(),target=createVault(storage);
    await target.saveProfile(makeProfile());
    const before=await storage.dumpSerialized();
    const tampered=bytes.slice(); tampered[tampered.length-20]^=1;
    await expect(importBackup(target,tampered,'passphrase')).rejects.toThrow();
    expect(await storage.dumpSerialized()).toBe(before);
    await importBackup(target,bytes,'passphrase'); await target.unlock('passphrase');
    expect((await target.readFields([{moduleId:'mod_project',itemId:'phone'}]))[0].value).toBe('PRIVATE_SENTINEL');
  });
  it('preserves the old profile if a storage transaction fails',async()=>{
    class FailingStorage extends MemoryVaultStorage {
      fail=false;
      override async transaction(changes:Record<string,string|null>){if(this.fail)throw Object.assign(new Error('quota'),{name:'QuotaExceededError'});await super.transaction(changes);}
    }
    const storage=new FailingStorage(),vault=createVault(storage);
    await vault.saveProfile(makeProfile());const before=await storage.dumpSerialized();
    storage.fail=true;
    await expect(vault.saveProfile(makeProfile({identity:{name:'Changed'}}))).rejects.toMatchObject({name:'QuotaExceededError'});
    expect(await storage.dumpSerialized()).toBe(before);
  });
  it('refuses an old backup version before changing storage',async()=>{
    const storage=new MemoryVaultStorage(),vault=createVault(storage);
    await vault.saveProfile(makeProfile());const before=await storage.dumpSerialized();
    const old=new TextEncoder().encode(JSON.stringify({format:'neymi-encrypted-backup',version:0}));
    await expect(importBackup(vault,old,'passphrase')).rejects.toThrow('Unsupported backup');
    expect(await storage.dumpSerialized()).toBe(before);
  });
});
