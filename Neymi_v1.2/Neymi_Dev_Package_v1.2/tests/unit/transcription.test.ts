import {describe,expect,it,vi} from 'vitest';
import {createVoiceSession,type TranscriptionProvider} from '../../src/modules/content/voice';

describe('voice transcription boundary',()=>{
  it('does not call a provider until cloud transcription is separately approved',async()=>{
    const transcribe=vi.fn(async()=>({text:'Hello',segments:[{text:'Hello',startMs:0,endMs:500}],provider:'fixture',language:'en'}));
    const session=createVoiceSession({provider:{transcribe},sourceId:'voice-1'});
    await expect(session.transcribe(new Uint8Array([1]),'en')).rejects.toThrow(/consent/i);
    expect(transcribe).not.toHaveBeenCalled();
  });
  it('returns only a reviewed transcript and valid private source ranges',async()=>{
    const provider:TranscriptionProvider={transcribe:async()=>({text:'Hello',segments:[{text:'Hello',startMs:0,endMs:500,confidence:.98}],provider:'fixture',language:'en'})};
    const session=createVoiceSession({provider,sourceId:'voice-2'});
    await session.approveCloudTranscription({approved:true,recipient:'fixture provider',purpose:'transcription',retention:'request only'},new Uint8Array([1,2]));
    await expect(session.transcribe(new Uint8Array([3]),'en')).rejects.toThrow(/changed/i);
    await session.approveCloudTranscription({approved:true,recipient:'fixture provider',purpose:'transcription',retention:'request only'},new Uint8Array([1,2]));
    const result=await session.transcribe(new Uint8Array([1,2]),'en');
    expect(result.text).toBe('Hello');
    expect(result.sourceRefs[0]).toMatchObject({kind:'voice_transcript',sourceId:'voice-2',startMs:0,endMs:500});
    expect(session.rawAudio).toBeUndefined();
    await expect(session.transcribe(new Uint8Array([1,2]),'en')).rejects.toThrow(/consent/i);
  });
  it('aborts an in-flight transcription and clears the audio reference',async()=>{
    let signal:AbortSignal|undefined;
    const provider:TranscriptionProvider={transcribe:(_bytes,_language,options)=>new Promise((_resolve,reject)=>{signal=options.signal;options.signal.addEventListener('abort',()=>reject(new DOMException('Aborted','AbortError')));})};
    const session=createVoiceSession({provider,sourceId:'voice-3'});
    const bytes=new Uint8Array([1]);await session.approveCloudTranscription({approved:true,recipient:'fixture provider',purpose:'transcription',retention:'request only'},bytes);
    const pending=session.transcribe(bytes,'zh-CN');
    session.cancel();
    await expect(pending).rejects.toMatchObject({name:'AbortError'});
    expect(signal===undefined||signal.aborted).toBe(true);
    expect(session.rawAudio).toBeUndefined();
  });
});
