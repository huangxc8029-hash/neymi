import Link from 'next/link';
import Image from 'next/image';
import type {ShareProjection} from '../../../domain/types';
import {getPublicationService} from '../../../server/publication-runtime';
import {ApiError} from '../../../server/errors';

export const dynamic='force-dynamic';
export const revalidate=0;
export const fetchCache='force-no-store';
export const runtime='nodejs';

function PublicCard({projection}:{projection:ShareProjection}){
  return <article className="cyber-card" aria-label="公开名片">
    <div className="card-head"><span className="card-mark">neymi<span aria-hidden="true">✳</span></span><span className="card-label">A better first impression</span></div>
    <div className="card-main"><p className="card-kicker">Nice to meet you</p><h1>{projection.identity.name??'你好'}</h1>
      <p>{[projection.identity.role,projection.identity.company].filter(Boolean).join(' · ')}</p>
      {projection.publicDedication&&<p>{projection.publicDedication}</p>}</div>
    <div className="card-modules">{projection.modules.map((section,index)=><section key={`${section.title}-${index}`}><h2>{section.title}</h2>{section.items.map((item,itemIndex)=><p key={`${item.label}-${itemIndex}`}><strong>{item.label}</strong> {item.value}</p>)}</section>)}
      {projection.assets.map((asset,index)=><Image key={index} src={`data:${asset.mime};base64,${asset.base64}`} alt="名片图片" width={640} height={400} unoptimized style={{maxWidth:'100%',height:'auto'}}/>)}</div>
    <div className="card-foot"><span>Made for this moment</span><span>↗</span></div>
  </article>;
}

export default async function PublishedPage({params}:{params:Promise<{publicId:string}>}){
  const {publicId}=await params;let projection:ShareProjection|null=null,message='';
  try{projection=await getPublicationService('https://neymi.invalid').readPublication(publicId);}
  catch(error){message=error instanceof ApiError&&error.code==='EXPIRED'?'此公开链接已到期。':error instanceof ApiError&&error.code==='NOT_FOUND'?'此公开链接已撤回或不存在。':'公开服务暂不可用。';}
  return <main className="workspace"><header><Link className="wordmark" href="/">neymi</Link></header>
    {projection?<div className="preview-panel" style={{maxWidth:720,margin:'48px auto'}}><p className="eyebrow">由持有人选择公开</p><PublicCard projection={projection}/></div>:
      <div className="hero"><p className="eyebrow">neymi</p><h1>{message}</h1><p className="intro">你仍可在此创建自己的名片。</p><Link href="/">开始制作</Link></div>}
  </main>;
}
