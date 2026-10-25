import {rateLimited} from './errors';
export function assertHourlyQuota(timestamps:string[],now:Date,limit=10):void{
  if(timestamps.length<limit)return;
  const oldest=Math.min(...timestamps.map(value=>Date.parse(value)));
  const retryAfter=Number.isFinite(oldest)?Math.max(1,Math.ceil((oldest+3600000-now.getTime())/1000)):3600;
  throw rateLimited(retryAfter);
}
