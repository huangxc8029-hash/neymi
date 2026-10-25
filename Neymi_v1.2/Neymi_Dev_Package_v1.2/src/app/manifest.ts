import type {MetadataRoute} from 'next';
export default function manifest():MetadataRoute.Manifest{
  return{name:'Neymi',short_name:'Neymi',description:'为每次相遇，准备好的你',start_url:'/',scope:'/',display:'standalone',background_color:'#f5f3e7',theme_color:'#153d31',lang:'zh-CN'};
}
