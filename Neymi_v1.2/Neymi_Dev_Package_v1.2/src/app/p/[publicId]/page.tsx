import Link from 'next/link';
import type {Metadata} from 'next';
import {publicCardUrl, socialPreview, siteOrigin} from '../../../modules/publication/social-preview';
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

export async function generateMetadata({params}:{params:Promise<{publicId:string}>}):Promise<Metadata>{
  const {publicId}=await params;
  const url=publicCardUrl(publicId);
  try{
    const projection=await getPublicationService(siteOrigin()).readPublication(publicId);
    const preview=socialPreview(projection);
    const imageUrl=new URL(`/p/${encodeURIComponent(publicId)}/opengraph-image`,siteOrigin()).toString();
    return {
      metadataBase:new URL(siteOrigin()),title:preview.title,description:preview.description,
      alternates:{canonical:url},robots:{index:false,follow:false},
      openGraph:{type:'website',siteName:'Neymi',url,title:preview.title,description:preview.description,
        images:[{url:imageUrl,width:1200,height:630,alt:`${preview.name} 的数字名片`}]},
      twitter:{card:'summary_large_image',title:preview.title,description:preview.description,images:[imageUrl]},
    };
  }catch{
    // Do not emit stale identity details for revoked, expired, or missing cards.
    return {title:'名片暂不可用 | Neymi',description:'这张名片已失效或不可访问。',robots:{index:false,follow:false}};
  }
}


function PublicCard({projection}:{projection:ShareProjection}){
  const modules=projection.modules.map((section,index)=>({id:`public-${index}`,kind:section.kind,title:section.title,items:section.items.map((item,itemIndex)=>({...item,id:`public-${index}-${itemIndex}`,sensitivity:'ordinary' as const}))}));
  const logo=projection.assets[0];
  return <div className="public-card-wrap"><CardExperience identity={projection.identity} modules={modules} templateId={projection.templateId} layout={projection.layout} motion={projection.animation} label="公开名片" dedication={projection.publicDedication} publicCard logoSrc={logo?`data:${logo.mime};base64,${logo.base64}`:undefined}/>
    {projection.assets.slice(1).map((asset,index)=><Image className="public-card-asset" key={index} src={`data:${asset.mime};base64,${asset.base64}`} alt="名片图片" width={640} height={400} unoptimized/>)}</div>;
}

export default async function PublishedPage({params}:{params:Promise<{publicId:string}>}){
  const {publicId}=await params;let projection:ShareProjection|null=null,message='';
  try{projection=await getPublicationService('https://neymi.invalid').readPublication(publicId);}
  catch(error){message=error instanceof ApiError&&error.code==='EXPIRED'?'此公开链接已到期。':error instanceof ApiError&&error.code==='NOT_FOUND'?'此公开链接已撤回或不存在。':'公开服务暂不可用。';}
  return <main className="workspace"><header className="site-header"><Link className="wordmark" href="/">neymi<span>.</span></Link><Link className="nav-ai" href="/">返回首页</Link></header>
    {projection?<div className="preview-panel public-preview"><p className="eyebrow">由持有人选择公开</p><PublicCard projection={projection}/><ReceiveActions projection={projection} publicUrl={publicCardUrl(publicId)}/></div>:
      <div className="hero"><p className="eyebrow">neymi</p><h1>{message}</h1><p className="intro">你仍可在此创建自己的名片。</p><Link href="/">开始制作</Link></div>}
  </main>;
}
