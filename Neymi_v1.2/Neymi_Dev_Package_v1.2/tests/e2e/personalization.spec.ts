import {expect,test} from '@playwright/test';
import {readFile} from 'node:fs/promises';

const now='2026-10-25T00:00:00.000Z';
const recipientResearch={
  recipient:{id:'recipient_e2e',displayName:'王先生',organization:'Example Lab',identityStatus:'unverified'},state:'needs_confirmation',
  sources:[{id:'source_e2e',url:'https://example.org/speaker',title:'活动嘉宾介绍',origin:'official',accessedAt:now,publishedAt:null,excerpt:'负责仓储机器人部署。'}],
  claims:[{id:'claim_e2e',recipientId:'recipient_e2e',kind:'fact',claim:'负责仓储机器人部署',sourceIds:['source_e2e'],confidence:'high',checkedAt:now}],warnings:['E2E fixture；仅用于交互测试，非真实接收人资料。'],
};

test('guest prepares, approves, shares, receives, and returns one personalized card',async({page})=>{
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
  await page.getByRole('button',{name:'预览名片'}).click();await page.getByRole('link',{name:/AI 名片/}).click();
  await page.getByLabel('也可以手动整理一条本人事实（只保存在本地）').fill('做过仓储机器人演示。');
  await page.getByRole('button',{name:'确认并保存事实'}).click();
  await expect(page.getByRole('status')).toContainText('已确认并保存在本地');
  await page.getByLabel('接收人信息').fill('王先生，负责仓储机器人部署');
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
  await expect(page.getByText('PRIVATE_UNSELECTED')).toHaveCount(0);
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
