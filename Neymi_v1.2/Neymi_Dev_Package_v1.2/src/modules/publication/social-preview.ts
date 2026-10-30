import type {ShareProjection} from '../../domain/types';

const clean = (value: string | undefined, limit = 90) =>
  (value ?? '').replace(/[\u0000-\u001f\u007f]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, limit);

export function socialPreview(projection: ShareProjection) {
  // Identity is already the explicitly selected public projection. Do not add
  // email, phone, addresses, or other module content to crawler-facing metadata.
  const name = clean(projection.identity.name, 70) || '一张 Neymi 数字名片';
  const details = [clean(projection.identity.role, 60), clean(projection.identity.company, 60)]
    .filter(Boolean).join(' · ');
  return {
    name,
    title: `${name} | Neymi 数字名片`,
    description: details || '打开我的交互式数字名片 · 保存联系人 · 制作自己的名片',
    details,
  };
}

export function siteOrigin() {
  const configured = process.env.NEYMI_PUBLIC_ORIGIN || process.env.NEXT_PUBLIC_SITE_URL;
  try {
    if (configured) {
      const parsed = new URL(configured);
      if (parsed.protocol === 'https:' || (process.env.NODE_ENV !== 'production' && parsed.protocol === 'http:')) {
        return parsed.origin;
      }
    }
  } catch { /* Use the production canonical origin instead. */ }
  return 'https://swtpic.com';
}

export function publicCardUrl(publicId: string) {
  return new URL(`/p/${encodeURIComponent(publicId)}`, siteOrigin()).toString();
}
