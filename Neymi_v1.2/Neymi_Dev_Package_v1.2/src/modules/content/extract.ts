import {getDocument,GlobalWorkerOptions} from 'pdfjs-dist/legacy/build/pdf.mjs';
import type {ContentSourceRef} from '../../domain/types';
import {CONTENT_FILE_LIMITS,type ContentFileLike,validateContentFileBytes} from './file-input';
import type {ContentImportDocument,ContentImportSegment} from './types';

if(typeof window!=='undefined')GlobalWorkerOptions.workerSrc=new URL('pdfjs-dist/legacy/build/pdf.worker.min.mjs',import.meta.url).toString();
const maxDocxXmlBytes=2*1024*1024;
const sourceRef=(sourceId:string,createdAt:string,location:Partial<Pick<ContentSourceRef,'page'|'paragraph'>>={}):ContentSourceRef=>({kind:'file',sourceId,createdAt,...location});
const checkAbort=(signal?:AbortSignal)=>{if(signal?.aborted)throw new DOMException('Import cancelled','AbortError');};

function checkedText(value:string,maxCharacters:number):string{
  const text=value.replace(/^\uFEFF/,'').replace(/\r\n?/g,'\n').trim();
  if(!text||text.includes('\u0000'))throw new Error('文件为空或包含无效文本。');
  if(text.length>maxCharacters)throw new Error('提取文本超过本次 50,000 字符上限。');
  return text;
}
function textSegments(text:string,sourceId:string,createdAt:string,maxCharacters:number):ContentImportSegment[]{
  const paragraphs=text.split(/\n\s*\n/).map(value=>value.trim()).filter(Boolean);
  const segments=(paragraphs.length?paragraphs:[text]).map((value,index)=>({text:value,sourceRef:sourceRef(sourceId,createdAt,{paragraph:index+1})}));
  if(segments.reduce((sum,segment)=>sum+segment.text.length,0)>maxCharacters)throw new Error('提取文本超过本次 50,000 字符上限。');
  return segments;
}

async function extractPdf(bytes:Uint8Array,sourceId:string,createdAt:string,options:{pageRange?:{startPage:number;endPage:number};maxCharacters:number;signal?:AbortSignal}){
  const task=getDocument({data:bytes,isEvalSupported:false,useSystemFonts:false,stopAtErrors:true,verbosity:0});
  const abort=()=>{void task.destroy();};options.signal?.addEventListener('abort',abort,{once:true});
  try{
    const document=await task.promise;checkAbort(options.signal);
    const range=options.pageRange;
    if(document.numPages>CONTENT_FILE_LIMITS.maxPdfPages&&!range)throw new Error('PDF 超过 100 页，请选择页码范围后重试。');
    const start=range?.startPage??1,end=range?.endPage??document.numPages;
    if(!Number.isInteger(start)||!Number.isInteger(end)||start<1||end<start||end>document.numPages||end-start+1>CONTENT_FILE_LIMITS.maxPdfPages)throw new Error('PDF 页码范围无效，最多可选 100 页。');
    const segments:ContentImportSegment[]=[];let total=0;
    for(let pageNumber=start;pageNumber<=end;pageNumber++){
      checkAbort(options.signal);
      const page=await document.getPage(pageNumber),content=await page.getTextContent();
      const text=content.items.map(item=>'str'in item?item.str:'').filter(Boolean).join(' ').trim();
      if(!text)continue;
      total+=text.length;if(total>options.maxCharacters)throw new Error('提取文本超过本次 50,000 字符上限。');
      segments.push({text,sourceRef:sourceRef(sourceId,createdAt,{page:pageNumber})});
    }
    if(!segments.length)throw new Error('PDF 没有可提取的文字；扫描图片的 OCR 暂未启用。');
    return {segments,text:segments.map(segment=>segment.text).join('\n'),pageCount:document.numPages};
  }catch(error){
    if(options.signal?.aborted)throw new DOMException('Import cancelled','AbortError');
    if(error instanceof Error&&/100 页|页码范围|50,000|没有可提取的文字/.test(error.message))throw error;
    throw new Error('PDF 无法读取，可能已损坏、加密或格式不受支持。');
  }finally{options.signal?.removeEventListener('abort',abort);await task.destroy();}
}

function readDocxXml(bytes:Uint8Array):Promise<string>{
  const view=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);
  const lower=Math.max(0,bytes.byteLength-65_557);let end=-1;
  for(let offset=bytes.byteLength-22;offset>=lower;offset--){if(view.getUint32(offset,true)===0x06054b50){end=offset;break;}}
  if(end<0)throw new Error('DOCX 压缩目录无效。');
  const disk=view.getUint16(end+4,true),directoryDisk=view.getUint16(end+6,true),entriesOnDisk=view.getUint16(end+8,true),count=view.getUint16(end+10,true),directorySize=view.getUint32(end+12,true),directoryStart=view.getUint32(end+16,true),commentLength=view.getUint16(end+20,true);
  if(disk!==0||directoryDisk!==0||entriesOnDisk!==count||end+22+commentLength!==bytes.byteLength||count<1||count>1000||directoryStart+directorySize>end)throw new Error('DOCX 压缩目录超出安全范围。');
  let offset=directoryStart,documentEntry:{method:number;compressed:number;uncompressed:number;localOffset:number}|undefined;
  const decoder=new TextDecoder('utf-8',{fatal:true});
  for(let index=0;index<count;index++){
    if(offset+46>bytes.byteLength||view.getUint32(offset,true)!==0x02014b50)throw new Error('DOCX 压缩目录条目无效。');
    const flags=view.getUint16(offset+8,true),method=view.getUint16(offset+10,true),compressed=view.getUint32(offset+20,true),uncompressed=view.getUint32(offset+24,true);
    const nameLength=view.getUint16(offset+28,true),extraLength=view.getUint16(offset+30,true),commentLength=view.getUint16(offset+32,true),localOffset=view.getUint32(offset+42,true);
    const next=offset+46+nameLength+extraLength+commentLength;if(next>bytes.byteLength)throw new Error('DOCX 文件名超出压缩目录。');
    const name=decoder.decode(bytes.subarray(offset+46,offset+46+nameLength));
    if(name==='word/document.xml'){
      if(documentEntry||flags&1||![0,8].includes(method)||compressed===0xffffffff||uncompressed>maxDocxXmlBytes)throw new Error('DOCX 文档条目不受支持。');
      documentEntry={method,compressed,uncompressed,localOffset};
    }
    offset=next;
  }
  if(!documentEntry)throw new Error('DOCX 缺少主文档。');
  const {method,compressed,uncompressed,localOffset}=documentEntry;
  if(localOffset+30>bytes.byteLength||view.getUint32(localOffset,true)!==0x04034b50)throw new Error('DOCX 主文档位置无效。');
  const localMethod=view.getUint16(localOffset+8,true),nameLength=view.getUint16(localOffset+26,true),extraLength=view.getUint16(localOffset+28,true);
  const localName=decoder.decode(bytes.subarray(localOffset+30,localOffset+30+nameLength)),start=localOffset+30+nameLength+extraLength,endData=start+compressed;
  if(localName!=='word/document.xml'||localMethod!==method||endData>directoryStart)throw new Error('DOCX 主文档数据不完整。');
  const payload=bytes.subarray(start,endData);
  if(method===0){if(payload.byteLength!==uncompressed)throw new Error('DOCX 主文档长度不匹配。');return Promise.resolve(new TextDecoder('utf-8',{fatal:true}).decode(payload));}
  if(typeof DecompressionStream==='undefined')throw new Error('此浏览器暂不支持离线解压 DOCX。');
  return (async()=>{
    const stream=new Blob([payload as BlobPart]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
    const reader=stream.getReader(),chunks:Uint8Array[]=[];let total=0;
    try{while(true){const {done,value}=await reader.read();if(done)break;total+=value.length;if(total>maxDocxXmlBytes){await reader.cancel();throw new Error('DOCX 解压后文档过大。');}chunks.push(value);}}
    finally{reader.releaseLock();}
    if(total!==uncompressed)throw new Error('DOCX 解压后长度不匹配。');
    const xmlBytes=new Uint8Array(total);let position=0;for(const chunk of chunks){xmlBytes.set(chunk,position);position+=chunk.length;}
    return new TextDecoder('utf-8',{fatal:true}).decode(xmlBytes);
  })();
}

function extractDocxText(xml:string,maxCharacters:number){
  if(/<!DOCTYPE|<!ENTITY/i.test(xml))throw new Error('DOCX XML 声明不受支持。');
  const decode=(value:string)=>value.replace(/&(#x[\da-f]+|#\d+|amp|lt|gt|quot|apos);/gi,(entity,code:string)=>{
    if(code==='amp')return '&';if(code==='lt')return '<';if(code==='gt')return '>';if(code==='quot')return '"';if(code==='apos')return "'";
    const point=code[1]?.toLowerCase()==='x'?Number.parseInt(code.slice(2),16):Number.parseInt(code.slice(1),10);
    if(!Number.isInteger(point)||point<1||point>0x10ffff||(point>=0xd800&&point<=0xdfff))throw new Error('DOCX 含有非法字符引用。');
    return String.fromCodePoint(point);
  });
  const paragraphs=[...xml.matchAll(/<w:p\b[^>]*>([\s\S]*?)<\/w:p>/g)].map(match=>[...match[1].matchAll(/<w:t\b[^>]*>([\s\S]*?)<\/w:t>/g)].map(item=>decode(item[1])).join(''));
  const clean=checkedText(paragraphs.filter(Boolean).join('\n\n'),maxCharacters);
  return clean.split(/\n\s*\n/).map(text=>text.trim()).filter(Boolean);
}

export async function extractContentFile(file:ContentFileLike,bytes:Uint8Array,options:{sourceId:string;pageRange?:{startPage:number;endPage:number};maxCharacters?:number;signal?:AbortSignal}):Promise<ContentImportDocument>{
  checkAbort(options.signal);
  const kind=validateContentFileBytes(file,bytes),createdAt=new Date().toISOString(),maxCharacters=options.maxCharacters??CONTENT_FILE_LIMITS.maxCharacters;
  if(kind==='png'||kind==='jpeg')return {sourceId:options.sourceId,fileName:file.name,mime:file.type,kind:'media',untrusted:true,text:'',segments:[]};
  if(kind==='pdf'){
    const result=await extractPdf(bytes,options.sourceId,createdAt,{pageRange:options.pageRange,maxCharacters,signal:options.signal});
    return {sourceId:options.sourceId,fileName:file.name,mime:file.type,kind:'text',untrusted:true,...result};
  }
  let segments:ContentImportSegment[];
  if(kind==='txt'){
    const text=checkedText(new TextDecoder('utf-8',{fatal:true}).decode(bytes),maxCharacters);
    segments=textSegments(text,options.sourceId,createdAt,maxCharacters);
  }else{
    const xml=await readDocxXml(bytes),paragraphs=extractDocxText(xml,maxCharacters);
    segments=paragraphs.map((text,index)=>({text,sourceRef:sourceRef(options.sourceId,createdAt,{paragraph:index+1})}));
  }
  checkAbort(options.signal);
  return {sourceId:options.sourceId,fileName:file.name,mime:file.type,kind:'text',untrusted:true,text:segments.map(segment=>segment.text).join('\n\n'),segments};
}
