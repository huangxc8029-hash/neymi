import {expect,test} from '@playwright/test';

test('voice notes stay local until explicitly sent and preserve their source in the AI request',async({page})=>{
  let submitted:Record<string,any>|undefined;
  await page.route('**/v1/session',route=>route.request().method()==='GET'
    ?route.fulfill({status:404,json:{error:{message:'No session'}}})
    :route.fulfill({status:201,json:{expiresAt:new Date(Date.now()+60_000).toISOString()}}));
  await page.route('**/v1/designer/turn',async route=>{
    const body=route.request().postDataJSON();submitted=body;
    await route.fulfill({status:200,json:{reply:'已读取语音笔记，请确认内容。',slots:body.slots,question:null,factCandidates:[{text:'负责过无障碍预约流程',evidenceIds:[body.evidence[0].id]}]}});
  });
  await page.goto('/');await page.getByRole('button',{name:/AI 名片助理/}).click();
  const dialog=page.getByRole('dialog',{name:'AI 名片助理'});
  await dialog.getByRole('button',{name:/开始录音/}).waitFor();
  await dialog.getByLabel('手工转写 / 语音笔记').fill('我负责过无障碍预约流程。');
  await expect(dialog.getByRole('button',{name:'发送消息'})).toBeEnabled();
  await dialog.getByRole('button',{name:'发送消息'}).click();
  await expect.poll(()=>submitted).toBeTruthy();
  expect(submitted?.message).toContain('我负责过无障碍预约流程。');
  expect(submitted?.evidence[0]).toMatchObject({sourceId:'voice_note_local',quote:'我负责过无障碍预约流程。'});
  await expect(dialog.getByRole('region',{name:'确认名片亮点'})).toContainText('负责过无障碍预约流程');
});

test('AI card proposals require confirmed evidence and persist separately in the card library',async({page})=>{
  await page.route('**/v1/session',route=>route.request().method()==='GET'
    ?route.fulfill({status:404,json:{error:{message:'No session'}}})
    :route.fulfill({status:201,json:{expiresAt:new Date(Date.now()+60_000).toISOString()}}));
  await page.route('**/v1/designer/turn',async route=>{
    const body=route.request().postDataJSON(),evidence=body.evidence.at(-1);
    await route.fulfill({status:200,json:{reply:'我找到了你提供的课程预约交互经历，请确认后再用于名片。',slots:{...body.slots,displayName:'林予安',role:'产品设计师',purposeType:'partner',audienceMode:'group',audienceRole:'教育科技负责人'},question:null,factCandidates:[{text:'做过课程预约流程的交互设计',evidenceIds:[evidence.id]}]}});
  });
  await page.route('**/v1/designer/proposal',async route=>{
    const body=route.request().postDataJSON(),evidenceId=body.confirmedEvidenceIds[0];
    await route.fulfill({status:200,json:{proposal:{templateId:'soft-signal',alternatives:[],rationale:'柔和紫色适合简洁呈现这段已确认的课程预约经历。',identityFieldRefs:['name','role'],modules:[{kind:'highlight',title:'个人亮点',items:[{label:'项目经历',text:'做过课程预约流程的交互设计',evidenceIds:[evidenceId],treatment:'verbatim',needsConfirmation:false}],evidenceIds:[evidenceId]}],proposedFieldRefs:[],omissions:[],missingInformation:['公司名称可稍后填写']}}});
  });
  await page.goto('/');
  await page.getByRole('button',{name:/AI 名片助理/}).click();
  await page.getByLabel('告诉 AI 名片助理').fill('我叫林予安，是产品设计师。这张名片用于商务合作，面向教育科技负责人。我做过课程预约流程的交互设计。');
  await page.getByRole('button',{name:'发送',exact:true}).click();
  const candidates=page.getByRole('region',{name:'确认名片亮点'});
  await expect(candidates).toBeVisible();
  await expect(candidates).toContainText('原文：我叫林予安');
  const highlight=candidates.getByRole('checkbox',{name:/做过课程预约流程的交互设计/});
  await expect(highlight).not.toBeChecked();
  await highlight.check();
  await page.getByRole('button',{name:'生成名片预览'}).click();
  await expect(page.getByRole('button',{name:'打开名片预览并确认显示内容'})).toBeVisible();
  await expect(page.locator('.designer-rewrite-confirm')).toContainText('做过课程预约流程的交互设计');
  await expect(page.locator('.designer-rewrite-confirm input')).toBeDisabled();
  await page.getByRole('button',{name:'打开名片预览并确认显示内容'}).click();
  await expect(page.locator('.guided-draft-notice')).toContainText('已保存');
  await expect(page.locator('.studio-workspace')).toHaveAttribute('data-active-step','visibility');
  const card=page.getByRole('region',{name:'我的名片'});
  await card.getByRole('button',{name:'查看个人亮点'}).click();
  await expect(card.getByRole('group',{name:'个人亮点详情'})).toContainText('做过课程预约流程的交互设计');

  await page.goto('/cards');
  const saved=page.locator('.wallet-guided-card');
  await expect(saved).toHaveCount(1);
  await expect(saved.locator('h3')).toHaveText('林予安');
  await expect(saved).toContainText('商务合作 · 面向教育科技负责人');
  await saved.getByRole('button',{name:'查看个人亮点'}).click();
  await expect(saved.getByRole('group',{name:'个人亮点详情'})).toContainText('做过课程预约流程的交互设计');

  await page.goto('/');
  await expect(page.getByRole('textbox',{name:'展示名称'})).toHaveValue('');
});
