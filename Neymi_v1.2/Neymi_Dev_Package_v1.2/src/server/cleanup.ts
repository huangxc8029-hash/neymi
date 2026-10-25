import {getConfiguredJobStore} from './store';
export async function purgeExpiredJobs(now=new Date().toISOString()):Promise<number>{
  return getConfiguredJobStore().purgeExpired(now);
}
