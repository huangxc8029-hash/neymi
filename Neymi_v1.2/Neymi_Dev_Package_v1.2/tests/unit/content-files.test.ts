import {describe,expect,it} from 'vitest';
import {CONTENT_FILE_LIMITS,validateContentFileBytes,validateContentFileSelection} from '../../src/modules/content/file-input';

const makeFile=(name:string,type:string,bytes:Uint8Array)=>({name,type,size:bytes.byteLength,arrayBuffer:async()=>{const copy=new ArrayBuffer(bytes.byteLength);new Uint8Array(copy).set(bytes);return copy;}});

describe('local content file boundary',()=>{
  it('requires supported extension and matching MIME before reading bytes',()=>{
    expect(()=>validateContentFileSelection([makeFile('portfolio.exe','application/pdf',new Uint8Array(8))])).toThrow();
    expect(()=>validateContentFileSelection([makeFile('portfolio.pdf','text/plain',new Uint8Array(8))])).toThrow();
    expect(()=>validateContentFileSelection([makeFile('scan.pdf.exe','application/pdf',new Uint8Array(8))])).toThrow();
  });

  it('checks signatures for PDF, DOCX, PNG and JPEG',()=>{
    const cases:[string,string,number[]][]=[
      ['resume.pdf','application/pdf',[0x25,0x50,0x44,0x46,0x2d]],
      ['resume.docx','application/vnd.openxmlformats-officedocument.wordprocessingml.document',[0x50,0x4b,0x03,0x04]],
      ['photo.png','image/png',[0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a]],
      ['photo.jpg','image/jpeg',[0xff,0xd8,0xff]],
    ];
    for(const [name,type,signature] of cases){const file=makeFile(name,type,new Uint8Array(signature));validateContentFileSelection([file]);expect(()=>validateContentFileBytes(file,new Uint8Array(signature))).not.toThrow();}
    expect(()=>validateContentFileBytes(makeFile('resume.pdf','application/pdf',new Uint8Array(8)),new TextEncoder().encode('not pdf'))).toThrow();
  });

  it('enforces per-file, file-count, and aggregate byte limits',()=>{
    expect(CONTENT_FILE_LIMITS).toMatchObject({maxFileBytes:10*1024*1024,maxFiles:5,maxTotalBytes:25*1024*1024,maxPdfPages:100,maxCharacters:50000});
    expect(()=>validateContentFileSelection(Array.from({length:6},(_,i)=>makeFile(`${i}.txt`,'text/plain',new Uint8Array(1))))).toThrow();
    expect(()=>validateContentFileSelection([makeFile('large.txt','text/plain',new Uint8Array(10*1024*1024+1))])).toThrow();
    expect(()=>validateContentFileSelection(Array.from({length:5},(_,i)=>makeFile(`${i}.txt`,'text/plain',new Uint8Array(5*1024*1024+1))))).toThrow();
  });
});
