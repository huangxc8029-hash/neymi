import {createHmac,randomBytes,timingSafeEqual} from 'node:crypto';
import {z} from 'zod';
import {invalidRequest,permissionDenied,rateLimited} from '../../server/errors';
import {hashMessagingToken,type MessagingStore} from './store';

const eventSchema=z.strictObject({eventId:z.string().regex(/^[A-Za-z0-9_.:-]{1,200}$/),type:z.enum(['message.received','delivery.receipt'])});
const publicationIdSchema=z.string().regex(/^[A-Za-z0-9_-]{16,64}$/);
export type MessagingEvent=z.infer<typeof eventSchema>;
const timeText=(time:number)=>new Date(time).toISOString();

export class FixtureHmacAdapter{
  constructor(private readonly secret:string){if(Buffer.byteLength(secret)<32)throw new Error('Webhook secret must contain at least 32 bytes');}
  verify(rawBody:string,headers:Headers,now=Date.now()):MessagingEvent{
    const timestamp=headers.get('x-neymi-timestamp')??'',eventId=headers.get('x-neymi-event-id')??'',provided=headers.get('x-neymi-signature')??'';
    if(!/^\d{10}$/.test(timestamp)||Math.abs(now-Number(timestamp)*1000)>5*60*1000)throw permissionDenied();
    const expected=createHmac('sha256',this.secret).update(`${timestamp}.${rawBody}`).digest();
    const signature=provided.match(/^sha256=([a-f\d]{64})$/i)?.[1]??'',actual=Buffer.from(signature,'hex');
    if(actual.length!==expected.length||!timingSafeEqual(actual,expected))throw permissionDenied();
    let parsed:unknown;try{parsed=JSON.parse(rawBody);}catch{throw invalidRequest();}
    const event=eventSchema.parse(parsed);if(event.eventId!==eventId)throw invalidRequest('Webhook event ID does not match its signed header');return event;
  }
}

export class MessagingService{
  private readonly windows=new Map<string,{startedAt:number;count:number}>();
  constructor(private readonly store:MessagingStore,private readonly options:{ticketTtlMs?:number;webhookLimit?:number}={}){
    if(options.ticketTtlMs!==undefined&&(options.ticketTtlMs<=0||options.ticketTtlMs>5*60*1000))throw new Error('Handoff tickets must expire within five minutes');
    if(options.webhookLimit!==undefined&&options.webhookLimit<1)throw new Error('Webhook limit must be positive');
  }
  async acceptEvent(channelId:string,eventId:string,now=Date.now()):Promise<'accepted'|'duplicate'>{
    const window=this.windows.get(channelId);if(!window||now-window.startedAt>=60_000)this.windows.set(channelId,{startedAt:now,count:0});
    const current=this.windows.get(channelId)!;if(current.count>=(this.options.webhookLimit??60))throw rateLimited(Math.max(1,Math.ceil((current.startedAt+60_000-now)/1000)));
    current.count++;
    const time=timeText(now),accepted=await this.store.claimEvent(eventId,timeText(now+7*24*60*60*1000),time);return accepted?'accepted':'duplicate';
  }
  async issueHandoff(publicationId:string,now=Date.now()):Promise<{ticket:string;expiresAt:string}>{
    if(!publicationIdSchema.safeParse(publicationId).success)throw invalidRequest('Invalid public card reference');
    const ticket=randomBytes(32).toString('base64url'),expiresAt=timeText(now+(this.options.ticketTtlMs??5*60*1000));
    await this.store.createTicket(hashMessagingToken(ticket),publicationId,timeText(now),expiresAt);return{ticket,expiresAt};
  }
  async consumeHandoff(ticket:string,now=Date.now()):Promise<string|null>{
    if(!/^[A-Za-z0-9_-]{40,60}$/.test(ticket))return null;return this.store.consumeTicket(hashMessagingToken(ticket),timeText(now));
  }
}
