import {NextResponse,type NextRequest} from 'next/server';
import {createSupabaseServerClient} from '../../../modules/auth/server';
import {safeAuthReturnTo} from '../../../modules/auth/config';

export async function GET(request:NextRequest){
  const code=request.nextUrl.searchParams.get('code'),next=safeAuthReturnTo(request.nextUrl.searchParams.get('next'));
  if(!code)return NextResponse.redirect(new URL('/auth?error=verification',request.url));
  const supabase=await createSupabaseServerClient();
  if(!supabase)return NextResponse.redirect(new URL('/auth?error=configuration',request.url));
  const {error}=await supabase.auth.exchangeCodeForSession(code);
  return NextResponse.redirect(new URL(error?'/auth?error=verification':next,request.url));
}
