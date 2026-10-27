export interface AuthAvailability {
  configured:boolean;
  providers:{email:boolean;google:boolean;apple:boolean};
}

export function safeAuthReturnTo(value:string|null|undefined):string{
  if(!value?.startsWith('/')||value.startsWith('//'))return '/';
  try{const target=new URL(value,'https://neymi.invalid');return target.origin==='https://neymi.invalid'?`${target.pathname}${target.search}${target.hash}`:'/';}catch{return '/';}
}

export function authAvailability(env:Record<string,string|undefined>):AuthAvailability{
  const url=env.NEXT_PUBLIC_SUPABASE_URL?.trim()??'',key=env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim()??'';
  let configured=false;
  try{const parsed=new URL(url);configured=(parsed.protocol==='https:'||parsed.hostname==='localhost'&&parsed.protocol==='http:')&&Boolean(key);}catch{}
  return{configured,providers:{email:configured,google:configured&&env.NEXT_PUBLIC_AUTH_GOOGLE_ENABLED==='true',apple:configured&&env.NEXT_PUBLIC_AUTH_APPLE_ENABLED==='true'}};
}

export const publicAuthAvailability=authAvailability({
  NEXT_PUBLIC_SUPABASE_URL:process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  NEXT_PUBLIC_AUTH_GOOGLE_ENABLED:process.env.NEXT_PUBLIC_AUTH_GOOGLE_ENABLED,
  NEXT_PUBLIC_AUTH_APPLE_ENABLED:process.env.NEXT_PUBLIC_AUTH_APPLE_ENABLED,
});

export function supabasePublicConfig(){
  if(!publicAuthAvailability.configured)return null;
  return{url:process.env.NEXT_PUBLIC_SUPABASE_URL!.trim(),key:process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!.trim()};
}
