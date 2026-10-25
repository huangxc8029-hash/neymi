import type { Metadata } from 'next';
import {ServiceWorkerRegister} from '../modules/pwa/register';
import './globals.css';
import '../modules/card/styles.css';

export const metadata: Metadata = {
  title: 'Neymi — 为每次相遇，准备好的你',
  description: '面向不同接收人的个性化数字名片。',
  manifest: '/manifest.webmanifest',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="zh-CN"><body>{children}<ServiceWorkerRegister/></body></html>;
}
