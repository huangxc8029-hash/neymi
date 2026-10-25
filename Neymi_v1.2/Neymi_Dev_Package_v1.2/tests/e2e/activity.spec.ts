import {expect,test} from '@playwright/test';

function pdfFixture(text:string){
  const stream=`BT /F1 12 Tf 20 80 Td (${text}) Tj ET`,objects=['<< /Type /Catalog /Pages 2 0 R >>','<< /Type /Pages /Kids [3 0 R] /Count 1 >>','<< /Type /Page /Parent 2 0 R /MediaBox [0 0 200 100] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>','<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',`<< /Length ${Buffer.byteLength(stream)} >>\nstream\n${stream}\nendstream`];
  let pdf='%PDF-1.4\n';const offsets=[0];for(let i=0;i<objects.length;i++){offsets.push(Buffer.byteLength(pdf));pdf+=`${i+1} 0 obj\n${objects[i]}\nendobj\n`;}
  const xref=Buffer.byteLength(pdf);pdf+=`xref\n0 ${objects.length+1}\n0000000000 65535 f \n${offsets.slice(1).map(value=>`${String(value).padStart(10,'0')} 00000 n \n`).join('')}trailer\n<< /Size ${objects.length+1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return Buffer.from(pdf);
}

test('guest prepares a local event list and confirms each recipient first',async({page})=>{
  let planRequestCount=0;page.on('request',request=>{if(request.url().includes('/v1/activity/plans'))planRequestCount++;});
  await page.goto('/activity');
  await page.getByLabel('活动名称').fill('Robotics Forum');
  await page.getByLabel('这次活动想建立什么联系').fill('Find robotics partners');
  await page.locator('#activity-pdf').setInputFiles({name:'agenda.pdf',mimeType:'application/pdf',buffer:pdfFixture('Alex Kim robotics partnerships')});
  await expect(page.getByText('PDF 文字已在本地提取；原文件不会上传。')).toBeVisible();
  await page.getByLabel('姓名',{exact:true}).fill('Alex Kim');
  await page.getByLabel('嘉宾介绍',{exact:true}).fill('robotics partnerships');
  await page.getByRole('button',{name:'加入嘉宾'}).click();
  const batch=page.getByRole('button',{name:'逐人准备本地草案'});
  await expect(batch).toBeDisabled();
  await page.getByLabel('我确认这是我要联系的嘉宾').check();
  await page.getByRole('button',{name:'检查资料并保存活动'}).click();
  await expect(batch).toBeEnabled();
  await batch.click();
  await expect(page.getByText(/完成 1 位/)).toBeVisible();
  await expect(page.getByText(/阶段关系尚未确认/)).toBeVisible();
  await page.getByLabel('选择要提供给 AI 的本人背景（可留空但至少选择一条已确认事实）').fill('I build robotics products.');
  await expect(page.getByText(/Alex Kim/).first()).toBeVisible();
  await page.getByLabel('我已查看上方内容，并同意为本活动将其发送给 AI 逐位拟定方案。').check();
  await page.getByRole('button',{name:'授权并生成多人 AI 方案'}).click();
  await expect(page.getByText(/已准备 1 位方案/)).toBeVisible();
  expect(planRequestCount).toBe(1);
  await expect(page.getByRole('heading',{name:'AI 表达方案',exact:true})).toBeVisible();
  await page.getByLabel('我已查看上方内容，并同意为本活动将其发送给 AI 逐位拟定方案。').check();
  await page.getByRole('button',{name:'授权并生成多人 AI 方案'}).click();
  await expect(page.getByText('已复用本地方案；未再次发送云端请求。')).toBeVisible();
  expect(planRequestCount).toBe(1);
  await page.reload();
  await expect(page.getByRole('heading',{name:'Alex Kim',exact:true})).toBeVisible();
  await expect(page.getByLabel('我确认这是我要联系的嘉宾')).toBeChecked();
});
