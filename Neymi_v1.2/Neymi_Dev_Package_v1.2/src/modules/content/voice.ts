import type {ContentSourceRef} from '../../domain/types';
import type {TranscriptionProvider,TranscriptionResult} from './transcription-provider';
export type {TranscriptionProvider} from './transcription-provider';
export type VoiceState='idle'|'recording'|'reviewing'|'transcribing'|'ready'|'failed'|'cancelled';
export interface CloudTranscriptionConsent {approved:true;recipient:string;purpose:string;retention:string;}
export interface ReviewedTranscript extends TranscriptionResult {sourceRefs:ContentSourceRef[];warnings:string[];}
async function digest(bytes:Uint8Array){const hash=await crypto.subtle.digest('SHA-256',bytes.slice().buffer as ArrayBuffer);return Array.from(new Uint8Array(hash),byte=>byte.toString(16).padStart(2,'0')).join('');}
export function createVoiceSession(input:{provider:TranscriptionProvider;sourceId:string;now?:()=>string}){
  let consent:(CloudTranscriptionConsent&{contentDigest:string})|undefined,controller:AbortController|undefined,rawAudio:Uint8Array|undefined;
  let state:VoiceState='idle';
  return {
    get state(){return state;},get rawAudio(){return rawAudio;},
    setRecording(){state='recording';},
    setReviewing(bytes:Uint8Array){rawAudio=bytes;state='reviewing';},
    async approveCloudTranscription(value:CloudTranscriptionConsent,bytes:Uint8Array){if(value.approved&&value.recipient&&value.purpose&&value.retention)consent={...value,contentDigest:await digest(bytes)};},
    async transcribe(bytes:Uint8Array,language:string):Promise<ReviewedTranscript>{
      const approved=consent;if(!approved)throw new Error('Cloud transcription consent is required before sending audio.');
      if(!language.trim())throw new Error('A language must be selected before transcription.');
      rawAudio=bytes;controller=new AbortController();const activeController=controller;state='transcribing';
      try{
        if(await digest(bytes)!==approved.contentDigest)throw new Error('Audio changed; review and approve this recording again.');
        if(activeController.signal.aborted)throw new DOMException('Aborted','AbortError');
        const result=await input.provider.transcribe(bytes,language,{signal:activeController.signal});
        if(activeController.signal.aborted)throw new DOMException('Aborted','AbortError');
        for(const segment of result.segments){if(segment.startMs<0||segment.endMs<=segment.startMs||segment.endMs>24*60*60*1000)throw new Error('Transcript source range is invalid.');}
        state='ready';rawAudio=undefined;consent=undefined;
        return {...result,sourceRefs:result.segments.map(segment=>({kind:'voice_transcript',sourceId:input.sourceId,startMs:segment.startMs,endMs:segment.endMs,createdAt:(input.now??(()=>new Date().toISOString()))()})),warnings:result.segments.some(segment=>(segment.confidence??1)<.75)?['部分专名、姓名或数字置信度较低，请逐段校对。']:[]};
      }catch(error){rawAudio=undefined;consent=undefined;state=activeController.signal.aborted?'cancelled':'failed';throw error;}
    },
    cancel(){controller?.abort();rawAudio=undefined;consent=undefined;state='cancelled';},
    clear(){controller?.abort();rawAudio=undefined;consent=undefined;state='idle';},
  };
}
