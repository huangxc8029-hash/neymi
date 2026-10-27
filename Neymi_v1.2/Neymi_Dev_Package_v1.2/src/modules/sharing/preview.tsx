'use client';
import {useState} from 'react';
import type {FieldRef,LocalDraft,ShareProjection,ShareSelection} from '../../domain/types';
import {projectShare} from './projection';
import {assertConfirmation,confirmShare} from './confirmation';
import {renderImage,serializeNcard,serializeVcard} from './export';
import {PublicationPanel} from '../publication/panel';
import {shareViaOS} from './native';
import {CardExperience} from '../card/card-experience';

export function SharePreview({draft,moduleDisplayLimit}:{draft:LocalDraft;moduleDisplayLimit?:number}){
  const [selection,setSelection]=useState<ShareSelection>({identity:['name'],fields:[],assetIds:[]});
  const [projection,setProjection]=useState<ShareProjection|null>(null);
  const [message,setMessage]=useState('');
  const [sharing,setSharing]=useState(false);
  function update(next:ShareSelection){setSelection(next);setProjection(null);setMessage('');}
  function toggleField(ref:FieldRef){
    const exists=selection.fields.some(item=>item.moduleId===ref.moduleId&&item.itemId===ref.itemId);
    update({...selection,fields:exists?selection.fields.filter(item=>item.moduleId!==ref.moduleId||item.itemId!==ref.itemId):[...selection.fields,ref]});
  }
  async function download(action:'file'|'vcard'|'image'){
    if(!projection)return;
    try{
      const fresh=projectShare(draft,selection),confirmation=await confirmShare(projection,action);
      await assertConfirmation(fresh,confirmation,action);
      const bytes=action==='file'?serializeNcard(fresh):action==='vcard'?serializeVcard(fresh):null;
      const blob=action==='image'?await renderImage(fresh):new Blob([bytes as BlobPart],{type:action==='vcard'?'text/vcard':'application/json'});
      const url=URL.createObjectURL(blob),anchor=document.createElement('a');
      anchor.href=url;anchor.download=action==='image'?'neymi-card.png':action==='vcard'?'neymi-card.vcf':'neymi-card.ncard';
      anchor.click();setTimeout(()=>URL.revokeObjectURL(url),30_000);setMessage('已生成所选内容的文件。');
    }catch{setMessage('分享内容已变化，请重新预览。');setProjection(null);}
  }
  async function shareNative(){
    if(!projection||sharing)return;
    setSharing(true);setMessage('正在打开系统分享面板；选择接收人或关闭面板后会返回此页。');
    try{const fresh=projectShare(draft,selection),confirmation=await confirmShare(projection,'file');await assertConfirmation(fresh,confirmation,'file');
      const result=await shareViaOS(fresh);setMessage(result==='shared'?'已交给系统分享。':result==='cancelled'?'你取消了分享。':'系统分享不可用，名片文件已下载。');
    }catch{setMessage('分享内容已变化，请重新预览。');setProjection(null);}finally{setSharing(false);}
  }
  return <section className="share-panel" aria-labelledby="share-title">
    <p className="eyebrow">03 · 由你决定分享</p><h2 id="share-title">选择公开内容</h2>
    <p>导出文件前，请检查将让他人看到的内容。只有勾选的字段会进入文件。</p>
    {(['name','company','role'] as const).map(key=>draft.identity[key]&&<label key={key}>
      <input type="checkbox" checked={selection.identity.includes(key)} onChange={event=>update({...selection,identity:event.target.checked?[...selection.identity,key]:selection.identity.filter(item=>item!==key)})}/>
      {key==='name'?'展示名称':key==='company'?'公司或团队':'角色'}：{draft.identity[key]}
    </label>)}
    {draft.modules.flatMap(section=>section.items.map(item=><label key={`${section.id}/${item.id}`}>
      <input type="checkbox" checked={selection.fields.some(ref=>ref.moduleId===section.id&&ref.itemId===item.id)}
        onChange={()=>toggleField({moduleId:section.id,itemId:item.id})}/>
      {section.title} · {item.label}：{item.value}
    </label>))}
    {draft.assets.map(asset=><label key={asset.id}><input type="checkbox" checked={selection.assetIds.includes(asset.id)} onChange={event=>update({...selection,assetIds:event.target.checked?[...selection.assetIds,asset.id]:selection.assetIds.filter(id=>id!==asset.id)})}/>公开 Logo 或图片</label>)}
    <button type="button" onClick={()=>{try{setProjection(projectShare(draft,selection));setMessage('请核对下面的公开预览。');}catch{setMessage('选中的内容无效，请检查。');}}}>生成分享预览</button>
    {projection&&<div className="share-confirmation">
      <h3>对方将看到这张名片</h3>
      <CardExperience identity={projection.identity} modules={projection.modules.map((section,sectionIndex)=>({id:`shared-module-${sectionIndex}`,kind:section.kind,title:section.title,items:section.items.map((item,itemIndex)=>({id:`shared-item-${sectionIndex}-${itemIndex}`,label:item.label,value:item.value,sensitivity:'ordinary' as const}))}))} templateId={projection.templateId} layout={projection.layout} motion={projection.animation} dedication={projection.publicDedication} label="最终公开名片预览" moduleDisplayLimit={moduleDisplayLimit} logoSrc={projection.assets[0]?`data:${projection.assets[0].mime};base64,${projection.assets[0].base64}`:undefined}/>
      <div className="share-confirmed-fields"><h4>已选公开内容</h4><ul>{Object.entries(projection.identity).map(([key,value])=><li key={key}>{key==='name'?'展示名称':key==='company'?'公司或团队':'角色'} · {value}</li>)}{projection.modules.flatMap((section,index)=>section.items.map((item,itemIndex)=><li key={`${index}-${itemIndex}`}>{section.title} · {item.label} · {item.value}</li>))}{projection.assets.length>0&&<li>已选图片 · {projection.assets.length} 张</li>}</ul></div>
      <p>文件可被转发。下载后无法撤回已交给他人的副本。</p>
      <div className="share-actions"><button type="button" onClick={()=>download('file')}>确认下载名片文件</button>
        <button type="button" onClick={()=>download('vcard')}>确认下载 vCard</button>
        <button type="button" onClick={()=>download('image')}>确认下载图片</button>
        <button type="button" disabled={sharing} onClick={shareNative}>{sharing?'正在分享…':'确认用系统分享'}</button></div>
      <PublicationPanel key={JSON.stringify(projection)} projection={projection}/>
    </div>}
    {message&&<p role="status">{message}</p>}
  </section>;
}
