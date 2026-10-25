import {createHash} from 'node:crypto';
import {DatabaseSync} from 'node:sqlite';
import {mkdirSync} from 'node:fs';
import {dirname,resolve} from 'node:path';

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

export class SqliteMessagingStore implements MessagingStore{
  private readonly db:DatabaseSync;
  constructor(filename:string){if(!filename||filename===':memory:')throw new Error('A persistent SQLite path is required');const path=resolve(filename);mkdirSync(dirname(path),{recursive:true});this.db=new DatabaseSync(path);
    this.db.exec('PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000; CREATE TABLE IF NOT EXISTS messaging_events(event_id TEXT PRIMARY KEY,expires_at TEXT NOT NULL); CREATE TABLE IF NOT EXISTS messaging_tickets(token_hash TEXT PRIMARY KEY,publication_id TEXT NOT NULL,created_at TEXT NOT NULL,expires_at TEXT NOT NULL,consumed_at TEXT); CREATE INDEX IF NOT EXISTS messaging_tickets_expiry ON messaging_tickets(expires_at);');}
  async claimEvent(id:string,expiresAt:string,now:string){this.db.prepare('DELETE FROM messaging_events WHERE expires_at<=?').run(now);return this.db.prepare('INSERT OR IGNORE INTO messaging_events(event_id,expires_at) VALUES(?,?)').run(id,expiresAt).changes===1;}
  async createTicket(hash:string,publicationId:string,createdAt:string,expiresAt:string){this.db.prepare('DELETE FROM messaging_tickets WHERE expires_at<=?').run(createdAt);this.db.prepare('INSERT INTO messaging_tickets(token_hash,publication_id,created_at,expires_at,consumed_at) VALUES(?,?,?,?,NULL)').run(hash,publicationId,createdAt,expiresAt);}
  async consumeTicket(hash:string,now:string){const row=this.db.prepare('UPDATE messaging_tickets SET consumed_at=? WHERE token_hash=? AND consumed_at IS NULL AND expires_at>? RETURNING publication_id').get(now,hash,now) as {publication_id:string}|undefined;return row?.publication_id??null;}
  close(){this.db.close();}
}

export const hashMessagingToken=(token:string)=>createHash('sha256').update(token).digest('hex');
