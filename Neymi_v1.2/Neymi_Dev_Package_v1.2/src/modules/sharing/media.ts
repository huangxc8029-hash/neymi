import type {LocalAsset} from '../../domain/types';
import {localAssetSchema} from '../../domain/schemas';
const pngSignature=[137,80,78,71,13,10,26,10];
export function stripPngMetadata(bytes:Uint8Array):Uint8Array{
  if(bytes.length<33||!pngSignature.every((byte,index)=>bytes[index]===byte))throw new Error('Invalid PNG');
  const parts=[bytes.slice(0,8)];let offset=8,hasImage=false,ended=false;
  const view=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);
  while(offset+12<=bytes.length){
    const length=view.getUint32(offset),end=offset+12+length;
    if(length>5*1024*1024||end>bytes.length)throw new Error('Invalid PNG chunk');
    const kind=new TextDecoder().decode(bytes.slice(offset+4,offset+8));
    if(!/^[A-Za-z]{4}$/.test(kind))throw new Error('Invalid PNG chunk type');
    if(['IHDR','PLTE','tRNS','IDAT','IEND'].includes(kind))parts.push(bytes.slice(offset,end));
    else if(kind[0]===kind[0].toUpperCase())throw new Error('Unsupported critical PNG chunk');
    if(kind==='IDAT')hasImage=true;
    offset=end;
    if(kind==='IEND'){ended=true;break;}
  }
  if(!hasImage||!ended||offset!==bytes.length)throw new Error('Incomplete PNG');
  const result=new Uint8Array(parts.reduce((sum,part)=>sum+part.length,0));
  let cursor=0;for(const part of parts){result.set(part,cursor);cursor+=part.length;}
  return result;
}
export async function sanitizeImage(file:Blob):Promise<LocalAsset>{
  if(!['image/png','image/jpeg','image/webp'].includes(file.type)||file.size>5*1024*1024)throw new Error('Unsupported image');
  const source=new Uint8Array(await file.arrayBuffer());
  const isPng=source[0]===137&&source[1]===80&&source[2]===78&&source[3]===71;
  const isJpeg=source[0]===255&&source[1]===216&&source[2]===255;
  const isWebp=new TextDecoder().decode(source.slice(0,4))==='RIFF'&&new TextDecoder().decode(source.slice(8,12))==='WEBP';
  if(!(file.type==='image/png'&&isPng||file.type==='image/jpeg'&&isJpeg||file.type==='image/webp'&&isWebp))throw new Error('Image bytes do not match declared type');
  const bitmap=await createImageBitmap(file);
  try{
    const canvas=document.createElement('canvas');canvas.width=bitmap.width;canvas.height=bitmap.height;
    if(canvas.width*canvas.height>20_000_000)throw new Error('Image dimensions too large');
    const ctx=canvas.getContext('2d');if(!ctx)throw new Error('Canvas unavailable');
    ctx.drawImage(bitmap,0,0);
    const clean=await new Promise<Blob>((resolve,reject)=>canvas.toBlob(blob=>blob?resolve(blob):reject(new Error('Image encoding failed')),'image/png'));
    return localAssetSchema.parse({id:`asset_${crypto.randomUUID().replaceAll('-','')}`,mime:'image/png',bytes:new Uint8Array(await clean.arrayBuffer())});
  }finally{bitmap.close();}
}
