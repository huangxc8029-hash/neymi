export type CachePolicy='network-only'|'cache-first';
export function cachePolicy(path:string):CachePolicy{
  const pathname=new URL(path,'https://neymi.invalid').pathname;
  if(/^\/p(?:\/|$)/.test(pathname)||/^\/v1\/publications(?:\/|$)/.test(pathname))return'network-only';
  if(['/','/cards','/receive','/prepare','/offline.html','/manifest.webmanifest'].includes(pathname)||pathname.startsWith('/_next/static/'))return'cache-first';
  return'network-only';
}
