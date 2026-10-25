import {unavailable} from './errors';
import {FixtureHmacAdapter,MessagingService} from '../modules/messaging/protocol';
import {SqliteMessagingStore} from '../modules/messaging/store';

let store:SqliteMessagingStore|undefined;
let service:MessagingService|undefined;
export function getMessagingService(){
  const path=process.env.NEYMI_SQLITE_PATH;if(!path)throw unavailable('Persistent messaging storage is not configured');
  if(!store)store=new SqliteMessagingStore(path);return service??=new MessagingService(store);
}
export function getFixtureMessagingAdapter(){
  if(process.env.NEYMI_MESSAGING_ADAPTER!=='fixture-hmac')throw unavailable('An approved official messaging adapter is not configured');
  const secret=process.env.NEYMI_MESSAGING_WEBHOOK_SECRET;if(!secret||Buffer.byteLength(secret)<32)throw unavailable('Messaging webhook signing is not configured');
  return new FixtureHmacAdapter(secret);
}
export function closeMessagingRuntime(){store?.close();store=undefined;service=undefined;}
