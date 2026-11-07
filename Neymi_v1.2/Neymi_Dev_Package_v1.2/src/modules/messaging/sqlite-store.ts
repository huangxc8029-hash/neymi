import {DatabaseSync} from 'node:sqlite';
import {mkdirSync} from 'node:fs';
import {dirname,resolve} from 'node:path';
import type {MessagingStore} from './store';

export class SqliteMessagingStore implements MessagingStore{
  private readonly db:DatabaseSync;
  constructor(filename:string){if(!filename||filename===':memory:')throw new Error('A persistent SQLite path is required');const path=resolve(filename);mkdirSync(dirname(path),{recursive:true});this.db=new DatabaseSync(path);this.db.exec('PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000; CREATE TABLE IF NOT EXISTS messaging_events(event_id TEXT PRIMARY KEY,expires_at TEXT NOT NULL); CREATE TABLE IF NOT EXISTS messaging_tickets(token_hash TEXT PRIMARY KEY,publication_id TEXT NOT NULL,created_at TEXT NOT NULL,expires_at TEXT NOT NULL,consumed_at TEXT); CREATE INDEX IF NOT EXISTS messaging_tickets_expiry ON messaging_tickets(expires_at);');}
  async claimEvent(id:string,expiresAt:string,now:string){this.db.prepare('DELETE FROM messaging_events WHERE expires_at<=?').run(now);return this.db.prepare('INSERT OR IGNORE INTO messaging_events(event_id,expires_at) VALUES(?,?)').run(id,expiresAt).changes===1;}
  async createTicket(hash:string,publicationId:string,createdAt:string,expiresAt:string){this.db.prepare('DELETE FROM messaging_tickets WHERE expires_at<=?').run(createdAt);this.db.prepare('INSERT INTO messaging_tickets(token_hash,publication_id,created_at,expires_at,consumed_at) VALUES(?,?,?,?,NULL)').run(hash,publicationId,createdAt,expiresAt);}
  async consumeTicket(hash:string,now:string){const row=this.db.prepare('UPDATE messaging_tickets SET consumed_at=? WHERE token_hash=? AND consumed_at IS NULL AND expires_at>? RETURNING publication_id').get(now,hash,now) as {publication_id:string}|undefined;return row?.publication_id??null;}
  close(){this.db.close();}
}
