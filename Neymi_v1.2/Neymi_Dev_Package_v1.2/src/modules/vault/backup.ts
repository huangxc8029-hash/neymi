import {localProfileSchema} from '../../domain/schemas';
import type {LocalProfile} from '../../domain/types';
import {deriveKey,fromBase64,KDF_ITERATIONS,open,randomBase64,seal,toBase64} from './crypto';
import type {Vault} from './vault';
type Envelope={format:'neymi-encrypted-backup';version:1;iterations:number;salt:string;payload:string};
export async function exportBackup(vault:Vault,passphrase:string):Promise<Uint8Array>{
  const profile=await vault.snapshot(passphrase);
  const salt=randomBase64(16),key=await deriveKey(passphrase,salt);
  const payload=await seal(key,{...profile,assets:profile.assets.map(asset=>({...asset,bytes:toBase64(asset.bytes)}))});
  return new TextEncoder().encode(JSON.stringify({format:'neymi-encrypted-backup',version:1,iterations:KDF_ITERATIONS,salt,payload} satisfies Envelope));
}
export async function importBackup(vault:Vault,bytes:Uint8Array,passphrase:string):Promise<void>{
  const envelope=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes)) as Envelope;
  if(envelope.format!=='neymi-encrypted-backup'||envelope.version!==1)throw new Error('Unsupported backup');
  const key=await deriveKey(passphrase,envelope.salt,envelope.iterations);
  const raw=await open<Omit<LocalProfile,'assets'>&{assets:Array<{id:string;mime:string;bytes:string}>}>(key,envelope.payload);
  const profile=localProfileSchema.parse({...raw,assets:raw.assets.map(asset=>({...asset,bytes:fromBase64(asset.bytes)}))});
  await vault.restore(profile,passphrase);
}
