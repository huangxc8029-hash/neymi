export interface TranscriptSegment {text:string;startMs:number;endMs:number;confidence?:number;}
export interface TranscriptionResult {text:string;segments:TranscriptSegment[];provider:string;language:string;}
export interface TranscriptionProvider {
  transcribe(bytes:Uint8Array,language:string,options:{signal:AbortSignal}):Promise<TranscriptionResult>;
}

/** Fixture adapter for deterministic local development. It never sends audio anywhere. */
export const fixtureTranscriptionProvider:TranscriptionProvider={
  async transcribe(_bytes,language,{signal}){
    if(signal.aborted)throw new DOMException('Aborted','AbortError');
    throw new Error('当前没有配置语音识别服务。你可以改用文字输入或上传文档。');
  },
};
