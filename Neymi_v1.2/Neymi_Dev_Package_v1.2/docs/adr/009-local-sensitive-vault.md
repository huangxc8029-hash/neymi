# ADR-009 — Local sensitive vault
Status: Accepted product design; cryptographic implementation unverified · 2026-10-24。
免费非敏感名片不设注册或解锁口令门槛。用户选择保存敏感字段时建立口令加密保险库，密钥不明文持久化；提供加密备份和原子恢复。
忘记口令无服务器恢复，跨浏览器不自动同步。算法参数和设备性能在 A02 验证，A12 审查；加密不解决已解锁页面的 XSS。
