import {expect,test} from '@playwright/test';

test('prepare retains local material import and evidence-backed module review',async({page})=>{
  let requestedText='';
  await page.route('**/v1/session',route=>route.fulfill({status:201,json:{expiresAt:new Date(Date.now()+60_000).toISOString()}}));
  await page.route('**/v1/modules/proposals',async route=>{
    const body=route.request().postDataJSON() as {context:{text:string};segments:Array<{sourceRef:Record<string,unknown>;text:string}>};
    requestedText=body.context.text;
    await route.fulfill({status:200,json:{proposals:[{id:'prepare_module_e2e',kind:'project_case',title:'项目经历',items:[{id:'result',label:'行动',value:'我设计了课程预约流程。'}],sourceRefs:body.segments.map(segment=>segment.sourceRef),rationale:'原文有明确行动',missingEvidence:[]}]}});
  });
  await page.goto('/prepare');
  const importPanel=page.getByRole('region',{name:'上传介绍材料'});
  await importPanel.getByLabel('选择本地文件').setInputFiles({name:'project.txt',mimeType:'text/plain',buffer:Buffer.from('我设计了课程预约流程。')});
  await expect(importPanel.getByText('已就绪')).toBeVisible();
  const assistant=page.getByRole('region',{name:'把材料整理成展示模块'});
  await assistant.getByText('查看将发送的完整文字与来源').click();
  await assistant.getByLabel(/我已核对发送文字/).check();
  await assistant.getByRole('button',{name:'生成候选并审阅'}).click();
  await expect(assistant.getByLabel('模块标题')).toHaveValue('项目经历');
  expect(requestedText).toContain('我设计了课程预约流程。');
  await assistant.getByLabel('模块标题').fill('课程预约项目');
  await assistant.getByRole('button',{name:'确认并加入名片'}).click();
  await expect(page.locator('.story-status')).toContainText('模块已保存在本地');
  await page.goto('/');
  await page.getByRole('textbox',{name:'展示名称'}).fill('Material owner');
  await page.getByRole('navigation',{name:'名片制作步骤'}).getByRole('button',{name:/选择显示内容/}).click();
  await expect(page.locator('.editor-visibility-step')).toContainText('课程预约项目');
});

test('prepare retains explicit identity confirmation before single-recipient planning',async({page})=>{
  const research={recipient:{id:'recipient_single_e2e',displayName:'Alex Kim',identityStatus:'unverified'},state:'needs_confirmation',sources:[{id:'source_single_e2e',url:'https://example.org/alex',title:'公开资料',origin:'official',accessedAt:new Date().toISOString(),publishedAt:null,excerpt:'负责 robotics partnerships。'}],claims:[{id:'claim_single_e2e',recipientId:'recipient_single_e2e',kind:'unknown',claim:'负责 robotics partnerships',sourceIds:['source_single_e2e'],confidence:'unknown',checkedAt:new Date().toISOString()}],warnings:['测试材料；未独立核验。']};
  await page.route('**/v1/session',route=>route.fulfill({status:201,json:{expiresAt:new Date(Date.now()+60_000).toISOString()}}));
  await page.route('**/v1/research',route=>route.fulfill({status:202,json:{jobId:'single_research_e2e',state:'researching'}}));
  await page.route('**/v1/research/single_research_e2e',route=>route.fulfill({status:200,json:{research}}));
  await page.route('**/v1/research/single_research_e2e/confirm',route=>route.fulfill({status:200,json:{ok:true}}));
  await page.goto('/prepare');
  await page.getByLabel('接收人信息类型').selectOption('text');
  await page.getByLabel('接收人信息',{exact:true}).fill('Alex Kim');
  await page.getByLabel('本次交流场景与目的').fill('交流产品合作');
  await page.getByRole('button',{name:'查找公开资料'}).click();
  await expect(page.getByRole('button',{name:'确认这是我提供的接收人'})).toBeVisible();
  await page.getByRole('button',{name:'确认这是我提供的接收人'}).click();
  await expect(page.getByRole('button',{name:'生成本次表达方案'})).toBeVisible();
});
