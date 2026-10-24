# First implementation prompt — v1.3
你要实施 Neymi v1.3，顺序 A 单人定制 → B 活动 → C 正式聊天渠道。本次先执行 A，不能按历史 T00–T15 从活动批处理开始。

1. 读取 AGENTS.md、README、docs/00_PRODUCT_PRD.md、03_ARCHITECTURE_PRIVACY.md、04_DATA_CONTRACTS.md、06_DELIVERY_BACKLOG.md、07_EVAL_AND_QA.md、08_DECISIONS_AND_RISKS.md。
2. 读取 docs/superpowers/plans/2026-10-24-phase-a-implementation.md 和当前 harness/build 任务卡。A00 前不假设脚手架、密钥、部署、依赖或测试。
3. 输出真实仓库发现报告，锁定支持的运行环境与依赖。v1.1 HTML 仅视觉参考，legacy/v1.2-baseline 仅历史，不执行旧活动优先任务。
4. 每次只处理可独立验收的任务，说明范围/文件/测试/边界；执行授权来自用户，不因文档存在便自动部署。
5. ManualCardConfig 无 AI Strategy；AI CardRecipe 仍必须关联 Strategy。Recipient.eventId 可缺省。
6. 完整本人资料不上传。对话/最小摘要明确批准后可进云端。敏感联系字段本地加密，不进 AI；最终分享可主动选择字段并另行发布快照。
7. 免注册创建/接收/保存/回赠；公开链接可转发，不宣称接收人 E2EE；不自动外联。
8. 无配置用标记清楚的 fixture，真实 API/设备测试未做标 BLOCKED/NOT RUN。每任务报告 Implemented / Tests（实际命令）/ Privacy / Open questions / Next task。
