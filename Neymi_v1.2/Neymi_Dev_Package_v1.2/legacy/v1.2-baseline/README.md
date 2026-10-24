# Neymi · Product & Engineering v1.2

> **工作名** Neymi（正式英文品牌未确定）。**版本** 1.2.0 · **日期** 2026-10-24 · **状态** 产品方向确认，AI Event Connection Pilot 待实现和验证。\
> 本包是供真实团队与 Codex 实施的**需求/架构/任务/验收基线**，不是已实现的软件或已经验证的商业效果。

## 先读哪几份

| 角色 | 阅读顺序 | 用途 |
|---|---|---|
| 产品经理 / 创始人 | `docs/00_PRODUCT_PRD.md` → `docs/08_DECISIONS_AND_RISKS.md` | 目标、边界、决策与风险 |
| 设计师 | `docs/01_USER_JOURNEYS_UX.md` → `prototypes/` | 用户路径、卡片与分享交互 |
| AI 工程师 | `docs/02_AI_AGENT_SPEC.md` → `docs/04_DATA_CONTRACTS.md` → `docs/07_EVAL_AND_QA.md` | 检索、来源、推荐、结构化输出与评测 |
| 全栈工程师 | `docs/03_ARCHITECTURE_PRIVACY.md` → `docs/05_APIS_INTEGRATIONS.md` → `docs/06_DELIVERY_BACKLOG.md` | 边界、接口、分期 |
| Codex | 根目录 `AGENTS.md` → `docs/CODEX_FIRST_PROMPT.md` → 当前 `harness/build/` 任务卡 | 单次任务推进与验收 |

## 最高优先级产品事实

1. Card 是用户本地数据的**可分享表示**；Core Guest 免费、免注册、免安装，支持创建/接收/回赠。
2. **Recipient Intelligence → Relevance → Connection Strategy → Card Recipe**。不能把 AI Agent 降级为“模板文字生成器”。
3. 面向每个具体的人，AI 研究其可核验的公开职业兴趣与决策偏好，给用户提供**真实、非操纵性的交流建议**，优先衡量有意义的下一次接触。
4. **Recipe 仅保存模块引用/次序/意图/文案草稿；用户本地资料保留在设备上。** 云端公开研究和聊天资料 != 本地个人资料。
5. 不允许在未授权的情况下上传整个本地 Profile、把未勾选字段写入分享包、擅自代表用户发送名片或代发消息。
6. AI 准备可以经 WhatsApp/微信/Telegram Bot 开始；本地 Composer 仍用于审查授权、生成、分享。聊天渠道适配能力不得假装是现成的。
7. 卡片 5:3 横版，姓名左上，Company/Role 紧随；动态 1–N 模块、大小不等，简洁透明浮窗、三种动效。个人头像/公司 logo 可选。
8. Sleeve 是独立于卡片的会员视觉/签章层，支付和会员后端与个人明文资料库分离。

## 版本边界

- **现有基线**：v1.1 HTML 交互原型（不是生产应用）。
- **本版新增并进入试点范围**：Event Research、Recipient Evidence、Match & Strategy、Card Recipe、临时授权设计、Prepared Cards、对话入口抽象、跟进记录。
- **本版不承诺开发完毕**：商业 Messenger 正式接入、自动联网抓取私人社交账号、AI 全自动发送、正式用户行为追踪、已经上线的安全加密同步。
- **权威优先级**：`docs/00_PRODUCT_PRD.md` + ADR Accepted 决策 → 单功能契约 → 当前任务卡 → 本 README → `legacy/`。遇冲突**停止相关代码并记录**，不得自行选择便宜实现。
- `legacy/v1.1_full_spec_REFERENCE_ONLY.md` 只提供旧设计历史与细节；固定六宫格、旧计划、旧 API 不能覆盖 v1.2。原型截图是视觉参考。

## 对 Codex 的最低交付要求

每个任务：最小可运行代码 + 类型检查 + 单测/集成测 + 前后端边界说明 + 失败案例 + 实际执行命令/输出 + 未完成事项。**无法运行时报告原因，不把“代码写好”当测试通过。** 不直接重构已有仓库；先做 read-only discovery。

## 设计、协议与安全原则参考

- Atlassian PRD: https://www.atlassian.com/agile/product-management/requirements
- Cucumber Gherkin: https://cucumber.io/docs/gherkin/reference/
- Architecture Decision Records: https://gds-way.digital.cabinet-office.gov.uk/standards/architecture-decisions.html
- OpenAI Codex workflow: https://developers.openai.com/cookbook/examples/codex/iterating-development-workflows-with-codex
- OWASP ASVS: https://asvs.owasp.org/
- NIST AI RMF: https://www.nist.gov/itl/ai-risk-management-framework
