# Delivery Backlog v1.3 — A → B → C
2026-10-24。下面记录任务范围和依赖；阶段实现状态及验证结果见 `docs/verification/`，更新文档不等于完成开发。旧 T00–T15 仅历史引用，映射见 09。详细可执行步骤见 [A 实施计划](superpowers/plans/2026-10-24-phase-a-implementation.md)。

2026-10-26 新计划阶段 A/B 已在此代码线实现；交付与验证状态见 [A/B 验收记录](verification/card-and-assistant-2026-10-26.md)。该记录不表示真实 provider 或设备试点已通过。

## 闸门
| 闸门 | 完成条件 | 任务 |
|---|---|---|
| G-A0 基础可信 | runnable 工程、契约、加密/恢复和边界测试 | A00–A02 |
| G-A1 免费名片 | 无注册创建/导出，响应式/无障碍，未选字段不泄露 | A03–A04 |
| G-A2 单人定制 | 公开证据、确认本人事实、策略/recipe、授权与方案库 | A05–A09 |
| G-A3 可试用 | 主动发布/接收/回赠、离线、真机、真实服务、清理/撤下 | A10–A12 |
| G-B 活动准备 | 20 人以内完整活动批处理，部分失败不阻断其他人 | B01–B03 |
| G-C 正式渠道 | 一个获准官方渠道、可靠消息接入、本地衔接 | C01–C02 |

## A 任务
| ID | 交付 | 依赖 | 验收重点 |
|---|---|---|---|
| A00 | 实际仓库发现、运行环境/依赖锁定、文档冲突表 | — | 不假设脚手架/密钥/托管，记录真实命令 |
| A01 | 最小可运行工程、严格类型/运行时契约、合法与非法 fixtures | A00 | 手动卡片独立，接收人无需活动，引用与枚举验证 |
| A02 | 本地数据、敏感 vault、备份恢复、锁定与迁移 | A01 | 错口令/损坏/限额失败不覆盖，密钥不明文落盘 |
| A03 | 免费快速编辑、动态卡片、可访问基础视觉 | A02 | 无账户/口令墙，360/390/768/1440 |
| A04 | 逐字段投影、媒体净化、文件/图片/vCard 导出 | A03 | 导出字节无未选字段，确认后变更需重确认 |
| A05 | 匿名服务边界、云端上下文授权、临时存储/配额/清理 | A01 | 跨会话拒绝、24h 清理、无正文日志 |
| A06 | 本人对话、事实确认与最小上下文复用 | A02,A05 | 未确认事实不入库，敏感输入拦截/替换 |
| A07 | 单人公开研究、安全抓取、消歧、证据 | A05 | SSRF/注入/重名/不可访问来源 |
| A08 | 单人相关性、表达策略及 AI Recipe | A06,A07 | 相同本人面向不同对象有依据地改变重点 |
| A09 | 本地 scoped grant、方案批准/合成、按人保存与 stale | A03,A08 | 过期/撤销/越权拒绝，标签私有 |
| A10 | 主动发布快照、接收页面基础、到期/撤下/管理凭证 | A04,A05,A09 | 可转发提示、幂等、无原 profile、30d 到期 |
| A11 | 接收/保存/回赠、离线缓存、系统分享降级 | A10 | 无注册墙、不缓存动态公开敏感页、跨浏览器恢复 |
| A12 | 端到端、安全/事实评测、真实 API、真机试点 | A00–A11 | AC-A01–18 证据，未运行项明确 BLOCKED/NOT RUN |

可独立开展部分文档/fixture 工作，但不能跳过依赖的验收闸门。默认按序小提交，不主动扩成多代理并行实施；实施方式由后续执行指令决定。

## B/C 与独立商业线
| ID | 范围 | 依赖/闸门 |
|---|---|---|
| B01 | 活动 HTTPS URL/文字/PDF，最多 20 人、身份确认、来源保留；PDF 本地文本提取 | G-A3；文件处理与安全独立测试 |
| B02 | 透明主题整理、阶段不匹配/未知分组、逐人 Strategy/Recipe、本地合成审阅及输入指纹复用 | B01；真实来源/用户评价，不把排名当成功概率 |
| B03 | 逐人隔离失败、每会话 20 人/小时预算、API/本地批次取消、脱敏错误、重试和自愿本地跟进 | B02；AC-B01–03 |
| C01 | 选定一个官方渠道、准入/费用/密钥、签名与幂等 | G-B；平台配置为外部条件；本地已实现渠道适配接口、fixture HMAC 验签、重放去重与限流，真实渠道待选/待配置 |
| C02 | 单次 handoff、原浏览器/恢复路径、真实渠道联调 | C01；AC-C01–02；本地已实现已发布卡片的一次性交接与恢复提示，真实消息渠道待联调 |
| P-LATER | AI 付费权益/恢复、视觉付费、卡套等 | 真实价值与成本验证后另写需求，不阻塞 A |

新计划 B 阶段实际交付：全局助手外壳、仅内存会话、候选事实人工确认、单人 prepare 现有研究/策略流程入口、活动现有最多 20 人流程入口；已确认事实可选并逐次预览/授权，历史会话不自动外发。策略结果摘要可回到共享会话。商业账号、支付和真实 provider 密钥仍未配置；更多细节及未跑项见验收记录。

B/C 是路线级任务；C 实施步骤见 [C 实施计划](superpowers/plans/2026-10-25-phase-c-implementation.md)。真实渠道、平台政策和试点仍为外部门槛，不预先承诺具体供应商。

## 新工期基线（估算）
按单一实施流、每天约一个工作日的有效开发/验证、需求稳定、配置及时提供计算；不是后台自动持续工作或交付承诺。
| 阶段 | 本阶段估计 | 累计 |
|---|---|---|
| 工程/本地资料/基础名片 A00–A04 | 3–5 工作日 | 3–5 |
| 单人 AI 闭环 A05–A09 | 4–6 工作日 | 7–11 |
| 发布/接收/离线 A10–A11 | 3–4 工作日 | 10–15 |
| 完整验证与修复 A12 | 2–3 工作日 | **12–18** |
| B（A 通过后） | 追加 5–8 工作日的粗估 | 不固定日历日期 |
| C（渠道就绪后） | 追加 3–5 工作日的粗估 | 另计平台审批等待 |

第一份可操作演示仍可争取 1–2 工作日，但模拟数据必须标注，不能视为 G-A3。相较原先 7–12 日粗估，本次显式计入加密恢复、快照托管/撤下和完整验证，修订为 A 12–18 工作日。A04、A09 后各重估一次。供应商、托管、真机和用户反馈等待另计；重大范围变动重新估算。

## Creative cards and content assistant follow-up

Completed locally: a six-group module catalog with repeatable project case modules; nine registered mosaic/dopamine/anime Pro previews; local PDF/DOCX/TXT/image intake with source locations; temporary browser recording and manual transcript review; transcription and module-proposal ports; deterministic style pairing; and test-only read-only entitlement/reservation fixtures. Existing guest card creation and sharing remain available.

Not enabled for production: account/OAuth, paid checkout, server-side entitlement, production metering, ASR, OCR, or a content-module LLM endpoint. Pro templates remain preview-only. These require separate COM/provider work and must not be presented as available paid features until configured and deployed.

## Definition of Done
每任务有实现文件、小范围提交、实际 typecheck/lint/相关单测与集成结果、负例与隐私边界说明。最终含 responsive/reduced-motion、真实 API 和真机矩阵。无密钥、无设备、无部署权限时准确区分可测部分和阻塞项，不用截图或 mock 宣称上线完成。推送、部署、付费和发送真实消息需明确指令。
