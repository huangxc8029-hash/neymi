import {CardLibrary} from '../../modules/card/library';
export default async function CardsPage({searchParams}:{searchParams:Promise<{tab?:string|string[]}>}){
  const {tab}=await searchParams;
  return <CardLibrary initialTab={tab==='received'?'received':'own'}/>;
}
