export const CONTENT_FILE_LIMITS={maxFileBytes:10*1024*1024,maxFiles:5,maxTotalBytes:25*1024*1024,maxPdfPages:100,maxCharacters:50_000} as const;

export interface ContentFileLike {name:string;type:string;size:number;arrayBuffer():Promise<ArrayBuffer>;}
type FileKind='pdf'|'docx'|'txt'|'jpeg'|'png';
const mimeByKind:Record<FileKind,string>={pdf:'application/pdf',docx:'application/vnd.openxmlformats-officedocument.wordprocessingml.document',txt:'text/plain',jpeg:'image/jpeg',png:'image/png'};

function fileKind(name:string):FileKind{
  const extension=name.toLowerCase().split('.').pop();
  if(extension==='pdf'||extension==='docx'||extension==='txt'||extension==='png')return extension;
  if(extension==='jpg'||extension==='jpeg')return 'jpeg';
  throw new Error('仅支持 PDF、DOCX、TXT、JPEG 和 PNG 文件。');
}

export function validateContentFileSelection(files:readonly ContentFileLike[]):void{
  if(files.length>CONTENT_FILE_LIMITS.maxFiles)throw new Error('一次最多选择 5 个文件。');
  let total=0;
  for(const file of files){
    const kind=fileKind(file.name);
    if(!Number.isSafeInteger(file.size)||file.size<1||file.size>CONTENT_FILE_LIMITS.maxFileBytes)throw new Error('单个文件必须大于 0 且不超过 10 MiB。');
    if(file.type.toLowerCase()!==mimeByKind[kind])throw new Error('文件扩展名与 MIME 类型不匹配。');
    total+=file.size;
  }
  if(total>CONTENT_FILE_LIMITS.maxTotalBytes)throw new Error('所选文件总大小不能超过 25 MiB。');
}

export function validateContentFileBytes(file:ContentFileLike,bytes:Uint8Array):FileKind{
  const kind=fileKind(file.name);
  if(bytes.byteLength!==file.size)throw new Error('文件读取不完整。');
  const prefix=(...values:number[])=>values.every((value,index)=>bytes[index]===value);
  const signatureMatches=kind==='pdf'?new TextDecoder().decode(bytes.subarray(0,5))==='%PDF-':
    kind==='docx'?prefix(0x50,0x4b,0x03,0x04):kind==='png'?prefix(0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a):
      kind==='jpeg'?prefix(0xff,0xd8,0xff):true;
  if(!signatureMatches)throw new Error('文件内容与所选类型不符。');
  return kind;
}
