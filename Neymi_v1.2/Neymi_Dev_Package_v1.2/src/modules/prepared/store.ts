import {z} from 'zod';
import {aiRecipeSchema,privateCardLabelSchema} from '../../domain/schemas';
import type {CardRecipe,PrivateCardLabel} from '../../domain/types';
import type {VaultStorage} from '../vault/storage';

const KEY='prepared-cards-v1';
const recordSchema=z.strictObject({config:aiRecipeSchema,label:privateCardLabelSchema,profileRevision:z.int().positive(),status:z.enum(['ready','stale'])});
export type PreparedRecord=z.infer<typeof recordSchema>;
export class PreparedStore{
  constructor(private readonly storage:VaultStorage){}
  private async records():Promise<PreparedRecord[]>{const raw=await this.storage.get(KEY);return raw?z.array(recordSchema).parse(JSON.parse(raw)):[];}
  async save(config:CardRecipe,label:PrivateCardLabel,profileRevision:number):Promise<void>{
    const checked=recordSchema.parse({config,label,profileRevision,status:'ready'});
    if(checked.config.id!==checked.label.cardId)throw new Error('Private label card ID mismatch');
    const records=await this.records();await this.storage.set(KEY,JSON.stringify([...records.filter(item=>item.config.id!==checked.config.id),checked]));
  }
  async find(query=''):Promise<PreparedRecord[]>{
    const needle=query.trim().toLocaleLowerCase();return(await this.records()).filter(item=>!needle||`${item.label.recipientLabel} ${item.label.scenario} ${item.config.label}`.toLocaleLowerCase().includes(needle));
  }
  async markStale(profileRevision:number):Promise<void>{
    const records=(await this.records()).map(item=>item.profileRevision===profileRevision?item:{...item,status:'stale' as const});
    await this.storage.set(KEY,JSON.stringify(records));
  }
}
