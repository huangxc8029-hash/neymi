import {expect,test} from '@playwright/test';
import {readFile} from 'node:fs/promises';

const now='2026-10-25T00:00:00.000Z';
const recipientResearch={
  recipient:{id:'recipient_e2e',displayName:'王先生',organization:'Example Lab',identityStatus:'unverified'},state:'needs_confirmation',
  sources:[{id:'source_e2e',url:'https://example.org/speaker',title:'活动嘉宾介绍',origin:'official',accessedAt:now,publishedAt:null,excerpt:'负责仓储机器人部署。'}],
  claims:[{id:'claim_e2e',recipientId:'recipient_e2e',kind:'fact',claim:'负责仓储机器人部署',sourceIds:['source_e2e'],confidence:'high',checkedAt:now}],warnings:['E2E fixture；仅用于交互测试，非真实接收人资料。'],
};
const plan={strategy:{recommendation:'prepare_introduction',confidence:'low',recommendedFocus:'展示仓储机器人演示',
  whyTheyMayCare:'公开片段与本人事实主题重合，仍需确认实际需求。',mainPoint:'分享一项已确认的经历。',openingLine:'你目前最关注哪类部署问题？',uncertainties:['E2E fixture；不是现实建议。']},
  recipe:{schemaVersion:1,id:'recipe_e2e',kind:'ai',label:'本次交流提案',templateId:'plain',layout:'editorial',animation:'float',orderedModules:[],
    createdAt:now,updatedAt:now,strategyId:'strategy_e2e',goalId:'recipient_goal',contextId:'recipient_context',recipientId:'recipient_e2e',
    headlineDraft:'为这次交流准备的介绍',introDraft:'内容由你确认后再分享。',missingProofPointIds:[],status:'proposed'}};

test('guest prepares, approves, shares, receives, and returns one personalized card',async({page})=>{
  await page.route('**/v1/session',route=>route.fulfill({status:201,json:{expiresAt:'2026-10-26T00:00:00.000Z'}}));
  await page.route('**/v1/publications',route=>route.fulfill({status:201,json:{publication:{publicId:'publication_public123',url:'https://neymi.example/p/publication_public123',expiresAt:'2026-11-24T00:00:00.000Z'},revokeToken:'revoke-token-fixture'}}));
  await page.route('**/v1/messaging/handoffs',route=>route.fulfill({status:201,json:{url:'https://neymi.example/handoff#ticket=fixture-ticket-value',expiresAt:'2026-10-25T00:05:00.000Z'}}));
  await page.route('**/v1/plan',route=>route.fulfill({status:200,json:plan}));
  await page.route('**/v1/research**',async route=>{
    const request=route.request(),path=new URL(request.url()).pathname;
    if(path.endsWith('/research')&&request.method()==='POST')return route.fulfill({status:202,json:{jobId:'job_e2e',state:'researching'}});
    if(path.endsWith('/confirm')&&request.method()==='POST')return route.fulfill({status:200,json:{ok:true}});
    if(path.endsWith('/job_e2e')&&request.method()==='GET')return route.fulfill({status:200,json:{research:recipientResearch}});
    if(path.endsWith('/job_e2e')&&request.method()==='DELETE')return route.fulfill({status:200,json:{ok:true}});
    return route.fulfill({status:404,json:{error:{message:'Unexpected E2E research request'}}});
  });
  await page.goto('/');
  await page.getByLabel('展示名称').fill('Lin E2E');await page.getByLabel('公司或团队').fill('Neymi Lab');
  await page.getByRole('button',{name:'添加展示模块'}).click();await page.getByLabel('亮点').fill('做过仓储机器人演示 PRIVATE_UNSELECTED');
  await page.getByRole('button',{name:'保存并更新预览'}).click();await page.getByRole('link',{name:'AI 助手'}).click();
  await page.getByLabel('也可以手动整理一条本人事实（只保存在本地）').fill('做过仓储机器人演示。');
  await page.getByRole('button',{name:'确认并保存事实'}).click();
  await expect(page.getByRole('status')).toContainText('已确认并保存在本地');
  await page.getByRole('textbox',{name:'接收人信息'}).fill('王先生，负责仓储机器人部署');
  await page.getByLabel('本次交流场景与目的').fill('行业活动后讨论合作');
  await page.getByRole('button',{name:'查找公开资料'}).click();
  await page.getByRole('button',{name:'确认这是我提供的接收人'}).click();
  await expect(page.getByText('已确认接收人身份。')).toBeVisible();
  await page.getByRole('checkbox',{name:'选择发送事实：做过仓储机器人演示。'}).check();
  await page.getByRole('checkbox',{name:/我同意只发送上面选中的本人事实/}).check();
  await page.getByRole('button',{name:'生成本次表达方案'}).click();
  await expect(page.getByText('方案已生成。当前内容是规则草案')).toBeVisible();
  await page.getByRole('checkbox',{name:'姓名：Lin E2E'}).check();
  await page.getByRole('checkbox',{name:/我同意按所选字段在此设备本地合成/}).check();
  await page.getByRole('button',{name:'授权并在本地合成'}).click();
  await expect(page.getByRole('region',{name:'我的名片'})).toContainText('Lin E2E');
  await page.getByRole('button',{name:'生成分享预览'}).click();
  await expect(page.locator('.share-confirmation pre')).not.toContainText('PRIVATE_UNSELECTED');
  await page.getByRole('button',{name:'确认发布公开链接'}).click();
  await expect(page.getByRole('button',{name:'创建一次性交接链接'})).toBeVisible();
  await page.getByRole('button',{name:'创建一次性交接链接'}).click();
  await expect(page.getByText('https://neymi.example/handoff#ticket=fixture-ticket-value')).toBeVisible();
  await expect(page.getByRole('button',{name:'复制交接链接'})).toBeVisible();
  const downloadWait=page.waitForEvent('download');await page.getByRole('button',{name:'确认下载名片文件'}).click();
  const download=await downloadWait,bytes=await readFile(await download.path()!);
  expect(bytes.toString('utf8')).toContain('Lin E2E');expect(bytes.toString('utf8')).not.toContain('PRIVATE_UNSELECTED');
  await page.goto('/receive');
  await page.getByLabel('导入 Neymi 名片文件').setInputFiles({name:'lin-card.ncard',mimeType:'application/json',buffer:bytes});
  await expect(page.getByRole('heading',{name:'Lin E2E'})).toBeVisible();
  await page.getByRole('link',{name:'回赠我的名片'}).click();
  await expect(page.getByLabel('展示名称')).toHaveValue('Lin E2E');
  await expect(page.locator('input[type="password"]')).toHaveCount(0);
});
