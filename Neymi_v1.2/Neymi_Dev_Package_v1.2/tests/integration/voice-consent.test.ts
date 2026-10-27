import {describe,expect,it,vi} from 'vitest';
import {createVoiceSession} from '../../src/modules/content/voice';

describe('voice consent integration boundary',()=>{
  it('requires a fresh approval bound to the exact recording before any provider request',async()=>{
    const provider={transcribe:vi.fn(async()=>({text:'hello',segments:[{text:'hello',startMs:0,endMs:100}],provider:'fixture',language:'en'}))};
    const session=createVoiceSession({provider,sourceId:'voice-int'}),first=new Uint8Array([1]),edited=new Uint8Array([2]);
    await session.approveCloudTranscription({approved:true,recipient:'named fixture',purpose:'transcription',retention:'request only'},first);
    await expect(session.transcribe(edited,'en')).rejects.toThrow(/approve this recording again/i);
    expect(provider.transcribe).not.toHaveBeenCalled();
    await session.approveCloudTranscription({approved:true,recipient:'named fixture',purpose:'transcription',retention:'request only'},edited);
    await session.transcribe(edited,'en');expect(provider.transcribe).toHaveBeenCalledTimes(1);
  });
  it('cancellation releases temporary recording data even if the adapter rejects',async()=>{
    const provider={transcribe:(_bytes:Uint8Array,_language:string,{signal}:{signal:AbortSignal})=>new Promise<never>((_resolve,reject)=>signal.addEventListener('abort',()=>reject(new DOMException('Aborted','AbortError'))))};
    const session=createVoiceSession({provider,sourceId:'voice-cancel'}),bytes=new Uint8Array([1]);
    await session.approveCloudTranscription({approved:true,recipient:'fixture',purpose:'transcription',retention:'request only'},bytes);
    const pending=session.transcribe(bytes,'zh-CN');session.cancel();await expect(pending).rejects.toMatchObject({name:'AbortError'});expect(session.rawAudio).toBeUndefined();
  });
});
