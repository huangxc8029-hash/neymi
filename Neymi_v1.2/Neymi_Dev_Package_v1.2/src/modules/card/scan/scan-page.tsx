'use client';
import {useRef,useState} from 'react';
import Link from 'next/link';
import {useSearchParams,useRouter} from 'next/navigation';
import {recognizeCard,suggestFields} from './ocr';
import {saveScannedCard} from './store';

type Fields={name:string;company:string;role:string;phone:string;email:string};
const empty:Fields={name:'',company:'',role:'',phone:'',email:''};
export function ScanPage(){
  const router=useRouter(),source=useSearchParams().get('source')==='camera'?'camera':'album';
  const input=useRef<HTMLInputElement>(null),[image,setImage]=useState(''),[fields,setFields]=useState<Fields>(empty),[rawText,setRawText]=useState(''),[busy,setBusy]=useState(false),[status,setStatus]=useState('');
  async function choose(file?:File){if(!file)return;setStatus('');if(!['image/jpeg','image/png','image/webp'].includes(file.type)||file.size>8*1024*1024){setStatus('请选择 8 MB 以内的 JPG、PNG 或 WebP 图片。');return;}
    setBusy(true);try{const bitmap=await createImageBitmap(file),canvas=document.createElement('canvas'),scale=Math.min(1,1600/Math.max(bitmap.width,bitmap.height));canvas.width=Math.round(bitmap.width*scale);canvas.height=Math.round(bitmap.height*scale);canvas.getContext('2d')!.drawImage(bitmap,0,0,canvas.width,canvas.height);bitmap.close();const blob=await new Promise<Blob>((resolve,reject)=>canvas.toBlob(value=>value?resolve(value):reject(new Error('图片处理失败')),'image/jpeg',.84));const url=canvas.toDataURL('image/jpeg',.84);setImage(url);try{const text=await recognizeCard(blob);setRawText(text);setFields(suggestFields(text));setStatus(text?'识别完成，请检查并修改信息。':'未读到文字，请手动填写。');}catch{setRawText('');setFields(empty);setStatus('识别暂不可用，可以手动填写后保存图片。');}}
    catch{setStatus('无法读取这张图片，请换一张重试。');}finally{setBusy(false);}}
  async function save(){if(!image)return;setBusy(true);try{await saveScannedCard({id:`scan_${crypto.randomUUID()}`,createdAt:new Date().toISOString(),source,image,...fields,rawText});router.push('/cards?tab=received');}catch{setStatus('保存失败，请检查浏览器可用空间后重试。');setBusy(false);}}
  return <main className="workspace scan-page"><header className="scan-header"><Link href="/">neymi.</Link><Link href="/cards?tab=received">返回卡片库</Link></header><div className="scan-intro"><h1>{source==='camera'?'拍照识别新卡':'选择识别照片'}</h1><p>图片只在此浏览器处理。识别结果由你确认后保存。</p></div><input ref={input} type="file" accept="image/jpeg,image/png,image/webp" capture={source==='camera'?'environment':undefined} className="scan-file-input" onChange={event=>{void choose(event.currentTarget.files?.[0]);event.currentTarget.value='';}}/><button type="button" className="scan-primary" onClick={()=>input.current?.click()} disabled={busy}>{source==='camera'?'打开相机':'选择照片'}</button>{busy&&<p role="status">正在处理图片，请稍候…</p>}{status&&<p role="status">{status}</p>}{image&&<div className="scan-review"><img src={image} alt="待保存的名片照片"/><section><h2>核对名片信息</h2>{(['name','company','role','phone','email'] as const).map(field=><label key={field}>{({name:'姓名',company:'公司',role:'职位',phone:'电话',email:'邮箱'} as const)[field]}<input value={fields[field]} onChange={event=>setFields(current=>({...current,[field]:event.target.value}))}/></label>)}<button type="button" className="scan-primary" onClick={()=>void save()} disabled={busy}>确认保存到卡片库</button></section></div>}</main>;
}
