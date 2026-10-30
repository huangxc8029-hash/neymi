import {ImageResponse} from 'next/og';
import {getPublicationService} from '../../../server/publication-runtime';
import {getCardTemplate} from '../../../modules/card/templates';
import {socialPreview} from '../../../modules/publication/social-preview';
import type {ShareProjection} from '../../../domain/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const alt = 'Neymi 数字名片';
export const size = {width: 1200, height: 630};
export const contentType = 'image/png';

export default async function OpenGraphImage({params}: {params: Promise<{publicId: string}>}) {
  const {publicId} = await params;
  let projection: ShareProjection | null = null;
  try {
    projection = await getPublicationService('https://neymi.invalid').readPublication(publicId);
  } catch { /* Missing, revoked and expired cards must never expose their old identity. */ }
  const preview = projection ? socialPreview(projection) : {
    name: 'Neymi', details: '为每次相遇，准备好的你',
  };
  const template = getCardTemplate(projection?.templateId);
  const image = (
    <div style={{
      width: '100%', height: '100%', display: 'flex', flexDirection: 'column',
      justifyContent: 'space-between', padding: 68,
      background: `linear-gradient(125deg, ${template.start}, ${template.end})`,
      color: template.ink, position: 'relative',
    }}>
      <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
        <div style={{fontSize: 28, letterSpacing: 2, fontWeight: 700}}>neymi.</div>
        <div style={{fontSize: 19, color: template.muted}}>DIGITAL IDENTITY</div>
      </div>
      <div style={{display: 'flex', flexDirection: 'column', gap: 24, maxWidth: 1064}}>
        <div style={{fontSize: preview.name.length > 22 ? 52 : 76, fontWeight: 700, lineHeight: 1.12,
          overflowWrap: 'anywhere'}}>{preview.name}</div>
        <div style={{fontSize: 29, color: template.muted, maxWidth: 990, lineHeight: 1.4}}>
          {preview.details || 'Open my interactive card'}
        </div>
      </div>
      <div style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between'}}>
        <div style={{height: 5, width: 120, backgroundColor: template.accent, borderRadius: 5}}/>
        <div style={{fontSize: 21, color: template.muted}}>swtpic.com</div>
      </div>
    </div>
  );
  return new ImageResponse(image, {
    ...size,
    headers: {'Cache-Control': 'no-store, max-age=0'},
  });
}
