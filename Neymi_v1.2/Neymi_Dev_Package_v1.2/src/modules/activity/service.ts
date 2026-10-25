import {getDocument,GlobalWorkerOptions} from 'pdfjs-dist/legacy/build/pdf.mjs';
import {z} from 'zod';

const maxPeople=20,maxActivityText=20_000,maxPdfBytes=10*1024*1024,maxPdfPages=60;
const riskyInstructions=/(?:ignore\s+(?:all\s+)?(?:previous|prior|above)\s+instructions|reveal\s+(?:the\s+)?(?:system\s+)?prompt|忽略(?:所有|以上|之前|前面)?(?:的)?指令|泄露(?:系统)?提示词)/i;
if(typeof window!=='undefined')GlobalWorkerOptions.workerSrc=new URL('pdfjs-dist/legacy/build/pdf.worker.min.mjs',import.meta.url).toString();
const candidateSchema=z.strictObject({id:z.string().min(1).max(128),displayName:z.string().trim().min(1).max(120),organization:z.string().trim().max(160).optional(),role:z.string().trim().max(160).optional(),description:z.string().trim().max(3000),stageFit:z.enum(['aligned','mismatch','unknown']),identityConfirmed:z.boolean()});
const activitySchema=z.strictObject({schemaVersion:z.literal(1),id:z.string().min(1).max(128),name:z.string().trim().min(1).max(160),goal:z.string().trim().min(1).max(500),source:z.strictObject({kind:z.enum(['text','pdf','public_url']),title:z.string().trim().min(1).max(200),url:z.string().url().optional(),excerpt:z.string().max(maxActivityText),accessedAt:z.string().datetime()}),candidates:z.array(candidateSchema).min(1).max(maxPeople)}).superRefine((event,context)=>{
  if(event.candidates.some(candidate=>!candidate.identityConfirmed))context.addIssue({code:'custom',path:['candidates'],message:'Confirm each candidate identity before preparation'});
  if(new Set(event.candidates.map(candidate=>candidate.id)).size!==event.candidates.length)context.addIssue({code:'custom',path:['candidates'],message:'Candidate IDs must be unique'});
  if(event.source.kind==='public_url'&&(!event.source.url||new URL(event.source.url).protocol!=='https:'))context.addIssue({code:'custom',path:['source','url'],message:'Public activity URL must use HTTPS'});
  if(event.source.excerpt.length>maxActivityText)context.addIssue({code:'custom',path:['source','excerpt'],message:'Activity source is too long'});
  if(riskyInstructions.test(event.source.excerpt)||event.candidates.some(candidate=>riskyInstructions.test(candidate.description)))context.addIssue({code:'custom',path:['source','excerpt'],message:'Activity source contains instructions and was rejected'});
});

export type ActivityCandidate=z.infer<typeof candidateSchema>;
export type ActivityPreparation=z.infer<typeof activitySchema>;
export type Assessment={recipientId:string;result:'qualified'|'uncertain'|'not_recommended';evidenceQuality:'strong'|'mixed'|'insufficient'};
export type ActivityOutcome={candidateId:string;summary:string};

export function prepareEvent(input:unknown):ActivityPreparation{return activitySchema.parse(input);}

export function validateActivityText(value:string):string{
  const text=value.replace(/\u0000/g,'').replace(/[\t\r ]+/g,' ').replace(/ *\n */g,'\n').trim();
  if(!text||text.length>maxActivityText||riskyInstructions.test(text))throw new Error('Activity source is empty, too long, or contains unsafe instructions');
  return text;
}

export async function extractActivityPdf(input:Uint8Array):Promise<string>{
  if(input.byteLength<8||input.byteLength>maxPdfBytes||new TextDecoder().decode(input.subarray(0,5))!=='%PDF-')throw new Error('Invalid activity PDF');
  let document:import('pdfjs-dist').PDFDocumentProxy|undefined;
  try{
    const task=getDocument({data:input,isEvalSupported:false,useSystemFonts:false,stopAtErrors:true,verbosity:0});document=await task.promise;
    if(document.numPages<1||document.numPages>maxPdfPages)throw new Error('Activity PDF page limit exceeded');
    const pages:string[]=[];let length=0;
    for(let pageNumber=1;pageNumber<=document.numPages;pageNumber++){
      const page=await document.getPage(pageNumber),content=await page.getTextContent();
      const text=content.items.map(item=>'str'in item?item.str:'').filter(Boolean).join(' ');
      length+=text.length;if(length>maxActivityText)throw new Error('Activity PDF text limit exceeded');pages.push(text);
    }
    return validateActivityText(pages.join('\n'));
  }catch{throw new Error('Activity PDF is malformed, encrypted, or has no extractable text');}
  finally{await document?.destroy();}
}

export type RankedEntry={candidate:ActivityCandidate;assessment:Assessment|null;overlap:number;position:number|null};
export function rankAssessments(entries:Array<Omit<RankedEntry,'position'>>){
  const qualified=entries.filter(item=>item.assessment?.result==='qualified').sort((a,b)=>Number(b.assessment?.evidenceQuality==='strong')-Number(a.assessment?.evidenceQuality==='strong')||b.overlap-a.overlap);
  const uncertain=entries.filter(item=>item.assessment?.result==='uncertain').sort((a,b)=>b.overlap-a.overlap);
  const notRecommended=entries.filter(item=>item.assessment?.result==='not_recommended');
  const unknown=entries.filter(item=>item.assessment===null);
  const rank=(items:typeof entries)=>items.map((item,index)=>({...item,position:index+1}));
  return{qualified:rank(qualified),uncertain:rank(uncertain),notRecommended:notRecommended.map(item=>({...item,position:null})),unknown:unknown.map(item=>({...item,position:null}))};
}

export async function runActivityBatch<T extends ActivityOutcome>(event:ActivityPreparation,process:(candidate:ActivityCandidate,signal?:AbortSignal)=>Promise<T>,options:{signal?:AbortSignal;cache?:Map<string,T>}={}):Promise<Array<{candidateId:string;state:'ready'|'reused'|'failed'|'cancelled';result?:T;error?:string}>>{
  const validated=prepareEvent(event),outcomes:Awaited<ReturnType<typeof runActivityBatch<T>>> =[];
  for(const candidate of validated.candidates){
    await new Promise(resolve=>setTimeout(resolve,0));
    if(options.signal?.aborted){outcomes.push({candidateId:candidate.id,state:'cancelled'});continue;}
    const existing=options.cache?.get(candidate.id);if(existing){outcomes.push({candidateId:candidate.id,state:'reused',result:existing});continue;}
    try{const result=await process(candidate,options.signal);if(options.signal?.aborted)outcomes.push({candidateId:candidate.id,state:'cancelled'});else{options.cache?.set(candidate.id,result);outcomes.push({candidateId:candidate.id,state:'ready',result});}}
    catch{outcomes.push({candidateId:candidate.id,state:options.signal?.aborted?'cancelled':'failed',...(!options.signal?.aborted?{error:'此人准备失败，可单独重试。'}:{})});}
  }
  return outcomes;
}

export function overlapCount(candidateDescription:string,confirmedFacts:string[]):number{
  const terms=(value:string)=>new Set(value.toLowerCase().match(/[a-z\d]{3,}|[\u3400-\u9fff]{2}/g)??[]);
  const candidateTerms=terms(candidateDescription);
  return confirmedFacts.reduce((total,fact)=>total+[...terms(fact)].filter(term=>candidateTerms.has(term)).length,0);
}

export function stageAndTopicGroups(candidates:ActivityCandidate[],confirmedFacts:string[]){
  const excluded=candidates.filter(candidate=>candidate.stageFit==='mismatch');
  const unknown=candidates.filter(candidate=>candidate.stageFit!=='mismatch'&&(candidate.stageFit==='unknown'||!candidate.description.trim()||!confirmedFacts.length));
  const comparable=candidates.filter(candidate=>candidate.stageFit==='aligned'&&candidate.description.trim()&&confirmedFacts.length);
  const overlaps=comparable.map(candidate=>({candidate,overlap:overlapCount(candidate.description,confirmedFacts)}));
  const topicOverlap=overlaps.filter(item=>item.overlap>0).sort((a,b)=>b.overlap-a.overlap);
  const noTopicOverlap=overlaps.filter(item=>item.overlap===0);
  return{topicOverlap,noTopicOverlap,unknown,excluded};
}
