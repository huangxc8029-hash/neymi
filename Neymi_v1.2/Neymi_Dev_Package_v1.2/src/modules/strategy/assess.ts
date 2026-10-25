import {approvedCloudContextSchema} from '../../domain/schemas';
import {validateResearch} from '../../domain/validate';
import type {RelevanceAssessment} from '../../domain/types';
import type {PlanningInput} from '../../server/providers/llm';

const marker='Confirmed professional facts:\n';
export function approvedSelfFacts(input:PlanningInput):Array<{id:string;text:string}>{
  const context=approvedCloudContextSchema.parse(input.approvedContext);
  if(!context.factIds.length)return[];
  const start=context.text.lastIndexOf(marker);if(start<0)throw new Error('Approved fact text missing');
  const lines=context.text.slice(start+marker.length).split('\n');
  const facts=lines.map(line=>{const match=/^- \[([A-Za-z0-9_-]+)\] (.+)$/.exec(line);if(!match)throw new Error('Malformed approved fact text');return{id:match[1],text:match[2]};});
  if(facts.length!==context.factIds.length||facts.some((fact,index)=>fact.id!==context.factIds[index]))throw new Error('Approved fact IDs do not match text');
  return facts;
}
function tokens(value:string):Set<string>{
  const result=new Set<string>();
  for(const match of value.toLowerCase().matchAll(/[a-z\d]{3,}/g))result.add(match[0]);
  for(const match of value.matchAll(/[\u3400-\u9fff]+/g))for(let index=0;index<match[0].length-1;index++)result.add(match[0].slice(index,index+2));
  return result;
}
export function matchedTopics(input:PlanningInput){
  const facts=approvedSelfFacts(input),research=validateResearch(input.research);
  const claims=research.claims.map(claim=>{
    const words=tokens(claim.claim),matches=facts.map(fact=>({fact,score:[...tokens(fact.text)].filter(word=>words.has(word)).length})).filter(item=>item.score>0);
    return{claim,matches,score:matches.reduce((sum,item)=>sum+item.score,0)};
  }).filter(item=>item.score>0).sort((a,b)=>b.score-a.score);
  return{facts,claims};
}
export function assessRecipient(input:PlanningInput):RelevanceAssessment{
  const research=validateResearch(input.research),{claims}=matchedTopics(input),best=claims[0];
  const authoritative=research.recipient.identityStatus==='verified'&&best?.claim.kind==='fact'&&best.claim.confidence==='high'&&best.claim.sourceIds.some(id=>research.sources.find(source=>source.id===id)?.origin==='official'||research.sources.find(source=>source.id===id)?.origin==='primary');
  return{id:`assessment_${crypto.randomUUID().replaceAll('-','')}`,recipientId:research.recipient.id,goalId:input.context.goal.id,
    result:authoritative?'qualified':'uncertain',evidenceQuality:authoritative?'strong':best&&(best.claim.kind==='fact'||best.claim.kind==='explicit_preference')?'mixed':'insufficient',
    positives:best?[{reason:'本人已确认事实与公开来源片段存在主题重合；来源仍需核实。',claimIds:[best.claim.id]}]:[],
    misfits:[],openQuestions:best?['这条公开资料是否对应你要联系的人？','对方目前是否需要讨论这个主题？']:['目前没有可匹配的已确认事实。','你想先向对方确认什么？']};
}
