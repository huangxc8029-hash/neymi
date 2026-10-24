import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Neymi — 为每次相遇，准备好的你',
  description: '面向不同接收人的个性化数字名片。',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="zh-CN"><body>{children}</body></html>;
}
