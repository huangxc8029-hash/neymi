import {z} from 'zod';
import {contentCandidateSchema,contentSourceRefSchema} from './schemas';
import {CARD_TEMPLATES} from '../card/templates';
import type {ContentSourceRef} from '../../domain/types';
import type {LocalProfile,ProfileItem} from '../../domain/types';
import {localProfileSchema,profileItemSchema} from '../../domain/schemas';

const proposalSchema=z.strictObject({
  id:z.string().min(1).max(128).regex(/^[A-Za-z0-9_-]+$/),kind:z.string().min(1),title:z.string().trim().min(1).max(1000),
  items:z.array(z.strictObject({id:z.string().min(1).max(128),label:z.string().trim().min(1).max(1000),value:z.string().trim().min(1).max(20000),valueKind:z.enum(['text','phone','email','address']).optional()})).min(1),
  sourceRefs:z.array(z.unknown()).min(1),rationale:z.string().trim().min(1).max(1000),missingEvidence:z.array(z.string().max(1000)).max(20),
});
export interface ModuleProposal {id:string;kind:string;title:string;items:Array<{id:string;label:string;value:string;valueKind?:'text'|'phone'|'email'|'address'}>;sourceRefs:ContentSourceRef[];rationale:string;missingEvidence:string[];status:'candidate';}
export interface ApprovedSourceSegment {sourceRef:ContentSourceRef;text:string;}
function sameSource(left:ContentSourceRef,right:ContentSourceRef){return left.kind===right.kind&&left.sourceId===right.sourceId&&left.page===right.page&&left.paragraph===right.paragraph&&left.startMs===right.startMs&&left.endMs===right.endMs&&left.createdAt===right.createdAt;}
export async function proposeModules(context:{text:string;approvedSourceIds:string[];approvedSources?:ContentSourceRef[];approvedSourceSegments?:ApprovedSourceSegment[]},provider:()=>Promise<unknown>):Promise<ModuleProposal[]>{
  if(!context.text.trim()||!context.approvedSourceIds.length)throw new Error('Select source text and approve it before requesting module proposals.');
  const raw=await provider();if(!Array.isArray(raw)||raw.length>8)throw new Error('Module proposal response is invalid.');
  return raw.map(value=>{
    const parsed=proposalSchema.parse(value),sources=parsed.sourceRefs.map(source=>contentSourceRefSchema.parse(source));
    if(sources.some(source=>!context.approvedSourceIds.includes(source.sourceId)))throw new Error('Proposal refers to a source that was not approved.');
    if(context.approvedSources&&sources.some(source=>!context.approvedSources!.some(approved=>sameSource(source,approved))))throw new Error('Proposal source location was not approved.');
    if(context.approvedSourceSegments){
      const citedSegments=context.approvedSourceSegments.filter(segment=>sources.some(source=>sameSource(source,segment.sourceRef)));
      if(parsed.items.some(item=>!citedSegments.some(segment=>segment.text.includes(item.value))))throw new Error('Proposal item is not supported by its cited source text.');
    }else if(parsed.items.some(item=>!context.text.includes(item.value)))throw new Error('Proposal item is not supported by the approved source text.');
    const candidate=contentCandidateSchema.parse({id:parsed.id,kind:parsed.kind,title:parsed.title,items:parsed.items,sourceRefs:sources,status:'candidate',revision:1});
    return {...candidate,status:'candidate' as const,rationale:parsed.rationale,missingEvidence:parsed.missingEvidence};
  });
}

export interface StylePairing {templateId:string;availability:'free'|'pro';layout:string;moduleKind:string;rationale:string;}
export function selectStylePairings(moduleKinds:string[],preferences:string[]=[]):StylePairing[]{
  const text=`${moduleKinds.join(' ')} ${preferences.join(' ')}`.toLowerCase();
  const preferenceScores=(id:string)=>{
    let score=0;
    const signals:[RegExp,string[],number][]=[
      [/pixel|像素|游戏|开发|复古/,['pixel-game'],8],
      [/东方|新潮|文化|人文|故事/,['oriental-newwave'],7],
      [/y2k|千禧|未来|时尚|潮流/,['y2k'],8],
      [/街头|涂鸦|音乐|艺术|大胆/,['street-graffiti'],7],
      [/剪贴|手账|日记|个人故事|经历/,['scrapbook'],8],
      [/赛博|霓虹|科技|科幻/,['cyber-neon'],8],
      [/马赛克|拼贴|时间线|作品集/,['mosaic-porcelain','scrapbook'],6],
      [/多巴胺|活泼|明亮|贴纸/,['dopamine-spark','y2k'],6],
      [/动漫|章节/,['anime-cel','pixel-game'],6],
    ];
    for(const [pattern,ids,points] of signals)if(pattern.test(text)&&ids.includes(id))score+=points;
    if(moduleKinds.includes('project_case')&&['pixel-game','cyber-neon','gallery'].includes(id))score+=2;
    if(moduleKinds.includes('my_story')&&['scrapbook','oriental-newwave','anime-cel'].includes(id))score+=2;
    if(moduleKinds.includes('service')&&['y2k','brand-studio','evergreen'].includes(id))score+=1;
    if(id==='evergreen')score+=1;
    return score;
  };
  const ranked=[...CARD_TEMPLATES].sort((a,b)=>preferenceScores(b.id)-preferenceScores(a.id)||a.id.localeCompare(b.id));
  const sorted=ranked.slice(0,3);
  if(!sorted.some(template=>template.availability==='free'))sorted[2]=ranked.find(template=>template.availability==='free')!;
  return sorted.map(template=>({templateId:template.id,availability:template.availability,layout:template.layout,moduleKind:moduleKinds[0]??'my_intro',rationale:`根据「${preferences[0]??moduleKinds[0]??'当前内容'}」偏好与内容结构推荐；需由用户选择，Pro 模板须通过权益校验。`}));
}

export function applyModuleProposal(profile:LocalProfile,proposal:ModuleProposal,now:string):LocalProfile{
  const moduleId=`module_${proposal.id}`;
  if(profile.modules.some(module=>module.id===moduleId))throw new Error('This proposal was already added or its ID is in use.');
  const items:ProfileItem[]=proposal.items.map(item=>{
    if(item.valueKind&&item.valueKind!=='text')throw new Error('Contact fields must be saved in the encrypted contact vault.');
    const value={...item,sensitivity:'ordinary' as const,sourceRefs:proposal.sourceRefs,confirmedAt:now};
    return profileItemSchema.parse(value);
  });
  return localProfileSchema.parse({...profile,revision:profile.revision+1,modules:[...profile.modules,{id:moduleId,kind:proposal.kind,title:proposal.title,items}]});
}
