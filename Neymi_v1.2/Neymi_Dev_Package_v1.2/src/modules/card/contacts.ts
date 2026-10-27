import type {ProfileItem} from '../../domain/types';

export type ContactChannel='email'|'phone'|'wechat'|'whatsapp'|'address';
export const CONTACT_MODULE_ID='contact_methods';
export const CONTACT_CHANNELS:ReadonlyArray<{key:ContactChannel;label:string;valueKind:'email'|'phone'|'text'|'address';autoComplete?:string}>=[
  {key:'email',label:'邮箱',valueKind:'email',autoComplete:'email'},
  {key:'phone',label:'电话',valueKind:'phone',autoComplete:'tel'},
  {key:'wechat',label:'微信',valueKind:'text'},
  {key:'whatsapp',label:'WhatsApp',valueKind:'phone',autoComplete:'tel'},
  {key:'address',label:'联系地址（可只填城市）',valueKind:'address',autoComplete:'street-address'},
];
export type ContactValues=Record<ContactChannel,string>;
export const emptyContacts=():ContactValues=>({email:'',phone:'',wechat:'',whatsapp:'',address:''});
export function contactItems(values:ContactValues):ProfileItem[]{
  return CONTACT_CHANNELS.flatMap(({key,label,valueKind})=>{
    const value=values[key].trim();
    if(!value)return[];
    if(value.length>200||/[\r\n]/.test(value))throw new Error(`${label}格式无效`);
    if(key==='email'&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value))throw new Error('邮箱格式无效');
    if((key==='phone'||key==='whatsapp')&&!/^\+?[\d\s().-]{6,30}$/.test(value))throw new Error(`${label}号码格式无效`);
    return[{id:`contact_${key}`,label,value,valueKind,sensitivity:'sensitive' as const}];
  });
}
