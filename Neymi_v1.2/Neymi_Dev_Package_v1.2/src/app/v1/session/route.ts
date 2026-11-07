import {createSession,readSession,sessionCookie} from '../../../server/session';
import {invalidRequest,notFound} from '../../../server/errors';
import {shareFailure,shareJson,shareOriginOk} from '../../../server/share-http';

export const runtime='nodejs';
export async function POST(request:Request){try{if(!shareOriginOk(request))throw invalidRequest('Invalid origin');const session=await createSession();return shareJson({expiresAt:session.expiresAt},201,{'Set-Cookie':sessionCookie(session,new URL(request.url).protocol==='https:')});}catch(error){return shareFailure(error);}}
export async function GET(request:Request){try{if(!readSession(request))throw notFound();return shareJson({active:true});}catch(error){return shareFailure(error);}}
export async function DELETE(request:Request){try{if(!shareOriginOk(request))throw invalidRequest('Invalid origin');return shareJson({ok:true},200,{'Set-Cookie':'neymi_session=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0'});}catch(error){return shareFailure(error);}}
