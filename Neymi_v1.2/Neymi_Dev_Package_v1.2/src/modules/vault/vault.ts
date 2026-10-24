import type {FieldRef,LocalAsset,LocalProfile,ProfileItem} from '../../domain/types';
import {localProfileSchema} from '../../domain/schemas';
import {deriveKey,fromBase64,KDF_ITERATIONS,open,randomBase64,seal,toBase64} from './crypto';
import type {VaultStorage} from './storage';
type Header={version:1;algorithm:'AES-GCM';kdf:'PBKDF2-SHA256';iterations:number;salt:string};
type Secret={items:Array<{moduleId:string;item:ProfileItem}>;assets:Array<{id:string;mime:LocalAsset['mime'];base64:string}>};
const PUBLIC='profile-public',HEADER='vault-header',CIPHER='vault-cipher';
const emptySecret=():Secret=>({items:[],assets:[]});
export const vaultError=(code:string,message:string)=>Object.assign(new Error(message),{code});
export class Vault{
  private key:CryptoKey|null=null;
  private timer:ReturnType<typeof setTimeout>|null=null;
  constructor(readonly storage:VaultStorage){}
  private touch(){if(this.timer) clearTimeout(this.timer);this.timer=setTimeout(()=>this.lock(),15*60*1000);}
  private async secret():Promise<Secret>{
    if(!this.key) throw vaultError('PERMISSION_DENIED','Vault is locked');
    this.touch();
    const cipher=await this.storage.get(CIPHER);
    if(!cipher) throw vaultError('CORRUPT_DATA','Missing encrypted payload');
    return open<Secret>(this.key,cipher);
  }
  async initialize(passphrase:string):Promise<void>{
    if(await this.storage.get(HEADER)) throw vaultError('ALREADY_EXISTS','Vault already initialized');
    const header:Header={version:1,algorithm:'AES-GCM',kdf:'PBKDF2-SHA256',iterations:KDF_ITERATIONS,salt:randomBase64(16)};
    const key=await deriveKey(passphrase,header.salt,header.iterations);
    await this.storage.transaction({[HEADER]:JSON.stringify(header),[CIPHER]:await seal(key,emptySecret())});
    this.key=key;this.touch();
  }
  async unlock(passphrase:string):Promise<void>{
    const raw=await this.storage.get(HEADER),cipher=await this.storage.get(CIPHER);
    if(!raw||!cipher) throw vaultError('PERMISSION_DENIED','Vault is not initialized');
    const header=JSON.parse(raw) as Header;
    if(header.version!==1||header.algorithm!=='AES-GCM'||header.kdf!=='PBKDF2-SHA256') throw vaultError('UNSUPPORTED_VERSION','Unsupported vault version');
    try{const key=await deriveKey(passphrase,header.salt,header.iterations);await open<Secret>(key,cipher);this.key=key;this.touch();}
    catch{throw vaultError('PERMISSION_DENIED','Incorrect passphrase or corrupted vault');}
  }
  lock():void{this.key=null;if(this.timer)clearTimeout(this.timer);this.timer=null;}
  async saveProfile(profile:LocalProfile):Promise<void>{
    localProfileSchema.parse(profile);
    if(await this.storage.get(HEADER) && !this.key) throw vaultError('PERMISSION_DENIED','Unlock vault before replacing profile');
    const secret:Secret={items:profile.modules.flatMap(section=>section.items.filter(item=>item.sensitivity==='sensitive').map(item=>({moduleId:section.id,item}))),
      assets:profile.assets.map(asset=>({id:asset.id,mime:asset.mime,base64:toBase64(asset.bytes)}))};
    const publicProfile={...profile,modules:profile.modules.map(section=>({...section,items:section.items.filter(item=>item.sensitivity==='ordinary')})),assets:[]};
    const changes:Record<string,string|null>={[PUBLIC]:JSON.stringify(publicProfile)};
    if(secret.items.length||secret.assets.length){
      if(!this.key||!(await this.storage.get(HEADER))) throw vaultError('PERMISSION_DENIED','Unlock vault before saving sensitive data');
      changes[CIPHER]=await seal(this.key,secret);this.touch();
    }else if(this.key){changes[CIPHER]=await seal(this.key,secret);this.touch();}
    await this.storage.transaction(changes);
  }
  private async publicProfile():Promise<LocalProfile>{
    const raw=await this.storage.get(PUBLIC);
    if(!raw) throw vaultError('NOT_FOUND','Profile not saved');
    return localProfileSchema.parse(JSON.parse(raw));
  }
  async readFields(refs:FieldRef[]):Promise<ProfileItem[]>{
    const profile=await this.publicProfile();
    const ordinary=new Map(profile.modules.flatMap(section=>section.items.map(item=>[`${section.id}/${item.id}`,item] as const)));
    const missing=refs.filter(ref=>!ordinary.has(`${ref.moduleId}/${ref.itemId}`));
    const hidden=new Map((missing.length?await this.secret():emptySecret()).items.map(({moduleId,item})=>[`${moduleId}/${item.id}`,item] as const));
    return refs.map(ref=>{
      const item=ordinary.get(`${ref.moduleId}/${ref.itemId}`)??hidden.get(`${ref.moduleId}/${ref.itemId}`);
      if(!item)throw vaultError('NOT_FOUND','Field does not exist');
      return item;
    });
  }
  async readIdentity(keys:Array<'name'|'company'|'role'>):Promise<LocalProfile['identity']>{
    const identity=(await this.publicProfile()).identity;
    return Object.fromEntries(keys.filter(key=>identity[key]!==undefined).map(key=>[key,identity[key]]));
  }
  async readAssets(ids:string[]):Promise<LocalAsset[]>{
    if(!ids.length)return [];
    const secret=await this.secret();
    return ids.map(id=>{const asset=secret.assets.find(asset=>asset.id===id);if(!asset)throw vaultError('NOT_FOUND','Asset does not exist');
      return{id:asset.id,mime:asset.mime,bytes:fromBase64(asset.base64)};});
  }
  async snapshot(passphrase:string):Promise<LocalProfile>{
    if(await this.storage.get(HEADER))await this.unlock(passphrase);
    const profile=await this.publicProfile();
    const secret=await this.storage.get(HEADER)?await this.secret():emptySecret();
    return localProfileSchema.parse({...profile,modules:profile.modules.map(section=>({...section,
      items:[...section.items,...secret.items.filter(entry=>entry.moduleId===section.id).map(entry=>entry.item)]})),
      assets:secret.assets.map(asset=>({id:asset.id,mime:asset.mime,bytes:fromBase64(asset.base64)}))});
  }
  async restore(profile:LocalProfile,passphrase:string):Promise<void>{
    localProfileSchema.parse(profile);
    const header:Header={version:1,algorithm:'AES-GCM',kdf:'PBKDF2-SHA256',iterations:KDF_ITERATIONS,salt:randomBase64(16)};
    const key=await deriveKey(passphrase,header.salt,header.iterations);
    const secret:Secret={items:profile.modules.flatMap(section=>section.items.filter(item=>item.sensitivity==='sensitive').map(item=>({moduleId:section.id,item}))),
      assets:profile.assets.map(asset=>({id:asset.id,mime:asset.mime,base64:toBase64(asset.bytes)}))};
    const publicProfile={...profile,modules:profile.modules.map(section=>({...section,items:section.items.filter(item=>item.sensitivity==='ordinary')})),assets:[]};
    await this.storage.transaction({[PUBLIC]:JSON.stringify(publicProfile),[HEADER]:JSON.stringify(header),[CIPHER]:await seal(key,secret)});
    this.lock();
  }
}
export const createVault=(storage:VaultStorage)=>new Vault(storage);
