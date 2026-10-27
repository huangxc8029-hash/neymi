import {Suspense} from 'react';
import Link from 'next/link';
import {SignInForm} from '../../modules/auth/sign-in-form';
import '../../modules/auth/auth.css';

export default function AuthPage(){return <main className="auth-page"><header><Link className="wordmark" href="/">neymi<span aria-hidden="true">.</span></Link><Link href="/">继续免注册使用</Link></header><Suspense fallback={<p>正在打开账户…</p>}><SignInForm/></Suspense></main>;}
