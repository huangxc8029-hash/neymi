import {shareProjectionSchema} from '../../domain/schemas';
import type {ShareProjection} from '../../domain/types';
import {fromBase64} from '../vault/crypto';

const encode=(value:string)=>new TextEncoder().encode(value);
const vEscape=(value:string)=>value.replaceAll('\\','\\\\').replace(/\r\n|\r|\n/g,'\\n').replaceAll(';','\\;').replaceAll(',','\\,');
export function serializeNcard(projection:ShareProjection):Uint8Array{
  return encode(JSON.stringify(shareProjectionSchema.parse(projection)));
}
export function serializeVcard(projection:ShareProjection):Uint8Array{
  const p=shareProjectionSchema.parse(projection);
  const lines=['BEGIN:VCARD','VERSION:4.0',`FN:${vEscape(p.identity.name??'')}`];
  if(p.identity.company)lines.push(`ORG:${vEscape(p.identity.company)}`);
  if(p.identity.role)lines.push(`TITLE:${vEscape(p.identity.role)}`);
  for(const section of p.modules)for(const item of section.items){
    const label=item.label.toLowerCase();
    const kind=/email|邮箱|邮件/.test(label)?'EMAIL':/phone|tel|电话|手机/.test(label)?'TEL':'NOTE';
    lines.push(`${kind}:${vEscape(item.value)}`);
  }
  if(p.publicDedication)lines.push(`NOTE:${vEscape(p.publicDedication)}`);
  return encode(lines.join('\r\n')+'\r\nEND:VCARD\r\n');
}
export async function renderImage(projection:ShareProjection):Promise<Blob>{
  const p=shareProjectionSchema.parse(projection);
  const canvas=document.createElement('canvas');canvas.width=1500;canvas.height=900;
  const ctx=canvas.getContext('2d');if(!ctx)throw new Error('Canvas unavailable');
  const gradient=ctx.createLinearGradient(0,0,1500,900);gradient.addColorStop(0,'#153d31');gradient.addColorStop(1,'#3c6d5b');
  ctx.fillStyle=gradient;ctx.fillRect(0,0,1500,900);
  ctx.fillStyle='#f5f3e7';ctx.font='bold 45px sans-serif';ctx.fillText('neymi ✳',90,115);
  ctx.font='bold 90px sans-serif';ctx.fillText(p.identity.name??'',90,360,1280);
  ctx.font='38px sans-serif';ctx.fillText([p.identity.role,p.identity.company].filter(Boolean).join(' · '),90,430,1250);
  ctx.font='30px sans-serif';let y=555;
  for(const section of p.modules)for(const item of section.items){
    if(y>800)break;
    ctx.fillText(`${section.title} · ${item.label}: ${item.value}`,90,y,1300);y+=55;
  }
  if(p.publicDedication){ctx.font='28px sans-serif';ctx.fillText(p.publicDedication,90,825,1300);}
  for(let i=0;i<p.assets.length;i++){
    const asset=p.assets[i],bitmap=await createImageBitmap(new Blob([fromBase64(asset.base64) as BlobPart],{type:asset.mime}));
    ctx.drawImage(bitmap,1250-(i%3)*130,60,110,110);bitmap.close();
  }
  return new Promise((resolve,reject)=>canvas.toBlob(blob=>blob?resolve(blob):reject(new Error('PNG export failed')),'image/png'));
}
