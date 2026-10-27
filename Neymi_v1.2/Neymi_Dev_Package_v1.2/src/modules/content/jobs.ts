import {validateContentFileSelection,type ContentFileLike} from './file-input';
import {extractContentFile} from './extract';
import type {ContentImportDocument} from './types';

export type ContentImportState='selected'|'validating'|'ready'|'failed'|'cancelled';
export interface ContentImportJob {id:string;sourceId:string;fileName:string;status:ContentImportState;document?:ContentImportDocument;error?:string;}
export async function runContentImport(file:ContentFileLike,options:{sourceId:string;pageRange?:{startPage:number;endPage:number};maxCharacters?:number;signal?:AbortSignal;onState?:(state:ContentImportState)=>void}):Promise<ContentImportJob>{
  const job:ContentImportJob={id:options.sourceId,sourceId:options.sourceId,fileName:file.name,status:'selected'};
  const set=(status:ContentImportState)=>{job.status=status;options.onState?.(status);};
  const cancel=()=>{set('cancelled');return job;};
  set('selected');if(options.signal?.aborted)return cancel();set('validating');
  try{
    validateContentFileSelection([file]);
    const bytes=new Uint8Array(await file.arrayBuffer());if(options.signal?.aborted)return cancel();
    job.document=await extractContentFile(file,bytes,{sourceId:options.sourceId,pageRange:options.pageRange,maxCharacters:options.maxCharacters,signal:options.signal});
    if(options.signal?.aborted){delete job.document;return cancel();}
    set('ready');return job;
  }catch(error){
    delete job.document;
    if(options.signal?.aborted||error instanceof DOMException&&error.name==='AbortError')return cancel();
    job.error=error instanceof Error?error.message:'文件读取失败。';set('failed');return job;
  }
}
