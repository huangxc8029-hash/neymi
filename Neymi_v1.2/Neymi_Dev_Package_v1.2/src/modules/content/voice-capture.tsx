'use client';
import {useEffect,useRef,useState} from 'react';
import type {ContentImportDocument} from './types';

export function VoiceCapture({onTranscript,compact=false}:{onTranscript?:(document?:ContentImportDocument)=>void;compact?:boolean}){
  const recorder=useRef<MediaRecorder|null>(null),chunks=useRef<Blob[]>([]),url=useRef<string|null>(null);
  const [recording,setRecording]=useState(false),[audio,setAudio]=useState<Blob|null>(null),[audioUrl,setAudioUrl]=useState<string|null>(null),[manualText,setManualText]=useState(''),[message,setMessage]=useState(''),[manualOpen,setManualOpen]=useState(false);
  useEffect(()=>()=>{if(url.current)URL.revokeObjectURL(url.current);recorder.current?.stream.getTracks().forEach(track=>track.stop());},[]);
  async function start(){
    setMessage('');setManualOpen(true);
    if(!navigator.mediaDevices?.getUserMedia||typeof MediaRecorder==='undefined'){setMessage('此浏览器暂不支持录音。可以直接在下方手工输入。');return;}
    try{const stream=await navigator.mediaDevices.getUserMedia({audio:true}),instance=new MediaRecorder(stream);chunks.current=[];instance.ondataavailable=event=>{if(event.data.size)chunks.current.push(event.data);};instance.onstop=()=>{const blob=new Blob(chunks.current,{type:instance.mimeType||'audio/webm'});if(url.current)URL.revokeObjectURL(url.current);url.current=URL.createObjectURL(blob);setAudioUrl(url.current);setAudio(blob);stream.getTracks().forEach(track=>track.stop());setRecording(false);};recorder.current=instance;instance.start();setRecording(true);}
    catch{setMessage('没有获得麦克风权限。你可以检查浏览器权限，或直接手工输入。');}
  }
  function stop(){if(recorder.current?.state==='recording')recorder.current.stop();}
  function updateManualText(value:string){setManualText(value);if(!value.trim()){onTranscript?.();return;}const sourceId='voice_note_local',createdAt=new Date().toISOString();onTranscript?.({sourceId,fileName:'语音笔记',mime:'text/plain',kind:'text',untrusted:true,text:value,segments:[{text:value,sourceRef:{kind:'voice_transcript',sourceId,paragraph:1,createdAt}}]});}
  function clear(){if(url.current){URL.revokeObjectURL(url.current);url.current=null;}recorder.current?.stream.getTracks().forEach(track=>track.stop());setAudioUrl(null);setAudio(null);setManualText('');setRecording(false);onTranscript?.();setMessage('本次录音和文字草稿已清除。');}
  return <section className={`content-import content-import-panel voice-capture${compact?' voice-capture-compact':''}`} aria-label={compact?'语音输入':'录音与语音笔记'}>
    {!compact&&<><div className="content-import-heading"><div><p className="eyebrow">语音输入</p><h3>录一段，再自己核对</h3></div><span>本机临时处理</span></div>
    <p>录音只保留在当前页面内存，不会保存到资料或分享。当前没有配置转写服务；可以试听并手工整理，拒绝麦克风权限也可直接输入。</p></>}
    <div className="content-import-actions">{recording?<button type="button" aria-label="停止录音" title="停止录音" onClick={stop}>{!compact&&'停止录音'}<span className="recording-dot" aria-hidden="true"/></button>:<button type="button" aria-label="开始录音" title="开始录音，目前不会自动转写" onClick={()=>void start()}>{!compact&&'开始录音'}<svg className="record-mic-icon" aria-hidden="true" viewBox="0 0 20 20"><rect x="7" y="2" width="6" height="11" rx="3"/><path d="M4.5 9.5a5.5 5.5 0 0 0 11 0M10 15v3m-3 0h6"/></svg></button>}{(audio||manualText)&&<button type="button" onClick={clear}>清除本次内容</button>}</div>
    {audioUrl&&<><audio controls src={audioUrl} aria-label="试听本次录音"/><p>自动转写服务尚未配置。你可以边试听边校对下方文本。</p></>}
    {(recording||audioUrl||!compact||manualOpen)&&<><label htmlFor="voice-manual-transcript">手工转写 / 语音笔记</label><textarea id="voice-manual-transcript" rows={compact?3:4} maxLength={20000} value={manualText} onChange={event=>updateManualText(event.target.value)} placeholder="录音不会自动转成文字；可以手工输入并核对后随对话发送。"/></>}
    {message&&<p role="status">{message}</p>}
  </section>;
}
