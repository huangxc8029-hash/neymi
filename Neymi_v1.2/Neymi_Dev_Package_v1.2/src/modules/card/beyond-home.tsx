import Link from 'next/link';
import {AccountEntry} from '../auth/account-entry';

export function BeyondHome(){
  return <main className="workspace beyond-page">
    <header className="prepare-header"><Link className="wordmark" href="/">neymi</Link><Link className="prepare-back" href="/" aria-label="返回制作名片"><span aria-hidden="true">←</span> 返回制作名片</Link><AccountEntry className="secondary-account-entry"/></header>
    <section className="hero beyond-hero"><div><h1>Beyond 名片</h1><p className="intro">先整理真实的自己，再决定如何向重要联系人介绍自己。</p></div></section>
    <section className="beyond-flow" aria-label="Beyond 名片准备流程">
      <p className="beyond-flow-intro">推荐顺序</p>
      <article className="beyond-flow-step"><span className="beyond-flow-number" aria-hidden="true">01</span><div className="beyond-flow-copy"><h2>关于自己的故事</h2><p>录音、输入或和 AI 对话，整理经历与特点；只有你确认的内容才会成为本人事实。</p><small>素材 → 候选 → 你确认的事实</small></div><Link href="/prepare" className="beyond-flow-action">整理我的故事 <span aria-hidden="true">→</span></Link></article>
      <article className="beyond-flow-step"><span className="beyond-flow-number" aria-hidden="true">02</span><div className="beyond-flow-copy"><h2>瞄准关键联系人</h2><p>添加活动资料和联系人，逐位核实身份，再准备适合本次交流的介绍。</p><small>活动背景 → 联系人 → 逐人准备</small></div><Link href="/activity" className="beyond-flow-action">准备联系人 <span aria-hidden="true">→</span></Link></article>
      <p className="beyond-flow-note">第二步可以单独开始；本人事实会帮助你准备更贴近实际的介绍。</p>
    </section>
    <footer className="site-footer"><span>信息由你确认 · 分享由你决定</span><Link href="/cards">我的卡片库</Link></footer>
    <nav className="mobile-work-nav" aria-label="主要功能"><Link href="/"><span aria-hidden="true">✦</span>制作名片</Link><Link href="/beyond" aria-current="page"><span aria-hidden="true">◇</span>Beyond 名片</Link><Link href="/cards"><span aria-hidden="true">▤</span>我的卡片库</Link></nav>
  </main>;
}
