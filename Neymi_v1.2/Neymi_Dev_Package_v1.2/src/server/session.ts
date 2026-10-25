import {createHmac,randomBytes,timingSafeEqual} from 'node:crypto';
import {unavailable} from './errors';
export interface Session{id:string;expiresAt:string}
function secret(){const value=process.env.NEYMI_SESSION_SECRET;if(!value||Buffer.byteLength(value)<32)throw unavailable('Session signing is not configured');return value;}
export async function createSession(now=new Date()):Promise<Session>{
  return {id:randomBytes(32).toString('base64url'),expiresAt:new Date(now.getTime()+24*60*60*1000).toISOString()};
}
export function sessionCookie(session:Session,secure=process.env.NODE_ENV==='production'):string{
  const expiry=Date.parse(session.expiresAt),payload=`${session.id}.${expiry}`;
  const signature=createHmac('sha256',secret()).update(payload).digest('hex');
  return `neymi_session=${payload}.${signature}; Path=/; HttpOnly; SameSite=Lax; Max-Age=86400${secure?'; Secure':''}`;
}
export function readSession(request:Request,now=Date.now()):string|null{
  const cookie=request.headers.get('cookie')?.split(';').map(part=>part.trim()).find(part=>part.startsWith('neymi_session='));
  const token=cookie?.slice('neymi_session='.length),parts=token?.split('.');
  if(!parts||parts.length!==3||!/^[A-Za-z0-9_-]{40,60}$/.test(parts[0])||!/^[0-9]{13}$/.test(parts[1])||!/^[a-f\d]{64}$/i.test(parts[2]))return null;
  const [id,expiry,signature]=parts,expected=createHmac('sha256',secret()).update(`${id}.${expiry}`).digest();
  const supplied=Buffer.from(signature,'hex');
  if(supplied.length!==expected.length||!timingSafeEqual(supplied,expected)||Number(expiry)<=now)return null;
  return id;
}
