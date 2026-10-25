import type {LocalDraft} from '../../domain/types';
export function CardRenderer({draft,reducedMotion=false}:{draft:LocalDraft;reducedMotion?:boolean}){
  return <section className={`cyber-card motion-${reducedMotion?'none':draft.config.animation}`} role="region" aria-label="我的名片">
    <div className="card-head"><span className="card-mark">neymi<span aria-hidden="true">✳</span></span><span className="card-label">A better first impression</span></div>
    <div className="card-main"><p className="card-kicker">Nice to meet you</p><h2>{draft.identity.name}</h2>
      {draft.config.kind==='ai'&&<><p>{draft.config.headlineDraft}</p><p>{draft.config.introDraft}</p></>}
      <p>{[draft.identity.role,draft.identity.company].filter(Boolean).join(' · ')}</p></div>
    <div className="card-modules">{draft.modules.map(section=><details key={section.id}>
      <summary>{section.title}</summary><div>{section.items.map(item=><p key={item.id}><strong>{item.label}</strong> {item.value}</p>)}</div>
    </details>)}</div>
    <div className="card-foot"><span>Made for this moment</span><span>↗</span></div>
  </section>;
}
