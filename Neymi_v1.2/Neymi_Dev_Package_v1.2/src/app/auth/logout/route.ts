import {NextResponse,type NextRequest} from 'next/server';
import {createSupabaseServerClient} from '../../../modules/auth/server';
import {safeAuthReturnTo} from '../../../modules/auth/config';

export async function POST(request:NextRequest){
  const supabase=await createSupabaseServerClient();
  if(supabase)await supabase.auth.signOut();
  return NextResponse.redirect(new URL(safeAuthReturnTo(request.nextUrl.searchParams.get('next'))||'/',request.url),303);
}
