import {expect,it} from 'vitest';
import {createVault} from '../../src/modules/vault/vault';
import {MemoryVaultStorage} from '../../src/modules/vault/storage';
import {makeProfile} from '../fixtures/domain';

it('stores the card logo encrypted, preserves contacts, and requires unlock to replace it',async()=>{
  const storage=new MemoryVaultStorage(),vault=createVault(storage);
  await vault.initialize('correct horse');await vault.saveOrdinaryProfile(makeProfile());
  await vault.saveContacts({phone:'+1 415 555 0111',email:'',wechat:'',whatsapp:''});
  const logo={id:'card_logo',mime:'image/png' as const,bytes:new Uint8Array([137,80,78,71])};
  await vault.saveCardLogo(logo);
  expect(await vault.readCardLogo()).toEqual(logo);
  expect((await vault.loadPublicProfile()).assets).toEqual([]);
  expect((await vault.readContacts()).phone).toBe('+1 415 555 0111');
  vault.lock();await expect(vault.saveCardLogo(null)).rejects.toMatchObject({code:'PERMISSION_DENIED'});
  await vault.unlock('correct horse');await vault.saveCardLogo(null);
  expect(await vault.readCardLogo()).toBeNull();
  expect((await vault.readContacts()).phone).toBe('+1 415 555 0111');
});
