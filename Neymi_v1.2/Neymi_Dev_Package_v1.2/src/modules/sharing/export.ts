import {shareProjectionSchema} from '../../domain/schemas';
import type {ShareProjection} from '../../domain/types';
import {fromBase64} from '../vault/crypto';
import {getCardTemplate} from '../card/templates';
import {isCardLinkItem} from '../card/links';

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
    const kind=isCardLinkItem(section.kind,item.label)?'URL':section.kind==='social'?'NOTE':/email|邮箱|邮件/.test(label)?'EMAIL':/phone|tel|电话|手机/.test(label)?'TEL':'NOTE';
    lines.push(`${kind}:${vEscape(kind==='NOTE'?`${item.label}: ${item.value}`:item.value)}`);
  }
  if(p.publicDedication)lines.push(`NOTE:${vEscape(p.publicDedication)}`);
  return encode(lines.join('\r\n')+'\r\nEND:VCARD\r\n');
}
export async function renderImage(projection:ShareProjection):Promise<Blob>{
  const p=shareProjectionSchema.parse(projection);
  const canvas=document.createElement('canvas');canvas.width=1500;canvas.height=900;
  const ctx=canvas.getContext('2d');if(!ctx)throw new Error('Canvas unavailable');
  const template=getCardTemplate(p.templateId),gradient=ctx.createLinearGradient(0,0,1500,900);
  gradient.addColorStop(0,template.start);gradient.addColorStop(1,template.end);
  ctx.fillStyle=gradient;ctx.fillRect(0,0,1500,900);
  if(template.image){
    const response=await fetch(template.image);if(!response.ok)throw new Error('Card background unavailable');
    const bitmap=await createImageBitmap(await response.blob());
    try{const scale=Math.max(1500/bitmap.width,900/bitmap.height),w=bitmap.width*scale,h=bitmap.height*scale;ctx.drawImage(bitmap,(1500-w)/2,(900-h)/2,w,h);}finally{bitmap.close();}
    const shade=ctx.createLinearGradient(0,0,1500,0);shade.addColorStop(0,template.start+'ed');shade.addColorStop(.58,template.start+'a6');shade.addColorStop(.9,template.start+'00');ctx.fillStyle=shade;ctx.fillRect(0,0,1500,900);
  }
  if(p.assets[0]){
    const asset=p.assets[0],bitmap=await createImageBitmap(new Blob([fromBase64(asset.base64) as BlobPart],{type:asset.mime}));
    try{const scale=Math.min(220/bitmap.width,110/bitmap.height);ctx.drawImage(bitmap,82,65,bitmap.width*scale,bitmap.height*scale);}finally{bitmap.close();}
  }
  ctx.fillStyle=template.ink;ctx.font='600 82px sans-serif';ctx.fillText(p.identity.name??'',82,290,1250);
  ctx.fillStyle=template.muted;ctx.font='32px sans-serif';ctx.fillText([p.identity.company,p.identity.role].filter(Boolean).join(' · '),82,350,1250);
  const contacts=p.modules.filter(section=>section.kind==='contact').flatMap(section=>section.items);
  for(let i=0;i<Math.min(contacts.length,4);i++){
    const item=contacts[i],x=82+(i%2)*640,y=460+Math.floor(i/2)*115;
    ctx.fillStyle=template.muted;ctx.font='24px sans-serif';ctx.fillText(item.label,x,y,580);
    ctx.fillStyle=template.ink;ctx.font='30px sans-serif';ctx.fillText(item.value,x,y+43,580);
  }
  ctx.font='26px sans-serif';let x=82;
  for(const section of p.modules.filter(section=>section.kind!=='contact')){
    const width=Math.min(330,ctx.measureText(section.title).width+70);if(x+width>1418)break;
    ctx.strokeStyle=template.muted;ctx.lineWidth=1;ctx.strokeRect(x,718,width,62);
    ctx.fillStyle=template.ink;ctx.fillText(section.title,x+22,758,width-44);x+=width+22;
  }
  if(p.publicDedication){ctx.fillStyle=template.muted;ctx.font='23px sans-serif';ctx.fillText(p.publicDedication,82,665,1280);}
  ctx.globalAlpha=.48;ctx.textAlign='right';ctx.fillStyle=template.ink;
  ctx.font='19px sans-serif';ctx.fillText('your secure cyber card manager',1418,851);
  const captionWidth=ctx.measureText('your secure cyber card manager').width;
  ctx.font='600 30px sans-serif';ctx.fillText('Neymi',1418-captionWidth-20,851);ctx.globalAlpha=1;
  return new Promise((resolve,reject)=>canvas.toBlob(blob=>blob?resolve(blob):reject(new Error('PNG export failed')),'image/png'));
}
