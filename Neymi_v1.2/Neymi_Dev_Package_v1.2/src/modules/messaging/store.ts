import {createHash} from 'node:crypto';

export interface MessagingStore{
  claimEvent(eventId:string,expiresAt:string,now:string):Promise<boolean>;
  createTicket(tokenHash:string,publicationId:string,createdAt:string,expiresAt:string):Promise<void>;
  consumeTicket(tokenHash:string,now:string):Promise<string|null>;
}

export class MemoryMessagingStore implements MessagingStore{
  private readonly events=new Map<string,string>();
  private readonly tickets=new Map<string,{publicationId:string;expiresAt:string;consumedAt:string|null}>();
  async claimEvent(id:string,expiresAt:string,now:string){for(const[key,expiry]of this.events)if(expiry<=now)this.events.delete(key);if(this.events.has(id))return false;this.events.set(id,expiresAt);return true;}
  async createTicket(hash:string,publicationId:string,_createdAt:string,expiresAt:string){this.tickets.set(hash,{publicationId,expiresAt,consumedAt:null});}
  async consumeTicket(hash:string,now:string){const ticket=this.tickets.get(hash);if(!ticket||ticket.consumedAt||ticket.expiresAt<=now)return null;ticket.consumedAt=now;return ticket.publicationId;}
  async snapshot(){return{events:[...this.events.keys()].sort(),tickets:[...this.tickets.values()].map(ticket=>({publicationId:ticket.publicationId,consumed:Boolean(ticket.consumedAt)}))};}
}

export const hashMessagingToken=(token:string)=>createHash('sha256').update(token).digest('hex');
