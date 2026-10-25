import {z} from 'zod';
import {shareProjectionSchema} from '../../domain/schemas';
import type {ShareProjection} from '../../domain/types';
import type {VaultStorage} from '../vault/storage';

const KEY='received-cards-v1',recordSchema=z.strictObject({id:z.string().min(1),receivedAt:z.iso.datetime({offset:true}),projection:shareProjectionSchema});
export type ReceivedCard=z.infer<typeof recordSchema>;
export class ReceivedCardsStore{
  constructor(private readonly storage:VaultStorage){}
  private async records():Promise<ReceivedCard[]>{const raw=await this.storage.get(KEY);return raw?z.array(recordSchema).parse(JSON.parse(raw)):[];}
  async add(projection:ShareProjection,receivedAt=new Date().toISOString()):Promise<ReceivedCard>{
    const value=recordSchema.parse({id:`received_${crypto.randomUUID().replaceAll('-','')}`,receivedAt,projection});
    await this.storage.set(KEY,JSON.stringify([value,...await this.records()]));return value;
  }
  async list():Promise<ReceivedCard[]>{return this.records();}
  async remove(id:string):Promise<void>{await this.storage.set(KEY,JSON.stringify((await this.records()).filter(item=>item.id!==id)));}
}
