import {z} from 'zod';
import {localDraftSchema,shareSelectionSchema} from '../../domain/schemas';
import type {LocalDraft} from '../../domain/types';
import type {VaultStorage} from '../vault/storage';

const key='guided-card-snapshots-v1';
const recordSchema=z.strictObject({
  id:z.string().min(1).max(128),draft:localDraftSchema,purposeLabel:z.string().trim().min(1).max(120),
  audienceLabel:z.string().trim().min(1).max(160),selection:shareSelectionSchema,createdAt:z.string().datetime(),
}).refine(record=>record.id===record.draft.id,'Guided card ID must match its draft');
export type GuidedCardRecord={id:string;draft:LocalDraft;purposeLabel:string;audienceLabel:string;selection:{identity:Array<'name'|'company'|'role'>;fields:Array<{moduleId:string;itemId:string}>;assetIds:string[];publicDedication?:string};createdAt:string};

export class GuidedCardStore{
  constructor(private readonly storage:VaultStorage){}
  private async records():Promise<GuidedCardRecord[]>{const raw=await this.storage.get(key);return raw?z.array(recordSchema).max(40).parse(JSON.parse(raw)) as unknown as GuidedCardRecord[]:[];}
  async list():Promise<GuidedCardRecord[]>{return(await this.records()).sort((a,b)=>Date.parse(b.createdAt)-Date.parse(a.createdAt));}
  async save(input:GuidedCardRecord):Promise<void>{
    const record=recordSchema.parse(input) as unknown as GuidedCardRecord,records=await this.records();
    await this.storage.set(key,JSON.stringify([...records.filter(item=>item.id!==record.id),record].slice(-40)));
  }
  async remove(id:string):Promise<void>{const records=await this.records();await this.storage.set(key,JSON.stringify(records.filter(record=>record.id!==id)));}
}
