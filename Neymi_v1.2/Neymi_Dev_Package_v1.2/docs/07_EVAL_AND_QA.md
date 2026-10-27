# QA & Evaluation v1.3
所有测试为待实施验收。实际结果写入 docs/verification/，记录 commit、命令、fixture、日期、PASS/FAIL/BLOCKED/NOT RUN。禁止仅因代码存在写 PASS。

2026-10-26 阶段 A/B 执行结果已记录于 [card-and-assistant-2026-10-26.md](verification/card-and-assistant-2026-10-26.md)：unit、typecheck、lint、build 和正式浏览器矩阵通过；真实 provider、手机/Safari/微信实机及商业系统未运行。mock 结果不得作为实时服务通过证据。

## A 验收矩阵
| ID | Given / When | Then | 任务 |
|---|---|---|---|
| AC-A01 | 新访客只填展示名称，创建/导出 | 无账户、付费、口令或 AI 问卷墙 | A03 |
| AC-A02 | 保存敏感电话，锁定/重载/错误口令 | 存储无明文值或原始密钥，未解锁不读取 | A02 |
| AC-A03 | 错口令、篡改、旧版本或空间不足时恢复备份 | 原库完整保留，明确失败；合法备份可恢复 | A02 |
| AC-A04 | AI 提取本人经历但用户未确认 | 不作为事实入库/引用；确认后有 revision | A06 |
| AC-A05 | 聊天含电话/邮箱，或用户未批准摘要/摘要被改动 | 提示移除/替换，实际批准文本可见；敏感 vault 从请求路径隔离 | A05,A06 |
| AC-A06 | 研究同名、错机构、冲突日期、受限页面 | 消歧/unknown/partial，不混人物/伪造来源 | A07 |
| AC-A07 | localhost/私网/重定向/DNS rebinding/超大响应/注入页 | 抓取拒绝或安全停止，不读 vault、不执行页内命令 | A07 |
| AC-A08 | 同一本人，两个不同职业背景接收人 | 策略选择/重点有实质且有据差异，非只替换姓名 | A08 |
| AC-A09 | LLM 编造业绩、跨任务 sourceId、敏感画像或成功概率 | schema/语义验证拒绝，不能当成已批准方案 | A08 |
| AC-A10 | grant 过期/撤销/错设备/用途/字段/卡片范围 | 本地读取拒绝；server jobId 无绕过能力 | A09 |
| AC-A11 | 私有接收人标签存在，本人材料更新 | 标签不导出，方案 stale，公开快照不自动修改 | A09 |
| AC-A12 | 分别填写邮箱、电话、微信、WhatsApp；只选部分联系方式/资源，导出 JSON/vCard/图片 | 四类联系方式可本地加密保存；未选字段在字节、像素内容与元数据中均缺席；无 EXIF | A02,A04 |
| AC-A13 | 发布后重试、改动内容、撤下/到期、猜管理凭证 | 幂等、改动重确认、失效不可读、无法越权撤下 | A10 |
| AC-A14 | 接收人打开名片，保存/回赠 | 免注册，无私有标签/策略/追踪，无自动外发 | A11 |
| AC-A15 | 360/390/768/1440、键盘、reduced-motion、离线/系统分享取消 | 不溢出、焦点正确；缓存卡可导出；取消不报成功 | A03,A11 |
| AC-A16 | 另一个匿名会话查询/修改任务，CSRF、配额超限 | 访问拒绝，错误不泄露任务存在/正文，返回安全 retry 信息 | A05 |
| AC-A17 | 24h 提案/30d 发布到期，删除/清理任务运行 | 应用数据按规则清理，凭证/正文不进日志；供应商留存另核验 | A05,A10 |
| AC-A18 | 配置真实服务并进行少量试用 | 真实来源可核对，成本可记录，限制如实；mock 不算实时通过 | A12 |
| AC-A19 | 新匿名用户选择六款卡片模板并切换 | 六款均免费免注册；预览、分享投影、公开卡片和 PNG 使用所选样式 | A03,A10 |

## 核心 Gherkin
```gherkin
Given 一个本地用户已确认两个真实项目
And 两个接收人的职业背景分别有不同的公开证据
When 用户分别请求表达方案
Then 每个重点都能追溯至本人事实和接收人依据
And 没有依据的差异不会被编造

Given 用户批准云端处理一段职业摘要
When 用户尚未批准本地合成或最终分享
Then AI 不能读取电话
And 系统不能发布或发送名片

Given 用户选定了一个邮件但没有选电话
When 用户确认并发布名片
Then 快照和 OG 不包含电话
And 私有接收人标签与研究策略不会出现
```

## 评测材料
A01 将 fixtures/single-recipient.json 场景种子转为合法领域 fixture；添加至少 20 个独立负例，覆盖上表威胁、缺配置、跨浏览器、低存储、取消/超时。虚构 sources 始终标记，真实 API 测试另建 opt-in suite，默认测试不花费外部额度。
模型结构校验不能证明语义真实，A12 人工抽查关键事实与原文是否支持、本人事实是否确认、建议是否真正相关。样本中接受内容的虚构本人事实和越权输出应为零，但不得外推为绝对安全保证。

## B/C
AC-B01：活动/PDF 注入与格式错误安全拒绝，最多 20 人。
AC-B02：阶段不匹配不被浮夸文案提升排名；未知单独显示。
AC-B03：一人失败不阻断其他人，预算/取消/复用生效，本地跟进自愿。
AC-C01：无效签名/重放/重复事件无副作用，日志无 webhook 正文。
AC-C02：一次性 ticket 到期/复用拒绝；webview 无 vault 时提供恢复，不声称自动同步。

## 验证纪律
npm 命令在 A01 才创建。文档检查不能替代应用测试。每项记录命令、真实输出和设备/浏览器。设备覆盖至少桌面浏览器、手机 Safari/Chrome 与目标聊天软件内置浏览器；没有真机访问时标 NOT RUN，不能声称 G-A3 完成。

## Creative content release evidence

Task-local checks cover schema/source bounds, file signatures and parser limits, malformed or unsupported input, voice provider consent and cancellation, module allowlists and approved source IDs, template fallback, and idempotent entitlement reservation. The test transcription provider fails closed; no real ASR, OCR, content-module LLM endpoint, account system, billing provider, mobile device or hosted environment was exercised. Those checks remain NOT RUN until providers, devices and COM endpoints exist.
