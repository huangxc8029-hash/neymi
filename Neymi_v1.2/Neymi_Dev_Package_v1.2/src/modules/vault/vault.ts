import type {FieldRef,LocalAsset,LocalDraft,LocalProfile,ProfileItem} from '../../domain/types';
import {localAssetSchema,localDraftSchema,localProfileSchema} from '../../domain/schemas';
import {deriveKey,fromBase64,KDF_ITERATIONS,open,randomBase64,seal,toBase64} from './crypto';
import type {VaultStorage} from './storage';
import {CONTACT_MODULE_ID,contactItems,emptyContacts,type ContactValues} from '../card/contacts';
type Header={version:1;algorithm:'AES-GCM';kdf:'PBKDF2-SHA256';iterations:number;salt:string};
type Secret={items:Array<{moduleId:string;item:ProfileItem}>;assets:Array<{id:string;mime:LocalAsset['mime'];base64:string}>;preparedDrafts:Array<{id:string;profileRevision:number;payload:string}>};
const PUBLIC='profile-public',HEADER='vault-header',CIPHER='vault-cipher';
const emptySecret=():Secret=>({items:[],assets:[],preparedDrafts:[]});
export const vaultError=(code:string,message:string)=>Object.assign(new Error(message),{code});
export class Vault{
  private key:CryptoKey|null=null;
  private timer:ReturnType<typeof setTimeout>|null=null;
  constructor(readonly storage:VaultStorage){}
  async isInitialized():Promise<boolean>{return Boolean(await this.storage.get(HEADER));}
  isUnlocked():boolean{return this.key!==null;}
  private touch(){if(this.timer) clearTimeout(this.timer);this.timer=setTimeout(()=>this.lock(),15*60*1000);}
  private async secret():Promise<Secret>{
    if(!this.key) throw vaultError('PERMISSION_DENIED','Vault is locked');
    this.touch();
    const cipher=await this.storage.get(CIPHER);
    if(!cipher) throw vaultError('CORRUPT_DATA','Missing encrypted payload');
    const value=await open<Partial<Secret>>(this.key,cipher);
    return{items:value.items??[],assets:value.assets??[],preparedDrafts:value.preparedDrafts??[]};
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
    const previous=this.key?await this.secret():emptySecret();
    const secret:Secret={...previous,items:profile.modules.flatMap(section=>section.items.filter(item=>item.sensitivity==='sensitive').map(item=>({moduleId:section.id,item}))),
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
  async loadPublicProfile():Promise<LocalProfile>{return this.publicProfile();}
  async saveOrdinaryProfile(profile:LocalProfile):Promise<void>{
    localProfileSchema.parse(profile);
    if(profile.modules.some(section=>section.items.some(item=>item.sensitivity==='sensitive'))||profile.assets.length)
      throw vaultError('PERMISSION_DENIED','Sensitive data requires the unlocked vault');
    const existing=await this.storage.get(PUBLIC);
    const previous=existing?localProfileSchema.parse(JSON.parse(existing)):null;
    const contactModule=previous?.modules.find(section=>section.id===CONTACT_MODULE_ID);
    const modules=contactModule&&!profile.modules.some(section=>section.id===CONTACT_MODULE_ID)
      ?[...profile.modules,contactModule]:profile.modules;
    await this.storage.set(PUBLIC,JSON.stringify({...profile,modules}));
  }
  async readContacts():Promise<ContactValues>{
    const values=emptyContacts();
    for(const {item} of (await this.secret()).items.filter(entry=>entry.moduleId===CONTACT_MODULE_ID)){
      const key=item.id.slice('contact_'.length);
      if(key in values)values[key as keyof ContactValues]=item.value;
    }
    return values;
  }
  async saveContacts(values:ContactValues):Promise<LocalProfile>{
    const items=contactItems(values),secret=await this.secret();
    let profile:LocalProfile;
    try{profile=await this.publicProfile();}
    catch(error){if((error as {code?:string}).code!=='NOT_FOUND')throw error;
      profile={schemaVersion:1,id:'guest_profile',revision:1,identity:{},modules:[],facts:[],assets:[]};}
    const modules=profile.modules.filter(section=>section.id!==CONTACT_MODULE_ID);
    if(items.length)modules.push({id:CONTACT_MODULE_ID,kind:'contact',title:'联系方式',items:[]});
    const updated=localProfileSchema.parse({...profile,revision:profile.revision+1,modules});
    secret.items=[...secret.items.filter(entry=>entry.moduleId!==CONTACT_MODULE_ID),...items.map(item=>({moduleId:CONTACT_MODULE_ID,item}))];
    await this.storage.transaction({[PUBLIC]:JSON.stringify(updated),[CIPHER]:await seal(this.key!,secret)});
    this.touch();
    return updated;
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
  async readCardLogo():Promise<LocalAsset|null>{
    const asset=(await this.secret()).assets.find(asset=>asset.id==='card_logo');
    return asset?{id:asset.id,mime:asset.mime,bytes:fromBase64(asset.base64)}:null;
  }
  async saveCardLogo(asset:LocalAsset|null):Promise<void>{
    if(asset)localAssetSchema.parse(asset);
    const previous=await this.secret();
    const assets=previous.assets.filter(item=>item.id!=='card_logo');
    if(asset)assets.unshift({id:'card_logo',mime:asset.mime,base64:toBase64(asset.bytes)});
    await this.storage.set(CIPHER,await seal(this.key!,{...previous,assets}));this.touch();
  }
  async readAssets(ids:string[]):Promise<LocalAsset[]>{
    if(!ids.length)return [];
    const secret=await this.secret();
    return ids.map(id=>{const asset=secret.assets.find(asset=>asset.id===id);if(!asset)throw vaultError('NOT_FOUND','Asset does not exist');
      return{id:asset.id,mime:asset.mime,bytes:fromBase64(asset.base64)};});
  }
  async savePreparedDraft(draft:LocalDraft):Promise<void>{
    const checked=localDraftSchema.parse(draft),profile=await this.publicProfile();
    if(!this.key)throw vaultError('PERMISSION_DENIED','Unlock vault before caching prepared cards');
    if(checked.profileRevision!==profile.revision)throw vaultError('STALE_DATA','Profile changed before the card could be cached');
    const secret=await this.secret(),payload=JSON.stringify({...checked,assets:checked.assets.map(asset=>({...asset,bytes:toBase64(asset.bytes)}))});
    secret.preparedDrafts=[...secret.preparedDrafts.filter(item=>item.id!==checked.id),{id:checked.id,profileRevision:checked.profileRevision,payload}];
    const cipher=await this.storage.get(CIPHER);if(!cipher)throw vaultError('CORRUPT_DATA','Missing encrypted payload');
    await this.storage.set(CIPHER,await seal(this.key,secret));
  }
  async readPreparedDraft(id:string):Promise<LocalDraft|null>{
    const secret=await this.secret(),entry=secret.preparedDrafts.find(item=>item.id===id);if(!entry)return null;
    if(entry.profileRevision!==(await this.publicProfile()).revision)return null;
    const raw=JSON.parse(entry.payload) as Omit<LocalDraft,'assets'>&{assets:Array<{id:string;mime:LocalAsset['mime'];bytes:string}>};
    return localDraftSchema.parse({...raw,assets:raw.assets.map(asset=>({...asset,bytes:fromBase64(asset.bytes)}))});
  }
  async listPreparedDrafts():Promise<LocalDraft[]>{
    const secret=await this.secret(),revision=(await this.publicProfile()).revision,result:LocalDraft[]=[];
    for(const entry of secret.preparedDrafts)if(entry.profileRevision===revision){
      const raw=JSON.parse(entry.payload) as Omit<LocalDraft,'assets'>&{assets:Array<{id:string;mime:LocalAsset['mime'];bytes:string}>};
      result.push(localDraftSchema.parse({...raw,assets:raw.assets.map(asset=>({...asset,bytes:fromBase64(asset.bytes)}))}));
    }
    return result;
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
      assets:profile.assets.map(asset=>({id:asset.id,mime:asset.mime,base64:toBase64(asset.bytes)})),preparedDrafts:[]};
    const publicProfile={...profile,modules:profile.modules.map(section=>({...section,items:section.items.filter(item=>item.sensitivity==='ordinary')})),assets:[]};
    await this.storage.transaction({[PUBLIC]:JSON.stringify(publicProfile),[HEADER]:JSON.stringify(header),[CIPHER]:await seal(key,secret)});
    this.lock();
  }
}
export const createVault=(storage:VaultStorage)=>new Vault(storage);
