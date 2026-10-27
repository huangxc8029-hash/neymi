import Link from 'next/link';
import {redirect} from 'next/navigation';
import {createSupabaseServerClient} from '../../modules/auth/server';
import {publicAuthAvailability} from '../../modules/auth/config';
import '../../modules/auth/auth.css';

export default async function AccountPage(){
  if(!publicAuthAvailability.configured)redirect('/auth');
  const supabase=await createSupabaseServerClient();
  const {data,error}=await supabase!.auth.getUser();
  if(error||!data.user)redirect('/auth?next=%2Faccount');
  const provider=String(data.user.app_metadata.provider??'email');
  return <main className="auth-page"><header><Link className="wordmark" href="/">neymi<span aria-hidden="true">.</span></Link><Link href="/">返回名片工作区</Link></header><section className="auth-card account-card"><p className="auth-eyebrow">ACCOUNT</p><h1>账户设置</h1><dl><div><dt>邮箱</dt><dd>{data.user.email??'未提供'}</dd></div><div><dt>登录方式</dt><dd>{provider}</dd></div><div><dt>名片资料</dt><dd>保存在当前浏览器；账户不会自动同步</dd></div></dl><p>退出账户只结束登录会话，不会删除当前浏览器里的名片。清除本地资料请前往名片库操作。</p><form action="/auth/logout?next=%2F" method="post"><button type="submit">退出登录</button></form><Link href="/cards">前往名片库</Link></section></main>;
}
