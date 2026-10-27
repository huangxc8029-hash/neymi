import type { ContentSourceRef } from '../../domain/types';

export function serializeContentSources(sources: ContentSourceRef[]): string {
  return JSON.stringify(sources.map(canonicalSource));
}

function canonicalSource(source: ContentSourceRef) {
  return {
    kind: source.kind,
    sourceId: source.sourceId,
    ...(source.page === undefined ? {} : { page: source.page }),
    ...(source.paragraph === undefined ? {} : { paragraph: source.paragraph }),
    ...(source.startMs === undefined ? {} : { startMs: source.startMs }),
    ...(source.endMs === undefined ? {} : { endMs: source.endMs }),
    createdAt: source.createdAt,
  };
}

export function serializeContentSourceSegments(segments:Array<{sourceRef:ContentSourceRef;text:string}>):string{
  return JSON.stringify(segments.map(segment=>({sourceRef:canonicalSource(segment.sourceRef),text:segment.text})));
}
