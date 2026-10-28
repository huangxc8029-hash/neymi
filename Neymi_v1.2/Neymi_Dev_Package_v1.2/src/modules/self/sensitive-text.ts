const patterns:[string,RegExp][]=[
  ['email',/[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}/g],
  ['phone',/(?<!\w)\+?\d[\d\s().-]{7,}\d(?!\w)/g],
  ['address',/\b\d{1,5}\s+\w+(?:\s+\w+){0,3}\s+(?:street|st|road|rd|avenue|ave|lane|ln|boulevard|blvd)\b/gi],
];
export function detectSensitiveText(text:string):Array<{start:number;end:number;kind:string}>{
  return patterns.flatMap(([kind,pattern])=>{pattern.lastIndex=0;return Array.from(text.matchAll(pattern),match=>({start:match.index!,end:match.index!+match[0].length,kind}));}).sort((a,b)=>a.start-b.start);
}
