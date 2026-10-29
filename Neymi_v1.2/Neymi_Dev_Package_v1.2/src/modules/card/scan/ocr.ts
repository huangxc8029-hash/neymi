import {createWorker} from 'tesseract.js';

export async function recognizeCard(image:Blob){
  const worker=await createWorker('chi_sim+eng');
  try{const result=await worker.recognize(image);return result.data.text.trim();}
  finally{await worker.terminate();}
}
export function suggestFields(text:string){
  const lines=text.split(/\r?\n/).map(line=>line.trim()).filter(Boolean);
  return {name:lines.find(line=>/^[\p{Script=Han}]{2,4}$/u.test(line))??lines[0]??'',company:lines.find(line=>/公司|集团|工作室|有限公司|科技|studio|inc\b/i.test(line))??'',role:lines.find(line=>/经理|总监|设计师|创始人|顾问|director|manager|designer|founder/i.test(line))??'',phone:text.match(/(?:\+?\d[\d\s()-]{7,}\d)/)?.[0]?.trim()??'',email:text.match(/[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}/)?.[0]??''};
}
