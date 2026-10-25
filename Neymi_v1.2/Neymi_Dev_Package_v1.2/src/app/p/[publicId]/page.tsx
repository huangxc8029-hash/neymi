import Link from 'next/link';
import Image from 'next/image';
import type {ShareProjection} from '../../../domain/types';
import {getPublicationService} from '../../../server/publication-runtime';
import {ApiError} from '../../../server/errors';
import {ReceiveActions} from '../../../modules/sharing/receive-actions';
import {CardExperience} from '../../../modules/card/card-experience';

export const dynamic='force-dynamic';
export const revalidate=0;
export const fetchCache='force-no-store';
export const runtime='nodejs';

function PublicCard({projection}:{projection:ShareProjection}){
  const modules=projection.modules.map((section,index)=>({id:`public-${index}`,kind:section.kind,title:section.title,items:section.items.map((item,itemIndex)=>({...item,id:`public-${index}-${itemIndex}`,sensitivity:'ordinary' as const}))}));
  return <div className="public-card-wrap"><CardExperience identity={projection.identity} modules={modules} templateId={projection.templateId} motion={projection.animation} label="公开名片" dedication={projection.publicDedication} publicCard/>
    {projection.assets.map((asset,index)=><Image className="public-card-asset" key={index} src={`data:${asset.mime};base64,${asset.base64}`} alt="名片图片" width={640} height={400} unoptimized/>)}</div>;
}

export default async function PublishedPage({params}:{params:Promise<{publicId:string}>}){
  const {publicId}=await params;let projection:ShareProjection|null=null,message='';
  try{projection=await getPublicationService('https://neymi.invalid').readPublication(publicId);}
  catch(error){message=error instanceof ApiError&&error.code==='EXPIRED'?'此公开链接已到期。':error instanceof ApiError&&error.code==='NOT_FOUND'?'此公开链接已撤回或不存在。':'公开服务暂不可用。';}
  return <main className="workspace"><header className="site-header"><Link className="wordmark" href="/">neymi<span>.</span></Link><Link className="nav-ai" href="/">返回首页</Link></header>
    {projection?<div className="preview-panel public-preview"><p className="eyebrow">由持有人选择公开</p><PublicCard projection={projection}/><ReceiveActions projection={projection}/></div>:
      <div className="hero"><p className="eyebrow">neymi</p><h1>{message}</h1><p className="intro">你仍可在此创建自己的名片。</p><Link href="/">开始制作</Link></div>}
  </main>;
}
