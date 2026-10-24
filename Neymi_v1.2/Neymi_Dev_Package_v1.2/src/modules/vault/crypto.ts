const enc=new TextEncoder(),dec=new TextDecoder();
export const KDF_ITERATIONS=310_000;
export const toBase64=(bytes:Uint8Array)=>btoa(Array.from(bytes,b=>String.fromCharCode(b)).join(''));
export const fromBase64=(value:string)=>Uint8Array.from(atob(value),c=>c.charCodeAt(0));
export const randomBase64=(length:number)=>toBase64(crypto.getRandomValues(new Uint8Array(length)));
export async function deriveKey(passphrase:string,salt:string,iterations=KDF_ITERATIONS):Promise<CryptoKey>{
  if(!passphrase||iterations<100_000||iterations>2_000_000) throw new Error('Invalid key parameters');
  const base=await crypto.subtle.importKey('raw',enc.encode(passphrase),'PBKDF2',false,['deriveKey']);
  return crypto.subtle.deriveKey({name:'PBKDF2',salt:fromBase64(salt) as BufferSource,iterations,hash:'SHA-256'},base,{name:'AES-GCM',length:256},false,['encrypt','decrypt']);
}
export async function seal(key:CryptoKey,value:unknown):Promise<string>{
  const nonce=crypto.getRandomValues(new Uint8Array(12));
  const cipher=await crypto.subtle.encrypt({name:'AES-GCM',iv:nonce},key,enc.encode(JSON.stringify(value)));
  return JSON.stringify({nonce:toBase64(nonce),cipher:toBase64(new Uint8Array(cipher))});
}
export async function open<T>(key:CryptoKey,value:string):Promise<T>{
  const record=JSON.parse(value) as {nonce:string;cipher:string};
  const plain=await crypto.subtle.decrypt({name:'AES-GCM',iv:fromBase64(record.nonce) as BufferSource},key,fromBase64(record.cipher) as BufferSource);
  return JSON.parse(dec.decode(plain)) as T;
}
