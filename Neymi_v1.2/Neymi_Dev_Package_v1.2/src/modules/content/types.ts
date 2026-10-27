import type {ContentSourceRef} from '../../domain/types';

export interface ContentImportSegment { text:string; sourceRef:ContentSourceRef; }
export interface ContentImportDocument {
  sourceId:string; fileName:string; mime:string; kind:'text'|'media'; untrusted:true;
  text:string; segments:ContentImportSegment[]; pageCount?:number;
}
