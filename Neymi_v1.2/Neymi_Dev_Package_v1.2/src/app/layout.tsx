import type { Metadata } from 'next';
import {ServiceWorkerRegister} from '../modules/pwa/register';
import {AssistantProvider} from '../modules/assistant/provider';
import './globals.css';
import '../modules/card/styles.css';
import '../modules/card/identity-card.css';
import '../styles/tokens.css';
import '../modules/card/ui-theme.css';
import '../modules/card/studio.css';
import '../modules/card/onboarding.css';

export const metadata: Metadata = {
  title: 'Neymi — 为每次相遇，准备好的你',
  metadataBase: new URL(process.env.NEYMI_PUBLIC_ORIGIN || 'https://swtpic.com'),
  description: '面向不同接收人的个性化数字名片。',
  manifest: '/manifest.webmanifest',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="zh-CN" data-scroll-behavior="smooth"><body><AssistantProvider>{children}</AssistantProvider><ServiceWorkerRegister/></body></html>;
}
