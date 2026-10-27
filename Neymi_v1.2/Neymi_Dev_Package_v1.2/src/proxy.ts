import {createServerClient} from '@supabase/ssr';
import {NextResponse,type NextRequest} from 'next/server';
import {publicAuthAvailability} from './modules/auth/config';

export async function proxy(request:NextRequest){
  if(!publicAuthAvailability.configured)return NextResponse.next({request});
  let response=NextResponse.next({request});
  const client=createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!.trim(),process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!.trim(),{
    cookies:{
      getAll(){return request.cookies.getAll();},
      setAll(values){
        for(const {name,value} of values)request.cookies.set(name,value);
        response=NextResponse.next({request});
        for(const {name,value,options} of values)response.cookies.set(name,value,options);
      },
    },
  });
  await client.auth.getClaims();
  return response;
}

export const config={matcher:['/auth/:path*','/account/:path*']};
