'use client';
import {useEffect,useRef,useState,type ChangeEvent} from 'react';
import {CONTENT_FILE_LIMITS,validateContentFileSelection} from './file-input';
import {runContentImport,type ContentImportJob} from './jobs';
import type {ContentImportDocument} from './types';

export function ContentImportPanel({onReady,onClear,compact=false}:{onReady?:(document:ContentImportDocument)=>void;onClear?:()=>void;compact?:boolean}){
  const [jobs,setJobs]=useState<ContentImportJob[]>([]),[error,setError]=useState('');
  const [retryableIds,setRetryableIds]=useState<string[]>([]);
  const [pageRanges,setPageRanges]=useState<Record<string,{startPage:number;endPage:number}>>({});
  const input=useRef<HTMLInputElement>(null),files=useRef(new Map<string,File>()),controllers=useRef(new Map<string,AbortController>());
  useEffect(()=>()=>{controllers.current.forEach(controller=>controller.abort());controllers.current.clear();files.current.clear();},[]);
  function update(job:ContentImportJob){setJobs(current=>current.map(item=>item.id===job.id?job:item));}
  async function parse(file:File,sourceId:string,pageRange?:{startPage:number;endPage:number},maxCharacters:number=CONTENT_FILE_LIMITS.maxCharacters){
    const controller=new AbortController();controllers.current.set(sourceId,controller);
    const result=await runContentImport(file,{sourceId,pageRange,maxCharacters,signal:controller.signal,onState:status=>setJobs(current=>current.map(job=>job.id===sourceId?{...job,status}:job))});
    update(result);controllers.current.delete(sourceId);
    if(result.status==='ready'&&result.document)onReady?.(result.document);
    if(result.status==='ready'||result.status==='cancelled'){files.current.delete(sourceId);setRetryableIds(current=>current.filter(id=>id!==sourceId));}
    return result;
  }
  async function importFiles(selected:File[]){
    let usedCharacters=0;
    for(const file of selected){
      const sourceId=`source_${crypto.randomUUID().replaceAll('-','')}`;files.current.set(sourceId,file);setRetryableIds(current=>[...current,sourceId]);
      setJobs(current=>[...current,{id:sourceId,sourceId,fileName:file.name,status:'selected'}]);
      const result=await parse(file,sourceId,undefined,CONTENT_FILE_LIMITS.maxCharacters-usedCharacters);
      usedCharacters+=result.document?.text.length??0;
    }
  }
  async function selectFiles(event:ChangeEvent<HTMLInputElement>){
    const selected=Array.from(event.currentTarget.files??[]);event.currentTarget.value='';setError('');
    try{validateContentFileSelection(selected);}catch(cause){setError(cause instanceof Error?cause.message:'所选文件不符合要求。');return;}
    controllers.current.forEach(controller=>controller.abort());controllers.current.clear();files.current.clear();setJobs([]);setPageRanges({});setRetryableIds([]);onClear?.();
    await importFiles(selected);
  }
  async function retry(job:ContentImportJob){
    const file=files.current.get(job.id);if(!file)return;
    const usedCharacters=jobs.reduce((sum,item)=>sum+(item.document?.text.length??0),0);
    await parse(file,job.sourceId,pageRanges[job.id],CONTENT_FILE_LIMITS.maxCharacters-usedCharacters);
  }
  function clear(){controllers.current.forEach(controller=>controller.abort());controllers.current.clear();files.current.clear();setJobs([]);setPageRanges({});setRetryableIds([]);setError('');onClear?.();if(input.current)input.current.value='';}

  return <section className={`content-import${compact?' content-import-compact':''}`} aria-label={compact?'附件':'上传介绍材料'}>
    {!compact&&<><h3 id="content-import-title">上传介绍材料</h3>
    <p>仅在此设备解析 PDF、DOCX、TXT、JPEG 或 PNG；图片暂不识别文字。材料不会自动写入资料或发送到云端。</p>
    <p className="content-import-limits">最多 5 个文件；单个不超过 10 MiB、合计 25 MiB；PDF 最多 100 页；文字最多 50,000 字符。</p></>}
    {compact?<button type="button" aria-label="添加附件" title="添加附件" className="content-import-trigger" onClick={()=>input.current?.click()}>＋</button>:<label htmlFor="content-files">选择本地文件</label>}
    <input ref={input} id="content-files" aria-label="选择本地文件" type="file" accept=".pdf,.docx,.txt,.jpg,.jpeg,.png" multiple onChange={event=>void selectFiles(event)}/>
    {error&&<p role="alert">{error}</p>}
    {jobs.length>0&&<div className="content-import-jobs" aria-live="polite">
      {jobs.map(job=><article className={`content-import-job${compact?' content-import-job-compact':''}`} key={job.id}>
        <div><strong>{job.fileName}</strong><span>{job.status==='selected'?'已选择':job.status==='validating'?'正在本机解析':job.status==='ready'?'已就绪':job.status==='cancelled'?'已取消':'解析失败'}</span></div>
        {job.document?.kind==='media'&&!compact&&<p>图片作为媒体素材保留在本次临时预览中；首版未启用 OCR。</p>}
        {job.document?.text&&!compact&&<details><summary>查看本机提取文本和来源</summary><pre>{job.document.text.slice(0,3000)}{job.document.text.length>3000?'\n…已按范围截取预览':''}</pre><ul>{job.document.segments.map((segment,index)=><li key={`${segment.sourceRef.sourceId}-${index}`}>{segment.sourceRef.page?`第 ${segment.sourceRef.page} 页`:segment.sourceRef.paragraph?`第 ${segment.sourceRef.paragraph} 段`:'文本'} · {segment.text.slice(0,120)}</li>)}</ul></details>}
        {job.status==='failed'&&job.error&&<p role="alert">{job.error}</p>}
        {job.status==='failed'&&/\.pdf$/i.test(job.fileName)&&retryableIds.includes(job.id)&&<div className="content-page-range">
          <label htmlFor={`${job.id}-start`}>起始页</label><input id={`${job.id}-start`} type="number" min="1" max="10000" value={pageRanges[job.id]?.startPage??1} onChange={event=>setPageRanges(current=>({...current,[job.id]:{startPage:Number(event.target.value),endPage:current[job.id]?.endPage??100}}))}/>
          <label htmlFor={`${job.id}-end`}>结束页（最多选 100 页）</label><input id={`${job.id}-end`} type="number" min="1" max="10000" value={pageRanges[job.id]?.endPage??100} onChange={event=>setPageRanges(current=>({...current,[job.id]:{startPage:current[job.id]?.startPage??1,endPage:Number(event.target.value)}}))}/>
          <button type="button" onClick={()=>void retry(job)}>按页码范围重试</button>
        </div>}
        {(job.status==='selected'||job.status==='validating')&&<button type="button" onClick={()=>controllers.current.get(job.id)?.abort()}>取消解析</button>}
        {job.status==='failed'&&retryableIds.includes(job.id)&&!job.fileName.toLowerCase().endsWith('.pdf')&&<button type="button" onClick={()=>void retry(job)}>重新解析</button>}
      </article>)}
    </div>}
    {jobs.length>0&&<button type="button" className="secondary" onClick={clear}>清除临时材料</button>}
  </section>;
}
