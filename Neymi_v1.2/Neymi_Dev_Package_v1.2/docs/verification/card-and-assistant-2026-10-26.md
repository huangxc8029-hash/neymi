# A/B 名片与全局助手验收记录

日期：2026-10-26（Asia/Shanghai）
分支：`codex/phase-a-foundation`
计划：`docs/superpowers/plans/2026-10-26-card-and-global-assistant.md`

## 已实现范围

- A：免注册名片、独立加密联系方式、免费 Story/Project 与链接位、外链白名单和逐项分享确认；既有额外/未知模块保留读取、编辑与导出。
- B：共享助手仅出现在创建者路由；对话和输入只在 Provider 内存；提示关闭标记是唯一 sessionStorage 用途。单人 facts 对话只发送本轮文字及用户选择的已确认事实；候选事实需单条确认才本地保存。
- 单人入口复用现有研究、策略、recipe、本地授权和合成流程；活动入口复用现有 20 人限制、身份确认、来源审阅和活动上下文授权。策略/合成/活动进度摘要可追加回同一助手会话。
- 无真实服务配置时不返回伪 AI 成功；保留手工编辑、活动本地草案及已有直接页面入口。账号、支付和会员权益未实现。

## 验证结果

| 检查 | 命令/范围 | 结果 |
|---|---|---|
| 类型检查 | `npm run typecheck` | PASS |
| Lint | `npm run lint` | PASS |
| 单元测试 | `npm test -- --reporter=dot` | 23 files passed、1 skipped；157 passed、2 skipped |
| 策略边界 | `npm test -- tests/integration/strategy-boundary.test.ts` | 2 passed（规则草案边界、活动无 provider 快速 503） |
| 正式浏览器矩阵 | Playwright 单 worker；activity/card/exchange/messaging/personalization/service-worker/smoke/assistant | 32/32 PASS |
| 视觉验收 | `playwright.card-design.config.ts`；1440/390、六主题与 Logo | 3/3 PASS；额外生成主题截图 |
| Production build | `$env:NEYMI_NEXT_DIST_DIR='.next-phase-b-verify'; npm run build` | PASS；Next.js 16.4.3，静态与动态路由均生成。默认 `.next-neymi` 曾被并行 dev 实例占用并返回 EPERM；隔离输出目录后通过 |
| 本机预览 | production server `http://127.0.0.1:3290` | 已打开 Codex 浏览器面板 |

Playwright 默认并行执行时曾触发本机 Next dev 与 artifact recorder 的超时/ENOENT；改为单 worker 后正式矩阵全通过。两个失效 locator 已按实际模板中文名和卡片联系方式按钮修正。

## 截图

- 助手桌面弹窗：[assistant-desktop.png](screenshots/assistant-desktop.png)
- 助手手机弹窗：[assistant-mobile.png](screenshots/assistant-mobile.png)
- 六主题在 1440/390 的名片截图：`test-results/card-themes/`（本地验收产物，不提交）

## 未运行 / 发布条件

- 真实 DeepSeek/Tavily 请求、真实受控来源和供应商费用/数据留存核验：NOT RUN；需要项目密钥和合成测试数据。单人 coach 浏览器流使用 mock，不能等同真实服务通过。
- 活动 AI 服务端请求：本地测试环境没有完整 provider 配置，未验证真实结果。已验证活动本地资料、名单、身份确认、草稿保存/重载和助手路由。
- 手机 Safari、Chrome 实机、微信内置浏览器、VoiceOver/TalkBack：NOT RUN。
- 注册、支付、付费额度、真实权益校验：未实现，属于后续独立阶段。
- 未推送、部署、发送消息或发起收费。

因此自动化/构建结果通过不代表 G-A3 真实服务与真机闸门已完成，也不代表可发布收费。
