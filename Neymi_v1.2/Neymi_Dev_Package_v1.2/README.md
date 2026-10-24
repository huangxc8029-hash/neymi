# Neymi · Product & Engineering v1.3
版本 1.3.0 · 2026-10-24 · 状态：产品方向已确认，实施尚未开始。

## 本次变更
从 v1.2 的“整场活动研究优先”调整为 **A 单人定制 → B 整场活动准备 → C 正式聊天渠道**。先免注册用上基础名片，再体验 AI 针对具体接收人提炼本人的真实特点。AI 个性化准备是核心增值价值，高级视觉是独立增值方向。

## 阅读入口
- 产品与范围：[PRD](docs/00_PRODUCT_PRD.md)、[UX](docs/01_USER_JOURNEYS_UX.md)。
- 技术与隐私：[AI](docs/02_AI_AGENT_SPEC.md)、[架构](docs/03_ARCHITECTURE_PRIVACY.md)、[契约](docs/04_DATA_CONTRACTS.md)、[API](docs/05_APIS_INTEGRATIONS.md)。
- 执行：[交付清单](docs/06_DELIVERY_BACKLOG.md)、[A 实施计划](docs/superpowers/plans/2026-10-24-phase-a-implementation.md)、[验收](docs/07_EVAL_AND_QA.md)。
- 决策：[风险与决策](docs/08_DECISIONS_AND_RISKS.md)、[变更映射](docs/09_V1_3_CHANGELOG.md)。
- 工作规范：[AGENTS.md](AGENTS.md)、[首次开发提示](docs/CODEX_FIRST_PROMPT.md)、当前 harness/build 任务卡。
- 产品讨论依据：[设计文档](docs/superpowers/specs/2026-10-24-neymi-personalized-card-design.md)。

## 当前实际状态
有 v1.1 HTML 原型、设计图片、需求文档、任务卡和虚构 fixture；没有已完成的生产应用、已运行的测试或已接通的 API。文档中的接口、命令和路径是实施目标，不是现成功能。原型只作视觉参考。

## 不变原则
免注册创建/接收/保存/回赠；本人完整资料默认本地；云端 AI 只处理用户批准的对话和最小职业摘要；敏感联系字段不输入 AI。分析、合成、最终分享分别授权。Strategy 先于 AI Recipe，手动名片不要求 AI Strategy。公开链接只托管主动发布的白名单快照，可被转发，不宣称接收人专属加密。不自动外联或隐性追踪。

## 文档权威和版本
本 v1.3 PRD + Accepted ADR → 契约 → 实施计划/任务卡 → README。设计文档记录讨论依据，操作细节以本轮同步后的规范为准。legacy/v1.2-baseline 保存修改前原件与 SHA-256 清单，仅供历史对照；旧 T00–T15 不作为当前任务编号，使用 A00–A12、B01–B03、C01–C02。legacy/v1.1 同样不得覆盖现行要求。冲突先记录，不擅自实现。
