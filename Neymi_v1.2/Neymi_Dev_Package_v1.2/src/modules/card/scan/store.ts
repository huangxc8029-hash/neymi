import {z} from 'zod';
import {IndexedDbVaultStorage} from '../../vault/storage';

const storage=new IndexedDbVaultStorage();
const key='scanned-cards-v1';
const schema=z.object({id:z.string(),createdAt:z.string(),source:z.enum(['camera','album']),image:z.string(),name:z.string(),company:z.string(),role:z.string(),phone:z.string(),email:z.string(),rawText:z.string()});
export type ScannedCard=z.infer<typeof schema>;
export async function listScannedCards():Promise<ScannedCard[]>{const raw=await storage.get(key);return raw?z.array(schema).parse(JSON.parse(raw)):[];}
export async function saveScannedCard(card:ScannedCard){await storage.set(key,JSON.stringify([schema.parse(card),...await listScannedCards()]));}
export async function removeScannedCard(id:string){await storage.set(key,JSON.stringify((await listScannedCards()).filter(card=>card.id!==id)));}
export async function updateScannedCard(card:ScannedCard){await storage.set(key,JSON.stringify((await listScannedCards()).map(item=>item.id===card.id?schema.parse(card):item)));}
