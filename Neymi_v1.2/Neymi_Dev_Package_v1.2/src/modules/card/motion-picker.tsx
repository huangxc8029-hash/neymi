'use client';
import type {Motion} from '../../domain/types';

export function MotionPicker({value,onChange}:{value:Motion;onChange:(value:Motion)=>void}){
  return <fieldset className="motion-picker"><legend>打开效果</legend><p>选择对方打开卡片时的动态风格。</p><div role="group" aria-label="名片动效">{([['float','轻柔浮现'],['keys','层叠展开'],['orbit','环绕显现']] as const).map(([motion,title])=><button type="button" key={motion} aria-pressed={value===motion} className={value===motion?'motion-option selected':'motion-option'} onClick={()=>onChange(motion)}>{title}</button>)}</div></fieldset>;
}
