import {shareProjectionSchema} from '../../domain/schemas';
import type {ShareProjection} from '../../domain/types';
import {fromBase64} from '../vault/crypto';
import {getCardTemplate} from '../card/templates';
import {isCardLinkItem} from '../card/links';

const encode=(value:string)=>new TextEncoder().encode(value);
const vEscape=(value:string)=>value.replaceAll('\\','\\\\').replace(/\r\n|\r|\n/g,'\\n').replaceAll(';','\\;').replaceAll(',','\\,');
function drawTemplateAccents(ctx:CanvasRenderingContext2D,id:string,accent:string,end:string){
  ctx.save();ctx.globalAlpha=.42;
  if(id.startsWith('mosaic-')){
    const tiles=[[1050,70,250,210],[1270,220,170,200],[1020,400,260,180],[1260,570,180,160],[900,250,160,190]];
    tiles.forEach(([x,y,w,h],i)=>{ctx.fillStyle=i%2?end:accent;ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+w,y+h*.12);ctx.lineTo(x+w*.82,y+h);ctx.lineTo(x+w*.12,y+h*.78);ctx.closePath();ctx.fill();ctx.strokeStyle='#fff';ctx.lineWidth=4;ctx.stroke();});
  }else if(id.startsWith('dopamine-')){
    [[1290,150,76],[1430,390,52],[1170,650,66]].forEach(([x,y,r],i)=>{ctx.fillStyle=i%2?end:accent;ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fill();});
    ctx.fillStyle='#fff';ctx.font='700 80px sans-serif';ctx.fillText('✦',1110,310);
  }else if(id.startsWith('anime-')){
    ctx.strokeStyle=accent;ctx.lineWidth=8;ctx.beginPath();ctx.moveTo(1050,70);ctx.lineTo(1440,120);ctx.lineTo(1390,600);ctx.lineTo(1000,560);ctx.closePath();ctx.stroke();
    for(let i=0;i<5;i++){ctx.globalAlpha=.18;ctx.fillStyle=i%2?end:accent;ctx.fillRect(1080+i*68,180+i*32,56,12);}
  }
  ctx.restore();
}
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
    if(section.kind==='contact'&&/地址|address/.test(label)){lines.push(`ADR:;;${vEscape(item.value)};;;;`);continue;}
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
  drawTemplateAccents(ctx,template.id,template.accent,template.end);
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
  for(let i=0;i<Math.min(contacts.length,6);i++){
    const item=contacts[i],x=82+(i%2)*640,y=430+Math.floor(i/2)*75;
    ctx.fillStyle=template.muted;ctx.font='19px sans-serif';ctx.fillText(item.label,x,y,580);
    ctx.fillStyle=template.ink;ctx.font='25px sans-serif';ctx.fillText(item.value,x,y+30,580);
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
