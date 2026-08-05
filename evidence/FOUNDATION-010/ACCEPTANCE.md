# FOUNDATION-010 验收证据

- 已配置 Vitest、Playwright Chromium、测试数据复用、evidence 校验和 Playwright trace/screenshot 输出目录。
- `pnpm.cmd test:unit`：Vitest 1 项通过。
- `pnpm.cmd test:e2e`：实际启动 Consumer Next.js，Playwright 断言壳标题并生成 `consumer-shell.png`（17,598 bytes）。
- `pnpm.cmd evidence:check`、lint、format:check、全仓 test 和 build：PASS。
