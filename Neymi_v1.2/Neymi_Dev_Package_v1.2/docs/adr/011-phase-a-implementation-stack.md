# ADR-011 — Phase A implementation stack
Status: Proposed implementation · 2026-10-24。

计划默认 TypeScript strict、Next.js/React 同源 Web/API、Zod、Dexie/IndexedDB、Web Crypto、Vitest、Playwright。单实例试点服务端 SQLite 必须有持久卷；研究与发布分别建存储边界，不用共享用户画像表。

理由：单一 TypeScript 工程可复用领域契约，本地优先与服务端最小上下文边界清晰，测试工具覆盖领域、API 和浏览器。框架本身不保证隐私，必须按投影/授权测试验证。

A00 核验受支持 Node LTS、各依赖兼容版本、托管持久卷和实际可用环境后，记录确切版本与选择依据并更新状态。版本和服务商尚未锁定，不宣称已安装或已部署；若部署环境不支持持久卷，改为适配的持久数据库并记录决策，不使用易失文件。
