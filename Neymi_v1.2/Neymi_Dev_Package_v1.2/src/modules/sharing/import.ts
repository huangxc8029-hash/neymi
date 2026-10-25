import {shareProjectionSchema} from '../../domain/schemas';
import type {ShareProjection} from '../../domain/types';

const MAX_IMPORT_BYTES=8*1024*1024;
export async function importSharedCard(bytes:Uint8Array):Promise<ShareProjection>{
  if(bytes.byteLength===0||bytes.byteLength>MAX_IMPORT_BYTES)throw new Error('Invalid card file size');
  const text=new TextDecoder('utf-8',{fatal:true}).decode(bytes);
  let value:unknown;try{value=JSON.parse(text);}catch{throw new Error('Card file is not valid JSON');}
  return shareProjectionSchema.parse(value);
}
