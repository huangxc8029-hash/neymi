import {unavailable} from '../errors';
import {z} from 'zod';
import type {ResearchSource} from '../../domain/types';

export interface ResearchProvider{search(query:string):Promise<ResearchSource[]>}
export class UnconfiguredResearchProvider implements ResearchProvider{
  async search():Promise<ResearchSource[]>{throw unavailable('Public research provider is not configured');}
}
const resultSchema=z.object({results:z.array(z.object({title:z.string(),url:z.string().url(),content:z.string(),published_date:z.string().nullable().optional()}))});
export class TavilyResearchProvider implements ResearchProvider{
  constructor(private readonly key:string,private readonly transport:typeof fetch=fetch){}
  async search(query:string):Promise<ResearchSource[]>{
    let response:Response;
    try{response=await this.transport('https://api.tavily.com/search',{method:'POST',headers:{authorization:`Bearer ${this.key}`,'content-type':'application/json'},
      body:JSON.stringify({query:query.slice(0,2000),search_depth:'basic',max_results:5,include_answer:false,include_raw_content:false,include_images:false,include_published_date:true}),
      signal:AbortSignal.timeout(20_000),cache:'no-store'});}catch{throw unavailable('Public research request failed');}
    if(!response.ok)throw unavailable('Public research provider rejected the request');
    let parsed:unknown;try{parsed=await response.json();}catch{throw unavailable('Public research response was invalid');}
    const now=new Date().toISOString();
    return resultSchema.parse(parsed).results.flatMap((result,index)=>{
      if(!result.title.trim()||!result.content.trim()||!result.url.startsWith('https://'))return[];
      const date=result.published_date?new Date(result.published_date):null;
      return[{id:`search_${index}_${crypto.randomUUID().replaceAll('-','')}`,url:result.url,title:result.title.slice(0,500),origin:'other' as const,
        accessedAt:now,publishedAt:date&&!Number.isNaN(date.getTime())?date.toISOString():null,excerpt:result.content.slice(0,2000)}];
    });
  }
}
export function getResearchProvider():ResearchProvider{
  const key=process.env.NEYMI_TAVILY_API_KEY;
  return key?new TavilyResearchProvider(key):new UnconfiguredResearchProvider();
}
